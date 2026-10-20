import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform, useVelocity, type MotionValue,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Focus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_ROOMS } from '@/lib/heroRooms';
import { ScrollWords } from '@/components/lab/KineticType';

/**
 * Pinned horizontal gallery: the section is as tall as its track is wide,
 * the inner frame sticks to the viewport, and vertical scroll slides the
 * track sideways through the style templates applied to the example rooms.
 *
 * The faster you scroll, the more the cards shear (skewX from scroll
 * velocity), and each photo pans inside its frame as it crosses the screen.
 * "Lock camera angle" swaps the strip for one fixed view of a single room
 * that you scrub through every style with a dial (or by holding Space).
 *
 * Lives OUTSIDE a StackPanel: panels are overflow-hidden, which stops
 * position:sticky from pinning anything inside them.
 */

const CARDS = [
  { style: 'Scandinavian', room: 'Living room', image: '/assets/rooms/room-living-scandinavian.webp' },
  { style: 'Japanese', room: 'Bedroom', image: '/assets/rooms/room-bedroom-japanese.webp' },
  { style: 'Maximalism', room: 'Living room', image: '/assets/rooms/room-living-maximalism.webp' },
  { style: 'Minimal', room: 'Kitchen', image: '/assets/rooms/room-kitchen-minimal.webp' },
  { style: 'Scandinavian', room: 'Hall', image: '/assets/rooms/room-hall-scandinavian.webp' },
  { style: 'Maximalism', room: 'Bedroom', image: '/assets/rooms/room-bedroom-maximalism.webp' },
  { style: 'Japanese', room: 'Kitchen', image: '/assets/rooms/room-kitchen-japanese.webp' },
  { style: 'Minimal', room: 'Living room', image: '/assets/rooms/room-living-minimal.webp' },
];

const PAD = 24;

