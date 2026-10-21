import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, Check, Images, Link2, Pause, Play, Share2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { Reveal } from './Motion';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks';
import { cn } from '@/lib/utils';

/**
 * "Get the app" — the four things the app does are live tabs: pick one (or
 * let them play through, like stories) and the phone shows that feature
 * working — the camera taking the shot, styles changing, the library
 * filling up, a before/after being shared. The phone leans towards the
 * cursor; the launch reel is one tap away. On desktop a QR code opens the
 * Play Store on your phone. The navbar's "Get the app" link targets #get-app.
 */

const FEATURES = [
  { icon: Camera, t: 'Shoot straight from your camera', d: 'Point, snap, and the room is ready to redesign.' },
  { icon: Sparkles, t: 'Every Mantha tool', d: 'Styles, colour swaps and "describe a change", same as on the web.' },
  { icon: Images, t: 'One library, everywhere', d: 'Designs made on your phone show up on the web, and back.' },
  { icon: Share2, t: 'Share in a tap', d: 'Send a before-and-after to a partner, landlord or designer.' },
];
const STEP_MS = 5200;

type Screen = 0 | 1 | 2 | 3 | 'reel';

export function GetTheApp() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLDivElement>(null);
  const inView = useInView(section, { amount: 0.35 });
  const [screen, setScreen] = useState<Screen>(0);
  const [auto, setAuto] = useState(true);

  // play through the features like stories until someone picks one
  useEffect(() => {
    if (!auto || !inView || reduce || screen === 'reel') return;
    const t = window.setTimeout(() => setScreen((s) => (((s as number) + 1) % FEATURES.length) as Screen), STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, inView, reduce, screen]);

  const pick = (s: Screen) => { setAuto(false); setScreen(s); };

  // the phone leans towards the cursor
  const tiltX = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });

  return (
    <section className="py-6">
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-8">
        <div
          ref={section}
          onPointerMove={(e) => {
            if (e.pointerType !== 'mouse' || reduce) return;
            const r = e.currentTarget.getBoundingClientRect();
            tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 22);
            tiltX.set(((e.clientY - r.top) / r.height - 0.5) * -14);
          }}
          onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}
          className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#003B33,#00332C_55%,#002923)] px-[clamp(20px,4vw,56px)] py-[clamp(36px,5vw,64px)] text-white"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(60% 55% at 85% 20%, rgba(0,160,140,.32), transparent 62%), radial-gradient(50% 45% at 0% 100%, rgba(0,89,78,.55), transparent 65%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_80%_at_15%_20%,#000,transparent)]"
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div>
              <Reveal>
                <span className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">Think Decor for iPhone &amp; Android</span>
                <h2 className="mt-4 font-display text-[clamp(2.3rem,4.6vw,4rem)] font-medium leading-[1] text-white">
                  Your rooms,
                  <span className="block italic font-normal text-[#8FE3D4]">in your pocket.</span>
                </h2>
                <p className="mt-5 max-w-[44ch] text-[17px] text-white/75">
                  Stand in the room, take the photo, see it redesigned before you've put the phone down. Tap a feature to see it on the phone.
                </p>
              </Reveal>

              {/* the features, as tabs that drive the phone */}
              <ul className="mt-8 grid gap-2 sm:grid-cols-2" role="tablist" aria-label="App features">
                {FEATURES.map(({ icon: Icon, t, d }, i) => {
                  const on = screen === i;
                  return (
                    <li key={t} className="list-none">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => pick(i as Screen)}
                        className={cn(
                          'relative flex w-full gap-3 overflow-hidden rounded-[18px] p-3.5 text-left transition-colors',
                          on ? 'bg-white/[0.1] shadow-[inset_0_0_0_1px_rgba(143,227,212,0.45)]' : 'hover:bg-white/[0.05]',
                        )}
                      >
                        <span className={cn('grid h-9 w-9 flex-none place-items-center rounded-full transition-colors', on ? 'bg-[#8FE3D4] text-[#00231D]' : 'bg-white/[0.08] text-[#8FE3D4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]')}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <b className="block text-[15px] font-semibold text-white">{t}</b>
                          <span className="mt-0.5 block text-[13px] leading-snug text-white/60">{d}</span>
                        </span>
                        {/* story progress */}
                        {on && auto && !reduce && (
                          <motion.span
                            key={`bar-${i}`}
                            aria-hidden
                            className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[#8FE3D4]"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: inView ? 1 : 0 }}
                            transition={{ duration: STEP_MS / 1000, ease: 'linear' }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <Reveal delay={0.15} className="mt-8 flex flex-wrap items-center gap-3">
                <StoreBadge href={APP_STORE_URL} store="apple" />
                <StoreBadge href={PLAY_STORE_URL} store="google" />
                {/* desktop: scan to open the Play Store on your phone */}
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 hidden items-center gap-3 rounded-[16px] bg-white/[0.06] p-2 pr-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-colors hover:bg-white/[0.1] lg:flex"
                >
                  <span className="grid h-[68px] w-[68px] place-items-center rounded-[10px] bg-white p-1.5">
                    <img src="/assets/qr-play-store.svg" alt="QR code for Think Decor on Google Play" className="h-full w-full" />
                  </span>
                  <span className="text-[12.5px] leading-snug text-white/70">
                    <b className="block text-[13.5px] font-semibold text-white">Scan with your phone</b>
                    Opens Google Play
                  </span>
                </a>
              </Reveal>
            </div>

            <div className="flex flex-col items-center gap-4 lg:items-end">
              <div className="[perspective:1200px]">
                <motion.div
                  style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' }}
                  animate={reduce ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
                >
                  <div aria-hidden className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(0,160,140,0.35),transparent_65%)] blur-2xl" />
                  <div className="relative w-[min(280px,70vw)] rounded-[46px] bg-[#0B1513] p-[10px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8),inset_0_0_0_1.5px_rgba(255,255,255,0.14)]">
                    <div className="relative aspect-[9/19.5] overflow-hidden rounded-[37px] bg-[#F7F5F1] text-[#10201C]">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={String(screen)}
                          initial={{ opacity: 0, x: 26 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -26 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0"
                        >
                          {screen === 0 && <CameraScreen />}
                          {screen === 1 && <StylesScreen />}
                          {screen === 2 && <LibraryScreen />}
                          {screen === 3 && <ShareScreen />}
                          {screen === 'reel' && <ReelScreen />}
                        </motion.div>
                      </AnimatePresence>
                      <span aria-hidden className="absolute left-1/2 top-2.5 z-10 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-black" />
                    </div>
                  </div>
                </motion.div>
              </div>
              <button
                type="button"
                onClick={() => pick(screen === 'reel' ? 0 : 'reel')}
                className="flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-[13px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] transition-colors hover:bg-white/[0.14] lg:mr-8"
              >
                {screen === 'reel' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {screen === 'reel' ? 'Back to the features' : 'Watch the app reel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- the phone screens ----------------------------- */

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between px-6 pt-3 text-[10px] font-semibold', dark ? 'text-white' : 'text-[#10201C]')}>
      <span>9:41</span>
      <span className="flex items-center gap-1"><i className="h-1.5 w-3 rounded-sm bg-current opacity-80" /><i className="h-2 w-4 rounded-sm border border-current" /></span>
    </div>
  );
}

function AppHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="px-5 pt-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00A08C]">{kicker}</p>
      <p className="font-display text-[22px] leading-tight">{title}</p>
    </div>
  );
}

/** the camera: a viewfinder on a room, the shutter fires, the shot flies into the gallery */
function CameraScreen() {
  return (
    <div className="absolute inset-0 bg-black">
      <img src="/assets/rooms/room-bedroom.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <StatusBar dark />
      <div aria-hidden className="absolute inset-x-6 top-[22%] bottom-[30%]">
        {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'left-0 bottom-0 border-b-2 border-l-2', 'right-0 bottom-0 border-b-2 border-r-2'].map((c) => (
          <motion.span key={c} className={`absolute h-6 w-6 border-white ${c}`} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:33.3%_33.3%]" />
      </div>
      <motion.p className="absolute inset-x-0 top-[13%] text-center text-[11px] font-semibold text-white drop-shadow" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 2.2, times: [0, 0.15, 0.8, 1] }}>
        Two walls and the floor in frame
      </motion.p>
      {/* flash */}
      <motion.span className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.95, 0] }} transition={{ duration: 2.6, times: [0, 0.72, 0.76, 0.9] }} />
      {/* the shot shrinking into the gallery */}
      <motion.img
        src="/assets/rooms/room-bedroom.webp"
        alt=""
        className="absolute left-6 top-[22%] h-[48%] w-[calc(100%-48px)] origin-bottom-left rounded-md object-cover shadow-xl"
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 0, 1, 1], scale: [1, 1, 1, 0.16], x: [0, 0, 0, -6], y: [0, 0, 0, 230] }}
        transition={{ duration: 3.6, times: [0, 0.55, 0.56, 0.8] }}
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-7 pb-7 pt-10">
        <span className="h-9 w-9 rounded-lg bg-white/20 ring-1 ring-white/40" />
        <motion.span className="grid h-16 w-16 place-items-center rounded-full ring-4 ring-white" animate={{ scale: [1, 1, 0.86, 1] }} transition={{ duration: 2.6, times: [0, 0.7, 0.75, 0.82] }}>
          <span className="h-12 w-12 rounded-full bg-white" />
        </motion.span>
        <span className="text-[11px] font-semibold text-white">Photo</span>
      </div>
    </div>
  );
}

