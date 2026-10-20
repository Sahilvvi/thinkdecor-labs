import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { finishIntro } from '@/lib/introState';

/**
 * The opening frame, laid over the hero itself: "THINK IT FIRST." set
 * full-screen on a dark sheet, with a redesigned room showing through the
 * letters. Scrolling flies the camera into the closing "T" (of "FIRST."):
 * its stem grows past the edges of the screen, the room in the letters
 * gives way to the hero behind, and you come out of the "T" onto the hero.
 *
 * Mechanics: the hero is pinned (sticky) for the length of the dive, so it
 * holds still under the sheet; afterwards the page scrolls on normally.
 * The type is an SVG mask (letters are holes in the sheet); the zoom is one
 * transform on the mask's text, scaled exponentially so it feels like a
 * constant-speed dive, while the camera drifts to centre the "T".
 * It replaces the old cinematic cold open, so it also releases the hero's
 * headline reveal (finishIntro) — at the moment you come through the "T".
 */

const PHOTO = '/assets/rooms/room-living-maximalism.webp';
const INK = '#06130F';
const FONT = 'Urbanist, "Plus Jakarta Sans", system-ui, sans-serif';
/** scroll distance of the dive, in viewport heights */
const DIVE_VH = 1.4;

/** a clamped linear map from progress [a, b] to [from, to] */
const lin = (a: number, b: number, from: number, to: number) => (v: number) =>
  from + (to - from) * Math.min(1, Math.max(0, (v - a) / (b - a)));

type Layout = {
  w: number;
  h: number;
  size: number;
  lines: { text: string; y: number }[];
  /** which line and character holds the "T" we fly into */
  target: { line: number; index: number };
};

function computeLayout(svg: SVGSVGElement): Layout | null {
  const w = svg.clientWidth;
  const h = svg.clientHeight;
  if (!w || !h) return null;
  // one line on very wide screens, two on most, three on phones
  const ratio = w / h;
  const texts = ratio >= 2.2 ? ['THINK IT FIRST.'] : ratio >= 0.9 ? ['THINK IT', 'FIRST.'] : ['THINK', 'IT', 'FIRST.'];

  // measure at 100px, then scale to fit the screen
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  probe.setAttribute('font-family', FONT);
  probe.setAttribute('font-weight', '900');
  probe.setAttribute('font-size', '100');
  probe.setAttribute('letter-spacing', '-2');
  svg.appendChild(probe);
  const longest = Math.max(...texts.map((t) => { probe.textContent = t; return probe.getComputedTextLength(); }));
  probe.remove();

  const lineH = 0.86;
  const byWidth = ((texts.length < 3 ? 0.92 : 0.84) * w * 100) / longest;
  const byHeight = ((texts.length === 1 ? 0.42 : 0.62) * h) / (texts.length * lineH);
  const size = Math.min(byWidth, byHeight);
  const block = texts.length * size * lineH;
  const top = (h - block) / 2 + size * 0.04;
  const last = texts.length - 1;
  return {
    w,
    h,
    size,
    lines: texts.map((text, i) => ({ text, y: top + (i + 0.82) * size * lineH })),
    // the closing "T": the last T of "FIRST."
    target: { line: last, index: texts[last].lastIndexOf('T') },
  };
}

