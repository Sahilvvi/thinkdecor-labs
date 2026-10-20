import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import {
  animate, motion, useInView, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Blueprint → 3D: a flat black-and-white floor plan whose walls extrude up
 * into an isometric clay model, then fill with furniture and warm light.
 * Scroll drives it by default; the slider takes over once touched. The
 * dimension lines laser-draw themselves and their figures count up, as if
 * the room were being measured live. Illustrative — measurement is still
 * in development, as the copy beside it says.
 */

const PW = 560;
const PH = 360;
const WALL_H = 74;

const ROOMS = [
  { id: 'living', label: 'Living', dims: [5.4, 4.2], x: 20, y: 20, w: 280, h: 180, floor: '#CFA67A' },
  { id: 'kitchen', label: 'Kitchen', dims: [3.1, 4.2], x: 300, y: 20, w: 240, h: 180, floor: '#E4DDD2' },
  { id: 'bed', label: 'Bedroom', dims: [4.0, 3.0], x: 20, y: 200, w: 220, h: 140, floor: '#C79A6C' },
  { id: 'bath', label: 'Bath', dims: [2.2, 3.0], x: 240, y: 200, w: 160, h: 140, floor: '#DCE5E3' },
  { id: 'study', label: 'Study', dims: [2.3, 3.0], x: 400, y: 200, w: 140, h: 140, floor: '#C9A074' },
];

/** wall segments: [x1, y1, x2, y2] — outer shell first */
const WALLS: [number, number, number, number][] = [
  [20, 20, 540, 20], [540, 20, 540, 340], [20, 340, 540, 340], [20, 20, 20, 340],
  [300, 20, 300, 200], [20, 200, 540, 200], [240, 200, 240, 340], [400, 200, 400, 340],
];

/** furniture blocks: plan rect + height */
const FURNITURE = [
  { x: 46, y: 118, w: 130, h: 44, z: 22, c: '#7A8F80' }, // sofa
  { x: 200, y: 60, w: 74, h: 74, z: 14, c: '#B88C5E' }, // coffee table / rug
  { x: 92, y: 58, w: 54, h: 34, z: 30, c: '#E9E2D6' }, // sideboard
  { x: 322, y: 40, w: 196, h: 26, z: 36, c: '#F1ECE3' }, // kitchen run
  { x: 386, y: 110, w: 78, h: 56, z: 28, c: '#B88C5E' }, // dining table
  { x: 46, y: 232, w: 96, h: 74, z: 18, c: '#EDE7DD' }, // bed
  { x: 162, y: 240, w: 44, h: 34, z: 20, c: '#B88C5E' }, // bedside
  { x: 262, y: 228, w: 44, h: 60, z: 20, c: '#F4F6F5' }, // bath
  { x: 330, y: 292, w: 48, h: 30, z: 30, c: '#F4F6F5' }, // basin
  { x: 420, y: 232, w: 96, h: 34, z: 28, c: '#B88C5E' }, // desk
  { x: 452, y: 288, w: 36, h: 36, z: 16, c: '#7A8F80' }, // chair
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function BlueprintExtruder() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(host, { once: true, margin: '0px 0px -10% 0px' });
  const scale = useMotionValue(1);
  const [manual, setManual] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => scale.set(el.clientWidth / 660));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale]);

  // scroll drives the build until the visitor grabs the slider
  const { scrollYProgress } = useScroll({ target: host, offset: ['start 85%', 'end 45%'] });
  const t = useMotionValue(0);
  useEffect(() => scrollYProgress.on('change', (v) => { if (manual === null) t.set(v); }), [scrollYProgress, manual, t]);
  useEffect(() => { if (manual !== null) t.set(manual); }, [manual, t]);
  const ts = useSpring(t, { stiffness: 90, damping: 22 });

  const iso = useTransform(ts, (v) => clamp01((v - 0.12) / 0.28));
  const rise = useTransform(ts, (v) => clamp01((v - 0.25) / 0.3));
  const furnish = useTransform(ts, (v) => clamp01((v - 0.55) / 0.22));
  const light = useTransform(ts, (v) => clamp01((v - 0.7) / 0.3));

  const planTransform = useMotionTemplate`translate(-50%, -50%) scale(${useTransform([iso, scale], ([a, k]: number[]) => k * (1 - a * 0.24))}) translateY(${useTransform(iso, (a) => a * 30)}px) rotateX(${useTransform(iso, (a) => a * 56)}deg) rotateZ(${useTransform(iso, (a) => a * -36)}deg)`;
  const inkOpacity = useTransform(rise, [0, 1], [1, 0.08]);
  const clayOpacity = useTransform(iso, [0, 1], [0, 1]);
  const labelOpacity = useTransform(furnish, [0, 1], [1, 0.75]);

  const [sliderValue, setSliderValue] = useState(0);
  useEffect(() => ts.on('change', (v) => setSliderValue(Math.round(v * 100))), [ts]);

  const stageName = sliderValue < 20 ? '2D plan' : sliderValue < 55 ? 'Extruding walls' : sliderValue < 75 ? 'Furnishing' : 'Lit & furnished';

  return (
    <div ref={host} className="relative w-full">
      <div className="absolute inset-x-[8%] -bottom-6 h-24 rounded-[100%] bg-primary/20 blur-[60px]" />
      <div className="relative overflow-hidden rounded-[26px] border border-foreground/[0.10] bg-white shadow-[0_30px_80px_-24px_hsl(168_30%_15%/0.20)]">
        {/* window chrome */}
        <div className="flex items-center gap-2.5 border-b border-foreground/[0.08] px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="ml-3 font-mono text-[11px] tracking-wide text-foreground/50">apartment-plan.dwg · thinkdecor</span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> {stageName}
          </span>
        </div>

        <div ref={stage} className="relative aspect-[16/10] overflow-hidden bg-[#FAFAF8] [perspective:1700px]">
          {/* drafting-paper grid */}
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:22px_22px]" />
          <motion.div aria-hidden style={{ opacity: light }} className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_55%,rgba(255,196,120,0.22),transparent_70%)]" />

          <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ width: PW, height: PH, transform: planTransform, transformStyle: 'preserve-3d' }}
          >
            {/* floors: clay, then finished materials */}
            {ROOMS.map((r) => (
              <div key={r.id} className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
                <motion.span className="absolute inset-0 bg-[#E6E1D8]" style={{ opacity: clayOpacity }} />
                <motion.span
                  className="absolute inset-0"
                  style={{
                    opacity: light,
                    background: `radial-gradient(60% 60% at 50% 45%, rgba(255,220,160,0.55), transparent 70%), repeating-linear-gradient(90deg, ${r.floor} 0 18px, color-mix(in srgb, ${r.floor} 88%, #000) 18px 19px)`,
                  }}
                />
              </div>
            ))}

            {/* the ink plan: walls, dimensions, labels (flat on the floor) */}
            <PlanInk inView={inView} inkOpacity={inkOpacity} labelOpacity={labelOpacity} />

            {/* extruded walls */}
            {WALLS.map(([x1, y1, x2, y2], i) => (
              <Wall key={i} x1={x1} y1={y1} x2={x2} y2={y2} rise={rise} light={light} outer={i < 4} />
            ))}

            {/* furniture */}
            {FURNITURE.map((f, i) => (
              <Box key={i} {...f} grow={furnish} delay={i * 0.035} />
            ))}
          </motion.div>
        </div>

        {/* the slider */}
        <div className="flex items-center gap-4 border-t border-foreground/[0.08] px-5 py-3.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50">2D</span>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            aria-label="Blueprint to 3D"
            onChange={(e) => setManual(Number(e.target.value) / 100)}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[linear-gradient(90deg,#00A08C_var(--v),#D3E6E2_var(--v))] accent-[#00A08C] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#00A08C] [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            style={{ ['--v' as string]: `${sliderValue}%` }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50">3D</span>
          {manual !== null && (
            <button type="button" onClick={() => setManual(null)} className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary hover:underline">
              Follow scroll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Flat ink drawing: walls, laser-drawn dimension lines with live counters, room labels. */
function PlanInk({ inView, inkOpacity, labelOpacity }: { inView: boolean; inkOpacity: MotionValue<number>; labelOpacity: MotionValue<number> }) {
  const measure = useMotionValue(0);
  const [m, setM] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(measure, 1, { duration: 1.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] });
    const off = measure.on('change', setM);
    return () => { c.stop(); off(); };
  }, [inView, measure]);
  const dash = useTransform(measure, (v) => 600 * (1 - v));

  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} width={PW} height={PH} className="absolute inset-0 overflow-visible">
      <motion.g style={{ opacity: inkOpacity }}>
        {WALLS.map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#1D2B29" strokeWidth={i < 4 ? 5 : 3} strokeLinecap="square"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        {/* door swings */}
        <path d="M120 200 A30 30 0 0 1 150 170" fill="none" stroke="#1D2B29" strokeWidth="1" strokeDasharray="3 3" />
        <path d="M300 120 A30 30 0 0 1 330 150" fill="none" stroke="#1D2B29" strokeWidth="1" strokeDasharray="3 3" />
      </motion.g>

      {/* laser-drawn dimension lines */}
      <g stroke="#00A08C" strokeWidth="1.2" fill="none">
        <motion.line x1="20" y1="356" x2="540" y2="356" strokeDasharray="600" style={{ strokeDashoffset: dash }} />
        <motion.line x1="556" y1="20" x2="556" y2="340" strokeDasharray="600" style={{ strokeDashoffset: dash }} />
        <motion.line x1="20" y1="8" x2="300" y2="8" strokeDasharray="600" style={{ strokeDashoffset: dash }} />
        {[20, 540].map((x) => <line key={x} x1={x} y1="350" x2={x} y2="362" />)}
        {[20, 340].map((y) => <line key={y} x1="550" y1={y} x2="562" y2={y} />)}
        {[20, 300].map((x) => <line key={x} x1={x} y1="2" x2={x} y2="14" />)}
      </g>
      {/* laser heads */}
      {m > 0 && m < 1 && (
        <>
          <circle cx={20 + 520 * m} cy="356" r="3" fill="#8FE3D4" style={{ filter: 'drop-shadow(0 0 4px #00A08C)' }} />
          <circle cx="556" cy={20 + 320 * m} r="3" fill="#8FE3D4" style={{ filter: 'drop-shadow(0 0 4px #00A08C)' }} />
        </>
      )}
      <g fontFamily="ui-monospace, monospace" fontSize="11" fill="#00796B" textAnchor="middle">
        <text x="280" y="372">{(8.5 * m).toFixed(2)} m</text>
        <text x="572" y="184" transform="rotate(90 572 184)">{(7.2 * m).toFixed(2)} m</text>
        <text x="160" y="-2">{(5.4 * m).toFixed(2)} m</text>
      </g>

      <motion.g style={{ opacity: labelOpacity }} textAnchor="middle">
        {ROOMS.map((r) => (
          <g key={r.id}>
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 3} fontSize="13" fontWeight="600" fill="#1D2B29">{r.label}</text>
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 13} fontSize="10" fontFamily="ui-monospace, monospace" fill="#00796B">
              {(r.dims[0] * m).toFixed(1)} × {(r.dims[1] * m).toFixed(1)} m
            </text>
          </g>
        ))}
      </motion.g>
    </svg>
  );
}

