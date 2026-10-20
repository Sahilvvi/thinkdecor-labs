import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence, motion, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';
import { ScreenSaved, ScreenTemplates, ScreenUpload, type Phase } from '@/components/motion/HowItWorks';
import { ScrollWords } from '@/components/lab/KineticType';

/**
 * How it works, as one phone in 3D space instead of three static mockups.
 * The section pins while you scroll through steps i → ii → iii: the phone
 * turns and tilts towards the step being read, its screen plays that part
 * of the flow, and at step iii the redesigned room card lifts off the glass
 * along the Z axis and hovers above it.
 * CSS 3D only — no WebGL, no model file. Outside a StackPanel so it can pin.
 * On phones the copy sits above the phone, so the pose is toned down (a full
 * turn warps a small phone and lifts it into the copy) and the phone is sized
 * to whatever height is left under the copy.
 */

const AFTER_PHOTO = '/assets/rooms/room-living-scandinavian.webp';

const STEPS = [
  { numeral: 'i', title: 'Upload your image', body: 'Take one photo of any room on your phone, or pick one from your gallery.' },
  { numeral: 'ii', title: 'Pick a style', body: 'Choose one of seven room styles, or describe your own change. Mantha redesigns your photo.' },
  { numeral: 'iii', title: 'Save your work', body: 'Every preview you save goes straight into your Saved folder, ready to share.' },
];

/** Scroll position → which bit of the app flow the screen is showing. */
function phaseAt(p: number): Phase {
  if (p < 0.05) return 'idle';
  if (p < 0.09) return 'tap';
  if (p < 0.19) return 'uploading';
  if (p < 0.36) return 'uploaded';
  if (p < 0.68) return 'templates';
  return 'saving';
}

const stepOf = (p: number) => (p < 0.36 ? 0 : p < 0.68 ? 1 : 2);

/** an angle scaled by how much of the pose this screen size uses */
function usePosed(pose: MotionValue<number>, angle: MotionValue<number>) {
  return useTransform([angle, pose], ([a, k]: number[]) => a * k);
}

