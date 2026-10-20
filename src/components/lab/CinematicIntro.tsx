import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { finishIntro, introShouldPlay } from '@/lib/introState';

/**
 * A ~2 second cold open, once per session: a camera viewfinder pulls the
 * Think Decor logo into focus, its pendant lamp switches on, the line
 * "Think it before you buy it." types in, the shutter fires — and the
 * shutter blades open onto the real hero.
 * Any scroll, key, tap or click skips straight to the shutter opening.
 */

const LINE_A = 'Think it before';
const LINE_B = 'you buy it.';
const LOGO = '/logo.png?v=5';

type Stage = 'focus' | 'shutter' | 'open' | 'gone';

export function CinematicIntro() {
  const [stage, setStage] = useState<Stage>(() => (introShouldPlay() ? 'focus' : 'gone'));
  const [typed, setTyped] = useState(0);
  // the viewfinder animates in only once the clock starts
  const [ready, setReady] = useState(false);
  const timers = useRef<number[]>([]);
  const total = LINE_A.length + LINE_B.length;

  const open = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setStage('open');
    finishIntro();
    timers.current.push(window.setTimeout(() => setStage('gone'), 900));
  };

  useEffect(() => {
    if (stage === 'gone') return;
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    // start the clock only once the room photo is decoded and a frame is on
    // screen, so a slow first load doesn't eat the sequence (max 1.2s wait)
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setReady(true);
        for (let i = 1; i <= total; i++) at(180 + i * 34, () => setTyped(i));
        at(1180, () => setStage('shutter'));
        at(1480, open);
      }));
    };
    const img = new Image();
    img.src = LOGO;
    img.decode().then(start, start);
    at(1200, start);

    const skip = () => open();
    window.addEventListener('wheel', skip, { passive: true, once: true });
    window.addEventListener('touchstart', skip, { passive: true, once: true });
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      timers.current.forEach(window.clearTimeout);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('keydown', skip);
    };
    // runs once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === 'gone') return null;
  const opening = stage === 'open';
  const a = LINE_A.slice(0, typed);
  const b = LINE_B.slice(0, Math.max(0, typed - LINE_A.length));

  return (
    <div aria-hidden className="fixed inset-0 z-[100] cursor-pointer" onClick={open}>
      {/* shutter halves: they part to reveal the page */}
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2 bg-[#001A15]"
        animate={{ y: opening ? '-100%' : '0%' }}
        transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[#001A15]"
        animate={{ y: opening ? '100%' : '0%' }}
        transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
      />

      {/* viewfinder + line */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-6"
        animate={opening ? { opacity: 0, scale: 1.12 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={`relative aspect-[4/3] w-[min(360px,72vw)] transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}>
          {/* the lamp in the logo switches on: a warm pool of light under the shade */}
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-[18%] h-[82%] w-[70%] -translate-x-1/2"
            style={{ background: 'radial-gradient(48% 62% at 46% 46%, rgba(255,214,140,0.55), rgba(255,190,110,0.18) 45%, transparent 72%)', filter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={ready ? { opacity: [0, 0, 0.9, 0.25, 1, 0.85] } : undefined}
            transition={{ duration: 1.0, delay: 0.25, times: [0, 0.3, 0.42, 0.52, 0.66, 1] }}
          />
          {/* the logo, pulled into focus */}
          <div className="absolute inset-0 grid place-items-center">
            <motion.img
              src={LOGO}
              alt=""
              className="h-[66%] w-auto object-contain"
              initial={{ filter: 'blur(12px)', opacity: 0, scale: 1.12 }}
              animate={ready ? { filter: 'blur(0px)', opacity: 1, scale: 1 } : undefined}
              transition={{ duration: 0.9, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {/* viewfinder corner brackets fly in */}
          {[
            'left-0 top-0 border-l-2 border-t-2',
            'right-0 top-0 border-r-2 border-t-2',
            'left-0 bottom-0 border-l-2 border-b-2',
            'right-0 bottom-0 border-r-2 border-b-2',
          ].map((c, i) => (
            <motion.span
              key={c}
              className={`absolute h-6 w-6 border-[#8FE3D4] ${c}`}
              initial={{ opacity: 0, x: i % 2 ? 24 : -24, y: i < 2 ? -24 : 24 }}
              animate={ready ? { opacity: 1, x: 0, y: 0 } : undefined}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/75">
            <motion.span className="h-1.5 w-1.5 rounded-full bg-[#FF5A5F]" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            Think Decor
          </span>
          <motion.span
            className="absolute bottom-2.5 right-2.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#FFD68C]"
            initial={{ opacity: 0 }}
            animate={ready ? { opacity: 1 } : undefined}
            transition={{ delay: 0.75, duration: 0.3 }}
          >
            Light · on
          </motion.span>

          {/* shutter blades + flash */}
          <AnimatePresence>
            {stage === 'shutter' && (
              <>
                <motion.span
                  key="blade-t"
                  className="absolute inset-x-0 top-0 h-1/2 origin-top bg-black"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: [0, 1, 0] }}
                  transition={{ duration: 0.28, times: [0, 0.45, 1], ease: 'easeInOut' }}
                />
                <motion.span
                  key="blade-b"
                  className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-black"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: [0, 1, 0] }}
                  transition={{ duration: 0.28, times: [0, 0.45, 1], ease: 'easeInOut' }}
                />
              </>
            )}
          </AnimatePresence>
        </div>

        <p className="min-h-[1.1em] text-center font-display text-[clamp(1.8rem,4.6vw,3.4rem)] font-medium leading-[1.05] text-white">
          {a}
          {b && <span className="italic font-normal text-[#8FE3D4]"> {b}</span>}
          <span className="ml-1 inline-block h-[0.85em] w-[2px] translate-y-[0.1em] animate-pulse bg-[#8FE3D4]" />
        </p>
      </motion.div>

      {/* the flash */}
      <AnimatePresence>
        {stage === 'shutter' && (
          <motion.div
            key="flash"
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 0.32, delay: 0.1, times: [0, 0.3, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
