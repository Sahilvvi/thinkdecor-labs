import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  animate, motion, useInView, useMotionTemplate, useMotionValue, useSpring, useTransform,
} from 'framer-motion';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Before / after with weight: the divider follows the cursor through a spring
 * (stiffness 150, damping 15), so it glides and overshoots a touch like a
 * physical slider. The seam is an optical lens — a refractive glass strip
 * with chromatic fringes — rather than a flat white line.
 *
 * Mouse: just hover and move. Touch: drag. Keyboard: arrow keys.
 * With `autoplay`, it drifts back and forth on its own until touched.
 */
export function SpringCompare({
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After',
  autoplay = false,
  className,
  labelClassName,
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  autoplay?: boolean;
  className?: string;
  labelClassName?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { margin: '0px 0px -10% 0px' });
  const target = useMotionValue(50);
  const split = useSpring(target, { stiffness: 150, damping: 15, mass: 1 });
  const [touched, setTouched] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    if (!autoplay || touched || !inView) return;
    const controls = animate(target, [target.get(), 22, 78, 50], {
      duration: 6,
      times: [0, 0.3, 0.75, 1],
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 0.6,
    });
    return () => controls.stop();
  }, [autoplay, touched, inView, target]);

  const setFrom = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    target.set(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const clip = useMotionTemplate`inset(0 0 0 ${split}%)`;
  const left = useMotionTemplate`${split}%`;
  const now = useTransform(split, (v) => Math.round(v));
  const [valueNow, setValueNow] = useState(50);
  useEffect(() => now.on('change', setValueNow), [now]);

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 4;
    if (e.key === 'ArrowLeft') { setTouched(true); target.set(Math.max(0, target.get() - step)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setTouched(true); target.set(Math.min(100, target.get() + step)); e.preventDefault(); }
  };

  return (
    <div
      ref={box}
      data-cursor="Compare"
      role="slider"
      tabIndex={0}
      aria-label="Compare before and after"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valueNow}
      onKeyDown={onKey}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setTouched(true); }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse' || dragging.current) setFrom(e.clientX);
      }}
      onPointerDown={(e) => {
        setTouched(true);
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setFrom(e.clientX);
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') { target.set(50); if (autoplay) setTouched(false); } }}
      className={cn('relative touch-pan-y select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#00A08C]', className)}
    >
      <img src={before} alt={beforeLabel} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <motion.div style={{ clipPath: clip }} className="absolute inset-0">
        <img src={after} alt={afterLabel} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      </motion.div>

      {/* the lens: refractive glass strip with chromatic fringes */}
      <motion.div aria-hidden style={{ left }} className="pointer-events-none absolute inset-y-0 z-[2] w-[30px] -translate-x-1/2">
        <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18)_45%,rgba(255,255,255,0.18)_55%,transparent)] [backdrop-filter:blur(8px)_hue-rotate(24deg)_saturate(1.6)_brightness(1.08)] [mask-image:linear-gradient(90deg,transparent,#000_30%,#000_70%,transparent)]" />
        <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-[3px] bg-[rgba(255,70,110,0.75)] mix-blend-screen" />
        <span className="absolute inset-y-0 left-1/2 w-[1.5px] translate-x-[1.5px] bg-[rgba(70,215,255,0.75)] mix-blend-screen" />
        <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
      </motion.div>
      <motion.span
        aria-hidden
        style={{ left }}
        className="pointer-events-none absolute top-1/2 z-[3] grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/20 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </motion.span>

      <span className={cn('pointer-events-none absolute left-2.5 top-2.5 z-[3] rounded-full bg-black/50 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.08em] text-white', labelClassName)}>
        {beforeLabel}
      </span>
      <span className={cn('pointer-events-none absolute right-2.5 top-2.5 z-[3] rounded-full bg-[#00A08C]/90 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.08em] text-white', labelClassName)}>
        {afterLabel}
      </span>
    </div>
  );
}
