import { ReactNode, useEffect, useState } from 'react';
import {
  motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { useFinePointer } from './hooks';

/* ------------------------------------------------------------------ *
 *  Shared building blocks for the homepage motion system: section
 *  labels, cursor tilt, scroll progress and the cursor aura. Every
 *  pointer effect is skipped on touch screens and for reduced motion.
 * ------------------------------------------------------------------ */

/** Small uppercase eyebrow label — plain text, no decorative icon. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-[11px] uppercase tracking-[0.22em]', className)}>
      {children}
    </p>
  );
}

/** Tilts its content toward the cursor, with a soft moving highlight. */
export function Tilt({
  children,
  max = 8,
  className,
  innerClassName,
  glare = true,
}: {
  children: ReactNode;
  max?: number;
  className?: string;
  innerClassName?: string;
  glare?: boolean;
}) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const active = fine && !reduce;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 170, damping: 18 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 170, damping: 18 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.28), transparent 55%)`;

  return (
    <div className={cn('[perspective:1200px]', className)}>
      <motion.div
        className={cn('relative [transform-style:preserve-3d]', innerClassName)}
        style={active ? { rotateX, rotateY } : undefined}
        onPointerMove={(e) => {
          if (!active) return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        {children}
        {glare && active && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] mix-blend-overlay"
            style={{ background: glareBg }}
          />
        )}
      </motion.div>
    </div>
  );
}

/** Thin brand-coloured reading-progress line pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-primary via-mint to-primary"
      style={{ scaleX }}
    />
  );
}

/**
 * A soft ring that trails the cursor and swells over anything clickable.
 * Elements can name what the pointer does there with `data-cursor="Drag"`
 * (or "Tap", "Scroll", "Play"…): the ring grows into a small label.
 */
export function CursorAura() {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 520, damping: 42, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 520, damping: 42, mass: 0.3 });
  const [hover, setHover] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const enabled = fine && !reduce;

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const target = e.target as Element | null;
      const labelled = target?.closest?.('[data-cursor]');
      // a real control inside a labelled area (a button over the gallery)
      // keeps the plain hover ring rather than the area's label
      const control = target?.closest?.('a, button, [role="button"], input, textarea');
      const named = labelled && (!control || control === labelled || !labelled.contains(control))
        ? labelled.getAttribute('data-cursor') || null
        : null;
      setLabel(named);
      setHover(Boolean(control || labelled));
    };
    const leave = () => setVisible(false);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[70]" style={{ x: sx, y: sy }}>
      <motion.div
        animate={{ scale: label ? 0 : hover ? 1.9 : 1, opacity: visible && !label ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="-ml-4 -mt-4 h-8 w-8 rounded-full border border-mint/60 bg-mint/[0.06]"
      />
      <motion.div
        initial={false}
        animate={{ scale: label && visible ? 1 : 0.3, opacity: label && visible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="absolute left-0 top-0 -ml-8 -mt-8 grid h-16 w-16 place-items-center rounded-full bg-[#00A08C]/90 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_-10px_rgba(0,160,140,0.8)] backdrop-blur-sm"
      >
        {label}
      </motion.div>
    </motion.div>
  );
}