function Wall({
  x1, y1, x2, y2, rise, light, outer,
}: {
  x1: number; y1: number; x2: number; y2: number;
  rise: MotionValue<number>; light: MotionValue<number>; outer: boolean;
}) {
  const alongX = y1 === y2;
  const len = alongX ? x2 - x1 : y2 - y1;
  // the two walls nearest the camera are cut away low, so you can see in
  const near = (alongX && y1 === 340) || (!alongX && x1 === 20);
  const height = useTransform(rise, (r) => r * WALL_H * (near ? 0.28 : outer ? 1 : 0.92));
  const warm = useMotionTemplate`linear-gradient(180deg, rgba(255,214,150,${useTransform(light, (l) => l * 0.35)}), transparent 70%)`;
  return (
    <motion.div
      className={cn('absolute origin-top-left', alongX ? 'bg-[#F2EEE7]' : 'bg-[#D8D1C5]')}
      style={{
        left: x1,
        top: y1,
        width: len,
        height,
        transform: alongX ? 'rotateX(90deg)' : 'rotateZ(90deg) rotateX(90deg)',
        boxShadow: 'inset 0 -2px 0 rgba(255,255,255,0.9), inset 0 0 0 0.5px rgba(0,0,0,0.12)',
        backfaceVisibility: 'visible',
      }}
    >
      <motion.span className="absolute inset-0" style={{ background: warm }} />
    </motion.div>
  );
}

