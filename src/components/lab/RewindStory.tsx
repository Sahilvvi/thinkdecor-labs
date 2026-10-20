import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence, motion, useMotionTemplate, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';
import { Check, X } from 'lucide-react';
import { SOFA, pct } from './roomShapes';

/**
 * The "rewind" beat — why thinking first matters, told in one scroll:
 *   Day 14  the new sofa has arrived… in the wrong green. A price tag drops
 *           in on its string and a stamp slams down.
 *   ◀◀      the scene rewinds like a tape: scanlines, colour fringing, the
 *           tag flying back up, the day counter and the timeline running down.
 *   Day 0   before buying: Mantha previews the right green on the same
 *           photo. The new tag reads £0.
 * An illustrative story, labelled as one. The sofa recolours are cut from
 * the real pre-generated Mantha edits of the example room.
 */

const BASE = '/assets/rooms/hero.webp';
const SAGE = '/assets/rooms/colours/living-sofa-sage.webp';
const CLIP = pct(SOFA);

const CORAL = '#FF8A7A';
const MINT = '#8FE3D4';

const COPY = [
  { k: 'day14', step: 'The mistake', title: 'The sofa arrived.', sub: 'It’s the wrong green. £1,840, and it’s non-refundable.' },
  { k: 'rewind', step: 'Rewind', title: 'Let’s go back.', sub: 'Two weeks. To the moment before you clicked “buy”.' },
  { k: 'day0', step: 'Think first', title: 'Think it first.', sub: 'Try the greens on your own sofa, in your own light — then buy the right one.' },
];

const SWATCHES = [
  { name: 'Acid', color: '#9BC53D', ok: false },
  { name: 'Olive', color: '#7C7F3A', ok: false },
  { name: 'Sage velvet', color: '#93AA8E', ok: true },
];