const STYLE_SHOTS = [
  { name: 'Scandinavian', img: '/assets/rooms/room-living-scandinavian.webp' },
  { name: 'Japandi', img: '/assets/rooms/room-living-japanese.webp' },
  { name: 'Minimal', img: '/assets/rooms/room-living-minimal.webp' },
  { name: 'Maximalist', img: '/assets/rooms/room-living-maximalism.webp' },
];

/** Mantha's tools: tap a style chip and the room restyles */
function StylesScreen() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % STYLE_SHOTS.length), 1250);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 flex flex-col">
      <StatusBar />
      <AppHeader kicker="Front lounge" title="Styles" />
      <div className="relative mx-4 mt-3 aspect-[4/3.6] overflow-hidden rounded-[18px]">
        <AnimatePresence initial={false}>
          <motion.img
            key={STYLE_SHOTS[i].img}
            src={STYLE_SHOTS[i].img}
            alt=""
            initial={{ clipPath: 'inset(0 0 0 100%)' }}
            animate={{ clipPath: 'inset(0 0 0 0%)' }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[9.5px] font-semibold text-white backdrop-blur">
          <Sparkles className="h-3 w-3 text-[#8FE3D4]" /> Mantha
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 px-4">
        {STYLE_SHOTS.map((s, n) => (
          <span key={s.name} className={cn('rounded-full px-3 py-1.5 text-[10.5px] font-semibold transition-colors duration-300', n === i ? 'bg-[#00594E] text-white' : 'bg-[#E8EEEC] text-[#10201C]/70')}>
            {s.name}
          </span>
        ))}
      </div>
      <div className="mx-4 mt-3 rounded-[14px] bg-white p-3 text-[10.5px] text-[#10201C]/55 shadow-sm">
        Describe a change… <span className="text-[#10201C]">&ldquo;a green velvet sofa&rdquo;</span>
      </div>
    </div>
  );
}

