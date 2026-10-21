import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Check, CreditCard, ShieldCheck, Sofa, PaintRoller, Layers, CookingPot } from 'lucide-react';
import { PHASE1_PLAN, money, pence } from '@/lib/billing';
import { FREE_SIGNUP_CREDITS } from '@/lib/generation';
import { cn } from '@/lib/utils';
import { ScrollWords } from './KineticType';

/**
 * Pricing, framed the way the product is: the cost of previewing a decision
 * next to the cost of getting it wrong. Pick what you're about to buy and
 * the bars compare its typical price (illustrative, labelled as such) with
 * the 69p first month. Then the two real options: the free account and the
 * one plan on sale (prices always read from billing.ts, so they can't drift
 * from what Stripe charges). The plan card is a glass card that leans
 * towards the cursor, with light sliding across it.
 */

const INTRO = PHASE1_PLAN.introPrice ?? 0.69;

const PURCHASES = [
  { key: 'sofa', label: 'A sofa', icon: Sofa, price: 1200 },
  { key: 'paint', label: 'Paint a room', icon: PaintRoller, price: 120 },
  { key: 'floor', label: 'New flooring', icon: Layers, price: 1600 },
  { key: 'kitchen', label: 'Kitchen re-spray', icon: CookingPot, price: 2400 },
] as const;

const FREE_FEATURES = [
  `${FREE_SIGNUP_CREDITS} free redesigns of your own rooms`,
  'Every style and template',
  'Before / after you can share',
  'No card needed',
];

/** a number that counts to its value */
function useCount(value: number, decimals = 0) {
  const mv = useMotionValue(value);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Number(v.toFixed(decimals))) });
    return () => c.stop();
  }, [value, decimals, mv]);
  return shown;
}