export function StyleGallery() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [cardStep, setCardStep] = useState(380);
  const [vw, setVw] = useState(1200);
  const [locked, setLocked] = useState(false);

  // How far the track has to travel = its overflow past the viewport.
  useLayoutEffect(() => {
    const measure = () => {
      const t = trackRef.current;
      if (!t) return;
      setDistance(Math.max(0, t.scrollWidth - window.innerWidth + 32));
      setVw(window.innerWidth);
      const first = t.children[0] as HTMLElement | undefined;
      const second = t.children[1] as HTMLElement | undefined;
      if (first && second) setCardStep(second.offsetLeft - first.offsetLeft);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0.05, 0.95], ['0%', '100%']);

  // scroll velocity → shear: fast flicks tilt the cards, rest straightens them
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const skew = useSpring(useTransform(velocity, [-2600, 0, 2600], [8, 0, -8], { clamp: true }), { stiffness: 260, damping: 32 });

  return (
    <section
      ref={ref}
      id="styles"
      className="relative px-3 sm:px-4"
      // One screen of pinned time per screen of horizontal travel, plus the frame itself.
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-[84px] pb-4">
        <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[28px] bg-[linear-gradient(170deg,#003B33,#00332C_60%,#002923)] py-8 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(55% 60% at 90% 10%, rgba(0,160,140,.28), transparent 62%)' }}
          />
          <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4 px-6 sm:px-10">
            <div>
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">Style templates</span>
              <ScrollWords
                className="mt-2 font-display text-[clamp(1.9rem,3.8vw,3.4rem)] font-medium leading-[1]"
                segments={[{ text: 'Same rooms. ' }, { text: 'Every personality.', className: 'italic font-normal text-[#8FE3D4]' }]}
              />
            </div>
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-[#00594E] transition-transform hover:scale-[1.04]"
            >
              Try it on your room <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <motion.div ref={trackRef} style={{ x }} data-cursor="Scroll" className="relative flex min-h-0 flex-1 gap-4 px-6 sm:gap-5 sm:px-10">
            {CARDS.map((c, i) => (
              <GalleryCard key={c.image} card={c} index={i} x={x} skew={skew} cardStep={cardStep} vw={vw} />
            ))}
          </motion.div>

          <div className="relative mx-6 mt-6 flex items-center gap-4 sm:mx-10">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.i className="block h-full rounded-full bg-[linear-gradient(90deg,#00A08C,#8FE3D4)]" style={{ width: bar }} />
            </div>
            <button
              type="button"
              onClick={() => setLocked(true)}
              className="inline-flex flex-none items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8FE3D4] shadow-[inset_0_0_0_1px_rgba(143,227,212,0.35)] backdrop-blur-md transition-colors hover:bg-white/15"
            >
              <Focus className="h-3.5 w-3.5" /> Lock camera angle
            </button>
          </div>

          <AnimatePresence>
            {locked && <CameraLock onClose={() => setLocked(false)} />}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function GalleryCard({
  card, index, x, skew, cardStep, vw,
}: {
  card: (typeof CARDS)[number];
  index: number;
  x: MotionValue<number>;
  skew: MotionValue<number>;
  cardStep: number;
  vw: number;
}) {
  // the photo pans inside its frame as the card travels across the screen
  const imgX = useTransform(x, (xv) => {
    const center = PAD + index * cardStep + cardStep / 2 + xv;
    return `${Math.max(-1, Math.min(1, (center - vw / 2) / vw)) * -9}%`;
  });
  return (
    <motion.article
      style={{ skewX: skew, aspectRatio: '4 / 5' }}
      className="group relative h-full max-h-[460px] flex-none overflow-hidden rounded-[22px] bg-[#08463E] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)]"
    >
      <motion.img
        src={card.image}
        alt={`${card.room} in the ${card.style} style template`}
        loading="lazy"
        style={{ x: imgX }}
        className="absolute inset-y-0 -left-[12%] h-full w-[124%] max-w-none object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
      />
      <span className="absolute left-4 top-3.5 font-label text-[12px] font-bold text-white/80">{String(index + 1).padStart(2, '0')}</span>
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(0,35,29,0.88))] px-5 pb-4 pt-14">
        <h3 className="font-display text-[28px] italic leading-none">{card.style}</h3>
        <p className="mt-1 font-label text-[12px] text-white/65">{card.room}</p>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ *
 *  Lock camera angle: one fixed view of one room, scrubbed through
 *  every style like a time-lapse wheel. Drag the dial, or hold Space.
 * ------------------------------------------------------------------ */

const SWEEP = 270; // degrees of dial travel, -135° … +135°

function CameraLock({ onClose }: { onClose: () => void }) {
  const [roomKey, setRoomKey] = useState(DEMO_ROOMS[0].key);
  const room = DEMO_ROOMS.find((r) => r.key === roomKey) ?? DEMO_ROOMS[0];
  const looks = [
    { label: 'Original', image: room.image },
    ...(['Minimal', 'Scandinavian', 'Japanese', 'Maximalism'] as const).map((k) => ({ label: k, image: room.styles[k].image })),
  ];
  const last = looks.length - 1;

  const t = useMotionValue(0);
  const ts = useSpring(t, { stiffness: 140, damping: 22 });
  const angle = useTransform(ts, (v) => -SWEEP / 2 + (v / last) * SWEEP);
  const [current, setCurrent] = useState(0);
  const dial = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const currentRef = useRef(0);
  useEffect(() => ts.on('change', (v) => {
    const n = Math.round(v);
    if (n === currentRef.current) return;
    currentRef.current = n;
    setCurrent(n);
  }), [ts]);

  // hold Space to let the wheel turn on its own (ping-pong through the looks)
  useEffect(() => {
    let raf = 0;
    let dir = 1;
    let prev = 0;
    const step = (now: number) => {
      const dt = prev ? (now - prev) / 1000 : 0;
      prev = now;
      let v = t.get() + dir * dt * 1.6;
      if (v >= last) { v = last; dir = -1; }
      if (v <= 0) { v = 0; dir = 1; }
      t.set(v);
      raf = requestAnimationFrame(step);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (!raf) { prev = 0; raf = requestAnimationFrame(step); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      cancelAnimationFrame(raf);
      raf = 0;
      t.set(Math.round(t.get()));
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [t, last, onClose]);

  const fromPointer = (e: ReactPointerEvent) => {
    const r = dial.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    // 0° at the top, clockwise positive
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const clamped = Math.max(-SWEEP / 2, Math.min(SWEEP / 2, deg));
    t.set(((clamped + SWEEP / 2) / SWEEP) * last);
  };

  const R = 74;
  const knobX = useTransform(angle, (a) => 100 + R * Math.sin((a * Math.PI) / 180));
  const knobY = useTransform(angle, (a) => 100 - R * Math.cos((a * Math.PI) / 180));
  const arc = useTransform(ts, (v) => v / last);

  return (
    <motion.div
      initial={{ opacity: 0, clipPath: 'circle(0% at 92% 92%)' }}
      animate={{ opacity: 1, clipPath: 'circle(150% at 92% 92%)' }}
      exit={{ opacity: 0, clipPath: 'circle(0% at 92% 92%)' }}
      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
      className="absolute inset-0 z-20 grid bg-[#00231D] md:grid-cols-[1.5fr_1fr]"
    >
      {/* the locked view */}
      <div className="relative min-h-0 overflow-hidden">
        {looks.map((l, i) => (
          <LookLayer key={l.image} image={l.image} index={i} t={ts} alt={`${room.label} — ${l.label}`} />
        ))}
        <span className="absolute left-5 top-5 rounded-full bg-black/45 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#8FE3D4] backdrop-blur-md">
          ◎ Camera locked · {room.label}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(0,35,29,0.85))] px-6 pb-5 pt-16">
          <AnimatePresence mode="wait">
            <motion.h3
              key={looks[current].label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="font-display text-[clamp(28px,4vw,48px)] italic leading-none"
            >
              {looks[current].label}
            </motion.h3>
          </AnimatePresence>
        </div>
      </div>

      {/* the dial */}
      <div className="relative flex flex-col items-center justify-center gap-5 px-6 py-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/80 hover:bg-white/15"
        >
          <X className="h-3.5 w-3.5" /> Unlock
        </button>

        <div className="flex flex-wrap justify-center gap-1.5">
          {DEMO_ROOMS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRoomKey(r.key)}
              className={cn(
                'rounded-full px-3 py-1.5 font-label text-[12px] font-bold transition-colors',
                r.key === roomKey ? 'bg-[#00A08C] text-white' : 'bg-white/10 text-white/75 hover:bg-white/15',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <svg
          ref={dial}
          viewBox="0 0 200 200"
          data-cursor="Turn"
          role="slider"
          tabIndex={0}
          aria-label="Style dial"
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={current}
          aria-valuetext={looks[current].label}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { t.set(Math.min(last, Math.round(t.get()) + 1)); e.preventDefault(); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { t.set(Math.max(0, Math.round(t.get()) - 1)); e.preventDefault(); }
          }}
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
          onPointerMove={(e) => { if (dragging.current) fromPointer(e); }}
          onPointerUp={() => { dragging.current = false; t.set(Math.round(t.get())); }}
          className="h-[min(240px,32svh)] w-[min(240px,32svh)] touch-none select-none outline-none"
        >
          <circle cx="100" cy="100" r="92" fill="rgba(255,255,255,0.04)" stroke="rgba(143,227,212,0.18)" />
          {/* travel arc */}
          <path d={arcPath(R, -SWEEP / 2, SWEEP / 2)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" strokeLinecap="round" />
          <motion.path d={arcPath(R, -SWEEP / 2, SWEEP / 2)} fill="none" stroke="#00A08C" strokeWidth="6" strokeLinecap="round" style={{ pathLength: arc }} />
          {/* detents, one per look */}
          {looks.map((l, i) => {
            const a = ((-SWEEP / 2 + (i / last) * SWEEP) * Math.PI) / 180;
            return (
              <g key={l.label}>
                <line
                  x1={100 + 86 * Math.sin(a)} y1={100 - 86 * Math.cos(a)}
                  x2={100 + 94 * Math.sin(a)} y2={100 - 94 * Math.cos(a)}
                  stroke={i === current ? '#8FE3D4' : 'rgba(255,255,255,0.35)'} strokeWidth="2" strokeLinecap="round"
                />
              </g>
            );
          })}
          <motion.circle cx={knobX} cy={knobY} r="11" fill="#fff" stroke="#00A08C" strokeWidth="3" />
          <text x="100" y="98" textAnchor="middle" fill="#8FE3D4" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">
            {String(current + 1).padStart(2, '0')} / {String(looks.length).padStart(2, '0')}
          </text>
          <text x="100" y="116" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="8.5" fontFamily="ui-monospace, monospace" letterSpacing="1.5">
            DRAG · OR HOLD SPACE
          </text>
        </svg>
        <p className="max-w-[30ch] text-center text-[13px] text-white/60">
          Same camera, same light, same room. Only the style changes.
        </p>
      </div>
    </motion.div>
  );
}

function LookLayer({ image, index, t, alt }: { image: string; index: number; t: MotionValue<number>; alt: string }) {
  // cross-fade: fully visible on its own detent, blending into its neighbours between them
  const opacity = useTransform(t, (v) => Math.max(0, 1 - Math.abs(v - index)));
  const scale = useTransform(t, (v) => 1.04 - Math.max(0, 1 - Math.abs(v - index)) * 0.04);
  return (
    <motion.img
      src={image}
      alt={alt}
      style={{ opacity, scale }}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function arcPath(r: number, fromDeg: number, toDeg: number) {
  const p = (d: number) => {
    const a = (d * Math.PI) / 180;
    return `${100 + r * Math.sin(a)} ${100 - r * Math.cos(a)}`;
  };
  return `M ${p(fromDeg)} A ${r} ${r} 0 1 1 ${p(toDeg)}`;
}