const LIBRARY = [
  '/assets/rooms/room-living-scandinavian.webp',
  '/assets/rooms/room-bedroom-japanese.webp',
  '/assets/rooms/room-kitchen-minimal.webp',
  '/assets/rooms/room-hall-maximalism.webp',
  '/assets/rooms/room-bedroom-scandinavian.webp',
  '/assets/rooms/room-kitchen-japanese.webp',
];

/** the library filling up, and syncing with the web */
function LibraryScreen() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <StatusBar />
      <AppHeader kicker="Library" title="Your rooms" />
      <motion.span
        className="mx-5 mt-2 flex w-max items-center gap-1.5 rounded-full bg-[#00A08C]/10 px-2.5 py-1 text-[10px] font-semibold text-[#00594E]"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00A08C] opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00A08C]" />
        </span>
        Synced with thinkdecor.app
      </motion.span>
      <div className="mt-3 grid grid-cols-2 gap-2 px-4">
        {LIBRARY.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.16, type: 'spring', stiffness: 220, damping: 20 }}
            className="overflow-hidden rounded-[12px] bg-white shadow-sm"
          >
            <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
            <span className="block px-2 py-1.5 text-[9.5px] font-semibold text-[#10201C]/70">Saved</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const PEOPLE = [{ n: 'Sam', c: '#C9773F' }, { n: 'Priya', c: '#3C5A7A' }, { n: 'Landlord', c: '#7C8A6A' }, { n: 'Designer', c: '#B5603F' }];

