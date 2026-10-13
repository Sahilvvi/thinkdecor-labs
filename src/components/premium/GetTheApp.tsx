import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Images, Pause, Play, Share2, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Reveal, Stagger, staggerItem } from './Motion';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks';

const FEATURES = [
  { icon: Camera, t: 'Shoot straight from your camera', d: 'No uploads. Point, snap, and the room is ready to redesign.' },
  { icon: Sparkles, t: 'Every Mantha AI tool', d: 'Style templates, colour swaps and "describe a change", same as on the web.' },
  { icon: Images, t: 'One library, everywhere', d: 'Designs made on your phone show up on the web, and the other way round.' },
  { icon: Share2, t: 'Share in a tap', d: 'Send a before-and-after to a partner, landlord or designer.' },
];

/**
 * "Get the app" — dark teal card in the hero's palette, copy and store
 * badges on the left, a phone on the right playing a before/after wipe of
 * the hero's living room. The navbar's "Get the app" link targets #get-app.
 */
export function GetTheApp() {
  return (
    <section className="py-6">
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#003B33,#00332C_55%,#002923)] px-[clamp(20px,4vw,56px)] py-[clamp(36px,5vw,64px)] text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 55% at 85% 20%, rgba(0,160,140,.32), transparent 62%), radial-gradient(50% 45% at 0% 100%, rgba(0,89,78,.55), transparent 65%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_80%_at_15%_20%,#000,transparent)]"
          />

          <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Reveal>
                <span className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">
                  Think Decor for iPhone &amp; Android
                </span>
                <h2 className="mt-4 font-display text-[clamp(2.3rem,4.6vw,4rem)] font-medium leading-[1] text-white">
                  Your rooms,
                  <span className="block italic font-normal text-[#8FE3D4]">in your pocket.</span>
                </h2>
                <p className="mt-5 max-w-[44ch] text-[17px] text-white/75">
                  Stand in the room, take the photo, see it redesigned before you've put the
                  phone down. Everything you can do here, wherever you are.
                </p>
              </Reveal>

              <Stagger className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {FEATURES.map(({ icon: Icon, t, d }) => (
                  <motion.li key={t} variants={staggerItem} className="flex list-none gap-3">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
                      <Icon className="h-4 w-4 text-[#8FE3D4]" />
                    </span>
                    <span>
                      <b className="block text-[15px] font-semibold text-white">{t}</b>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-white/60">{d}</span>
                    </span>
                  </motion.li>
                ))}
              </Stagger>

              <Reveal delay={0.15} className="mt-9 flex flex-wrap gap-3">
                <StoreBadge href={APP_STORE_URL} store="apple" />
                <StoreBadge href={PLAY_STORE_URL} store="google" />
              </Reveal>
            </div>

            <Reveal delay={0.1} y={40} className="flex justify-center lg:justify-end">
              <PhoneDemo />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ href, store }: { href: string; store: 'apple' | 'google' }) {
  const apple = store === 'apple';
  const body = (
    <>
      {apple ? (
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden>
          <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.96-.74 1.39 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.43-3.66ZM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
          <path fill="#00D7FE" d="M3.6 2.3c-.3.3-.4.7-.4 1.3v16.8c0 .5.2 1 .4 1.3l9.4-9.7L3.6 2.3Z" />
          <path fill="#FFCE00" d="m16.2 15.2-3.2-3.2 3.2-3.2 3.8 2.2c1.1.6 1.1 1.6 0 2.2l-3.8 2Z" />
          <path fill="#FF3A44" d="M16.2 15.2 13 12l-9.4 9.7c.4.4 1 .4 1.6.1l11-6.6Z" />
          <path fill="#00F076" d="M16.2 8.8 5.2 2.2c-.6-.4-1.2-.3-1.6.1L13 12l3.2-3.2Z" />
        </svg>
      )}
      <span className="text-left leading-none">
        <span className="block text-[10px] font-medium text-white/70">{apple ? 'Download on the' : 'Get it on'}</span>
        <span className="mt-1 block text-[17px] font-semibold tracking-[-0.01em]">{apple ? 'App Store' : 'Google Play'}</span>
      </span>
    </>
  );
  const cls =
    'inline-flex items-center gap-2.5 rounded-[14px] bg-black px-4 py-2.5 text-white shadow-[0_14px_30px_-14px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-transform duration-300';
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:scale-[1.04] active:scale-[0.97]`}>
      {body}
    </a>
  ) : (
    <span aria-disabled className={`${cls} opacity-90`}>{body}</span>
  );
}

/**
 * A CSS phone playing the Think Decor launch reel. It turns in 3D as the
 * section scrolls past, and the glass cards drift at their own speeds
 * around it.
 */
function PhoneDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // Once someone pauses it, scrolling back into view doesn't restart it.
  const userPaused = useRef(false);

  // Play only while visible (saves battery and data), never for visitors who
  // asked for reduced motion — they get the poster frame. A plain
  // IntersectionObserver, since framer's useInView misreports inside panels.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !userPaused.current) v.play().catch(() => {});
      else if (!e.isIntersecting) v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rotateY = useTransform(scrollYProgress, [0, 1], [-26, 16]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [12, -6]);
  const rotateZ = useTransform(scrollYProgress, [0, 1], [-4, 2]);
  return (
    <div ref={ref} className="relative [perspective:1200px]">
      <div aria-hidden className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(0,160,140,0.35),transparent_65%)] blur-2xl" />
      <FloatCard progress={scrollYProgress} speed={-0.5} className="-left-6 top-[14%] sm:-left-40">
        <span className="h-5 w-5 rounded-[6px]" style={{ background: '#8A9F82' }} /> Sage velvet <small className="text-white/60">applied</small>
      </FloatCard>
      <FloatCard progress={scrollYProgress} speed={0.4} className="-right-2 top-[46%] sm:-right-8">
        <Sparkles className="h-4 w-4 text-[#8FE3D4]" /> Scandinavian
      </FloatCard>
      <FloatCard progress={scrollYProgress} speed={-0.25} className="-left-4 bottom-[14%] sm:-left-36">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#00A08C]"><Check className="h-3 w-3" /></span> Saved to Library
      </FloatCard>
      <motion.div
        style={{ rotateY, rotateX, rotateZ, transformStyle: 'preserve-3d' }}
        className="relative w-[min(290px,72vw)] rounded-[46px] bg-[#0B1513] p-[10px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8),inset_0_0_0_1.5px_rgba(255,255,255,0.14)]"
      >
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[37px] bg-[#00332C]">
          {/* The launch reel, playing only while the phone is on screen. */}
          <video
            ref={videoRef}
            src="/assets/video/app-reel.mp4"
            poster="/assets/video/app-reel-poster.jpg"
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Think Decor app reel: one photo, style templates, tap a look"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) { userPaused.current = false; v.play().catch(() => {}); }
              else { userPaused.current = true; v.pause(); }
            }}
            aria-label={playing ? 'Pause the app reel' : 'Play the app reel'}
            className="absolute bottom-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#00231D]/60 text-white backdrop-blur transition-transform hover:scale-110"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          {/* dynamic island */}
          <span aria-hidden className="absolute left-1/2 top-2.5 z-10 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </motion.div>
    </div>
  );
}

function FloatCard({ progress, speed, className, children }: { progress: MotionValue<number>; speed: number; className: string; children: React.ReactNode }) {
  const y = useTransform(progress, [0, 1], [-speed * 260, speed * 260]);
  const opacity = useTransform(progress, [0.1, 0.3, 0.75, 0.95], [0, 1, 1, 0]);
  return (
    <motion.div
      style={{ y, opacity }}
      className={`absolute z-10 flex items-center gap-2 whitespace-nowrap rounded-2xl bg-white/[0.08] px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_16px_34px_-16px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.16)] backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  );
}
