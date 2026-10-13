import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowRight, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Magnetic, Reveal, RevealWords, Stagger, staggerItem } from '@/components/premium/Motion';
import { SectionLabel } from './primitives';
import { type TrustItem, useFinePointer } from './hooks';

const BEFORE = '/assets/samples/empty_room.png';
const AFTER = '/assets/samples/styled_room.png';
const BARS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1];

/* ------------------------------------------------------------------ *
 *  Closing call to action. A room card hangs on a cord, swings with
 *  the cursor and flips over to show the photo it started from.
 * ------------------------------------------------------------------ */
export function HangingCta({ trust, freeCredits }: { trust: TrustItem[]; freeCredits: number }) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const target = useMotionValue(0);
  // Low damping so the card keeps swinging like a pendulum after the cursor moves.
  const swing = useSpring(target, { stiffness: 40, damping: 4, mass: 1.2 });
  const [flipped, setFlipped] = useState(false);

  return (
    <section className="pb-24 pt-10 lg:pb-32">
      <div className="container mx-auto max-w-[1240px] px-6 sm:px-8">
        <Reveal y={40} blur={16}>
          <div
            onPointerMove={(e) => {
              if (!fine || reduce) return;
              const r = e.currentTarget.getBoundingClientRect();
              target.set(((e.clientX - r.left) / r.width - 0.5) * 18);
            }}
            onPointerLeave={() => target.set(0)}
            className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,hsl(168_100%_14%),hsl(168_85%_20%)_55%,hsl(166_70%_27%))] text-white shadow-[0_34px_80px_-28px_hsl(168_100%_17%/0.55)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_80%_at_75%_40%,#000,transparent)]"
            />
            <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/[0.09] blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 right-10 h-96 w-96 rounded-full bg-[hsl(160_84%_45%)]/20 blur-3xl" />

            <div className="relative grid items-center gap-2 px-7 pt-14 sm:px-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-16 lg:py-20">
              <div>
                <SectionLabel className="text-white/65">Start free</SectionLabel>
                <h2 className="mt-6 text-[clamp(2.3rem,5.4vw,4.6rem)] font-bold leading-[0.98] tracking-[-0.045em]">
                  <RevealWords text="Your room deserves" className="block" />
                  <RevealWords text="smarter intelligence." className="block text-[hsl(160_80%_72%)]" delay={0.12} />
                </h2>
                <p className="mt-6 max-w-[42ch] text-[16px] text-white/70">
                  Your first {freeCredits} redesigns are free — no card needed.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Magnetic>
                    <Link
                      to="/signup"
                      className="group inline-flex items-center gap-2.5 rounded-full bg-white px-9 py-4 text-[15px] font-semibold text-primary shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98]"
                    >
                      Try it free
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Magnetic>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center rounded-full border border-white/30 px-7 py-4 text-[14.5px] font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    See pricing
                  </Link>
                </div>

                <Stagger className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                  {trust.map(({ icon: Icon, t }) => (
                    <motion.span key={t} variants={staggerItem} className="flex items-center gap-2 text-[13px] text-white/65">
                      <Icon className="h-3.5 w-3.5" />
                      {t}
                    </motion.span>
                  ))}
                </Stagger>
              </div>

              <div className="relative flex h-[400px] justify-center [perspective:1400px] sm:h-[440px] lg:-my-20 lg:h-[560px]">
                <motion.div
                  style={{ rotate: reduce ? 0 : swing }}
                  className="relative flex origin-top flex-col items-center [transform-style:preserve-3d]"
                >
                  <span className="h-3 w-3 rounded-full border-2 border-white/70 bg-primary" />
                  <span className="h-[80px] w-[3px] rounded-full bg-gradient-to-b from-white/30 to-white/90 sm:h-[110px] lg:h-[180px]" />
                  <span className="-mt-0.5 h-4 w-9 rounded-[6px] border-2 border-white/85" />
                  <motion.button
                    type="button"
                    onClick={() => setFlipped((f) => !f)}
                    aria-label={flipped ? 'Show the redesign' : 'Show the original photo'}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 110, damping: 15 }}
                    className="relative -mt-1 h-[280px] w-[214px] [transform-style:preserve-3d] sm:h-[300px] sm:w-[236px]"
                  >
                    <PassFace />
                    <PassFace back />
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PassFace({ back = false }: { back?: boolean }) {
  return (
    <span
      className={cn(
        'absolute inset-0 flex flex-col rounded-[20px] bg-white p-2.5 text-left text-foreground shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)] [backface-visibility:hidden]',
        back && '[transform:rotateY(180deg)]',
      )}
    >
      <span className="flex items-center justify-between px-1 pb-2 pt-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-foreground/45">
        <span>Think Decor</span>
        <span className={back ? 'text-foreground/60' : 'text-primary'}>{back ? 'Before' : 'After'}</span>
      </span>
      <span className="relative block min-h-0 flex-1 overflow-hidden rounded-[14px]">
        <img src={back ? BEFORE : AFTER} alt={back ? 'Living room before its redesign' : 'Same living room after a Mantha AI redesign'} loading="lazy" className="h-full w-full object-cover" />
      </span>
      <span className="block px-1 pt-2.5">
        <span className="block text-[15px] font-bold">{back ? 'Your photo' : 'Your room · Modern'}</span>
        <span className="mt-1 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.16em] text-foreground/40">
          <span>Room 0418</span>
          <span className="flex items-center gap-1">
            <RotateCw className="h-3 w-3" /> Tap to flip
          </span>
        </span>
      </span>
      <span aria-hidden className="mt-2 flex h-5 items-end gap-[2px] px-1">
        {BARS.map((bw, i) => (
          <span key={i} className="h-full bg-foreground/80" style={{ width: bw }} />
        ))}
      </span>
    </span>
  );
}
