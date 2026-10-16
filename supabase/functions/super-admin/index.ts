// deno-lint-ignore-file no-explicit-any
// Backend for the super admin panel (/super). One endpoint, many actions.
//
// Who may call it: signed-in users holding the 'admin' or 'super_admin' role in user_roles.
//   - admins can READ everything (the panel's "pull" action) and use the harmless actions
//   - super admins can also run every risky action; each one needs a typed confirmation in the UI
//     and writes an append-only row to audit_log (who, what, before, after, reason, IP).
// Uses the service role, so nothing here depends on RLS; the role check below is the gate.
//
// Deploy:  supabase functions deploy super-admin
// Secrets: STRIPE_SECRET_KEY (billing data), optional RESEND_API_KEY (email)

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/catalog.ts";
import { CATALOG } from "../_shared/catalog.ts";
import { invalidatePrices, invalidateSettings, loadSettings, todaySpendGbp } from "../_shared/platform.ts";
import { syncUserBilling } from "../_shared/stripeSync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin: any = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

class Deny extends Error {
  constructor(public code: string, message: string, public status = 403) {
    super(message);
  }
}

interface Caller {
  id: string;
  email: string;
  name: string;
  isSuper: boolean;
  aal: string;
  ip: string;
}

/* ------------------------------------------------------------------ helpers */