export function PhoneStory() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 24, mass: 0.5 });

  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  useEffect(() => p.on('change', (v) => {
    setPhase(phaseAt(v));
    const next = stepOf(v);
    if (next !== stepRef.current) {
      stepRef.current = next;
      setStep(next);
    }
  }), [p]);

  // the phone's pose follows the step being read: turned towards the copy on
  // the left, tilted up for the first step and down for the last
  // how much of that pose to use: all of it on desktop, a hint of it on phones
  const pose = useMotionValue(1);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const set = () => pose.set(mq.matches ? 0.35 : 1);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, [pose]);
  const rotY = usePosed(pose, useTransform(p, [0, 0.3, 0.42, 0.62, 0.74, 1], [26, 16, 6, 8, -10, -16]));
  const rotX = usePosed(pose, useTransform(p, [0, 0.3, 0.42, 0.62, 0.74, 1], [10, 6, 0, 0, -6, -4]));
  const rotZ = usePosed(pose, useTransform(p, [0, 0.36, 0.68, 1], [-3, 0, 1.5, 0]));
  const lift = useTransform([useTransform(p, [0, 0.5, 1], [0, -14, 0]), pose], ([a, k]: number[]) => (k < 1 ? 0 : a));

  // step iii: the result card lifts off the screen
  const pop = useTransform(p, [0.76, 0.86], [0, 1]);
  const popZ = useTransform([pop, pose], ([v, k]: number[]) => v * 130 * k);
  const popScale = useTransform([pop, pose], ([v, k]: number[]) => 0.86 + v * (k < 1 ? 0.12 : 0.2));
  const popShadow = useMotionTemplate`0 ${useTransform(pop, (v) => 10 + v * 50)}px ${useTransform(pop, (v) => 20 + v * 60)}px -20px rgba(0,40,34,${useTransform(pop, (v) => 0.25 + v * 0.35)})`;

  const glare = useTransform(p, [0, 1], ['-40%', '140%']);
  const bar = useTransform(p, [0, 1], ['0%', '100%']);

  const screens = [<ScreenUpload key="u" phase={phase} />, <ScreenTemplates key="t" phase={phase} />, <ScreenSaved key="s" phase={phase} />];

  return (
    <section ref={ref} id="how-it-works" className="relative scroll-mt-0 px-3 sm:px-4" style={{ height: '260vh' }}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center pt-[76px] pb-[84px] md:pb-3">
        <div className="relative flex h-full overflow-hidden rounded-[28px] bg-gradient-to-b from-white to-[#EEF8F6]">
          <div aria-hidden className="pointer-events-none absolute -right-20 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(0,160,140,0.16),transparent_65%)] blur-2xl" />

          <div className="relative flex w-full flex-col gap-4 px-5 py-5 sm:px-10 md:grid md:grid-cols-[1fr_1fr] md:items-center md:py-6 lg:px-16">
            {/* ---------- copy ---------- */}
            <div>
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Features
              </p>
              <ScrollWords
                className="mt-3 font-display text-[clamp(36px,5vw,68px)] font-medium leading-[1] text-foreground"
                segments={[{ text: 'How it ' }, { text: 'works', className: 'italic text-[#00A08C]' }]}
              />
              <ol className="mt-6 grid gap-2 md:mt-10 md:gap-4">
                {STEPS.map((s, i) => (
                  <motion.li
                    key={s.numeral}
                    animate={{ opacity: step === i ? 1 : 0.35, x: step === i ? 0 : -6 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className={`list-none rounded-[20px] px-5 py-3 transition-[background,box-shadow] duration-500 md:py-4 ${step === i ? 'bg-white shadow-[0_14px_34px_-18px_rgba(0,89,78,0.4)]' : ''} ${step === i ? '' : 'hidden md:block'}`}
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="w-6 flex-none font-display text-[28px] italic leading-none text-[#00A08C]">{s.numeral}</span>
                      <span>
                        <b className="block font-label text-[17px] font-bold text-primary">{s.title}</b>
                        <span className="block text-[14px] leading-[1.4] text-muted-foreground">{s.body}</span>
                      </span>
                    </span>
                  </motion.li>
                ))}
              </ol>
              <div className="mt-6 hidden h-1 max-w-[320px] overflow-hidden rounded-full bg-[#D3E6E2] md:block">
                <motion.i className="block h-full rounded-full bg-[linear-gradient(90deg,#00A08C,#8FE3D4)]" style={{ width: bar }} />
              </div>
            </div>

            {/* ---------- the phone ---------- */}
            <div className="flex min-h-0 flex-1 items-center justify-center [perspective:1400px] md:flex-none">
              <motion.div
                style={{ rotateY: rotY, rotateX: rotX, rotateZ: rotZ, y: lift, transformStyle: 'preserve-3d' }}
                className="relative h-full max-h-[520px] md:h-[min(600px,calc(100svh-150px))] md:max-h-none"
              >
                <div className="relative h-full [transform-style:preserve-3d]" style={{ aspectRatio: '9 / 19' }}>
                  {/* body thickness: stacked plates behind the glass */}
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="absolute inset-0 rounded-[42px]"
                      style={{
                        transform: `translateZ(${-(i + 1) * 1.6}px)`,
                        background: i === 8 ? '#0A1F1C' : `hsl(168 22% ${14 + i * 1.2}%)`,
                      }}
                    />
                  ))}
                  {/* the front: bezel + screen */}
                  <div className="absolute inset-0 rounded-[42px] bg-[#0C2622] p-[10px] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.08)]">
                    <div className="relative flex h-full flex-col overflow-hidden rounded-[33px] bg-white text-[11px]">
                      <span className="absolute left-1/2 top-2 z-10 h-[18px] w-[66px] -translate-x-1/2 rounded-full bg-[#0C2622]" />
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={step}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                          className="flex h-full flex-col"
                        >
                          {screens[step]}
                        </motion.div>
                      </AnimatePresence>
                      {/* moving glass reflection */}
                      <motion.span
                        aria-hidden
                        style={{ left: glare }}
                        className="pointer-events-none absolute -top-1/4 h-[150%] w-1/3 rotate-[20deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)] mix-blend-overlay"
                      />
                    </div>
                  </div>

                  {/* step iii: the redesigned room lifts off the glass */}
                  <motion.div
                    data-courier="phone-card"
                    style={{ translateZ: popZ, scale: popScale, opacity: pop, boxShadow: popShadow }}
                    className="pointer-events-none absolute left-[7%] right-[7%] top-[17%] overflow-hidden rounded-[18px] bg-white p-1.5"
                  >
                    <img src={AFTER_PHOTO} alt="" className="aspect-[4/3.4] w-full rounded-[13px] object-cover" />
                    <span className="flex items-center gap-1.5 px-1.5 pb-1 pt-2 text-[11px] font-semibold text-[#00594E]">
                      <i className="grid h-4 w-4 place-items-center rounded-full bg-[#00A08C] text-[9px] font-bold not-italic text-white">✓</i>
                      Saved to &ldquo;Front lounge&rdquo;
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
