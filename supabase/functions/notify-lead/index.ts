// Supabase Edge Function — emails info@thinkdecor.app when a contact form is submitted.
//
// Deploy:  supabase functions deploy notify-lead
// Secret:  supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//
// The lead is ALREADY stored in public.contact_submissions before this runs.
// Email is best-effort: if it fails, the lead is still safe in the panel.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TO = "info@thinkdecor.app";
// Must be a domain you have verified in Resend, otherwise sending is rejected.
const FROM = "ThinkDecor Leads <leads@thinkdecor.app>";

/** Escape so a lead can't inject markup into the notification email. */
function esc(v: unknown) {
  if (v == null || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: unknown) {
  return `<tr>
    <td style="padding:9px 16px 9px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</td>
    <td style="padding:9px 0;color:#111827;font-size:14px">${esc(value)}</td>
  </tr>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const b = await req.json();
    let {
      name, email, phone, company, company_size,
      industry, region, reason, message,
    } = b ?? {};

    if (!name || !email || !message) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Only email about a lead that really was stored (the database rate-limits and validates
    // inserts), and only once. This function is publicly callable, so without this check anyone
    // could use it to flood the inbox with arbitrary text.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: lead } = await admin
      .from("contact_submissions")
      .select("*")
      .eq("email", String(email))
      .eq("message", String(message))
      .is("notified_at", null)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lead) return json({ ok: true, emailed: false, reason: "no_matching_lead" });

    // Claim it; if another request got there first, do nothing.
    const { data: claimed } = await admin
      .from("contact_submissions")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", lead.id)
      .is("notified_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) return json({ ok: true, emailed: false, reason: "already_notified" });

    // Use what is stored, not what the request claims.
    ({ name, email, phone, company, company_size, industry, region, reason, message } = lead);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured — skipping email");
      return json({ ok: true, emailed: false, reason: "no_api_key" });
    }

    const subject = company
      ? `New enquiry — ${name} (${company})`
      : `New enquiry — ${name}`;

    const html = `
<div style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:8px">
  <div style="background:#00594e;border-radius:14px 14px 0 0;padding:22px 24px">
    <p style="margin:0;color:rgba(255,255,255,.65);font-size:11px;letter-spacing:.16em;text-transform:uppercase">ThinkDecor</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">New contact enquiry</h1>
  </div>

  <div style="border:1px solid #e6eae9;border-top:0;border-radius:0 0 14px 14px;padding:24px;background:#fefefe">
    <table style="width:100%;border-collapse:collapse">
      ${row("Name", name)}
      ${row("Email", email)}
      ${row("Phone", phone)}
      ${row("Company", company)}
      ${row("Team size", company_size)}
      ${row("Industry", industry)}
      ${row("Region", region)}
      ${row("Reason", reason)}
    </table>

    <p style="margin:22px 0 8px;color:#6b7280;font-size:11px;letter-spacing:.14em;text-transform:uppercase">Message</p>
    <div style="white-space:pre-line;background:#f4f7f6;border-left:3px solid #00594e;border-radius:8px;padding:14px 16px;color:#111827;font-size:14px;line-height:1.6">${esc(message)}</div>

    <a href="mailto:${esc(email)}?subject=${encodeURIComponent("Re: your ThinkDecor enquiry")}"
       style="display:inline-block;margin-top:22px;background:#00594e;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">
      Reply to ${esc(name)}
    </a>

    <p style="margin-top:22px;font-size:12px;color:#9ca3af">
      Also saved to your admin panel under Leads.
    </p>
  </div>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend error:", detail);
      return json({ ok: true, emailed: false, reason: "resend_error" });
    }

    return json({ ok: true, emailed: true });
  } catch (err) {
    console.error("notify-lead failed:", err);
    return json({ ok: true, emailed: false, reason: "exception" });
  }
});
