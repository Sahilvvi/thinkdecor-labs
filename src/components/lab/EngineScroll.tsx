import { useEffect, useRef, useState } from 'react';
import {
  motion, useMotionTemplate, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';
import { FLOOR, H, SOFA, STORAGE, W, pathOf, pct } from './roomShapes';

/**
 * "What is Mantha?" as a pinned, scroll-scrubbed deconstruction of one room:
 *   0–30%   the photo dims and glowing vector lines trace walls, floor, furniture;
 *   30–60%  golden light rays fall from the window onto a shadow map on the floor;
 *   60–100% the sofa, floor and cabinets lift off as isolated layers in an
 *           exploded isometric view, swap materials in mid-air, then snap back
 *           down into one photoreal composite.
 * The material layers are the real pre-generated recolours of this room,
 * cut out with hand-traced shapes — illustrative, like the rest of the page.
 * Lives outside a StackPanel: panels are overflow-hidden, which breaks sticky.
 * Don't put mix-blend-mode on any layer, or opacity/filter on the stage itself:
 * Chrome then flattens the 3D context and the exploded view collapses.
 */

const BASE = '/assets/rooms/hero.webp';

type Layer = {
  key: string;
  tag: string;
  clip: string;
  lift: number;
  /** where the layer's label floats, in % of the photo */
  tagAt: [number, number];
  /** [original, first swap, final] material photos for this item */
  images: [string, string, string];
};

const LAYERS: Layer[] = [
  { key: 'floor', tag: 'Floor plane', clip: pct(FLOOR), lift: 1, tagAt: [3, 90], images: [BASE, '/assets/rooms/colours/living-floor-walnut.webp', '/assets/rooms/colours/living-floor-whitewash.webp'] },
  { key: 'storage', tag: 'Cabinets · mask', clip: pct(STORAGE), lift: 2, tagAt: [3, 6], images: [BASE, '/assets/rooms/colours/living-storage-green.webp', '/assets/rooms/colours/living-storage-white.webp'] },
  { key: 'sofa', tag: 'Sofa · mask', clip: pct(SOFA), lift: 3, tagAt: [52, 46], images: [BASE, '/assets/rooms/colours/living-sofa-sage.webp', '/assets/rooms/colours/living-sofa-cream.webp'] },
];

const STEPS = [
  {
    n: '01',
    title: 'It finds the structure.',
    body: 'Mantha looks at your photo the way a designer would: it traces the walls, the floor and the edges of everything standing on it.',
  },
  {
    n: '02',
    title: 'It reads the light.',
    body: 'It works out where the window light comes from and where the shadows fall, so anything new sits in the same light as the rest of the room.',
  },
  {
    n: '03',
    title: 'It changes only what you choose.',
    body: 'New paint, flooring or upholstery is drawn in the right perspective. The layout, the window light and the shadows stay exactly where they were.',
  },
];

export function EngineScroll() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  // --- phase 1: dim + trace
  const dim = useTransform(p, [0, 0.08, 0.6, 0.7, 0.88, 0.97], [1, 0.42, 0.5, 0.32, 0.32, 1]);
  const photoFilter = useMotionTemplate`brightness(${dim}) saturate(${useTransform(p, [0, 0.1, 0.9, 1], [1, 0.55, 0.55, 1])})`;
  const trace = useTransform(p, [0.03, 0.28], [0, 1]);
  const linesOpacity = useTransform(p, [0, 0.03, 0.62, 0.72, 0.88, 0.95], [0, 1, 1, 0.55, 0.55, 0]);

  // --- phase 2: light
  const light = useTransform(p, [0.3, 0.4, 0.58, 0.66], [0, 1, 1, 0]);
  const rays = useTransform(p, [0.3, 0.45], [0.2, 1]);

  // --- phase 3: explode, swap, snap back
  const explode = useTransform(p, [0.6, 0.7, 0.86, 0.95], [0, 1, 1, 0]);
  const rotX = useTransform(explode, (e) => e * 52);
  const rotZ = useTransform(explode, (e) => e * -30);
  const scale = useTransform(explode, (e) => 1 - e * 0.2);
  const swapA = useTransform(p, [0.7, 0.74], [0, 1]);
  const swapB = useTransform(p, [0.78, 0.82], [0, 1]);
  const tagOpacity = useTransform(explode, [0.6, 1], [0, 1]);

  const active = useTransform(p, (v) => (v < 0.31 ? 0 : v < 0.6 ? 1 : 2));

  return (
    <section ref={ref} id="engine" className="relative px-3 sm:px-4" style={{ height: '290vh' }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center pt-[76px] pb-3">
        <div className="relative flex h-full overflow-hidden rounded-[28px] bg-[linear-gradient(170deg,#F7FBFA,#EAF5F2)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,89,78,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,89,78,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_70%_50%,#000,transparent)]" />

          <div className="relative grid w-full content-center items-center gap-5 px-5 py-5 sm:px-10 md:grid-cols-[0.85fr_1.15fr] md:gap-8 lg:gap-12 lg:px-14">
            {/* ---------- copy ---------- */}
            <div className="order-2 md:order-1">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Solution · The engine inside
              </p>
              <ManthaWordmark p={p} />
              <p className="mt-3 hidden max-w-[30ch] font-display text-[clamp(1.1rem,1.7vw,1.4rem)] font-medium leading-[1.25] text-foreground sm:block">
                What is Mantha? The design intelligence that reads your room like a decorator.
              </p>
              <ol className="mt-4 grid gap-3 lg:mt-8 lg:gap-5">
                {STEPS.map((s, i) => (
                  <Step key={s.n} index={i} active={active} {...s} />
                ))}
              </ol>
            </div>

            {/* ---------- the room, deconstructed ---------- */}
            <div className="order-1 flex items-center justify-center [perspective:1800px] md:order-2">
              <motion.div
                data-courier="engine"
                style={{ rotateX: rotX, rotateZ: rotZ, scale, transformStyle: 'preserve-3d' }}
                className="relative aspect-[1024/765] w-full max-w-[min(680px,calc((100svh-420px)*1.34))] md:max-w-[min(680px,calc((100svh-200px)*1.34))]"
              >
                {/* base photo */}
                <motion.img
                  src={BASE}
                  alt="Living room photo, deconstructed by Mantha into structure, light and material layers"
                  style={{ filter: photoFilter }}
                  className="absolute inset-0 h-full w-full rounded-[18px] object-cover shadow-[0_40px_80px_-40px_rgba(0,52,45,0.6)]"
                />

                {/* material layers — lift off when exploded */}
                {LAYERS.map((l) => (
                  <MaterialLayer key={l.key} layer={l} explode={explode} swapA={swapA} swapB={swapB} tagOpacity={tagOpacity} />
                ))}

                {/* light: rays from the window and the shadow map on the floor */}
                <motion.svg viewBox={`0 0 ${W} ${H}`} style={{ opacity: light }} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible rounded-[18px]">
                  <defs>
                    <linearGradient id="eng-ray" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(255,226,160)" stopOpacity="0.75" />
                      <stop offset="100%" stopColor="rgb(255,190,110)" stopOpacity="0.15" />
                    </linearGradient>
                    <pattern id="eng-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                      <line x1="0" y1="0" x2="0" y2="10" stroke="rgb(143,227,212)" strokeWidth="2" strokeOpacity="0.8" />
                    </pattern>
                    <filter id="eng-blur"><feGaussianBlur stdDeviation="7" /></filter>
                  </defs>
                  <motion.g style={{ scaleY: rays, transformOrigin: '50% 0%' }} filter="url(#eng-blur)">
                    <polygon points="545,30 680,30 560,765 250,765" fill="url(#eng-ray)" />
                    <polygon points="860,40 1015,40 930,765 610,765" fill="url(#eng-ray)" />
                    <polygon points="700,60 760,60 700,765 560,765" fill="url(#eng-ray)" opacity="0.5" />
                  </motion.g>
                  <ellipse cx="575" cy="700" rx="330" ry="58" fill="url(#eng-hatch)" opacity="0.9" />
                  <ellipse cx="575" cy="700" rx="330" ry="58" fill="none" stroke="rgb(143,227,212)" strokeWidth="1.5" strokeDasharray="6 6" />
                  <Tag x={250} y={694} text="Shadow map" />
                  <Tag x={700} y={110} text="Light · 214° · warm" gold />
                </motion.svg>

                {/* structure: vector lines tracing the room */}
                <motion.svg
                  viewBox={`0 0 ${W} ${H}`}
                  style={{ opacity: linesOpacity, translateZ: useTransform(explode, (e) => e * 205) }}
                  className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                >
                  <defs>
                    <filter id="eng-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3.5" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <g filter="url(#eng-glow)" fill="none" stroke="rgb(143,227,212)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <Trace d="M0 552 L1024 598" p={trace} from={0} />
                    <Trace d="M398 0 L398 546" p={trace} from={0.05} />
                    <Trace d="M530 0 L530 330 L675 330 L675 0" p={trace} from={0.12} />
                    <Trace d="M850 0 L850 400 L1024 400" p={trace} from={0.16} />
                    <Trace d="M0 35 L376 35 L376 210 L0 210" p={trace} from={0.22} />
                    <Trace d="M0 352 L378 352 L378 552" p={trace} from={0.28} />
                    <Trace d={pathOf(SOFA)} p={trace} from={0.34} />
                    <Trace d="M270 520 A125 32 0 1 0 520 520 A125 32 0 1 0 270 520" p={trace} from={0.5} />
                  </g>
                  <motion.g style={{ opacity: useTransform(trace, [0.7, 1], [0, 1]) }}>
                    <Tag x={410} y={40} text="Wall corner" />
                    <Tag x={20} y={585} text="Floor plane" />
                    <Tag x={858} y={412} text="Window" />
                    <Tag x={610} y={282} text="Sofa" />
                  </motion.g>
                </motion.svg>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A giant outlined "Mantha" that fills with ink, left to right, as the section scrolls. */
function ManthaWordmark({ p }: { p: MotionValue<number> }) {
  const fill = useTransform(p, [0.02, 0.95], [100, 0]);
  const clip = useMotionTemplate`inset(-10% ${fill}% -10% 0)`;
  const glowX = useTransform(fill, (f) => `${100 - f}%`);
  return (
    <h2 className="relative mt-1 inline-block font-display text-[clamp(2.8rem,7.4vw,6.6rem)] font-normal italic leading-[0.95]">
      <span className="text-transparent [-webkit-text-stroke:1.5px_rgba(0,89,78,0.55)]">Mantha</span>
      <motion.span
        aria-hidden
        style={{ clipPath: clip }}
        className="absolute inset-0 bg-[linear-gradient(100deg,#00332C,#00594E_45%,#00A08C)] bg-clip-text text-transparent [-webkit-background-clip:text]"
      >
        Mantha
      </motion.span>
      {/* the leading edge of the fill */}
      <motion.span aria-hidden style={{ left: glowX }} className="pointer-events-none absolute -top-[5%] h-[110%] w-[2px] bg-[#00A08C] shadow-[0_0_14px_#00A08C]" />
    </h2>
  );
}

function Step({ index, active, n, title, body }: { index: number; active: MotionValue<number>; n: string; title: string; body: string }) {
  const on = useTransform(active, (a) => (a === index ? 1 : 0));
  const [isOn, setIsOn] = useState(index === 0);
  useEffect(() => on.on('change', (v) => setIsOn(v === 1)), [on]);
  const opacity = useSpring(useTransform(on, [0, 1], [0.32, 1]), { stiffness: 200, damping: 30 });
  const bar = useSpring(on, { stiffness: 200, damping: 30 });
  return (
    <motion.li style={{ opacity }} className={`relative list-none pl-5 ${isOn ? '' : 'hidden md:block'}`}>
      <span className="absolute left-0 top-1 h-[calc(100%-4px)] w-[2px] overflow-hidden rounded-full bg-foreground/10">
        <motion.span style={{ scaleY: bar }} className="block h-full w-full origin-top bg-[#00A08C]" />
      </span>
      <span className="font-mono text-[11px] tracking-[0.18em] text-[#00A08C]">{n}</span>
      <b className="ml-2 font-display text-[clamp(1.05rem,1.5vw,1.3rem)] font-medium text-foreground">{title}</b>
      <p className="mt-1 max-w-[44ch] text-[13.5px] leading-relaxed text-foreground/62 lg:text-[14.5px]">{body}</p>
    </motion.li>
  );
}

function Trace({ d, p, from }: { d: string; p: MotionValue<number>; from: number }) {
  // each line starts a little later than the last, so the room is "traced" in order
  const len = useTransform(p, [from, Math.min(1, from + 0.45)], [0, 1]);
  return <motion.path d={d} style={{ pathLength: len }} />;
}

function Tag({ x, y, text, gold }: { x: number; y: number; text: string; gold?: boolean }) {
  const w = text.length * 14.2 + 32;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height="38" rx="19" fill="rgba(0,35,29,0.82)" stroke={gold ? 'rgba(255,214,140,0.8)' : 'rgba(143,227,212,0.65)'} strokeWidth="1.5" />
      <text x="16" y="25" fill={gold ? 'rgb(255,222,160)' : 'rgb(143,227,212)'} fontSize="19" fontFamily="ui-monospace, monospace" letterSpacing="2">
        {text.toUpperCase()}
      </text>
    </g>
  );
}

function MaterialLayer({
  layer, explode, swapA, swapB, tagOpacity,
}: {
  layer: Layer;
  explode: MotionValue<number>;
  swapA: MotionValue<number>;
  swapB: MotionValue<number>;
  tagOpacity: MotionValue<number>;
}) {
  const z = useTransform(explode, (e) => e * layer.lift * 55);
  const glow = useMotionTemplate`drop-shadow(0 0 ${useTransform(explode, (e) => e * 10)}px rgba(143,227,212,${useTransform(explode, (e) => e * 0.9)}))`;
  // first swap fades in, then the final material fades in over it
  return (
    <motion.div style={{ translateZ: z, filter: glow }} className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 overflow-hidden rounded-[18px]" style={{ clipPath: layer.clip }}>
        <img src={layer.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <motion.img src={layer.images[1]} alt="" style={{ opacity: swapA }} className="absolute inset-0 h-full w-full object-cover" />
        <motion.img src={layer.images[2]} alt="" style={{ opacity: swapB }} className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <motion.span
        style={{ opacity: tagOpacity, left: `${layer.tagAt[0]}%`, top: `${layer.tagAt[1]}%` }}
        className="absolute whitespace-nowrap rounded-full bg-[#00231D]/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8FE3D4] shadow-[inset_0_0_0_1px_rgba(143,227,212,0.4)]"
      >
        {layer.tag}
      </motion.span>
    </motion.div>
  );
}
