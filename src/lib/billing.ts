/**
 * Single source of truth for what Think Decor sells.
 *
 * IMPORTANT: nothing here controls what a customer is charged. The edge
 * function looks the real price up in Stripe by product key — the browser
 * never sends an amount, so a tampered request cannot change the charge.
 * These values are display only.
 *
 * PHASE 1 (current): one plan. 69p for the first month, then £4.99/month.
 * The old four-tier catalogue and the credit packs are kept below but
 * flagged `hidden`, so they are gone from the UI without being deleted.
 */

export type Interval = 'month' | 'year';

export interface Plan {
  key: 'phase1' | 'free' | 'access' | 'studio' | 'scale';
  name: string;
  tagline: string;
  /** display only — Stripe holds the authoritative amount */
  monthly: number;
  yearly: number;
  currency: string;
  credits: number;
  features: string[];
  highlight?: boolean;
  /** £0 recurring price — Checkout skips card collection entirely. */
  free?: boolean;
  /** Discounted first billing period, applied as a Stripe coupon. */
  introPrice?: number;
  /** Kept in the file but not rendered anywhere. */
  hidden?: boolean;
  cta: string;
}

export interface CreditPack {
  key: 'pack_10' | 'pack_50' | 'pack_200' | 'pack_500';
  name: string;
  credits: number;
  price: number;
  currency: string;
  note: string;
  best?: boolean;
  hidden?: boolean;
}

export const CURRENCY = 'GBP';
export const SYMBOL = '£';

/* ------------------------------------------------------------------ *
 *  PHASE 1 — the only plan currently on sale
 * ------------------------------------------------------------------ */

export const PHASE1_KEY = 'phase1';

export const PLANS: Plan[] = [
  {
    key: 'phase1',
    name: 'Think Decor',
    tagline: 'Everything, one simple plan',
    monthly: 4.99,
    yearly: 59.88, // display only; no yearly price is sold in Phase 1
    introPrice: 0.69,
    currency: CURRENCY,
    credits: 20,
    highlight: true,
    cta: 'Start for 69p',
    features: [
      '20 room designs a month',
      'Mantha AI redesigns',
      'Redecorate a whole room',
      'Change walls',
      'Change flooring',
      'Replace objects',
      'Cleanup, remove clutter',
    ],
  },

  /* ---------------- hidden: pre-Phase-1 catalogue ---------------- */
  {
    key: 'free',
    name: 'Early access',
    tagline: 'Free while we are in beta',
    monthly: 0,
    yearly: 0,
    currency: CURRENCY,
    credits: 3,
    free: true,
    hidden: true,
    cta: 'Start free',
    features: [
      '3 room scans a month',
      'Room Measurement to ±1.2 cm',
      'PDF floor plan export',
      'Mantha AI redesigns',
      'No card required',
    ],
  },
  {
    key: 'access',
    name: 'Personal',
    tagline: 'For homeowners and one-off projects',
    monthly: 29,
    yearly: 290,
    currency: CURRENCY,
    credits: 25,
    hidden: true,
    cta: 'Choose Personal',
    features: [
      '25 room scans a month',
      'Room Measurement to ±1.2 cm',
      'PDF and SVG floor plan export',
      'Mantha AI redesigns',
      'Email support',
    ],
  },
  {
    key: 'studio',
    name: 'Studio',
    tagline: 'For designers and small practices',
    monthly: 89,
    yearly: 890,
    currency: CURRENCY,
    credits: 120,
    hidden: true,
    cta: 'Start with Studio',
    features: [
      '120 room scans a month',
      'Everything in Personal',
      'DWG export for CAD',
      'Client-ready branded plans',
      'Up to 5 team seats',
      'Priority support',
    ],
  },
  {
    key: 'scale',
    name: 'Scale',
    tagline: 'For retailers and property portfolios',
    monthly: 249,
    yearly: 2490,
    currency: CURRENCY,
    credits: 500,
    hidden: true,
    cta: 'Talk to us',
    features: [
      '500 room scans a month',
      'Everything in Studio',
      'Catalogue integration',
      'White-labelled visualiser',
      'Unlimited seats',
      'Shared support channel',
    ],
  },
];

/* Credit packs are all hidden in Phase 1 — kept for a later phase. */
export const CREDIT_PACKS: CreditPack[] = [
  { key: 'pack_10',  name: 'Top-up 10',  credits: 10,  price: 10,  currency: CURRENCY, note: '£1 per scan',   hidden: true },
  { key: 'pack_50',  name: 'Top-up 50',  credits: 50,  price: 39,  currency: CURRENCY, note: '78p per scan',  hidden: true },
  { key: 'pack_200', name: 'Top-up 200', credits: 200, price: 129, currency: CURRENCY, note: '65p per scan',  hidden: true, best: true },
  { key: 'pack_500', name: 'Top-up 500', credits: 500, price: 279, currency: CURRENCY, note: '56p per scan',  hidden: true },
];

/** What the pricing page actually renders. */
export const VISIBLE_PLANS = PLANS.filter((p) => !p.hidden);
export const VISIBLE_PACKS = CREDIT_PACKS.filter((p) => !p.hidden);

/** The single Phase 1 plan, for pages that only ever show one offer. */
export const PHASE1_PLAN = PLANS.find((p) => p.key === 'phase1')!;

export function planByKey(key: string) {
  return PLANS.find((p) => p.key === key) ?? null;
}

export function packByKey(key: string) {
  return CREDIT_PACKS.find((p) => p.key === key) ?? null;
}

export function money(amount: number, currency = CURRENCY) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** "69p" reads better than "£0.69" on a call to action. */
export function pence(amount: number) {
  return amount < 1 ? `${Math.round(amount * 100)}p` : money(amount);
}

/** Months free when paying yearly, for the toggle label. */
export function yearlySaving(p: Plan) {
  return Math.round(((p.monthly * 12 - p.yearly) / (p.monthly * 12)) * 100);
}
