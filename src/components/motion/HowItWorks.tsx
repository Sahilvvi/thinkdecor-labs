import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Reveal } from '@/components/premium/Motion';

/**
 * How it works — one continuous demo running across three phone mockups,
 * not three static screenshots. A single timeline drives all three: a tap
 * on "upload a room photo" starts an upload, the photo lands in Recent,
 * focus shifts to Templates for a style pick, then to the saved preview —
 * which reveals the SAME photo, now restyled, before the loop resets.
 *
 * Everything here is illustrative (no real upload happens), same
 * convention as the hero's demo. Runs continuously regardless of
 * prefers-reduced-motion — deliberately: this is a small looping UI demo
 * (tap → progress bar → crossfade), not the large-scale parallax/autoplay
 * motion that reduced-motion is meant to suppress, and the product call
 * here is that it should always be moving, not freeze on one frame.
 */

// the same living room as the hero, so the homepage tells one room's story
const BEFORE_PHOTO = '/assets/rooms/hero.webp';
const AFTER_PHOTO = '/assets/rooms/room-living-scandinavian.webp';

export type Phase = 'idle' | 'tap' | 'uploading' | 'uploaded' | 'templates' | 'saving';

const SEQUENCE: { phase: Phase; ms: number }[] = [
  { phase: 'idle', ms: 1100 },
  { phase: 'tap', ms: 320 },
  { phase: 'uploading', ms: 1300 },
  { phase: 'uploaded', ms: 1100 },
  { phase: 'templates', ms: 2200 },
  { phase: 'saving', ms: 2800 },
];

const ACTIVE_PHONE: Record<Phase, 0 | 1 | 2> = {
  idle: 0, tap: 0, uploading: 0, uploaded: 0, templates: 1, saving: 2,
};

const UPLOADED_FROM: Phase[] = ['uploaded', 'templates', 'saving'];

/** Drives the whole demo off one clock, so all three phones stay in sync. Loops forever. */
function useDemoPhase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % SEQUENCE.length), SEQUENCE[index].ms);
    return () => clearTimeout(id);
  }, [index]);

  return SEQUENCE[index].phase;
}

const STEP_BG = ['bg-[#D3E6E2]', 'bg-[#C4E4DE]', 'bg-[#A9D8CF]'];

function StatusBar() {
  return (
    <div className="flex justify-between px-4 pb-1 pt-2.5 font-sans text-[10px] font-semibold text-foreground">
      <span>9:41</span>
      <span>●●● ▮</span>
    </div>
  );
}

function TabBar({ active }: { active: 'Home' | 'Templates' | 'Saved' }) {
  const tabs = ['Home', 'Templates', 'Saved', 'Profile'] as const;
  return (
    <div className="mt-auto flex justify-around border-t border-[#D3E6E2] px-2.5 pb-3 pt-2.5 text-[9px] text-[#4F6F6A]">
      {tabs.map((t) => (
        <span key={t} className={t === active ? 'font-semibold text-[#00594E]' : undefined}>
          {t}
        </span>
      ))}
    </div>
  );
}