function Box({
  x, y, w, h, z, c, grow, delay,
}: {
  x: number; y: number; w: number; h: number; z: number; c: string; grow: MotionValue<number>; delay: number;
}) {
  // each piece arrives slightly after the last
  const g = useTransform(grow, (v) => clamp01((v - delay) / (1 - delay * 2)));
  const zh = useTransform(g, (v) => v * z);
  const top = useMotionTemplate`translateZ(${zh}px)`;
  const opacity = useTransform(g, [0, 0.15], [0, 1]);
  const side = (style: CSSProperties, shade: number) => (
    <motion.span
      className="absolute origin-top-left"
      style={{ ...style, height: zh, background: c, filter: `brightness(${shade})` }}
    />
  );
  return (
    <motion.div className="absolute" style={{ left: x, top: y, width: w, height: h, opacity, transformStyle: 'preserve-3d' }}>
      {/* soft contact shadow */}
      <span className="absolute -inset-1 rounded-[6px] bg-black/15 blur-[3px]" />
      {side({ left: 0, top: h, width: w, transform: 'rotateX(90deg)' }, 0.86)}
      {side({ left: 0, top: 0, width: w, transform: 'rotateX(90deg)' }, 0.8)}
      {side({ left: 0, top: 0, width: h, transform: 'rotateZ(90deg) rotateX(90deg)' }, 0.74)}
      {side({ left: w, top: 0, width: h, transform: 'rotateZ(90deg) rotateX(90deg)' }, 0.92)}
      <motion.span className="absolute inset-0 rounded-[3px]" style={{ background: c, transform: top, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)' }} />
    </motion.div>
  );
}
