import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { productShopUrl } from '@/lib/products';

interface Hotspot {
  id: string;
  x: number;
  y: number;
  name: string;
  source_url: string | null;
}

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  aspectRatio?: string;
  /** Real products detected in the "after" image — a small clickable dot per
   *  item, linking to where it's sold. Only ones with a source_url show. */
  hotspots?: Hotspot[];
  /**
   * How the slider introduces itself once its images are on screen:
   * 'reveal' — the new design wipes across the original (a just-made result);
   * 'nudge'  — the handle eases a little each way so it reads as draggable;
   * 'none'   — sits still at the middle.
   */
  intro?: 'reveal' | 'nudge' | 'none';
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  aspectRatio = "aspect-[16/9]",
  hotspots,
  intro = 'nudge',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(intro === 'reveal' ? 100 : 50);
  const [containerWidth, setContainerWidth] = useState(0);
  // "Hold for original": while held, the original photo covers everything.
  const [holding, setHolding] = useState(false);
  const isDragging = useRef(false);
  const introRaf = useRef(0);
  const touched = useRef(false);

  // Intro animation, played once the slider is actually on screen. Any
  // touch of the slider cancels it on the spot.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || intro === 'none') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setSliderPos(50); return; }
    const keys: [number, number][] = intro === 'reveal'
      ? [[0, 100], [1300, 50]]
      : [[0, 50], [450, 60], [1000, 41], [1450, 50]];
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let started = 0;
    const step = (now: number) => {
      if (touched.current) return;
      if (!started) started = now;
      const t = now - started;
      const i = keys.findIndex(([at]) => at > t);
      if (i === -1) { setSliderPos(keys[keys.length - 1][1]); return; }
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      setSliderPos(v0 + (v1 - v0) * ease((t - t0) / (t1 - t0)));
      introRaf.current = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      // a beat after it lands, so the eye is on it
      window.setTimeout(() => { introRaf.current = requestAnimationFrame(step); }, intro === 'reveal' ? 250 : 600);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(introRaf.current); };
  }, [intro]);

  const stopIntro = () => { touched.current = true; cancelAnimationFrame(introRaf.current); };

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
    setContainerWidth(rect.width);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    stopIntro();
    isDragging.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // only end a drag this slider actually started
    if (!isDragging.current) return;
    isDragging.current = false;
    if (containerRef.current?.hasPointerCapture?.(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      containerRef.current = node;
      setContainerWidth(node.getBoundingClientRect().width);
    }
  }, []);

  return (
    <div
      ref={measureRef}
      className={`group/ba relative ${aspectRatio} w-full cursor-col-resize select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary`}
      role="slider"
      tabIndex={0}
      aria-label="Compare the original photo with the redesign"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(sliderPos)}
      aria-valuetext={`${Math.round(sliderPos)}% original`}
      data-cursor="Drag"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          stopIntro();
          setSliderPos((p) => Math.max(0, Math.min(100, p + (e.key === 'ArrowLeft' ? -5 : 5))));
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* After (full background) */}
      <img
        src={afterSrc}
        alt={afterAlt}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-primary/80 backdrop-blur-sm text-primary-foreground text-xs font-medium z-10 pointer-events-none">
        After
      </div>

      {/* Real-product "shop this" dots — painted before the before-clip div
          so dragging the slider left naturally covers ones on that side. */}
      {hotspots?.filter((h) => h.source_url).map((h, i) => (
        <a
          key={i}
          href={productShopUrl(h.id)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Shop: ${h.name}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-auto"
          style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-white/70" />
          <span className="absolute inset-0 rounded-full bg-white shadow-lg ring-2 ring-primary" />
        </a>
      ))}

      {/* Before (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${holding ? 100 : sliderPos}%` }}
      >
        <img
          src={beforeSrc}
          alt={beforeAlt}
          className="absolute inset-0 h-full object-cover"
          style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100vw', maxWidth: 'none' }}
          draggable={false}
        />
        {/* text-white, not text-foreground: this pill sits on a dark bg/42, and
            text-foreground (near-black) was almost unreadable against it. */}
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/42 backdrop-blur-sm text-white text-xs font-medium">
          Before
        </div>
      </div>

      {/* Hold for original — press and hold to see the untouched photo. */}
      <button
        type="button"
        onPointerDown={(e) => { e.stopPropagation(); stopIntro(); setHolding(true); }}
        onPointerUp={(e) => { e.stopPropagation(); setHolding(false); }}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setHolding(true); } }}
        onKeyUp={() => setHolding(false)}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to see your original photo"
        aria-pressed={holding}
        className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60 touch-none"
      >
        <Eye className="h-3.5 w-3.5" /> {holding ? 'Original' : 'Hold for original'}
      </button>

      {/* Slider handle */}
      <div
        className={`absolute top-0 bottom-0 z-20 pointer-events-none transition-opacity ${holding ? 'opacity-0' : ''}`}
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-0.5 h-full bg-white/80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L3 10L7 16" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 4L17 10L13 16" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
