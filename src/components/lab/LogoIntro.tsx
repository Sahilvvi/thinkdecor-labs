import { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { finishLogoIntro, logoIntroShouldPlay } from '@/lib/logoIntro';

/**
 * The first thing a visitor sees, once per session: the Think Decor mark on a
 * dark screen. Its pendant lamp switches on, a lens focus ring draws itself
 * around it while an inner ring fills as the page loads, and paint swatches
 * orbit the mark. When the page is ready the mark pops, flies into its place
 * in the navbar, and the dark screen opens like a lens iris from the lamp's
 * light onto the page underneath.
 *
 * Any wheel, touch, key or click skips straight to the reveal. Reduced
 * motion gets a short fade instead.
 */

const LOGO = '/logo.png?v=5';
const INK = '#06130F';
/** what the first screen needs before we open: the portal photo and the brand fonts */
const PRELOAD = ['/assets/rooms/room-living-maximalism.webp', LOGO];
const MIN_MS = 1900;
const MAX_MS = 3600;

const SWATCHES = [
  { c: '#8FB59A', r: 132, dur: 9, start: 20 },
  { c: '#C9773F', r: 150, dur: 12, start: 140 },
  { c: '#D9B66A', r: 124, dur: 10.5, start: 250 },
  { c: '#3C5A7A', r: 158, dur: 14, start: 320 },
  { c: '#E8DCC8', r: 142, dur: 11, start: 200 },
];

type Stage = 'loading' | 'pop' | 'reveal' | 'gone';

export function LogoIntro() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>(() => (logoIntroShouldPlay() ? 'loading' : 'gone'));
  const [progress, setProgress] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const started = useRef(performance.now());
  const revealing = useRef(false);

  // keep the page from scrolling underneath while the intro has the screen
  useEffect(() => {
    if (stage === 'gone') return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, [stage]);

  // load what the first screen needs; the inner ring shows how far along it is
  useEffect(() => {
    if (stage !== 'loading') return;
    let done = 0;
    const total = PRELOAD.length + 1;
    const tick = () => setProgress(++done / total);
    PRELOAD.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.decode().then(tick, tick);
    });
    (document.fonts?.ready ?? Promise.resolve()).then(tick, tick);
    const cap = window.setTimeout(() => setProgress(1), MAX_MS);
    return () => window.clearTimeout(cap);
  }, [stage]);

  const reveal = () => {
    if (revealing.current) return;
    revealing.current = true;
    setStage('pop');
    window.setTimeout(() => setStage('reveal'), reduce ? 0 : 380);
  };

  // open once everything is in and the intro has had its moment
  useEffect(() => {
    if (stage !== 'loading' || progress < 1) return;
    const wait = Math.max(0, (reduce ? 700 : MIN_MS) - (performance.now() - started.current));
    const t = window.setTimeout(reveal, wait);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, progress]);

  // any intent to move on skips straight to the reveal
  useEffect(() => {
    if (stage !== 'loading') return;
    const skip = () => reveal();
    window.addEventListener('wheel', skip, { passive: true, once: true });
    window.addEventListener('touchstart', skip, { passive: true, once: true });
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => {
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // the reveal: the mark flies to the navbar logo while the sheet irises open from the lamp
  useEffect(() => {
    if (stage !== 'reveal') return;
    const el = sheet.current;
    const m = mark.current;
    // release the page as the iris starts, so it opens onto the letters arriving
    finishLogoIntro();
    const end = () => setStage('gone');
    if (!el || !m || reduce) {
      if (el) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' }).finished.then(end, end);
      else end();
      return;
    }
    // the lamp sits a little above the centre of the mark
    const from = m.getBoundingClientRect();
    const cx = from.left + from.width * 0.47;
    const cy = from.top + from.height * 0.46;
    const reach = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) + 40;
    const iris = animate(0, reach, {
      duration: 1.05,
      ease: [0.7, 0, 0.2, 1],
      onUpdate: (r) => {
        const mask = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, #000 ${r + 1.5}px)`;
        el.style.maskImage = mask;
        el.style.webkitMaskImage = mask;
      },
    });
    // shared element: land exactly on the navbar's own mark, then hand over to it
    const target = document.querySelector<HTMLImageElement>('nav img[alt="Think Decor"]');
    const to = target?.getBoundingClientRect();
    if (to && to.width) {
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      m.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width})`, opacity: 1 },
        ],
        { duration: 900, easing: 'cubic-bezier(0.7,0,0.2,1)', fill: 'forwards' },
      );
    }
    iris.then(end, end);
    return () => iris.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (stage === 'gone') return null;
  const opening = stage === 'reveal';

  return (
    <div aria-hidden className="fixed inset-0 z-[100]">
      <div ref={sheet} className="absolute inset-0 overflow-hidden" style={{ backgroundColor: INK }}>
        {/* faint architectural grid, like a plan on the drawing board */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(143,227,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(143,227,212,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(circle_at_50%_46%,#000,transparent_65%)]" />

        <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
          {/* everything that orbits or rings the mark */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-0 w-0"
            animate={opening ? { scale: 2.6, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: opening ? 0.7 : 0.4, ease: [0.7, 0, 0.2, 1] }}
          >
            {/* the lens focus ring: ticks that draw in and turn slowly */}
            <motion.svg
              viewBox="-120 -120 240 240"
              className="absolute -left-[120px] -top-[120px] h-[240px] w-[240px] overflow-visible"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            >
              {Array.from({ length: 72 }, (_, i) => {
                const a = (i / 72) * Math.PI * 2;
                const long = i % 6 === 0;
                const r1 = long ? 100 : 104;
                return (
                  <motion.line
                    key={i}
                    x1={Math.cos(a) * r1}
                    y1={Math.sin(a) * r1}
                    x2={Math.cos(a) * 110}
                    y2={Math.sin(a) * 110}
                    stroke={long ? 'rgba(143,227,212,0.7)' : 'rgba(255,255,255,0.22)'}
                    strokeWidth={long ? 1.4 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.008, duration: 0.2 }}
                  />
                );
              })}
            </motion.svg>

            {/* the load ring: fills as the page gets ready */}
            <svg viewBox="-100 -100 200 200" className="absolute -left-[100px] -top-[100px] h-[200px] w-[200px] -rotate-90 overflow-visible">
              <circle r="90" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
              <motion.circle
                r="90"
                fill="none"
                stroke="#8FE3D4"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.max(0.04, progress) }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            {/* paint swatches in orbit */}
            {SWATCHES.map((s, i) => (
              <motion.div
                key={s.c}
                className="absolute left-0 top-0"
                initial={{ rotate: s.start, opacity: 0 }}
                animate={{ rotate: reduce ? s.start : s.start + 360, opacity: 1 }}
                transition={{
                  rotate: { duration: s.dur, repeat: Infinity, ease: 'linear' },
                  opacity: { delay: 0.5 + i * 0.12, duration: 0.5 },
                }}
              >
                <span
                  className="absolute block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_3px_rgba(6,19,15,1),0_0_18px_rgba(255,255,255,0.15)]"
                  style={{ left: s.r, top: 0, backgroundColor: s.c }}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* the mark, with its lamp switching on. Three layers, each owning its
              own transform: centring, the flight to the navbar, the pop. */}
          <div className="absolute left-0 top-0 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2">
          <div ref={mark} className="h-full w-full">
          <motion.div
            className="relative h-full w-full"
            initial={{ opacity: 0, scale: 0.86, filter: 'blur(8px)' }}
            animate={
              stage === 'pop'
                ? { opacity: 1, scale: 1.16, filter: 'blur(0px)' }
                : { opacity: 1, scale: 1, filter: 'blur(0px)' }
            }
            transition={stage === 'pop' ? { type: 'spring', stiffness: 420, damping: 14 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* lamp light: flickers on, then glows warm under the shade */}
            <motion.span
              className="pointer-events-none absolute left-[47%] top-[58%] h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,206,130,0.55),rgba(255,180,90,0.12)_45%,transparent_70%)] mix-blend-screen"
              initial={{ opacity: 0 }}
              animate={reduce ? { opacity: 0.8 } : { opacity: [0, 0.9, 0.2, 1, 0.85] }}
              transition={{ delay: 0.75, duration: 0.7, times: [0, 0.2, 0.35, 0.6, 1] }}
            />
            <img src={LOGO} alt="" className="relative h-full w-full object-contain" />
          </motion.div>
          </div>
          </div>
        </div>

        {/* the name and the line, under the rings */}
        <motion.div
          className="absolute inset-x-0 top-[calc(46%+150px)] flex flex-col items-center px-6 text-center"
          animate={opening ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="flex overflow-hidden font-display text-[28px] font-medium tracking-[-0.01em] text-white">
            {'Think Decor'.split('').map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block whitespace-pre"
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 0.35 + i * 0.035, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {ch}
              </motion.span>
            ))}
          </p>
          <motion.p
            className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.3em] text-[#8FE3D4]/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            Decor that thinks before you buy
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