/** a before/after card, then the share sheet, then sent */
function ShareScreen() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <StatusBar />
      <AppHeader kicker="Front lounge · Japandi" title="Before / after" />
      <div className="relative mx-4 mt-3 aspect-[4/3.4] overflow-hidden rounded-[18px]">
        <img src="/assets/rooms/hero.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <img src="/assets/rooms/room-living-japanese.webp" alt="" className="absolute inset-0 h-full w-full object-cover [clip-path:inset(0_0_0_50%)]" />
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow" />
      </div>
      {/* share sheet */}
      <motion.div
        className="absolute inset-x-0 bottom-0 rounded-t-[22px] bg-white px-4 pb-6 pt-3 shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.25)]"
        initial={{ y: '100%' }}
        animate={{ y: '0%' }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 170, damping: 22 }}
      >
        <span className="mx-auto block h-1 w-9 rounded-full bg-black/15" />
        <p className="mt-3 text-[11.5px] font-semibold">Share before / after</p>
        <div className="mt-3 flex justify-between">
          {PEOPLE.map((p, i) => (
            <div key={p.n} className="flex flex-col items-center gap-1">
              <motion.span
                className="relative grid h-11 w-11 place-items-center rounded-full text-[13px] font-semibold text-white"
                style={{ background: p.c }}
                animate={i === 0 ? { scale: [1, 1, 0.88, 1] } : undefined}
                transition={{ duration: 2.4, times: [0, 0.7, 0.76, 0.84] }}
              >
                {p.n[0]}
                {i === 0 && (
                  <motion.span
                    className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#00A08C] ring-2 ring-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2.1, type: 'spring' }}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </motion.span>
                )}
              </motion.span>
              <span className="text-[9.5px] text-[#10201C]/60">{p.n}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-[#F1F4F3] px-3 py-2 text-[10.5px] text-[#10201C]/70">
          <Link2 className="h-3.5 w-3.5" /> thinkdecor.app/r/front-lounge
        </div>
        <motion.p className="mt-2 text-center text-[11px] font-semibold text-[#00594E]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }}>
          Sent to Sam
        </motion.p>
      </motion.div>
    </div>
  );
}

function ReelScreen() {
  return (
    <video
      src="/assets/video/app-reel.mp4"
      poster="/assets/video/app-reel-poster.jpg"
      muted
      loop
      autoPlay
      playsInline
      aria-label="Think Decor app reel: one photo, style templates, tap a look"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function StoreBadge({ href, store }: { href: string; store: 'apple' | 'google' }): ReactNode {
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
