import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SRC = '/hero-animation.mp4';
const POSTER = '/hero-poster.jpg';

/** Framed hero video — sits beside the headline, not behind it. */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const v = videoRef.current;
    const host = hostRef.current;
    if (!v || !host) return;

    const kick = () => v.play().catch(() => {});
    kick();
    v.addEventListener('loadeddata', kick);
    if (reduceMotion) { v.pause(); return () => v.removeEventListener('loadeddata', kick); }

    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) kick(); else v.pause(); }, { threshold: 0.01 });
    io.observe(host);
    const onVisible = () => { if (document.visibilityState === 'visible') kick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      io.disconnect();
      v.removeEventListener('loadeddata', kick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reduceMotion]);

  return (
    <div ref={hostRef} className="relative">
      {/* ambient glow behind the frame */}
      <div className="pointer-events-none absolute -inset-10 rounded-[48px] bg-[radial-gradient(ellipse_at_center,hsl(168_100%_17%/0.35),transparent_68%)] blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 28, filter: 'blur(14px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[24px] border border-foreground/[0.12] bg-white shadow-[0_30px_80px_-24px_hsl(168_30%_15%/0.22)]"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2.5 border-b border-foreground/[0.08] px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="ml-3 text-[11px] font-medium tracking-wide text-foreground/45">thinkdecor · live</span>
          <motion.span
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI running
          </motion.span>
        </div>

        <div className="relative aspect-video bg-white">
          <img src={POSTER} alt="" className="absolute inset-0 h-full w-full object-contain" />
          <video
            ref={videoRef}
            src={SRC}
            poster={POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-contain"
          />
          {/* subtle brand grade + inner edge */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
        </div>
      </motion.div>

      {/* floating proof chips */}
      <motion.span
        initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="absolute -left-4 top-[22%] hidden rounded-2xl border border-foreground/[0.12] bg-black/38 px-4 py-2.5 backdrop-blur-xl lg:block"
      >
        <span className="block text-[10px] uppercase tracking-[0.14em] text-foreground/50">Room scanning</span>
        <span className="block text-[15px] font-semibold text-foreground">In development</span>
      </motion.span>

      <motion.span
        initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.7 }}
        className="absolute -right-4 bottom-[16%] hidden rounded-2xl border border-primary/30 bg-primary/90 px-4 py-2.5 backdrop-blur-xl lg:block"
      >
        <span className="block text-[10px] uppercase tracking-[0.14em] text-primary-foreground/70">Redesign</span>
        <span className="block text-[15px] font-semibold text-primary-foreground">In seconds</span>
      </motion.span>
    </div>
  );
}
