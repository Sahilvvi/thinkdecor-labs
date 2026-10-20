import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Magnetic, Reveal, RevealWords, Stagger, staggerItem } from '@/components/premium/Motion';
import { SectionLabel } from './primitives';
import { type TrustItem, useFinePointer } from './hooks';
import { DEMO_ROOMS, type StyleKey } from '@/lib/heroRooms';
import { useVisitorRoom } from '@/lib/visitorRoom';

const STYLE_KEYS: StyleKey[] = ['Scandinavian', 'Japanese', 'Minimal', 'Maximalism'];
const BARS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1];

/* ------------------------------------------------------------------ *
 *  Closing call to action. A room card hangs on a cord, swings with
 *  the cursor and flips over to show the photo it started from.
 *  The finale is personal: pick a room and a style, and the hanging
 *  card becomes *your* pick — then the call to action asks you to do
 *  the same on your own room.
 *  If the visitor made a redesign in the free generator, the card is
 *  their actual room instead: their redesign on the front, their photo
 *  on the back.
 * ------------------------------------------------------------------ */
export function HangingCta({ trust, freeCredits }: { trust: TrustItem[]; freeCredits: number }) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const target = useMotionValue(0);
  // Low damping so the card keeps swinging like a pendulum after the cursor moves.
  const swing = useSpring(target, { stiffness: 40, damping: 4, mass: 1.2 });
  const [flipped, setFlipped] = useState(false);
  // the visitor's own pick: the card shows exactly this
  const [roomKey, setRoomKey] = useState(DEMO_ROOMS[0].key);
  const [styleKey, setStyleKey] = useState<StyleKey>('Scandinavian');
  const room = DEMO_ROOMS.find((r) => r.key === roomKey) ?? DEMO_ROOMS[0];
  const visitor = useVisitorRoom();
  const theirs = !!(visitor.before && visitor.after);
  const look: Look = theirs
    ? { before: visitor.before!, after: visitor.after!, room: 'Room', style: 'Mantha', title: 'Your room · by Mantha' }
    : { before: room.image, after: room.styles[styleKey].image, room: room.label, style: styleKey };
  const pick = (r: typeof roomKey, st: StyleKey) => {
    setFlipped(false);
    setRoomKey(r);
    setStyleKey(st);
    // a little nudge so the card visibly reacts
    target.set(target.get() > 0 ? -9 : 9);
    window.setTimeout(() => target.set(0), 180);
  };
  // the card tilts towards the cursor and a specular glare tracks it
  const tiltX = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });

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
            {/* glow that swells as the card scrolls into view (CSS scroll-driven
                where supported; a static glow elsewhere) */}
            <div aria-hidden className="cta-glow pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(143,227,212,0.32),rgba(0,160,140,0.12)_55%,transparent)] blur-2xl" />
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
                  {theirs
                    ? `That's your room on the card. Keep going: with an account, your first ${freeCredits} redesigns are free — no card needed.`
                    : `Your first ${freeCredits} redesigns are free — no card needed.`}
                </p>

                {/* make it yours: the hanging card becomes this pick */}
                {!theirs && (
                <div className="mt-8 rounded-[20px] bg-white/[0.06] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8FE3D4]">Make it yours</p>
                  <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Room">
                    {DEMO_ROOMS.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        role="radio"
                        aria-checked={r.key === roomKey}
                        onClick={() => pick(r.key, styleKey)}
                        className={cn(
                          'rounded-full px-3 py-1.5 font-label text-[12.5px] font-bold transition-colors',
                          r.key === roomKey ? 'bg-white text-[#00594E]' : 'bg-white/10 text-white/80 hover:bg-white/15',
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Style">
                    {STYLE_KEYS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        role="radio"
                        aria-checked={st === styleKey}
                        onClick={() => pick(roomKey, st)}
                        className={cn(
                          'rounded-full px-3 py-1.5 font-label text-[12.5px] font-bold transition-colors',
                          st === styleKey ? 'bg-[#8FE3D4] text-[#00332C]' : 'bg-white/10 text-white/80 hover:bg-white/15',
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[13.5px] text-white/70" aria-live="polite">
                    You picked a <b className="font-semibold text-white">{look.style.toLowerCase()} {look.room.toLowerCase()}</b>. Now picture it in yours.
                  </p>
                </div>
                )}

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Magnetic>
                    <Link
                      to="/signup"
                      className="group inline-flex items-center gap-2.5 rounded-full bg-white px-9 py-4 text-[15px] font-semibold text-primary shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98]"
                    >
                      Try it on my room
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
                    data-cursor="Flip"
                    onPointerMove={(e) => {
                      if (!fine) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      const px = (e.clientX - r.left) / r.width;
                      const py = (e.clientY - r.top) / r.height;
                      e.currentTarget.style.setProperty('--gx', `${px * 100}%`);
                      e.currentTarget.style.setProperty('--gy', `${py * 100}%`);
                      e.currentTarget.style.setProperty('--ga', '1');
                      tiltX.set((0.5 - py) * 16);
                      tiltY.set((px - 0.5) * (flipped ? -16 : 16));
                    }}
                    onPointerLeave={(e) => {
                      e.currentTarget.style.setProperty('--ga', '0');
                      tiltX.set(0);
                      tiltY.set(0);
                    }}
                    style={{ rotateX: tiltX, rotateZ: useTransform(tiltY, (v) => v * 0.15) }}
                    aria-label={flipped ? `Show the ${look.style} redesign` : 'Show the original photo'}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 110, damping: 15 }}
                    className="relative -mt-1 h-[280px] w-[214px] [transform-style:preserve-3d] sm:h-[300px] sm:w-[236px]"
                  >
                    <PassFace look={look} />
                    <PassFace look={look} back />
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

type Look = { before: string; after: string; room: string; style: string; title?: string };

function PassFace({ look, back = false }: { look: Look; back?: boolean }) {
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
        <AnimatePresence initial={false}>
          <motion.img
            key={back ? look.before : look.after}
            src={back ? look.before : look.after}
            alt={back ? `${look.room} before its redesign` : `${look.room} after a ${look.style} redesign by Mantha AI`}
            loading="lazy"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        {/* a scan line sweeps the photo each time the pick changes */}
        {!back && (
          <motion.span
            key={`scan-${look.after}`}
            aria-hidden
            initial={{ y: '-30%', opacity: 0 }}
            animate={{ y: '330%', opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-[linear-gradient(180deg,transparent,rgba(143,227,212,0.55),transparent)]"
          />
        )}
      </span>
      <span className="block px-1 pt-2.5">
        <span className="block text-[15px] font-bold">{back ? 'Your photo' : look.title ?? `Your ${look.room.toLowerCase()} · ${look.style}`}</span>
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
      {/* dynamic specular glare + a faint holographic sheen, following the cursor */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[20px] transition-opacity duration-300"
        style={{
          opacity: 'var(--ga, 0)',
          background: back
            ? 'radial-gradient(circle at calc(100% - var(--gx, 50%)) var(--gy, 30%), rgba(255,255,255,0.75), rgba(255,255,255,0) 38%)'
            : 'radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgba(255,255,255,0.75), rgba(255,255,255,0) 38%)',
          mixBlendMode: 'soft-light',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[20px] transition-opacity duration-300"
        style={{
          opacity: 'calc(var(--ga, 0) * 0.35)',
          background: 'linear-gradient(115deg, transparent 20%, rgba(143,227,212,0.7) 38%, rgba(255,180,220,0.6) 50%, rgba(160,200,255,0.7) 62%, transparent 80%)',
          backgroundSize: '220% 220%',
          backgroundPosition: back ? 'calc(100% - var(--gx, 50%)) var(--gy, 50%)' : 'var(--gx, 50%) var(--gy, 50%)',
          mixBlendMode: 'color-dodge',
        }}
      />
    </span>
  );
}
