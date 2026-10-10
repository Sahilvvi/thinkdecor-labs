import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PHASE1_PLAN, pence, money } from '@/lib/billing';
import { Magnetic, Reveal } from './Motion';

const INTRO = pence(PHASE1_PLAN.introPrice ?? 0.69);
const MONTHLY = money(PHASE1_PLAN.monthly);

/**
 * High-contrast offer band — dark glass with a soft mint glow, a faint grid
 * and a slow light sweep, matching the motion language the rest of the site
 * uses (hero, comparison table). Price is read from billing.ts so it can
 * never drift from what Stripe actually charges.
 */
export function EarlyBirdStrip() {
  return (
    <section className="py-4">
      <div className="container mx-auto max-w-[1200px] px-6 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,hsl(168_100%_13%),hsl(168_85%_19%)_55%,hsl(166_70%_23%))] px-6 py-4 shadow-[0_24px_54px_-26px_hsl(168_100%_17%/0.65)] sm:px-8">
            {/* ambient grid + glow, same treatment as the hero and comparison table */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_75%_150%_at_20%_50%,#000,transparent)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(160_84%_55%/0.4),transparent_70%)] blur-2xl"
            />
            <div
              aria-hidden
              className="shine-sweep pointer-events-none absolute inset-y-0 -left-1/4 w-1/4 -skew-x-12 bg-[linear-gradient(90deg,transparent,hsl(0_0%_100%/0.35),transparent)] mix-blend-overlay"
            />

            <div className="relative flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
              <p className="flex items-center gap-2.5 text-[14px] font-medium text-primary-foreground">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
                </span>
                <span>
                  <span className="font-bold">{INTRO}</span> for your first month
                  <span className="hidden text-primary-foreground/70 sm:inline"> · then {MONTHLY}/month</span>
                </span>
              </p>

              <Magnetic>
                <Link
                  to="/pricing"
                  className="group relative inline-flex flex-shrink-0 items-center gap-2 overflow-hidden rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-primary shadow-[0_10px_26px_-10px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-[1.05] active:scale-[0.97]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,hsl(168_100%_17%/0.08),transparent)] transition-transform duration-700 group-hover:translate-x-full"
                  />
                  <span className="relative">Claim offer</span>
                  <ArrowRight className="relative h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