/** Dims and shrinks slightly whenever the demo's focus is on a different phone. */
function Phone({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  return (
    <motion.div
      aria-label={label}
      animate={{ scale: active ? 1.03 : 0.965, opacity: active ? 1 : 0.62, filter: active ? 'saturate(1)' : 'saturate(0.65)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-[min(250px,82%)] flex-none rounded-t-[34px] bg-[#0C2622] p-[9px] pb-0 shadow-[0_30px_50px_rgba(0,52,45,0.3)]"
      style={{ aspectRatio: '9/18.5' }}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-t-[26px] bg-white text-[11px]">
        <span className="absolute left-1/2 top-2 h-[17px] w-[62px] -translate-x-1/2 rounded-full bg-[#0C2622]" />
        {children}
      </div>
    </motion.div>
  );
}

export function ScreenUpload({ phase }: { phase: Phase }) {
  const uploaded = UPLOADED_FROM.includes(phase);
  const uploading = phase === 'uploading';
  const tapping = phase === 'tap';

  return (
    <>
      <StatusBar />
      <div className="flex items-center gap-1.5 px-3.5 pt-2">
        <span className="flex items-center gap-1 rounded-full bg-[#00594E]/[0.08] px-2 py-[3px] text-[8.5px] font-bold text-[#00594E]">
          ✦ Mantha AI
        </span>
      </div>
      <div className="px-3.5 pb-1.5 pt-1">
        <small className="text-[10px] text-[#4F6F6A]">Good evening, Aisha</small>
        <b className="block font-display text-[19px] font-medium leading-[1.1] text-foreground">Your rooms</b>
      </div>

      <div data-courier="phone-tile" className="relative mx-3.5 my-2 overflow-hidden rounded-[14px]">
        {/* Idle / tap: dashed upload tile */}
        <motion.div
          animate={{ opacity: uploading || uploaded ? 0 : 1, scale: tapping ? 0.95 : 1 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-0 grid justify-items-center gap-[5px] rounded-[14px] border-[1.5px] border-dashed border-[#4F6F6A] bg-[#F2F8F7] px-2.5 py-3.5 text-center"
          style={{ zIndex: uploading || uploaded ? 0 : 1 }}
        >
          <span className="relative grid h-7 w-7 place-items-center rounded-full bg-[#00594E] text-[16px] not-italic text-white">
            +
            {tapping && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 rounded-full bg-[#00A08C]"
              />
            )}
          </span>
          <b className="text-[11.5px] font-semibold text-foreground">Upload a room photo</b>
          <span className="text-[9.5px] text-[#4F6F6A]">JPG or PNG · one room per photo</span>
        </motion.div>

        {/* Uploading: spinner + progress */}
        <motion.div
          animate={{ opacity: uploading ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="grid justify-items-center gap-2 rounded-[14px] border-[1.5px] border-[#D3E6E2] bg-[#F2F8F7] px-2.5 py-4 text-center"
          style={{ pointerEvents: 'none' }}
        >
          <span
            className="h-6 w-6 rounded-full border-2 border-[#D3E6E2] border-t-[#00594E]"
            style={{ animation: uploading ? 'spin 0.8s linear infinite' : undefined }}
          />
          <span className="text-[10.5px] font-semibold text-foreground">Uploading your photo…</span>
          <span className="h-[3px] w-[70%] overflow-hidden rounded-full bg-[#D3E6E2]">
            <motion.span
              className="block h-full rounded-full bg-[#00594E]"
              animate={{ width: uploading ? '100%' : '0%' }}
              transition={{ duration: 1.1, ease: 'linear' }}
            />
          </span>
        </motion.div>

        {/* Uploaded: success state, settles until the loop resets */}
        <motion.div
          animate={{ opacity: uploaded ? 1 : 0 }}
          transition={{ duration: 0.3, delay: uploaded ? 0.1 : 0 }}
          className="flex items-center gap-2 rounded-[14px] border-[1.5px] border-[#BFE0DA] bg-[#E4F3F0] px-3 py-3"
          style={{ pointerEvents: 'none' }}
        >
          <motion.span
            initial={false}
            animate={{ scale: uploaded ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 15 }}
            className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#00A08C] text-[11px] font-bold text-white"
          >
            ✓
          </motion.span>
          <span className="text-left text-[10.5px] font-semibold text-[#00594E]">Photo uploaded — ready to style</span>
        </motion.div>
      </div>

      <div className="flex justify-between px-3.5 pb-1.5 pt-1 text-[11px] font-bold text-foreground">
        Recent <span className="font-medium text-[#4F6F6A]">See all</span>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3.5">
        <figure className="relative m-0 overflow-hidden rounded-[10px]">
          <motion.img
            src={BEFORE_PHOTO}
            alt=""
            animate={{ opacity: uploaded ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 aspect-square w-full object-cover"
          />
          <img
            src="/assets/rooms/step-upload.webp"
            alt=""
            className="aspect-square w-full rounded-[10px] object-cover"
            style={{ opacity: uploaded ? 0 : 1, transition: 'opacity 0.3s' }}
          />
          {uploaded && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.15 }}
              className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#00A08C] text-[8px] font-bold text-white"
            >
              ✓
            </motion.span>
          )}
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1.5 pb-1 pt-3 text-[9px] font-semibold text-white">
            {uploaded ? 'Your photo' : 'Front lounge'}
            <span className="block text-[8.5px] font-normal opacity-80">{uploaded ? 'Just now' : 'Edited 2h ago'}</span>
          </figcaption>
        </figure>
        <figure className="m-0">
          <img src="/assets/rooms/thumbs/t-scandi.webp" alt="" className="aspect-square w-full rounded-[10px] object-cover" />
          <figcaption className="mt-[3px] text-[9.5px] font-semibold text-foreground">
            Dining nook<span className="block text-[9px] font-normal text-[#4F6F6A]">Yesterday</span>
          </figcaption>
        </figure>
      </div>
      <TabBar active="Home" />
    </>
  );
}

const SWATCHES = [
  { img: 't-scandi.webp', name: 'Scandinavian', meta: 'Room style' },
  { img: 't-blush.webp', name: 'Warm Natural', meta: 'Room style' },
  { img: 't-classic.webp', name: 'Classic', meta: 'Room style' },
  { img: 't-japandi.webp', name: 'Japandi', meta: 'Room style' },
];

export function ScreenTemplates({ phase }: { phase: Phase }) {
  const active = phase === 'templates';
  const selected = active || phase === 'saving';

  return (
    <>
      <StatusBar />
      <div className="px-3.5 pb-1.5 pt-2.5">
        <small className="text-[10px] text-[#4F6F6A]">Front lounge</small>
        <b className="block font-display text-[19px] font-medium leading-[1.1] text-foreground">Styles</b>
      </div>
      <div className="mx-3.5 mb-2 mt-1 flex rounded-full bg-[#F2F8F7] p-[3px]">
        {['Styles', 'Describe your own'].map((c, i) => (
          <span
            key={c}
            className={`flex-1 rounded-full py-1 text-center text-[9.5px] font-semibold transition-colors duration-300 ${i === 0 ? 'bg-[#00594E] text-white' : 'text-foreground'}`}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 px-3.5">
        {SWATCHES.map((s, i) => (
          <figure key={s.name} className="relative m-0">
            <motion.div
              animate={i === 0 ? { scale: active ? [1, 0.92, 1.04, 1] : 1 } : {}}
              transition={{ duration: 0.55, times: [0, 0.35, 0.7, 1], ease: 'easeOut' }}
              className={`relative overflow-hidden rounded-[10px] transition-shadow duration-300 ${i === 0 && selected ? 'shadow-[0_0_0_2px_#00A08C]' : 'shadow-[0_0_0_1px_rgba(0,89,78,0.08)]'}`}
            >
              <img src={`/assets/rooms/thumbs/${s.img}`} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <motion.span
                  initial={false}
                  animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16, delay: selected ? 0.35 : 0 }}
                  className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#00A08C] text-[8px] font-bold text-white"
                >
                  ✓
                </motion.span>
              )}
            </motion.div>
            <figcaption className="mt-[3px] text-[9.5px] font-semibold text-foreground">
              {s.name}<span className="block text-[9px] font-normal text-[#4F6F6A]">{s.meta}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <TabBar active="Templates" />
    </>
  );
}

export function ScreenSaved({ phase }: { phase: Phase }) {
  const saving = phase === 'saving';
  const saved = [
    { img: 't-classic.webp', label: 'Front lounge · Classic', meta: 'Saved' },
    { img: 't-noir.webp', label: 'Bedroom · Japandi', meta: 'Saved' },
  ];

  return (
    <>
      <StatusBar />
      <div className="px-3.5 pb-1.5 pt-2.5">
        <small className="text-[10px] text-[#4F6F6A]">{saving ? 'Scandinavian · applying…' : 'Your preview'}</small>
        <b className="block font-display text-[19px] font-medium leading-[1.1] text-foreground">Your preview</b>
      </div>
      <div className="relative mx-3.5 mt-1.5 overflow-hidden rounded-[14px]" style={{ aspectRatio: '4/3.4' }}>
        <img src={BEFORE_PHOTO} alt="Living room before its redesign" className="absolute inset-0 h-full w-full object-cover" />
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={false}
          animate={{ clipPath: saving ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: saving ? 0.3 : 0 }}
        >
          <img src={AFTER_PHOTO} alt="Same room after a Mantha AI redesign" className="h-full w-full object-cover" />
        </motion.div>
        <motion.div
          className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-[10px] bg-[#00594E] px-2.5 py-1.5 text-[9.5px] text-white"
          initial={false}
          animate={{ opacity: saving ? 1 : 0, y: saving ? 0 : 14 }}
          transition={{ delay: saving ? 2.1 : 0, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.i
            initial={false}
            animate={{ scale: saving ? 1 : 0 }}
            transition={{ delay: saving ? 2.3 : 0, type: 'spring', stiffness: 420, damping: 14 }}
            className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#00A08C] text-[9px] font-bold not-italic text-white"
          >
            ✓
          </motion.i>
          Saved to &ldquo;Front lounge&rdquo;
        </motion.div>
      </div>
      <div className="flex justify-between px-3.5 pb-1.5 pt-2 text-[11px] font-bold text-foreground">
        Saved folder <span className="font-medium text-[#4F6F6A]">{saving ? '13 files' : '12 files'}</span>
      </div>
      <div className="grid gap-1.5 px-3.5">
        {saved.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-[10px] bg-[#F2F8F7] p-[5px]">
            <img src={`/assets/rooms/thumbs/${s.img}`} alt="" className="h-[34px] w-[34px] rounded-[7px] object-cover" />
            <span>
              <b className="block text-[10px] font-semibold text-foreground">{s.label}</b>
              <span className="text-[9px] text-[#4F6F6A]">{s.meta}</span>
            </span>
          </div>
        ))}
      </div>
      <TabBar active="Saved" />
    </>
  );
}

const STEPS = [
  {
    numeral: 'i', title: 'Upload your image',
    body: 'Take one photo of any room on your phone, or pick one from your gallery.',
    label: 'App home screen',
  },
  {
    numeral: 'ii', title: 'Pick a style',
    body: 'Choose one of seven room styles, or describe your own change. Mantha redesigns your photo.',
    label: 'App templates screen',
  },
  {
    numeral: 'iii', title: 'Save your work',
    body: 'Every preview you save goes straight into your Saved folder, ready to share.',
    label: 'App saved screen',
  },
];

export function HowItWorks() {
  const phase = useDemoPhase();
  const activePhone = ACTIVE_PHONE[phase];
  const screens = [<ScreenUpload phase={phase} />, <ScreenTemplates phase={phase} />, <ScreenSaved phase={phase} />];

  return (
    <section id="how-it-works" className="scroll-mt-24 px-[clamp(4px,2vw,24px)] py-[clamp(56px,7vw,96px)]">
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <Reveal className="mx-auto mb-[clamp(36px,5vw,64px)] grid max-w-[640px] justify-items-center gap-3.5 text-center">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Features
        </p>
        <h2 className="font-display text-[clamp(40px,5vw,68px)] font-medium leading-[1] text-foreground">
          How it <em className="italic text-[#00A08C]">works</em>
        </h2>
        <p className="max-w-[52ch] text-[18px] text-muted-foreground">
          Three screens from the Think Decor app. Snap your room, pick a look, and keep the result.
          That&rsquo;s the whole flow.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="grid grid-cols-1 gap-[clamp(16px,2.4vw,32px)] sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.numeral} className="grid gap-[22px]">
            <div
              className={`flex items-start justify-center overflow-hidden rounded-[24px] px-0 pb-0 pt-[clamp(22px,3vw,40px)] transition-colors duration-500 ${STEP_BG[i]}`}
              style={{ height: 'clamp(380px, 38vw, 500px)' }}
            >
              <Phone label={s.label} active={i === activePhone}>{screens[i]}</Phone>
            </div>
            <p
              className={`flex items-center gap-4 rounded-full bg-card px-[26px] py-4 shadow-[0_0_0_0_transparent] transition-shadow duration-500 ${i === activePhone ? 'shadow-[0_10px_30px_-14px_rgba(0,89,78,0.35)]' : ''}`}
            >
              <span className="flex-none font-display text-[30px] italic leading-none text-[#00A08C]">{s.numeral}</span>
              <span>
                <b className="block font-label text-[17px] font-bold text-primary">{s.title}</b>
                <span className="block text-[14px] leading-[1.4] text-muted-foreground">{s.body}</span>
              </span>
            </p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
