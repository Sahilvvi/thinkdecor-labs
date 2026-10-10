import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { money, pence, PHASE1_PLAN, planByKey } from "@/lib/billing";
import { CATALOG, resolvePrice } from "../../supabase/functions/_shared/catalog";

describe("price formatting", () => {
  it("shows sub-£1 prices in pence and the rest in pounds", () => {
    expect(pence(0.69)).toBe("69p");
    expect(pence(4.99)).toBe("£4.99");
  });
  it("formats whole and fractional pounds", () => {
    expect(money(5)).toBe("£5");
    expect(money(4.99)).toBe("£4.99");
  });
});

describe("the one plan on sale", () => {
  it("is £4.99 a month with a 69p first month and 20 credits", () => {
    expect(PHASE1_PLAN.monthly).toBe(4.99);
    expect(PHASE1_PLAN.introPrice).toBe(0.69);
    expect(PHASE1_PLAN.credits).toBe(20);
  });
  it("grants the same credits on the server as the site advertises", () => {
    expect(CATALOG.phase1.credits).toBe(PHASE1_PLAN.credits);
  });
  it("is found by key", () => {
    expect(planByKey("phase1")?.key).toBe("phase1");
    expect(planByKey("nope")).toBeNull();
  });
});

describe("server price resolution (resolvePrice)", () => {
  const env: Record<string, string> = {
    STRIPE_PRICE_PHASE1: "price_p1",
    STRIPE_COUPON_FIRST_MONTH: "coupon_first",
    STRIPE_PRICE_PACK_10: "price_pack10",
  };
  beforeEach(() => {
    vi.stubGlobal("Deno", { env: { get: (k: string) => env[k] } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("never trusts the client: only catalogue keys resolve", () => {
    expect(resolvePrice("nope")).toBeNull();
    expect(resolvePrice("")).toBeNull();
    expect(resolvePrice("__proto__")).toBeNull();
  });
  it("resolves the plan to its Stripe price with the first-month coupon", () => {
    const r = resolvePrice("phase1", "month")!;
    expect(r.priceId).toBe("price_p1");
    expect(r.couponId).toBe("coupon_first");
    expect(r.mode).toBe("subscription");
  });
  it("a yearly request cannot resolve to a different or missing price", () => {
    expect(resolvePrice("phase1", "year")!.priceId).toBe("price_p1");
  });
  it("charges full price (no coupon) rather than failing if the coupon secret is missing", () => {
    delete env.STRIPE_COUPON_FIRST_MONTH;
    const r = resolvePrice("phase1", "month")!;
    expect(r.priceId).toBe("price_p1");
    expect(r.couponId).toBeUndefined();
    env.STRIPE_COUPON_FIRST_MONTH = "coupon_first";
  });
  it("refuses a product whose price secret is not configured", () => {
    expect(resolvePrice("studio", "month")).toBeNull();
  });
  it("one-off packs are payment mode with no coupon", () => {
    const r = resolvePrice("pack_10")!;
    expect(r.mode).toBe("payment");
    expect(r.couponId).toBeUndefined();
  });
});