async function fetchAll(table: string, cols: string, apply?: (q: any) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    let q = admin.from(table).select(cols).range(from, from + 999);
    if (apply) q = apply(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function listAllAuthUsers(): Promise<any[]> {
  const out: any[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return out;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const monday = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
};
const DISPOSABLE = ["yopmail.com", "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "trashmail.com", "sharklasers.com", "getnada.com"];

async function audit(c: Caller, action: string, target: string, before: string, after: string, severity: "info" | "warn" | "crit", reason = "") {
  await admin.from("audit_log").insert({
    actor_id: c.id,
    actor_email: c.email,
    actor_role: c.isSuper ? "super_admin" : "admin",
    action,
    target,
    before_value: before,
    after_value: after,
    reason: reason || null,
    severity,
    ip: c.ip,
  });
}

function requireSuper(c: Caller, action: string) {
  if (!c.isSuper) throw new Deny("super_only", `${action} needs the super_admin role.`);
}

/* ------------------------------------------------------------------ auth */

async function authenticate(req: Request): Promise<Caller> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new Deny("unauthenticated", "Sign in first.", 401);
  const { data } = await admin.auth.getUser(token);
  const user = data?.user;
  if (!user) throw new Deny("unauthenticated", "Sign in first.", 401);

  const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const roles = new Set<string>((roleRows ?? []).map((r: any) => r.role));
  if (!roles.has("admin") && !roles.has("super_admin")) throw new Deny("not_admin", "No admin access.");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const settings = await loadSettings(admin, 3000);
  if (settings.security.ip_allow && settings.security.ips.length > 0) {
    const allowed = settings.security.ips.some((e: string) => e.split(/\s+/)[0].trim() === ip);
    if (!allowed) throw new Deny("ip_blocked", "This IP address is not on the admin allow-list.");
  }

  let aal = "aal1";
  try {
    aal = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).aal ?? "aal1";
  } catch { /* keep aal1 */ }
  if (settings.security.require_2fa && aal !== "aal2") {
    throw new Deny("mfa_required", "Two-factor authentication is required.", 401);
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name: (user.user_metadata?.name as string) || user.email || "",
    isSuper: roles.has("super_admin"),
    aal,
    ip,
  };
}

/* ------------------------------------------------------------------ Stripe block (cached) */

let stripeCache: { at: number; value: any } | null = null;
const priceCache = new Map<string, any>();

async function priceInfo(priceId: string) {
  if (priceCache.has(priceId)) return priceCache.get(priceId);
  try {
    const p = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const info = { id: p.id, amount: (p.unit_amount ?? 0) / 100, currency: p.currency, interval: p.recurring?.interval ?? null, name: (p.product as any)?.name ?? "" };
    priceCache.set(priceId, info);
    return info;
  } catch {
    return { id: priceId, amount: 0, currency: "gbp", interval: null, name: "" };
  }
}

async function stripeBlock(): Promise<any> {
  if (stripeCache && Date.now() - stripeCache.at < 30_000) return stripeCache.value;
  const value: any = { events: [], promos: [], ok: !!Deno.env.get("STRIPE_SECRET_KEY"), error: null };
  if (!value.ok) return value;
  try {
    const [recent, failed, promos] = await Promise.all([
      stripe.events.list({ limit: 100 }),
      stripe.events.list({ limit: 100, delivery_success: false }),
      stripe.promotionCodes.list({ limit: 100, expand: ["data.coupon"] }),
    ]);
    const failedIds = new Set(failed.data.map((e) => e.id));
    const seen = new Set<string>();
    for (const e of [...failed.data, ...recent.data]) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const obj: any = e.data?.object ?? {};
      value.events.push({
        id: e.id,
        type: e.type,
        at: new Date(e.created * 1000).toISOString(),
        ok: !failedIds.has(e.id),
        pending: e.pending_webhooks ?? 0,
        customer: typeof obj.customer === "string" ? obj.customer : null,
        email: obj.customer_email ?? obj.customer_details?.email ?? null,
      });
    }
    value.events.sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    value.promos = promos.data.map((p: any) => ({
      id: p.id,
      code: p.code,
      active: p.active,
      uses: p.times_redeemed ?? 0,
      limit: p.max_redemptions ?? null,
      expires: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null,
      owner: p.metadata?.owner ?? "",
      kind: p.metadata?.kind ?? "",
      off: p.coupon?.percent_off
        ? `${p.coupon.percent_off}% off ${p.coupon.duration === "repeating" ? p.coupon.duration_in_months + " months" : p.coupon.duration === "forever" ? "forever" : "first payment"}`
        : p.coupon?.amount_off
          ? `£${(p.coupon.amount_off / 100).toFixed(2)} off ${p.coupon.duration === "repeating" ? p.coupon.duration_in_months + " months" : "first payment"}`
          : "",
    }));
  } catch (e) {
    value.error = e instanceof Error ? e.message : "Stripe request failed";
  }
  stripeCache = { at: Date.now(), value };
  return value;
}

/* ------------------------------------------------------------------ pull: everything the panel shows */

async function pull(c: Caller) {
  const now = new Date();
  const since90 = new Date(now.getTime() - 90 * 864e5).toISOString();
  const since30 = new Date(now.getTime() - 30 * 864e5).toISOString();
  const since24h = new Date(now.getTime() - 864e5).toISOString();

  const settings = await loadSettings(admin, 1000);
  const settingsRows = await admin.from("app_settings").select("key, updated_at, updated_by");

  const [
    authUsers, roleRows, profiles, stats, mfa, lastIps, subs, payments, genEvents, audits, pricing, pvDaily, pvTop, pvSources,
    dbStats, posts, contacts, gens, retention, demoUsage, ticketsAll, stripeData, pvVisitors30,
  ] = await Promise.all([
    listAllAuthUsers(),
    fetchAll("user_roles", "user_id, role"),
    fetchAll("profiles", "user_id, name, phone, banned_at"),
    admin.rpc("super_user_stats").then((r: any) => r.data ?? []),
    admin.rpc("super_mfa").then((r: any) => r.data ?? []),
    admin.rpc("super_last_ips").then((r: any) => r.data ?? []),
    fetchAll("subscriptions", "id, user_id, status, plan_key, price_id, interval, current_period_end, cancel_at_period_end, created_at, updated_at"),
    fetchAll("payments", "id, user_id, amount_total, currency, status, created_at", (q: any) => q.gte("created_at", since90)),
    fetchAll("generation_events", "id, user_id, device_id, feature, model, status, latency_ms, input_tokens, output_tokens, cost_gbp, error, generation_id, fallback_used, created_at", (q: any) => q.gte("created_at", since90).order("created_at", { ascending: false })),
    admin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(400).then((r: any) => r.data ?? []),
    admin.from("ai_pricing").select("*").order("model").then((r: any) => r.data ?? []),
    admin.rpc("super_pv_daily", { p_days: 90 }).then((r: any) => r.data ?? []),
    admin.rpc("super_pv_top", { p_days: 30 }).then((r: any) => r.data ?? []),
    admin.rpc("super_pv_sources", { p_days: 30 }).then((r: any) => r.data ?? []),
    admin.rpc("super_db_stats").then((r: any) => r.data ?? {}),
    admin.from("blog_posts").select("id, slug, title, excerpt, published, published_at, read_minutes, content").order("created_at", { ascending: false }).then((r: any) => r.data ?? []),
    fetchAll("contact_submissions", "id, name, email, reason, status, created_at"),
    fetchAll("generations", "id, user_id, kind, status, created_at, output_image_url, input_image_url, meta", (q: any) => q.order("created_at", { ascending: false }).limit(1000)),
    admin.rpc("super_retention").then((r: any) => r.data ?? []),
    fetchAll("homepage_demo_usage", "device_id, ip, used_at", (q: any) => q.gte("used_at", since30)),
    fetchAll("support_tickets", "id, user_id, status"),
    stripeBlock(),
    admin.from("page_views").select("session_id", { count: "exact", head: true }).gte("created_at", since30).then((r: any) => r.count ?? 0),
  ]);

  const statsById = new Map<string, any>(stats.map((s: any) => [s.user_id, s]));
  const profileById = new Map<string, any>(profiles.map((p: any) => [p.user_id, p]));
  const mfaById = new Map<string, number>(mfa.map((m: any) => [m.user_id, Number(m.verified)]));
  const ipById = new Map<string, any>(lastIps.map((l: any) => [l.user_id, l]));
  const superIds = new Set<string>(roleRows.filter((r: any) => r.role === "super_admin").map((r: any) => r.user_id));
  const adminIds = new Set<string>(roleRows.filter((r: any) => r.role === "admin").map((r: any) => r.user_id));

  // ---- plans and prices (from Stripe, for every price that has a subscriber)
  const activeSubs = subs.filter((s: any) => ["active", "trialing", "past_due"].includes(s.status));
  const priceIds = [...new Set<string>(activeSubs.map((s: any) => s.price_id).filter(Boolean))];
  const priceMap = new Map<string, any>();
  await Promise.all(priceIds.map(async (id) => priceMap.set(id, await priceInfo(id))));
  // the plan on sale now, even with zero subscribers
  const saleEnv = CATALOG["phase1"] && (CATALOG["phase1"] as any).monthlyEnv;
  const salePriceId = saleEnv ? Deno.env.get(saleEnv) : null;
  if (salePriceId && !priceMap.has(salePriceId)) priceMap.set(salePriceId, await priceInfo(salePriceId));

  const planKeyOf = (s: any) => s.plan_key ?? "phase1";
  const plansOut: any[] = [];
  const planKeys = new Set<string>(["phase1", ...activeSubs.map(planKeyOf)]);
  for (const key of planKeys) {
    const entry: any = (CATALOG as any)[key];
    if (!entry || entry.kind !== "subscription" || entry.free) continue;
    const priceId = Deno.env.get(entry.monthlyEnv) ?? null;
    const p = priceId ? priceMap.get(priceId) ?? await priceInfo(priceId) : null;
    plansOut.push({
      key,
      name: entry.name,
      price: p?.amount ?? 0,
      credits: entry.credits,
      priceId,
      subs: activeSubs.filter((s: any) => planKeyOf(s) === key && s.status !== "past_due").length,
      pastDue: activeSubs.filter((s: any) => planKeyOf(s) === key && s.status === "past_due").length,
      intro: key === "phase1" ? 0.69 : null,
    });
  }
  const planNameByKey = new Map<string, string>(plansOut.map((p) => [p.key, p.name]));
  const subByUser = new Map<string, any>();
  for (const s of subs) {
    const cur = subByUser.get(s.user_id);
    const rank = (x: any) => (["active", "trialing"].includes(x.status) ? 3 : x.status === "past_due" ? 2 : 1);
    if (!cur || rank(s) > rank(cur) || (rank(s) === rank(cur) && s.updated_at > cur.updated_at)) subByUser.set(s.user_id, s);
  }

  // ---- users
  const phoneCount = new Map<string, number>();
  for (const u of authUsers) {
    const ph = profileById.get(u.id)?.phone ?? u.phone;
    if (ph) phoneCount.set(ph, (phoneCount.get(ph) ?? 0) + 1);
  }
  const usersOut = authUsers.map((u: any) => {
    const p = profileById.get(u.id) ?? {};
    const st = statsById.get(u.id) ?? {};
    const sub = subByUser.get(u.id);
    const phone = p.phone ?? u.phone ?? "";
    const domain = (u.email ?? "").split("@")[1]?.toLowerCase() ?? "";
    const flags: string[] = [];
    if (phone && (phoneCount.get(phone) ?? 0) > 1) flags.push("dup-phone");
    if (DISPOSABLE.includes(domain)) flags.push("disposable-email");
    const isPaid = sub && ["active", "trialing", "past_due"].includes(sub.status);
    return {
      id: u.id,
      name: p.name ?? u.user_metadata?.name ?? (u.email ?? "").split("@")[0],
      email: u.email ?? "",
      phone,
      plan: isPaid ? planNameByKey.get(planKeyOf(sub)) ?? "Paid" : "Free",
      status: isPaid ? sub.status : "free",
      country: phone.startsWith("+44") ? "UK" : phone.startsWith("+91") ? "India" : phone ? "Other" : "—",
      credits: Number(st.credits ?? 0),
      designs: Number(st.designs ?? 0),
      spend: Number(st.spend_pence ?? 0) / 100,
      signup: u.created_at,
      last: st.last_gen ?? u.last_sign_in_at ?? u.created_at,
      lastSignIn: u.last_sign_in_at,
      suspended: !!p.banned_at,
      flags,
      tickets: Number(st.tickets ?? 0),
      openTickets: Number(st.open_tickets ?? 0),
      cus: null as string | null,
      ip: ipById.get(u.id)?.ip ?? "",
      isAdmin: adminIds.has(u.id) || superIds.has(u.id),
    };
  });
  const { data: cust } = await admin.from("billing_customers").select("user_id, stripe_customer_id");
  const custById = new Map<string, string>((cust ?? []).map((x: any) => [x.user_id, x.stripe_customer_id]));
  for (const u of usersOut) u.cus = custById.get(u.id) ?? null;
  const userById = new Map<string, any>(usersOut.map((u: any) => [u.id, u]));

  // ---- admins
  const admins = usersOut
    .filter((u: any) => u.isAdmin)
    .map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: superIds.has(u.id) ? "super_admin" : "admin",
      tfa: (mfaById.get(u.id) ?? 0) > 0,
      last: u.lastSignIn,
      ip: u.ip,
    }));

  // ---- subscriptions table
  const subsOut = subs.map((s: any) => {
    const p = s.price_id ? priceMap.get(s.price_id) : null;
    const u = userById.get(s.user_id);
    return {
      id: s.id,
      userId: s.user_id,
      name: u?.name ?? "—",
      email: u?.email ?? "—",
      plan: planNameByKey.get(planKeyOf(s)) ?? "Paid",
      status: s.status,
      amount: p?.amount ?? (plansOut.find((x) => x.key === planKeyOf(s))?.price ?? 0),
      interval: s.interval,
      renew: s.current_period_end,
      cancelAtEnd: !!s.cancel_at_period_end,
      cus: u?.cus ?? null,
      created: s.created_at,
    };
  });

  // ---- revenue (live payments only; test-mode kept separately so the panel can toggle it)
  const revByDay: Record<string, { live: number; test: number }> = {};
  for (const p of payments) {
    if (p.status !== "paid") continue;
    const d = day(p.created_at);
    const isTest = String(p.id).startsWith("cs_test_");
    revByDay[d] ??= { live: 0, test: 0 };
    revByDay[d][isTest ? "test" : "live"] += (p.amount_total ?? 0) / 100;
  }
  const revenue = Object.entries(revByDay).map(([d, v]) => ({ d, live: +v.live.toFixed(2), test: +v.test.toFixed(2) })).sort((a, b) => (a.d < b.d ? -1 : 1));

  // ---- weekly new vs churned subscribers
  const weeks: string[] = [];
  const m0 = monday(now);
  for (let i = 11; i >= 0; i--) {
    const w = new Date(m0);
    w.setUTCDate(w.getUTCDate() - i * 7);
    weeks.push(day(w));
  }
  const weekOf = (d: string) => day(monday(new Date(d)));
  const newCh = weeks.map((w) => ({
    w,
    new: subs.filter((s: any) => weekOf(s.created_at) === w).length,
    churn: subs.filter((s: any) => s.status === "canceled" && weekOf(s.updated_at) === w).length,
  }));

  // ---- funnel (30 days)
  const firstDesignUsers = new Set(gens.filter((g: any) => g.created_at >= since30).map((g: any) => g.user_id));
  const funnel = {
    visitors: pvSources.reduce((a: number, s: any) => a + Number(s.visitors), 0) || pvVisitors30,
    demo: demoUsage.length,
    signups: authUsers.filter((u: any) => u.created_at >= since30).length,
    firstDesign: firstDesignUsers.size,
    paid: new Set(subs.filter((s: any) => s.user_id && s.created_at >= since30 && ["active", "trialing", "past_due", "canceled"].includes(s.status)).map((s: any) => s.user_id)).size,
  };

  // ---- retention heat map
  const cohorts: any[] = [];
  const byCohort = new Map<string, { n: number; row: Record<number, number> }>();
  for (const r of retention) {
    const key = r.cohort;
    const e = byCohort.get(key) ?? { n: Number(r.users), row: {} };
    if (r.k !== null) e.row[Number(r.k)] = Number(r.active);
    byCohort.set(key, e);
  }
  const nowWeek = m0.getTime();
  for (const [w, e] of [...byCohort.entries()].sort()) {
    const weeksAgo = Math.round((nowWeek - new Date(w + "T00:00:00Z").getTime()) / (7 * 864e5));
    const row: (number | null)[] = [];
    for (let k = 0; k <= Math.min(9, weeksAgo); k++) row.push(e.n ? Math.round(((e.row[k] ?? 0) / e.n) * 100) : 0);
    cohorts.push({ w, n: e.n, row });
  }

  // ---- credits per user buckets
  const buckets: [string, number][] = [["0", 0], ["1–5", 0], ["6–10", 0], ["11–20", 0], ["21–40", 0], ["41+", 0]];
  for (const u of usersOut) {
    const c2 = u.credits;
    buckets[c2 <= 0 ? 0 : c2 <= 5 ? 1 : c2 <= 10 ? 2 : c2 <= 20 ? 3 : c2 <= 40 ? 4 : 5][1]++;
  }

  // ---- generations / cost
  const gensOut = genEvents.slice(0, 400).map((g: any) => ({
    id: g.id,
    userId: g.user_id,
    deviceId: g.device_id,
    feature: g.feature,
    model: g.model ?? "—",
    status: g.status,
    latency: g.latency_ms != null ? +(g.latency_ms / 1000).toFixed(1) : null,
    cost: Number(g.cost_gbp ?? 0),
    inTok: g.input_tokens,
    outTok: g.output_tokens,
    err: g.error ?? "",
    at: g.created_at,
    fallback: g.fallback_used,
    generationId: g.generation_id,
  }));
  const genDaily: Record<string, any> = {};
  for (const g of genEvents) {
    const d = day(g.created_at);
    genDaily[d] ??= { d, redesign: 0, cleanup: 0, replace: 0, demo: 0, cRedesign: 0, cCleanup: 0, cReplace: 0, cDemo: 0, ok: 0, bad: 0 };
    const k = g.feature === "label" ? null : g.feature;
    if (k && g.status === "succeeded") genDaily[d][k]++;
    if (k) genDaily[d]["c" + k[0].toUpperCase() + k.slice(1)] += Number(g.cost_gbp ?? 0);
    genDaily[d][g.status === "succeeded" ? "ok" : "bad"]++;
  }
  const hourly: Record<string, any> = {};
  for (const g of genEvents.filter((x: any) => x.created_at >= since24h)) {
    const h = new Date(g.created_at).toISOString().slice(0, 13);
    hourly[h] ??= { h, ok: 0, bad: 0, lat: [] as number[] };
    hourly[h][g.status === "succeeded" ? "ok" : "bad"]++;
    if (g.status === "succeeded" && g.latency_ms) hourly[h].lat.push(g.latency_ms / 1000);
  }
  const pct = (arr: number[], p: number) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
  };
  const hoursOut = Object.values(hourly).sort((a: any, b: any) => (a.h < b.h ? -1 : 1)).map((x: any) => ({ h: x.h, ok: x.ok, bad: x.bad, p50: pct(x.lat, 0.5), p95: pct(x.lat, 0.95) }));

  const costByUser = new Map<string, { gens: number; cost: number }>();
  for (const g of genEvents.filter((x: any) => x.created_at >= since30 && x.user_id)) {
    const e = costByUser.get(g.user_id) ?? { gens: 0, cost: 0 };
    if (g.status === "succeeded") e.gens++;
    e.cost += Number(g.cost_gbp ?? 0);
    costByUser.set(g.user_id, e);
  }
  const costByModel: Record<string, number> = {};
  for (const g of genEvents.filter((x: any) => x.created_at >= since30 && x.model)) costByModel[g.model] = (costByModel[g.model] ?? 0) + Number(g.cost_gbp ?? 0);
  const okEvents30 = genEvents.filter((g: any) => g.created_at >= since30 && g.status === "succeeded");
  const avgCostPerGen = okEvents30.length ? sum(okEvents30.map((g: any) => Number(g.cost_gbp ?? 0))) / okEvents30.length : null;

  // average credits a paying subscriber actually uses per month (from the ledger)
  // An "unclaimed" subscription (the webhook recorded it but couldn't attach it to an account yet)
  // has user_id = NULL: leave it out, or the ledger lookup below gets `in.(null)` and fails on a uuid cast.
  const subscriberIds = new Set<string>(activeSubs.map((s: any) => s.user_id).filter(Boolean));
  let avgUsed: number | null = null;
  if (subscriberIds.size) {
    const led = await fetchAll("credit_ledger", "user_id, delta, reason, created_at", (q: any) => q.in("user_id", [...subscriberIds]).lt("delta", 0).gte("created_at", since30));
    avgUsed = -sum(led.map((l: any) => l.delta)) / subscriberIds.size;
  }

  // ---- recent outputs (signed image links)
  const recentGens = gens.filter((g: any) => g.output_image_url).slice(0, 24);
  const outputs: any[] = [];
  if (recentGens.length) {
    const paths = recentGens.flatMap((g: any) => [g.output_image_url, g.input_image_url]).filter(Boolean);
    const { data: signed } = await admin.storage.from("generations").createSignedUrls(paths, 3600);
    const urlOf = new Map<string, string>((signed ?? []).map((s: any) => [s.path, s.signedUrl]));
    for (const g of recentGens) {
      outputs.push({
        id: g.id,
        userId: g.user_id,
        feature: g.kind ?? "redesign",
        at: g.created_at,
        url: urlOf.get(g.output_image_url) ?? "",
        inUrl: urlOf.get(g.input_image_url) ?? "",
        flag: g.meta?.flag ?? "",
      });
    }
  }

  // ---- moderation queue: uploads the safety filter refused (real failures)
  const moderation = genEvents
    .filter((g: any) => g.status === "failed" && /refus|safety|blocked|prohibited|PROHIBITED|IMAGE_SAFETY/i.test(g.error ?? "") && g.created_at >= since30)
    .slice(0, 30)
    .map((g: any) => ({ id: g.id, userId: g.user_id, feature: g.feature, reason: g.error, at: g.created_at }));

  // ---- content & seo (real checks)
  const viewsBySlug = new Map<string, number>();
  for (const t of pvTop) {
    const m = String(t.path).match(/^\/blog\/([^/?#]+)/);
    if (m) viewsBySlug.set(m[1], Number(t.views));
  }
  const { data: postViews } = await admin.from("page_views").select("path").gte("created_at", since30).like("path", "/blog/%").limit(20000);
  const postCount = new Map<string, number>();
  for (const r of postViews ?? []) {
    const m = String(r.path).match(/^\/blog\/([^/?#]+)/);
    if (m) postCount.set(m[1], (postCount.get(m[1]) ?? 0) + 1);
  }
  const postsOut = posts.map((p: any) => ({
    title: p.title,
    slug: p.slug,
    published: p.published,
    publishedAt: p.published_at,
    readMin: p.read_minutes,
    views: postCount.get(p.slug) ?? 0,
    seo: {
      title: (p.title ?? "").length > 0 && (p.title ?? "").length <= 70,
      meta: !!p.excerpt && p.excerpt.length >= 60 && p.excerpt.length <= 200,
      schema: true,
      sitemap: !!p.published,
      links: (String(p.content ?? "").match(/\]\(\/(?!\/)/g) ?? []).length >= 2,
    },
  }));

  // ---- email segments (real counts)
  const seg = (fn: (u: any) => boolean) => usersOut.filter((u: any) => !u.suspended && fn(u));
  const dayMs = 864e5;
  const segments = [
    { key: "stalled", label: "Free users who made a design and stopped", users: seg((u) => u.plan === "Free" && u.designs >= 1 && Date.now() - new Date(u.last).getTime() > 7 * dayMs) },
    { key: "pastdue", label: "Past due subscribers", users: seg((u) => u.status === "past_due") },
    { key: "renewing", label: "Subscribers renewing in 7 days", users: seg((u) => subsOut.some((s: any) => s.userId === u.id && s.status === "active" && s.renew && new Date(s.renew).getTime() - Date.now() < 7 * dayMs && new Date(s.renew).getTime() > Date.now())) },
    { key: "nosignup", label: "All signed-up users", users: seg(() => true) },
  ].map((s) => ({ key: s.key, label: s.label, count: s.users.length, emails: s.users.map((u: any) => u.email) }));
  const newsletter = contacts.filter((c2: any) => /newsletter|news/i.test((c2.reason ?? "") + (c2.name ?? "")));

  // ---- secrets checklist (presence only)
  const SECRET_LIST: [string, string, boolean][] = [
    ["SUPABASE_URL", "Supabase", false], ["SUPABASE_ANON_KEY", "Supabase", false], ["SUPABASE_SERVICE_ROLE_KEY", "Supabase, edge only", false],
    ["STRIPE_SECRET_KEY", "Stripe", false], ["STRIPE_WEBHOOK_SECRET", "Stripe", false], ["STRIPE_PRICE_PHASE1", "Stripe price", false],
    ["STRIPE_COUPON_FIRST_MONTH", "Stripe coupon", false], ["GEMINI_API_KEY", "Google AI", false], ["SITE_URL", "App", false],
    ["RESEND_API_KEY", "Email (lead alerts, campaigns)", true], ["SENTRY_DSN", "Error tracking", true],
  ];
  const secrets = SECRET_LIST.map(([name, group, optional]) => ({ name, group, optional, set: !!Deno.env.get(name) }));

  // ---- live uptime probe (one real request to the public site)
  let site: any = { ok: false, ms: null, status: 0 };
  try {
    const t0 = Date.now();
    const r = await fetch("https://www.thinkdecor.app/", { method: "GET" });
    site = { ok: r.ok, ms: Date.now() - t0, status: r.status };
  } catch { /* offline */ }

  const today = await todaySpendGbp(admin);

  return {
    now: now.toISOString(),
    me: { id: c.id, email: c.email, name: c.name, role: c.isSuper ? "super_admin" : "admin", mfa: (mfaById.get(c.id) ?? 0) > 0, aal: c.aal, ip: c.ip },
    settings,
    settingsMeta: Object.fromEntries((settingsRows.data ?? []).map((r: any) => [r.key, { at: r.updated_at, by: r.updated_by }])),
    aiPricing: pricing,
    users: usersOut,
    admins,
    plans: plansOut,
    subs: subsOut,
    revenue,
    newCh,
    funnel,
    cohorts,
    creditBuckets: buckets,
    gens: gensOut,
    genDaily: Object.values(genDaily).sort((a: any, b: any) => (a.d < b.d ? -1 : 1)),
    hours: hoursOut,
    costs: {
      today,
      avgCostPerGen,
      avgUsed,
      byUser: [...costByUser.entries()].map(([userId, v]) => ({ userId, gens: v.gens, cost: +v.cost.toFixed(4) })).sort((a, b) => b.cost - a.cost).slice(0, 10),
      byModel: costByModel,
    },
    outputs,
    moderation,
    stripe: { ok: stripeData.ok, error: stripeData.error, events: stripeData.events, promos: stripeData.promos },
    audit: audits.map((a: any) => ({
      id: a.id, at: a.created_at, admin: a.actor_email, role: a.actor_role, action: a.action, target: a.target ?? "", before: a.before_value ?? "", after: a.after_value ?? "", sev: a.severity, reason: a.reason ?? "", ip: a.ip ?? "",
    })),
    traffic: { daily: pvDaily, top: pvTop, sources: pvSources },
    posts: postsOut,
    comms: {
      segments,
      newsletter: { count: newsletter.length, recent: newsletter.slice(0, 8).map((n: any) => ({ email: n.email, at: n.created_at })) },
      emailReady: !!Deno.env.get("RESEND_API_KEY"),
    },
    system: {
      db: dbStats,
      secrets,
      site,
      openTickets: ticketsAll.filter((t: any) => t.status !== "resolved").length,
      demoUses30: demoUsage.length,
    },
    demoClusters: (() => {
      const ips = new Map<string, number>();
      for (const d of demoUsage) ips.set(String(d.ip), (ips.get(String(d.ip)) ?? 0) + 1);
      return [...ips.entries()].filter(([, n]) => n > 1).map(([ip, n]) => ({ ip, n }));
    })(),
  };
}

/* ------------------------------------------------------------------ per-user detail */

async function userDetail(userId: string) {
  const [ledger, gens, tickets, subsRows, pays, signins] = await Promise.all([
    admin.from("credit_ledger").select("delta, reason, reference, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(60).then((r: any) => r.data ?? []),
    admin.from("generations").select("id, kind, created_at, output_image_url, input_image_url, prompt, meta").eq("user_id", userId).order("created_at", { ascending: false }).limit(12).then((r: any) => r.data ?? []),
    admin.from("support_tickets").select("id, subject, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10).then((r: any) => r.data ?? []),
    admin.from("subscriptions").select("id, status, plan_key, current_period_end, cancel_at_period_end").eq("user_id", userId).then((r: any) => r.data ?? []),
    admin.from("payments").select("id, amount_total, currency, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10).then((r: any) => r.data ?? []),
    admin.rpc("super_signins", { p_user: userId }).then((r: any) => r.data ?? []),
  ]);
  const paths = gens.flatMap((g: any) => [g.output_image_url, g.input_image_url]).filter(Boolean);
  const { data: signed } = paths.length ? await admin.storage.from("generations").createSignedUrls(paths, 3600) : { data: [] };
  const urlOf = new Map<string, string>((signed ?? []).map((s: any) => [s.path, s.signedUrl]));
  return {
    ledger,
    designs: gens.map((g: any) => ({ id: g.id, feature: g.kind ?? "redesign", at: g.created_at, url: urlOf.get(g.output_image_url) ?? "", inUrl: urlOf.get(g.input_image_url) ?? "", prompt: g.prompt, flag: g.meta?.flag ?? "" })),
    tickets,
    subs: subsRows,
    payments: pays,
    signins,
  };
}

/* ------------------------------------------------------------------ actions */

const ALLOWED_SETTING_KEYS = new Set(["flags", "maintenance_text", "ai", "demo", "security"]);

function diffText(before: any, after: any): [string, string] {
  if (typeof after !== "object" || after === null) return [String(before ?? ""), String(after ?? "")];
  const b: string[] = [];
  const a: string[] = [];
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before?.[k]) !== JSON.stringify(after[k])) {
      b.push(`${k}: ${typeof before?.[k] === "object" ? JSON.stringify(before?.[k]) : before?.[k]}`);
      a.push(`${k}: ${typeof after[k] === "object" ? JSON.stringify(after[k]) : after[k]}`);
    }
  }
  return [b.join("; ") || "—", a.join("; ") || "—"];
}

async function balanceOf(userId: string): Promise<number> {
  const rows = await fetchAll("credit_ledger", "delta", (q: any) => q.eq("user_id", userId));
  return sum(rows.map((r: any) => r.delta));
}

async function ensureRole(userId: string, role: string) {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", role);
  if (!data?.length) await admin.from("user_roles").insert({ user_id: userId, role });
}

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
async function sha(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...d].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handle(c: Caller, body: any): Promise<any> {
  const { action } = body;
  const reason = String(body.reason ?? "").trim();

  switch (action) {
    case "pull":
      return await pull(c);

    case "userDetail":
      return await userDetail(String(body.userId));

    /* ------------------------------ users */
    case "creditChange": {
      requireSuper(c, "Changing credits");
      const userId = String(body.userId);
      const n = Math.max(1, Math.min(500, Math.floor(Number(body.amount))));
      const grant = body.kind !== "remove";
      const before = await balanceOf(userId);
      const delta = grant ? n : -Math.min(n, Math.max(0, before));
      if (delta === 0) throw new Deny("nothing_to_remove", "This user has no credits to remove.", 400);
      const { error } = await admin.from("credit_ledger").insert({ user_id: userId, delta, reason: grant ? "admin_grant" : "admin_remove", reference: `admin:${crypto.randomUUID()}` });
      if (error) throw error;
      await audit(c, grant ? "credits.grant" : "credits.remove", userId, String(before), String(before + delta), "warn", reason);
      return { ok: true, balance: before + delta };
    }
    case "creditReset": {
      requireSuper(c, "Resetting credits");
      const userId = String(body.userId);
      const before = await balanceOf(userId);
      if (before > 0) {
        await admin.from("credit_ledger").insert({ user_id: userId, delta: -before, reason: "admin_reset", reference: `admin:${crypto.randomUUID()}` });
      }
      await audit(c, "user.reset_credits", userId, String(before), "0", "crit", reason);
      return { ok: true };
    }
    case "suspend":
    case "unsuspend": {
      requireSuper(c, "Suspending accounts");
      const ids: string[] = body.userIds ?? [body.userId];
      for (const id of ids) {
        if (id === c.id) throw new Deny("self", "You can't suspend yourself.", 400);
        const on = action === "suspend";
        await admin.from("profiles").update({ banned_at: on ? new Date().toISOString() : null }).eq("user_id", id);
        await admin.auth.admin.updateUserById(id, { ban_duration: on ? "876000h" : "none" });
        await audit(c, on ? (ids.length > 1 ? "user.suspend_bulk" : "user.suspend") : "user.unsuspend", id, on ? "active" : "suspended", on ? "suspended" : "active", on ? "crit" : "warn", reason);
      }
      return { ok: true, count: ids.length };
    }
    case "deleteUser": {
      requireSuper(c, "Deleting accounts");
      const userId = String(body.userId);
      if (userId === c.id) throw new Deny("self", "You can't delete yourself.", 400);
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const email = u?.user?.email ?? "";
      if (String(body.confirmEmail ?? "").toLowerCase() !== email.toLowerCase()) throw new Deny("confirm_mismatch", "The typed email doesn't match.", 400);
      // stop billing first, keep the payment records (UK law) but drop the personal data
      const { data: ss } = await admin.from("subscriptions").select("id, status").eq("user_id", userId);
      for (const s of ss ?? []) {
        if (["active", "trialing", "past_due"].includes(s.status)) {
          try { await stripe.subscriptions.cancel(s.id); } catch (e) { console.error("cancel failed", e); }
        }
      }
      await admin.from("payments").update({ email: null }).eq("user_id", userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      await audit(c, "user.delete_gdpr", `${userId} · ${email}`, "exists", "deleted", "crit", reason);
      return { ok: true };
    }
    case "userExport": {
      requireSuper(c, "Exporting a user's data");
      const userId = String(body.userId);
      const [profile, ledger, gens, tickets, pays, subsRows] = await Promise.all([
        admin.from("profiles").select("*").eq("user_id", userId).maybeSingle().then((r: any) => r.data),
        admin.from("credit_ledger").select("*").eq("user_id", userId).then((r: any) => r.data ?? []),
        admin.from("generations").select("id, kind, room_type, template_key, prompt, created_at").eq("user_id", userId).then((r: any) => r.data ?? []),
        admin.from("support_tickets").select("*").eq("user_id", userId).then((r: any) => r.data ?? []),
        admin.from("payments").select("*").eq("user_id", userId).then((r: any) => r.data ?? []),
        admin.from("subscriptions").select("*").eq("user_id", userId).then((r: any) => r.data ?? []),
      ]);
      await audit(c, "user.export", userId, "—", "exported", "warn", reason);
      return { ok: true, file: { profile, ledger, generations: gens, tickets, payments: pays, subscriptions: subsRows } };
    }
    case "impersonateStart": {
      await audit(c, "user.impersonate", String(body.userId), "—", "read-only session", "warn", reason);
      return { ok: true };
    }
    case "impersonateEnd": {
      await audit(c, "user.impersonate.end", String(body.userId), "active", "ended", "info");
      return { ok: true };
    }
    case "syncUser": {
      const userId = String(body.userId);
      const { data: u } = await admin.auth.admin.getUserById(userId);
      if (!u?.user?.email) throw new Deny("no_user", "User not found.", 404);
      const summary = await syncUserBilling(admin, stripe, userId, u.user.email);
      stripeCache = null;
      await audit(c, "stripe.sync", `${userId} · ${u.user.email}`, "—", `${summary.subscriptions} subs, +${summary.creditsGranted} credits`, "info");
      return { ok: true, ...summary };
    }
    case "syncEventCustomer": {
      // Stripe can't re-deliver an event with a fresh signature, so "replay" reconciles the customer instead.
      requireSuper(c, "Replaying events");
      const ev = await stripe.events.retrieve(String(body.eventId));
      const obj: any = ev.data?.object ?? {};
      const customerId = typeof obj.customer === "string" ? obj.customer : null;
      const email = obj.customer_email ?? obj.customer_details?.email ?? null;
      let userId: string | null = obj.metadata?.user_id || null;
      if (!userId && customerId) {
        const { data } = await admin.from("billing_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
        userId = data?.user_id ?? null;
      }
      if (!userId && email) {
        const users = await listAllAuthUsers();
        userId = users.find((u: any) => (u.email ?? "").toLowerCase() === String(email).toLowerCase())?.id ?? null;
      }
      if (!userId) throw new Deny("no_user", "No account matches this event's customer.", 404);
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const summary = await syncUserBilling(admin, stripe, userId, u?.user?.email ?? String(email));
      stripeCache = null;
      await audit(c, "stripe.replay", body.eventId, "failed delivery", `re-synced ${summary.subscriptions} subs`, "warn", reason);
      return { ok: true, ...summary };
    }

    /* ------------------------------ AI */
    case "refundGeneration": {
      requireSuper(c, "Refunding a design");
      const genId = String(body.generationId);
      const { data: g } = await admin.from("generations").select("id, user_id").eq("id", genId).maybeSingle();
      if (!g) throw new Deny("no_gen", "Design not found.", 404);
      const { error } = await admin.from("credit_ledger").insert({ user_id: g.user_id, delta: 1, reason: "admin_refund", reference: `genrefund:${genId}` });
      if (error?.code === "23505") throw new Deny("already", "This design was already refunded.", 409);
      if (error) throw error;
      await audit(c, "credits.refund", genId, "—", "+1 credit", "info", reason || "Quality goodwill");
      return { ok: true };
    }
    case "flagGeneration": {
      const genId = String(body.generationId);
      const { data: g } = await admin.from("generations").select("meta").eq("id", genId).maybeSingle();
      const meta = { ...(g?.meta ?? {}) } as any;
      if (meta.flag) delete meta.flag; else meta.flag = "flagged by admin";
      await admin.from("generations").update({ meta }).eq("id", genId);
      await audit(c, "generation.flag", genId, meta.flag ? "—" : "flagged", meta.flag ?? "cleared", "info");
      return { ok: true };
    }
    case "dismissModeration": {
      await audit(c, "moderation.dismiss", String(body.eventId), "in review", "allowed", "info");
      return { ok: true };
    }

    /* ------------------------------ settings + pricing table */
    case "saveSettings": {
      requireSuper(c, "Changing settings");
      const key = String(body.key);
      if (!ALLOWED_SETTING_KEYS.has(key)) throw new Deny("bad_key", "Unknown setting.", 400);
      const { data: cur } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
      const next = typeof body.value === "object" && body.value !== null && !Array.isArray(body.value) && typeof cur?.value === "object"
        ? { ...cur.value, ...body.value }
        : body.value;
      if (key === "security" && next.ips) next.ips = (next.ips as string[]).map((x) => String(x).slice(0, 80)).slice(0, 50);
      if (key === "ai") {
        if (next.daily_cap_gbp !== undefined) next.daily_cap_gbp = Math.max(0, Number(next.daily_cap_gbp));
        if (next.free_credits !== undefined) next.free_credits = Math.max(0, Math.min(20, Math.floor(Number(next.free_credits))));
        if (Array.isArray(next.fallback)) next.fallback = next.fallback.map((m: string) => String(m).slice(0, 80)).slice(0, 8);
      }
      const { error } = await admin.from("app_settings").upsert({ key, value: next, updated_at: new Date().toISOString(), updated_by: c.email });
      if (error) throw error;
      invalidateSettings();
      const [b, a] = diffText(cur?.value, next);
      const sev = key === "flags" || (key === "ai" && (body.value?.kill_switch !== undefined)) ? "crit" : key === "security" ? "warn" : "warn";
      await audit(c, key === "flags" ? "flag.change" : `settings.${key}`, `app_settings.${key}`, b, a, sev, reason);
      return { ok: true, value: next };
    }
    case "savePricingRow": {
      requireSuper(c, "Changing AI prices");
      const model = String(body.model);
      const row = { model, input_usd_per_m: Number(body.input), output_usd_per_m: Number(body.output), note: body.note ? String(body.note) : null, updated_at: new Date().toISOString() };
      const { data: cur } = await admin.from("ai_pricing").select("*").eq("model", model).maybeSingle();
      await admin.from("ai_pricing").upsert(row);
      invalidatePrices();
      await audit(c, "settings.ai_pricing", model, cur ? `in ${cur.input_usd_per_m} / out ${cur.output_usd_per_m}` : "—", `in ${row.input_usd_per_m} / out ${row.output_usd_per_m}`, "warn", reason);
      return { ok: true };
    }

    /* ------------------------------ promo codes (Stripe) */
    case "promoCreate": {
      requireSuper(c, "Creating promo codes");
      const code = String(body.code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (code.length < 3) throw new Deny("bad_code", "Code must be at least 3 characters.", 400);
      const kind = String(body.discount);
      const coupon = kind === "pct"
        ? await stripe.coupons.create({ percent_off: Number(body.percent), duration: body.months > 1 ? "repeating" : "once", ...(body.months > 1 ? { duration_in_months: Number(body.months) } : {}), name: code })
        : await stripe.coupons.create({ amount_off: Math.round(Number(body.amountOff) * 100), currency: "gbp", duration: "once", name: code });
      const promo = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        ...(body.limit ? { max_redemptions: Number(body.limit) } : {}),
        ...(body.expires ? { expires_at: Math.floor(new Date(body.expires).getTime() / 1000) } : {}),
        metadata: { owner: String(body.owner ?? ""), kind: String(body.kind ?? "") },
      });
      stripeCache = null;
      await audit(c, "promo.create", code, "—", promo.id, "warn", reason);
      return { ok: true };
    }
    case "promoToggle": {
      requireSuper(c, "Changing promo codes");
      const active = !!body.active;
      await stripe.promotionCodes.update(String(body.id), { active });
      stripeCache = null;
      await audit(c, active ? "promo.activate" : "promo.pause", String(body.code), active ? "paused" : "active", active ? "active" : "paused", "warn", reason);
      return { ok: true };
    }

    /* ------------------------------ admin team */
    case "roleChange": {
      requireSuper(c, "Changing roles");
      const userId = String(body.userId);
      if (userId === c.id) throw new Deny("self", "Nobody can change their own role.", 400);
      const to = String(body.role);
      if (!["admin", "super_admin"].includes(to)) throw new Deny("bad_role", "Unknown role.", 400);
      const { data: rows } = await admin.from("user_roles").select("role").eq("user_id", userId);
      const has = new Set<string>((rows ?? []).map((r: any) => r.role));
      const from = has.has("super_admin") ? "super_admin" : has.has("admin") ? "admin" : "user";
      if (from === "super_admin" && to === "admin") {
        const { count } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "super_admin");
        if ((count ?? 0) <= 1) throw new Deny("last_super", "You can't demote the last super admin.", 400);
      }
      if (!has.has("admin")) await admin.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (to === "super_admin" && !has.has("super_admin")) await admin.from("user_roles").insert({ user_id: userId, role: "super_admin" });
      if (to === "admin" && has.has("super_admin")) await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "super_admin");
      await audit(c, "role.change", userId, from, to, "crit", reason);
      return { ok: true };
    }
    case "removeAdmin": {
      requireSuper(c, "Removing admins");
      const userId = String(body.userId);
      if (userId === c.id) throw new Deny("self", "You can't remove yourself.", 400);
      const { data: rows } = await admin.from("user_roles").select("role").eq("user_id", userId);
      const has = new Set<string>((rows ?? []).map((r: any) => r.role));
      if (has.has("super_admin")) {
        const { count } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "super_admin");
        if ((count ?? 0) <= 1) throw new Deny("last_super", "You can't remove the last super admin.", 400);
      }
      await admin.from("user_roles").delete().eq("user_id", userId).in("role", ["admin", "super_admin"]);
      await admin.auth.admin.signOut(userId, "global").catch(() => {});
      await audit(c, "role.remove", userId, [...has].filter((r) => r !== "user").join("+") || "admin", "none", "crit", reason);
      return { ok: true };
    }
    case "inviteAdmin": {
      requireSuper(c, "Inviting admins");
      const email = String(body.email).trim().toLowerCase();
      if (!/.+@.+\..+/.test(email)) throw new Deny("bad_email", "Enter a valid email.", 400);
      const role = body.role === "super_admin" ? "super_admin" : "admin";
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
      if (error) throw new Deny("invite_failed", error.message, 400);
      const uid = data.user.id;
      await ensureRole(uid, "admin");
      if (role === "super_admin") await ensureRole(uid, "super_admin");
      await audit(c, "admin.invite", email, "—", role, "warn", reason);
      return { ok: true };
    }

    /* ------------------------------ email */
    case "sendEmail": {
      requireSuper(c, "Sending email");
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) throw new Deny("email_not_configured", "Email isn't set up: add RESEND_API_KEY to the Supabase secrets.", 400);
      const recipients: string[] = (body.to as string[]).slice(0, 500);
      let sent = 0;
      for (const to of recipients) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "ThinkDecor <hello@thinkdecor.app>", to, subject: String(body.subject).slice(0, 200), text: String(body.message).slice(0, 8000) }),
        });
        if (r.ok) sent++;
      }
      await audit(c, "email.send", `${recipients.length} recipients`, "—", `${sent} sent`, "warn", String(body.subject).slice(0, 80));
      return { ok: true, sent };
    }

    /* ------------------------------ data export */
    case "exportData": {
      requireSuper(c, "Exporting data");
      const set = String(body.dataset);
      const from = body.from ? new Date(body.from).toISOString() : "1970-01-01";
      const to = body.to ? new Date(new Date(body.to).getTime() + 864e5).toISOString() : new Date().toISOString();
      const mask = !!body.mask;
      let rows: any[] = [];
      if (set === "users") {
        const users = await listAllAuthUsers();
        const profs = await fetchAll("profiles", "user_id, name, phone, banned_at");
        const pm = new Map<string, any>(profs.map((p: any) => [p.user_id, p]));
        rows = users.filter((u: any) => u.created_at >= from && u.created_at <= to).map((u: any) => ({ id: u.id, email: u.email, name: pm.get(u.id)?.name ?? "", phone: pm.get(u.id)?.phone ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, suspended: !!pm.get(u.id)?.banned_at }));
      } else if (set === "payments") {
        rows = await fetchAll("payments", "id, user_id, email, amount_total, currency, mode, product_key, status, created_at", (q: any) => q.gte("created_at", from).lte("created_at", to));
      } else if (set === "generations") {
        rows = await fetchAll("generation_events", "id, user_id, feature, model, status, latency_ms, input_tokens, output_tokens, cost_gbp, error, created_at", (q: any) => q.gte("created_at", from).lte("created_at", to));
      } else if (set === "audit") {
        rows = await fetchAll("audit_log", "id, created_at, actor_email, actor_role, action, target, before_value, after_value, reason, severity, ip", (q: any) => q.gte("created_at", from).lte("created_at", to));
      } else throw new Deny("bad_dataset", "Unknown dataset.", 400);
      if (mask) {
        for (const r of rows) {
          if (r.email) r.email = `h_${await sha(r.email)}`;
          if (r.phone) r.phone = `h_${await sha(r.phone)}`;
        }
      }
      const cols = rows.length ? Object.keys(rows[0]) : [];
      const csv = [cols.join(","), ...rows.map((r) => cols.map((k) => csvEscape(r[k])).join(","))].join("\n");
      await audit(c, `export.${set}`, `${set}.csv (${rows.length} rows)`, "—", "exported", "warn", mask ? "personal data masked" : "personal data included");
      return { ok: true, csv, rows: rows.length, name: `${set}-${day(new Date())}.csv` };
    }

    default:
      throw new Deny("bad_action", "Unknown action.", 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await authenticate(req);
    const body = await req.json().catch(() => ({}));
    const result = await handle(caller, body);
    return json(result);
  } catch (e) {
    if (e instanceof Deny) return json({ error: e.message, code: e.code }, e.status);
    console.error("super-admin failed:", e);
    return json({ error: e instanceof Error ? e.message : "Something went wrong.", code: "server_error" }, 500);
  }
});