export function TypePortal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const maskId = `portal-${useId().replace(/:/g, '')}`;
  const svg = useRef<SVGSVGElement>(null);
  const zoomA = useRef<SVGGElement>(null);
  const zoomB = useRef<SVGGElement>(null);
  const lineEls = useRef<(SVGTextElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [dive, setDive] = useState(() => (typeof window === 'undefined' ? 1000 : window.innerHeight * DIVE_VH));
  const zoomFrom = useRef({ x: 0, y: 0, cx: 0, cy: 0, max: 1 });

  // progress through the dive: the wrapper starts at the top of the page,
  // so it's simply how far you've scrolled over the dive distance
  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, (y) => (reduce ? 1 : Math.min(1, Math.max(0, y / dive))));

  const apply = (v: number) => {
    const { x, y, cx, cy, max } = zoomFrom.current;
    const k = Math.min(1, Math.max(0, (v - 0.04) / 0.82));
    // ease in, then exponential: a slow lean in that turns into a dive
    const s = Math.exp(Math.log(max) * k * k * (3 - 2 * k));
    // the camera drifts so the "T" ends dead centre: its stem opens like a door
    const pan = Math.min(1, k * 1.8);
    const e = pan * pan * (3 - 2 * pan);
    const tf = `translate(${x + (cx - x) * e} ${y + (cy - y) * e}) scale(${s}) translate(${-x} ${-y})`;
    zoomA.current?.setAttribute('transform', tf);
    zoomB.current?.setAttribute('transform', tf);
    // coming out of the "T" is the hero's cue to play its headline
    if (v >= 0.85) finishIntro();
  };
  useEffect(() => progress.on('change', apply));
  useEffect(() => { if (reduce) finishIntro(); }, [reduce]);

  // lay the type out once the brand font is in, and again on resize
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    let alive = true;
    const run = () => {
      if (!alive) return;
      setLayout(computeLayout(el));
      setDive(window.innerHeight * DIVE_VH);
    };
    document.fonts?.ready.then(run);
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    return () => { alive = false; ro.disconnect(); };
  }, []);

  // find the "T" on screen and how far we must zoom for its stem to swallow the view
  useLayoutEffect(() => {
    if (!layout) return;
    const el = lineEls.current[layout.target.line];
    if (!el) return;
    let box: DOMRect;
    try {
      box = el.getExtentOfChar(layout.target.index);
    } catch {
      return;
    }
    // the glyph's ink, not its advance box: the T is symmetric, so its stem
    // sits at the ink centre; the stem is as thick as an I's
    let tL = layout.size * 0.02;
    let tR = layout.size * 0.58;
    let stem = layout.size * 0.15;
    let cap = layout.size * 0.7;
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `900 ${layout.size}px ${FONT}`;
      const t = ctx.measureText('T');
      const i = ctx.measureText('I');
      if (t.actualBoundingBoxRight > 0 && i.actualBoundingBoxRight > 0) {
        tL = -t.actualBoundingBoxLeft;
        tR = t.actualBoundingBoxRight;
        stem = i.actualBoundingBoxRight + i.actualBoundingBoxLeft;
        cap = t.actualBoundingBoxAscent;
      }
    }
    const x = box.x + (tL + tR) / 2;
    // aim below the crossbar, in the middle of the stem
    const y = layout.lines[layout.target.line].y - cap * 0.38;
    zoomFrom.current = { x, y, cx: layout.w / 2, cy: layout.h / 2, max: Math.max(2, (layout.w * 1.3) / Math.max(4, stem)) };
    apply(progress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // function transforms on purpose: framer hands plain range-mapped opacity to
  // a browser scroll timeline, which measures the whole page, not the dive
  const photo = useTransform(progress, lin(0.12, 0.5, 1, 0));
  const photoScale = useTransform(progress, lin(0, 0.5, 1.15, 1));
  const sheet = useTransform(progress, lin(0.8, 0.9, 1, 0));
  const outline = useTransform(progress, lin(0, 0.22, 1, 0));
  const chrome = useTransform(progress, lin(0, 0.07, 1, 0));
  const gone = useTransform(progress, (v) => (v >= 0.9 ? 'hidden' : 'visible'));

  return (
    <div data-pin-until={reduce ? 0 : Math.round(dive)} className="relative">
      {/* the hero holds still under the sheet for the length of the dive */}
      <div className="sticky top-0">
        {children}

        <motion.div
          aria-hidden
          style={{ visibility: gone }}
          className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[100svh] overflow-hidden"
        >
          {/* the room shown in the letters, giving way to the hero as you dive */}
          <motion.img
            src={PHOTO}
            alt=""
            fetchPriority="high"
            style={{ opacity: reduce ? 1 : photo, scale: reduce ? 1 : photoScale }}
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* the dark sheet with the letters cut out of it */}
          <motion.svg
            ref={svg}
            style={{ opacity: reduce ? 1 : sheet }}
            className="absolute inset-0 h-full w-full"
            viewBox={layout ? `0 0 ${layout.w} ${layout.h}` : undefined}
            preserveAspectRatio="none"
          >
            <defs>
              <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={layout?.w ?? 0} height={layout?.h ?? 0}>
                <rect width={layout?.w ?? 0} height={layout?.h ?? 0} fill="white" />
                <g ref={zoomA}>
                  {layout?.lines.map((l, i) => (
                    <text
                      key={l.text}
                      ref={(el) => { lineEls.current[i] = el; }}
                      x={layout.w / 2}
                      y={l.y}
                      textAnchor="middle"
                      fontFamily={FONT}
                      fontWeight={900}
                      fontSize={layout.size}
                      letterSpacing={-layout.size * 0.02}
                      fill="black"
                    >
                      {l.text}
                    </text>
                  ))}
                </g>
              </mask>
            </defs>
            <rect width={layout?.w ?? 0} height={layout?.h ?? 0} fill={INK} mask={`url(#${maskId})`} />
            {/* a hairline around each letter, so the type reads as cut glass */}
            <motion.g ref={zoomB} style={{ opacity: reduce ? 1 : outline }}>
              {layout?.lines.map((l) => (
                <text
                  key={l.text}
                  x={layout.w / 2}
                  y={l.y}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontWeight={900}
                  fontSize={layout.size}
                  letterSpacing={-layout.size * 0.02}
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                >
                  {l.text}
                </text>
              ))}
            </motion.g>
          </motion.svg>

          {/* the frame around the type: who we are, and a nudge to scroll */}
          {!reduce && (
            <>
              <motion.div style={{ opacity: chrome }} className="absolute inset-x-0 top-[96px] flex justify-center px-6 text-center">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">Think Decor · interior design from one photo</p>
              </motion.div>
              <motion.div style={{ opacity: chrome }} className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 px-6 text-center">
                <p className="max-w-[36ch] font-display text-[clamp(1.05rem,1.6vw,1.35rem)] italic text-white/80">
                  See your room redesigned before you spend a penny.
                </p>
                <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                  Scroll to step inside
                  <span className="relative h-8 w-px overflow-hidden bg-white/15">
                    <motion.span
                      className="absolute inset-x-0 top-0 h-1/2 bg-[#8FE3D4]"
                      animate={{ y: ['-100%', '200%'] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </span>
                </span>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
      {/* the room the pinned hero travels through during the dive (a sticky
          element only moves inside its parent's content box, not its padding) */}
      {!reduce && <div aria-hidden style={{ height: dive }} />}
    </div>
  );
}
