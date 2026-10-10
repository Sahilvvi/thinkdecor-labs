// Creates a Stripe Checkout Session (hosted).
//
// Deploy:  supabase functions deploy create-checkout-session
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...
//          plus one STRIPE_PRICE_* per product (see _shared/catalog.ts)
//
// Accepts an optional Supabase auth token. Signed-in buyers get their
// purchase attached to their account; anonymous buyers are matched later by
// email in the webhook.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolvePrice, corsHeaders } from "../_shared/catalog.ts";
import { loadSettings } from "../_shared/platform.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://thinkdecor.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      return json({ error: "Billing is not configured yet." }, 503);
    }

    // The super admin panel can switch checkout off (payment provider incident, price migration).
    const platform = await loadSettings(createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    ));
    if (!platform.flags.checkout) {
      return json({ error: "Checkout is temporarily unavailable. Please try again shortly.", code: "checkout_off" }, 503);
    }

    const { productKey, interval, promoCode } = await req.json();
    if (typeof productKey !== "string") {
      return json({ error: "Missing productKey" }, 400);
    }

    const resolved = resolvePrice(productKey, interval);
    if (!resolved) {
      return json({ error: "Unknown or unconfigured product" }, 400);
    }
    const { entry, priceId, couponId, mode } = resolved;
    const isFree = entry.kind === "subscription" && entry.free === true;

    // ---- affiliate / influencer promo codes --------------------------------
    // A code typed by the customer or carried in a link (e.g. ?ref=INFLUENCER10)
    // looks up a live Stripe promotion code. If it resolves, it REPLACES the
    // automatic intro coupon for this session — Stripe won't apply two
    // discounts at once, so the influencer code wins over the standard 69p
    // offer for that checkout. An unknown/typo'd code is ignored rather than
    // failing checkout; the customer just gets the standard offer.
    let promoDiscount: { promotion_code: string } | undefined;
    if (!isFree && typeof promoCode === "string" && promoCode.trim()) {
      try {
        const found = await stripe.promotionCodes.list({
          code: promoCode.trim().toUpperCase(),
          active: true,
          limit: 1,
        });
        if (found.data[0]) {
          promoDiscount = { promotion_code: found.data[0].id };
        } else {
          console.warn(`Promo code "${promoCode}" not found or inactive — using default pricing.`);
        }
      } catch (e) {
        console.error("Promo code lookup failed:", e);
      }
    }

    // ---- identify the buyer if they happen to be signed in ----------------
    let userId: string | null = null;
    let email: string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (data?.user) {
        userId = data.user.id;
        email = data.user.email ?? undefined;
      }
    }

    // ---- refuse a second subscription for someone who already has one ---------
    if (userId && mode === "subscription" && !isFree) {
      const guard = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: existing } = await guard
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .limit(1);
      if (existing && existing.length > 0) {
        return json({ error: "You already have an active plan. Manage it from Settings.", code: "already_subscribed" }, 409);
      }
    }

    // ---- reuse an existing Stripe customer where we can --------------------
    let customerId: string | undefined;
    if (userId) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data } = await admin
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();
      customerId = data?.stripe_customer_id ?? undefined;
    }

    const session = await stripe.checkout.sessions.create({
      mode: mode === "subscription" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],

      // Sign-in on this site is for the blog/CMS only — never a paying
      // customer. Seeding Checkout with a signed-in admin's address would
      // prefill (and lock) the wrong email, so we never pass `customer` or
      // `customer_email`. Stripe collects the address fresh every time.
      ...(mode === "payment" ? { customer_creation: "always" as const } : {}),

      // Carried through to the webhook on both the session and the
      // subscription, so entitlements can be granted without guessing.
      metadata: {
        product_key: productKey,
        credits: String(entry.credits),
        user_id: userId ?? "",
      },
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                product_key: productKey,
                credits: String(entry.credits),
                user_id: userId ?? "",
              },
            },
          }
        : {}),

      // A £0 subscription must not demand a card — asking for one is the
      // fastest way to kill free signups.
      //
      // Stripe rejects `discounts` and `allow_promotion_codes` together, so
      // only one discount path can win per session:
      //   1. A resolved influencer/affiliate promo code, if one came through.
      //   2. Otherwise, the automatic 69p intro coupon.
      //   3. Otherwise, the manual promo-code box on Checkout itself.
      ...(isFree
        ? { payment_method_collection: "if_required" as const }
        : promoDiscount
        ? { discounts: [promoDiscount] }
        : couponId
        ? { discounts: [{ coupon: couponId }] }
        : { allow_promotion_codes: true }),

      // Collect the customer's name (comes with the billing address block)
      // and their phone number, alongside the email Checkout always takes.
      billing_address_collection: "required" as const,

      // Shown beside the Pay button on paid plans: makes the start-now request
      // and the renewal explicit, and points at our own terms (Stripe's
      // consent_collection needs a Terms URL set in the Stripe dashboard, so
      // this uses custom text only).
      ...(isFree
        ? {}
        : {
            custom_text: {
              submit: {
                message:
                  "By subscribing you ask us to start your plan immediately. It renews monthly at the price shown until you cancel, and you can cancel any time from Settings. Think Decor is a trading name of Dreamverse Limited. See our Terms, Privacy Policy and Refund Policy at thinkdecor.app.",
              },
            },
          }),
      phone_number_collection: { enabled: true },

      automatic_tax: { enabled: false },

      success_url: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing?checkout=cancelled`,
    });

    return json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("create-checkout-session failed:", err);
    return json({ error: "Could not start checkout. Please try again." }, 500);
  }
});
