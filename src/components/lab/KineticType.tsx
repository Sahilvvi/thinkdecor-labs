import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence, motion, useScroll, useTransform, type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 *  Kinetic typography for the homepage headlines.
 * ------------------------------------------------------------------ */

type Segment = { text: string; className?: string };

/**
 * A headline whose words rise out of a mask one by one, scrubbed by scroll
 * (not a one-shot fade): scroll back and they sink again. Pass plain text
 * or segments, so part of a line can be italic / coloured.
 */
export function ScrollWords({
  segments,
  className,
  as: Tag = 'h2',
}: {
  segments: Segment[] | string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 95%', 'start 45%'] });
  const segs = typeof segments === 'string' ? [{ text: segments }] : segments;
  const words = segs.flatMap((s) =>
    s.text.split(/(\s+)/).filter(Boolean).map((w) => ({ w, className: s.className })),
  );
  const real = words.filter((x) => x.w.trim()).length;
  let n = -1;
  return (
    <Tag ref={ref} className={className}>
      {words.map((x, i) => {
        if (!x.w.trim()) return <span key={i}>{x.w}</span>;
        n += 1;
        return <ScrollWord key={i} word={x.w} className={x.className} index={n} count={real} progress={scrollYProgress} />;
      })}
    </Tag>
  );
}

function ScrollWord({
  word, className, index, count, progress,
}: {
  word: string; className?: string; index: number; count: number; progress: MotionValue<number>;
}) {
  const span = 0.55;
  const start = (index / Math.max(1, count)) * (1 - span);
  const t = useTransform(progress, [start, start + span], [0, 1]);
  const y = useTransform(t, [0, 1], ['105%', '0%']);
  const rotate = useTransform(t, [0, 1], [7, 0]);
  const opacity = useTransform(t, [0, 0.4, 1], [0, 1, 1]);
  return (
    // extra bottom room (cancelled by the negative margin) keeps descenders from clipping
    <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
      <motion.span style={{ y, rotate, opacity }} className={cn('inline-block origin-bottom-left', className)}>
        {word}
      </motion.span>
    </span>
  );
}

/* ------------------------------------------------------------------ */

/** Real materials, cropped from the Mantha recolours of the example room. */
const MATERIALS = [
  { name: 'Sage velvet', image: '/assets/rooms/colours/living-sofa-sage.webp', size: '520%', pos: '63% 50%' },
  { name: 'Honey oak', image: '/assets/rooms/hero.webp', size: '420%', pos: '6% 97%' },
  { name: 'White marble', image: '/assets/rooms/colours/kitchen-floor-marble.webp', size: '380%', pos: '40% 96%' },
  { name: 'Cream bouclé', image: '/assets/rooms/colours/living-sofa-cream.webp', size: '520%', pos: '63% 52%' },
];

/**
 * Words filled with real material — sage velvet, honey oak, marble,
 * bouclé — cycling every few seconds, with a soft sheen passing over each
 * change. `play` gates the entrance (the hero waits for the intro).
 * Exposes the current material's name so a caption can follow along.
 */
export function MaterialWords({
  text,
  play,
  delay = 0,
  className,
  onMaterial,
}: {
  text: string;
  play: boolean;
  delay?: number;
  className?: string;
  onMaterial?: (name: string) => void;
}) {
  const [m, setM] = useState(0);
  useEffect(() => {
    MATERIALS.forEach((x) => { const i = new Image(); i.src = x.image; });
  }, []);
  useEffect(() => {
    if (!play) return;
    const t = window.setInterval(() => setM((v) => (v + 1) % MATERIALS.length), 2600);
    return () => window.clearInterval(t);
  }, [play]);
  useEffect(() => { onMaterial?.(MATERIALS[m].name); }, [m, onMaterial]);

  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span
            className="relative inline-grid"
            initial={{ y: '110%', opacity: 0 }}
            animate={play ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* one copy of the word per material, stacked; the current one fades up */}
            {MATERIALS.map((mat, k) => (
              <span
                key={mat.name}
                aria-hidden={k !== 0}
                className="[grid-area:1/1] bg-clip-text text-transparent transition-opacity duration-700 [-webkit-background-clip:text]"
                style={{
                  backgroundImage: `url(${mat.image})`,
                  backgroundSize: mat.size,
                  backgroundPosition: mat.pos,
                  opacity: k === m ? 1 : 0,
                  filter: 'brightness(1.3) saturate(1.15) contrast(0.95)',
                }}
              >
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
            {/* sheen on each change */}
            <AnimatePresence>
              <motion.span
                key={m}
                aria-hidden
                className="pointer-events-none [grid-area:1/1] bg-clip-text text-transparent [-webkit-background-clip:text]"
                style={{ backgroundImage: 'linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.85) 50%, transparent 65%)', backgroundSize: '250% 100%' }}
                initial={{ backgroundPosition: '120% 0' }}
                animate={{ backgroundPosition: '-120% 0' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: [0.45, 0, 0.25, 1] }}
              >
                {w}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </span>
      ))}
    </span>
  );
}