export function PricingStage() {
  const [buyKey, setBuyKey] = useState<(typeof PURCHASES)[number]['key']>('sofa');
  const buy = PURCHASES.find((p) => p.key === buyKey)!;
  const price = useCount(buy.price);
  const share = (INTRO / buy.price) * 100;

  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-hidden py-16 lg:py-24">
      <div className="container relative mx-auto max-w-[1160px] px-5 sm:px-8">
        <div className="mx-auto max-w-[700px] text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Pricing</p>
          <ScrollWords
            className="mt-3 font-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-medium leading-[1] text-foreground"
            segments={[{ text: 'Less than one ' }, { text: 'tester pot.', className: 'italic text-[#00A08C]' }]}
          />
          <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-relaxed text-foreground/62">
            See it in your room before you buy it: {pence(INTRO)} for your first month, then {money(PHASE1_PLAN.monthly)} a month. Cancel any time.
          </p>
        </div>

        {/* ---------- the cost of guessing ---------- */}
        <div className="mt-10 rounded-[26px] bg-[#0A1C18] p-5 text-white shadow-[0_40px_90px_-50px_rgba(0,40,34,0.8)] sm:p-7 lg:mt-14">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">What are you about to buy?</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {PURCHASES.map(({ key, label, icon: Icon }) => {
                  const on = key === buyKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBuyKey(key)}
                      aria-pressed={on}
                      className={cn(
                        'flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-left text-[14px] font-semibold ring-1 transition-colors',
                        on ? 'bg-white text-[#0A1C18] ring-white' : 'bg-white/[0.04] text-white ring-white/10 hover:bg-white/[0.08]',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 flex-none', on ? 'text-[#00A08C]' : 'text-[#8FE3D4]')} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-white/65">Getting it wrong</span>
                    <b className="font-display text-[26px] font-medium tabular-nums">£{price.toLocaleString('en-GB')}</b>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      key={buyKey}
                      className="h-full rounded-full bg-[linear-gradient(90deg,#FF8A7A,#E5484D)]"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-white/65">Seeing it first in Think Decor</span>
                    <b className="font-display text-[26px] font-medium text-[#8FE3D4]">{pence(INTRO)}</b>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      key={`p-${buyKey}`}
                      className="h-full rounded-full bg-[#8FE3D4]"
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.max(1.2, share)}%` }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-white/60">
                That’s about <b className="font-semibold text-white">{share < 0.1 ? share.toFixed(2) : share.toFixed(1)}%</b> of the price, to know it works in your room before you buy.{' '}
                <span className="text-white/40">Typical UK prices, for illustration.</span>
              </p>
            </div>
          </div>
        </div>

        {/* ---------- the two real options ---------- */}
        <div className="mx-auto mt-6 grid max-w-[880px] gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-stretch">
          <div className="flex flex-col rounded-[24px] bg-white p-7 shadow-[0_24px_60px_-36px_rgba(0,52,45,0.45),inset_0_0_0_1px_rgba(0,89,78,0.1)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/50">Free account</p>
            <p className="mt-3 font-display text-[44px] font-medium leading-none text-foreground">£0</p>
            <p className="mt-1.5 text-[14px] text-foreground/55">to try it on your own rooms</p>
            <ul className="mt-6 grid gap-3 text-[14.5px] text-foreground/80">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 flex-none text-[#00A08C]" />{f}</li>
              ))}
            </ul>
            <div className="mt-auto pt-7">
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14.5px] font-semibold text-[#00594E] ring-1 ring-[#00594E]/25 transition-colors hover:bg-[#00594E]/[0.05]"
              >
                Start free
              </Link>
            </div>
          </div>

          <PlanCard />
        </div>
      </div>
    </section>
  );
}

/** the plan, as a glass card that leans towards the cursor */
function PlanCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(20);
  const glare = useTransform([gx, gy], ([x, y]: number[]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.28), transparent 45%)`);
  const intro = useCount(inView ? Math.round(INTRO * 100) : 0);
  const plan = PHASE1_PLAN;

  return (
    <div className="[perspective:1200px]">
      <motion.div
        ref={ref}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return;
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry.set((px - 0.5) * 12);
          rx.set((0.5 - py) * 10);
          gx.set(px * 100);
          gy.set(py * 100);
        }}
        onPointerLeave={() => { rx.set(0); ry.set(0); gx.set(50); gy.set(20); }}
        style={{ rotateX: rx, rotateY: ry, background: 'linear-gradient(155deg, #00A08C 0%, #00594E 50%, #002E27 100%)' }}
        className="relative flex h-full flex-col overflow-hidden rounded-[24px] p-7 text-white shadow-[0_40px_80px_-30px_rgba(0,89,78,0.75)]"
      >
        <motion.span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glare }} />
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(143,227,212,0.35),transparent_70%)] blur-xl" />

        <div className="relative flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8FE3D4]">{plan.name}</p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">First month offer</span>
        </div>
        <div className="relative mt-3 flex items-end gap-2">
          <span className="font-display text-[64px] font-medium leading-none tracking-[-0.02em] tabular-nums">{intro}p</span>
          <span className="mb-2 text-[14px] text-white/70">first month</span>
        </div>
        <p className="relative mt-1 text-[14px] text-white/75">
          then <b className="font-semibold text-white">{money(plan.monthly)}</b> a month · {plan.credits} designs a month
        </p>

        <ul className="relative mt-6 grid gap-2.5 text-[14.5px] sm:grid-cols-2">
          {plan.features.slice(0, 6).map((f, i) => (
            <motion.li
              key={f}
              className="flex gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.25 + i * 0.07 }}
            >
              <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full bg-[#8FE3D4] text-[#00231D]"><Check className="h-3 w-3" /></span>
              {f}
            </motion.li>
          ))}
        </ul>

        <Link
          to="/pricing"
          className="group relative mt-7 flex items-center justify-center gap-2.5 overflow-hidden rounded-full bg-white px-6 py-4 text-[15px] font-semibold text-[#00594E] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span aria-hidden className="absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,rgba(0,160,140,0.15),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative">{plan.cta}</span>
          <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        <div className="relative mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12px] text-white/65">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#8FE3D4]" /> Secure payment by Stripe</span>
          <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-[#8FE3D4]" /> Cancel any time</span>
        </div>
      </motion.div>
    </div>
  );
}