export function RewindStory() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  const [beat, setBeat] = useState(0);
  const [day, setDay] = useState(14);
  useEffect(() => p.on('change', (v) => {
    setBeat(v < 0.32 ? 0 : v < 0.62 ? 1 : 2);
    setDay(v < 0.34 ? 14 : v > 0.6 ? 0 : Math.round(14 * (1 - (v - 0.34) / 0.26)));
  }), [p]);

  // the wrong green: there until the rewind takes it away
  const wrong = useTransform(p, [0.34, 0.56], [1, 0]);
  // the right green: Mantha's preview on Day 0
  const right = useTransform(p, [0.66, 0.78], [0, 1]);
  const scan = useTransform(p, [0.64, 0.8], ['-20%', '120%']);
  const scanOpacity = useTransform(p, [0.63, 0.66, 0.78, 0.81], [0, 1, 1, 0]);

  // price tag: drops and swings in, flies back up during the rewind
  const tagY = useTransform(p, [0.04, 0.14, 0.36, 0.48], ['-150%', '0%', '0%', '-160%']);
  const tagRot = useTransform(p, [0.04, 0.1, 0.14, 0.18, 0.22, 0.36, 0.48], [-14, 9, -5, 3, 0, 0, 12]);
  const stampScale = useTransform(p, [0.2, 0.25], [2.4, 1]);
  const stampOpacity = useTransform(p, [0.2, 0.23, 0.36, 0.42], [0, 1, 1, 0]);
  const tag2Y = useTransform(p, [0.8, 0.9], ['-150%', '0%']);
  const tag2Rot = useTransform(p, [0.8, 0.86, 0.9, 0.94], [-10, 6, -2, 0]);
  const tagOpacity = useTransform(p, [0.03, 0.06, 0.44, 0.48], [0, 1, 1, 0]);
  const tag2Opacity = useTransform(p, [0.79, 0.82], [0, 1]);

  // tape rewind: jitter, colour fringing, scanlines
  const tape = useTransform(p, [0.32, 0.36, 0.58, 0.62], [0, 1, 1, 0]);
  const jitter = useTransform(p, (v) => (v > 0.33 && v < 0.61 ? Math.sin(v * 900) * 7 : 0));
  const fringe = useTransform(tape, (t) => t * 6);
  const fringeBack = useTransform(fringe, (f) => -f);
  const photoFilter = useMotionTemplate`saturate(${useTransform(tape, [0, 1], [1, 0.55])}) contrast(${useTransform(tape, [0, 1], [1, 1.15])})`;

  // the mood of the room around the photo: regret → static → relief
  const warmGlow = useTransform(p, [0, 0.58, 0.68], [1, 1, 0]);
  const coolGlow = useTransform(p, [0.6, 0.74], [0, 1]);
  const photoScale = useTransform(p, [0, 0.3, 0.62, 1], [1.04, 1, 1, 1.03]);

  // the timeline: the playhead sits on Day 14, then rewinds to Day 0
  const head = useTransform(p, [0.34, 0.6], ['100%', '0%']);
  const fill = useTransform(p, [0.34, 0.6], [1, 0]);

  // step progress, one bar per beat
  const seg = [
    useTransform(p, [0, 0.3], [0, 1]),
    useTransform(p, [0.32, 0.6], [0, 1]),
    useTransform(p, [0.62, 0.92], [0, 1]),
  ];

  const tone = beat === 2 ? MINT : beat === 1 ? '#FFFFFF' : CORAL;

  return (
    <section ref={ref} id="rewind" className="relative px-3 sm:px-4" style={{ height: '250vh' }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center pt-[76px] pb-3">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-[#081814] text-white">
          {/* mood light: warm regret, then cool relief */}
          <motion.div aria-hidden style={{ opacity: warmGlow }} className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_72%_45%,rgba(255,120,95,0.20),transparent_70%),radial-gradient(40%_50%_at_10%_90%,rgba(255,170,120,0.08),transparent_70%)]" />
          <motion.div aria-hidden style={{ opacity: coolGlow }} className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_72%_45%,rgba(0,190,160,0.26),transparent_70%),radial-gradient(40%_50%_at_10%_90%,rgba(143,227,212,0.10),transparent_70%)]" />
          {/* film grain + a vignette so the card reads as a stage, not a box */}
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_40px_rgba(0,0,0,0.55)]" />

          {/* ---------- the three beats ---------- */}
          <div className="relative flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 sm:pt-7 lg:px-14">
            <p className="hidden font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/40 sm:block">Why think first · an illustrative story</p>
            <ol className="flex w-full gap-2 sm:w-auto sm:gap-3">
              {COPY.map((c, i) => (
                <li key={c.k} className="flex-1 sm:w-[118px] sm:flex-none">
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/12">
                    <motion.div
                      style={{ scaleX: seg[i], backgroundColor: i === 0 ? CORAL : i === 1 ? '#FFFFFF' : MINT }}
                      className="h-full origin-left rounded-full"
                    />
                  </div>
                  <p className={`mt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] transition-colors duration-300 ${beat === i ? 'text-white' : 'text-white/35'}`}>
                    <span className="opacity-60">0{i + 1}</span> {c.step}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative grid min-h-0 w-full flex-1 content-center items-center gap-5 px-5 py-4 sm:px-10 md:grid-cols-[0.78fr_1.22fr] md:gap-12 lg:px-14">
            {/* ---------- the words ---------- */}
            <div className="order-2 md:order-1">
              {/* the day counter, big */}
              <div className="flex items-end gap-3">
                <span className="mb-[0.55em] font-mono text-[11px] uppercase tracking-[0.24em] text-white/45 md:text-[12px]">Day</span>
                <span
                  className="relative inline-flex font-display text-[clamp(3.6rem,9vw,8.5rem)] font-medium leading-[0.82] tabular-nums transition-colors duration-500"
                  style={{ color: tone }}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={day}
                      initial={{ y: '-45%', opacity: 0, filter: 'blur(6px)' }}
                      animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                      exit={{ y: '45%', opacity: 0, filter: 'blur(6px)' }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {String(day).padStart(2, '0')}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={COPY[beat].k}
                  initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-3 md:mt-6"
                >
                  <h2 className="font-display text-[clamp(1.9rem,3.6vw,3.3rem)] font-medium leading-[1.02] tracking-[-0.01em]">
                    {COPY[beat].title}
                  </h2>
                  <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-white/62 md:mt-4 md:text-[16px]">{COPY[beat].sub}</p>

                  {beat === 2 && (
                    <div className="mt-5 hidden sm:block">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">Tried in Mantha first</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {SWATCHES.map((s, i) => (
                          <motion.span
                            key={s.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
                            className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] ${s.ok ? 'bg-[#8FE3D4]/14 text-white ring-1 ring-[#8FE3D4]/60' : 'bg-white/[0.05] text-white/45 ring-1 ring-white/10'}`}
                          >
                            <span className="h-5 w-5 rounded-full ring-1 ring-black/20" style={{ backgroundColor: s.color }} />
                            {s.name}
                            {s.ok ? <Check className="h-3.5 w-3.5 text-[#8FE3D4]" /> : <X className="h-3 w-3 opacity-60" />}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ---------- the room ---------- */}
            <div className="order-1 flex justify-center md:order-2 md:justify-end">
              <motion.div
                style={{ x: jitter }}
                className="relative aspect-[1024/765] w-full max-w-[min(780px,calc((100svh-380px)*1.34))] md:max-w-[min(780px,calc((100svh-270px)*1.34))]"
              >
                <div className="absolute inset-0 overflow-hidden rounded-[20px] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)]">
                  <motion.div style={{ filter: photoFilter, scale: photoScale }} className="absolute inset-0">
                    <img src={BASE} alt="Living room where a sofa was bought in the wrong colour" className="absolute inset-0 h-full w-full object-cover" />
                    {/* the wrong green: a sharp, yellowed shade of the real sofa recolour */}
                    <motion.img
                      src={SAGE}
                      alt=""
                      style={{ opacity: wrong, clipPath: CLIP, filter: 'hue-rotate(-24deg) saturate(1.9) brightness(1.04)' }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* the right green: Mantha's preview */}
                    <motion.img src={SAGE} alt="" style={{ opacity: right, clipPath: CLIP }} className="absolute inset-0 h-full w-full object-cover" />
                  </motion.div>

                  {/* a soft lens falloff on the photo itself */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(0,0,0,0.35))]" />

                  {/* tape: colour fringing + scanlines + a rolling bar */}
                  <motion.div aria-hidden style={{ opacity: tape }} className="pointer-events-none absolute inset-0">
                    <motion.img src={BASE} alt="" style={{ x: fringe }} className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen [filter:sepia(1)_hue-rotate(-50deg)_saturate(5)]" />
                    <motion.img src={BASE} alt="" style={{ x: fringeBack }} className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen [filter:sepia(1)_hue-rotate(150deg)_saturate(5)]" />
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.28)_0_2px,transparent_2px_4px)]" />
                    <motion.div
                      className="absolute inset-x-0 h-[18%] bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.18),transparent)]"
                      animate={{ top: ['-20%', '110%'] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="absolute left-5 top-5 flex items-center gap-2 font-mono text-[15px] font-bold tracking-[0.12em] text-white drop-shadow">
                      <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>◀◀</motion.span> REWIND
                    </span>
                  </motion.div>

                  {/* Mantha's scan on Day 0 */}
                  <motion.div
                    aria-hidden
                    style={{ top: scan, opacity: scanOpacity }}
                    className="pointer-events-none absolute inset-x-0 h-1/5 bg-[linear-gradient(180deg,transparent,rgba(143,227,212,0.5),transparent)]"
                  />
                  <motion.span
                    style={{ opacity: right }}
                    className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-[#00231D]/80 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8FE3D4] backdrop-blur-md"
                  >
                    <Check className="h-3.5 w-3.5" /> Mantha preview · sage velvet
                  </motion.span>

                  {/* viewfinder corners */}
                  {['left-3 top-3 border-l border-t', 'right-3 top-3 border-r border-t', 'left-3 bottom-3 border-b border-l', 'right-3 bottom-3 border-b border-r'].map((c) => (
                    <span key={c} aria-hidden className={`pointer-events-none absolute h-5 w-5 border-white/55 ${c}`} />
                  ))}
                </div>

                {/* the price tag (Day 14) — hangs over the window, clear of the sofa */}
                <PriceTag y={tagY} rotate={tagRot} opacity={tagOpacity} lines={['£1,840', 'Velvet 3-seater', 'Final sale · no returns']}>
                  <motion.span
                    style={{ scale: stampScale, opacity: stampOpacity, rotate: -14 }}
                    className="absolute -left-7 top-[46%] whitespace-nowrap rounded-[6px] border-[3px] border-[#E5484D] px-2 py-0.5 font-mono text-[15px] font-black uppercase tracking-[0.08em] text-[#E5484D] [background:rgba(255,255,255,0.9)]"
                  >
                    Wrong green
                  </motion.span>
                </PriceTag>
                {/* the new tag (Day 0) */}
                <PriceTag y={tag2Y} rotate={tag2Rot} opacity={tag2Opacity} lines={['£0', 'Mantha preview', 'Before you buy']} mint />
              </motion.div>
            </div>
          </div>

          {/* ---------- the timeline ---------- */}
          <div className="relative px-5 pb-5 sm:px-10 sm:pb-7 lg:px-14">
            <div className="relative h-px bg-white/15">
              {/* day ticks */}
              {Array.from({ length: 15 }, (_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={`absolute top-1/2 w-px -translate-y-1/2 bg-white/25 ${i % 7 === 0 ? 'h-3' : 'h-1.5'}`}
                  style={{ left: `${(i / 14) * 100}%` }}
                />
              ))}
              <motion.div style={{ scaleX: fill, backgroundColor: tone }} className="absolute inset-y-[-1px] left-0 right-0 origin-left transition-colors duration-500" />
              <motion.div style={{ left: head }} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="block h-3.5 w-3.5 rounded-full ring-4 ring-white/10 transition-colors duration-500" style={{ backgroundColor: tone }} />
              </motion.div>
            </div>
            <div className="mt-3 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.16em]">
              <span className={`transition-colors duration-500 ${beat === 2 ? 'text-[#8FE3D4]' : 'text-white/40'}`}>
                Day 0 · {beat === 2 ? 'Previewed first' : 'Clicked buy'}
              </span>
              <span className="hidden text-white/30 sm:inline">Day 7 · Dispatched</span>
              <span className={`transition-colors duration-500 ${beat === 0 ? 'text-[#FF8A7A]' : 'text-white/40'}`}>Day 14 · Delivered</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PriceTag({
  y, rotate, opacity, lines, mint, children,
}: {
  y: MotionValue<string>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
  lines: [string, string, string];
  mint?: boolean;
  children?: ReactNode;
}) {
  return (
    <motion.div
      aria-hidden
      style={{ y, rotate, opacity }}
      className="absolute right-[3%] top-[-34px] z-10 origin-top sm:right-[5%] sm:top-[-56px]"
    >
      <div className="flex origin-top scale-[0.72] flex-col items-center sm:scale-100">
        <span className="h-[48px] w-px bg-gradient-to-b from-transparent to-white/80 sm:h-[64px]" />
        <span
          className={`relative -mt-px w-[138px] rounded-[10px] px-3.5 pb-3 pt-5 text-left shadow-[0_22px_36px_-14px_rgba(0,0,0,0.7)] ${mint ? 'bg-[#8FE3D4] text-[#00231D]' : 'bg-[#F4EDE1] text-[#2A1F17]'}`}
        >
          <span className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#0B1F1B]/70" />
          <span className="block font-display text-[26px] font-semibold leading-none">{lines[0]}</span>
          <span className="mt-1.5 block font-mono text-[9.5px] uppercase tracking-[0.12em] opacity-75">{lines[1]}</span>
          <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] opacity-60">{lines[2]}</span>
          {children}
        </span>
      </div>
    </motion.div>
  );
}
