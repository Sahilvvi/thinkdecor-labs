// Lets a signed-in customer permanently delete their own account and data.
//
// Deploy:  supabase functions deploy delete-account
// Secrets: STRIPE_SECRET_KEY (already set)
//
// Body: { confirmEmail: string } — must match the account's email.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/catalog.ts";
import { DeletionError, deleteAccount } from "../_shared/accountDeletion.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: auth } = token ? await admin.auth.getUser(token) : { data: null };
    const user = auth?.user;
    if (!user) return json({ error: "Please sign in again.", code: "unauthenticated" }, 401);

    let body: { confirmEmail?: string } = {};
    try { body = await req.json(); } catch { /* handled by the mismatch check */ }

    const result = await deleteAccount(admin, stripe, { id: user.id, email: user.email }, body.confirmEmail);
    console.log("account deleted", user.id);
    return json(result);
  } catch (err) {
    if (err instanceof DeletionError) return json({ error: err.message, code: err.code }, err.status);
    console.error("delete-account failed:", err);
    return json({ error: "Could not delete your account right now. Please email info@thinkdecor.app.", code: "server" }, 500);
  }
});
