import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/**
 * "One photo. Every room in the house." A pinned dive from room to room: as
 * you scroll, the camera pushes into a window of the room you're in, a round
 * portal opens in that window onto the next room (in a different style), and
 * you come through into it — living room → kitchen → bedroom → hall. All
 * real Mantha redesigns of our example rooms.
 *
 * Styles are written straight onto the images per frame (no React renders
 * while scrolling). Reduced motion gets the four rooms as a plain grid.
 */

const ROOMS = [
  { image: '/assets/rooms/room-living-scandinavian.webp', room: 'Living room', style: 'Scandinavian', focal: [0.55, 0.26] },
  { image: '/assets/rooms/room-kitchen-japanese.webp', room: 'Kitchen', style: 'Japandi', focal: [0.6, 0.27] },
  { image: '/assets/rooms/room-bedroom-minimal.webp', room: 'Bedroom', style: 'Minimal', focal: [0.66, 0.24] },
  { image: '/assets/rooms/room-hall-maximalism.webp', room: 'Hall', style: 'Maximalist', focal: [0.47, 0.26] },
] as const;

const smooth = (x: number) => x * x * (3 - 2 * x);

export function RoomDive() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const ring = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const [at, setAt] = useState(0);
  const [end, setEnd] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const n = ROOMS.length;
    const paint = (p: number) => {
      // a little hold at both ends, then one dive per gap between rooms
      const q = Math.min(1, Math.max(0, (p - 0.06) / 0.86));
      const s = Math.min(n - 1, q * (n - 1));
      const i = Math.min(n - 2, Math.floor(s));
      const f = s - i;
      const e = smooth(f);
      const [fx, fy] = ROOMS[i].focal;
      imgs.current.forEach((el, j) => {
        if (!el) return;
        if (j === i) {
          el.style.visibility = 'visible';
          el.style.transformOrigin = `${fx * 100}% ${fy * 100}%`;
          el.style.transform = `scale(${1 + e * 2.4})`;
          el.style.clipPath = 'none';
          el.style.filter = `brightness(${1 - e * 0.25})`;
          el.style.zIndex = '1';
        } else if (j === i + 1) {
          // the portal opens in the window of the room you're in
          const r = Math.pow(Math.max(0, (f - 0.12) / 0.88), 1.6) * 140;
          el.style.visibility = r > 0 ? 'visible' : 'hidden';
          el.style.transformOrigin = '50% 50%';
          el.style.transform = `scale(${1.35 - e * 0.35})`;
          el.style.clipPath = `circle(${r}% at ${fx * 100}% ${fy * 100}%)`;
          el.style.filter = 'none';
          el.style.zIndex = '2';
        } else {
          el.style.visibility = 'hidden';
        }
      });
      if (ring.current) {
        const show = f > 0.08 && f < 0.7;
        ring.current.style.opacity = show ? String(Math.sin(((f - 0.08) / 0.62) * Math.PI)) : '0';
        ring.current.style.left = `${fx * 100}%`;
        ring.current.style.top = `${fy * 100}%`;
        ring.current.style.transform = `translate(-50%, -50%) scale(${0.4 + e * 2.2})`;
      }
      setAt(f < 0.55 ? i : i + 1);
      setEnd(q > 0.97);
    };
    paint(scrollYProgress.get());
    return scrollYProgress.on('change', paint);
  }, [reduce, scrollYProgress]);

  if (reduce) {
    return (
      <section className="px-3 py-16 sm:px-4">
        <div className="container mx-auto max-w-[1200px]">
          <h2 className="font-display text-[clamp(2rem,4vw,3.2rem)] font-medium leading-[1.04] text-foreground">
            One photo. <span className="italic text-[#00A08C]">Every room in the house.</span>
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {ROOMS.map((r) => (
              <figure key={r.image} className="overflow-hidden rounded-[18px]">
                <img src={r.image} alt={`${r.room} redesigned in a ${r.style} style`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const cur = ROOMS[at];

  return (
    <section ref={section} id="every-room" className="relative px-3 sm:px-4" style={{ height: '380vh' }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center pb-[84px] pt-[76px] md:pb-3">
        <div className="relative h-full overflow-hidden rounded-[28px] bg-[#0A1C18] text-white">
          {ROOMS.map((r, j) => (
            <img
              key={r.image}
              ref={(el) => { imgs.current[j] = el; }}
              src={r.image}
              alt={`${r.room} redesigned in a ${r.style} style`}
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover will-change-transform"
              style={{ visibility: j === 0 ? 'visible' : 'hidden' }}
            />
          ))}
          {/* the portal's rim, as it opens */}
          <div ref={ring} aria-hidden className="pointer-events-none absolute z-[3] h-40 w-40 rounded-full opacity-0 shadow-[0_0_0_2px_rgba(143,227,212,0.85),0_0_60px_10px_rgba(143,227,212,0.35)]" />

          {/* legibility */}
          <div aria-hidden className="pointer-events-none absolute inset-0 z-[4] bg-[linear-gradient(180deg,rgba(0,0,0,0.45),transparent_32%,transparent_60%,rgba(0,0,0,0.6))]" />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-start justify-between gap-4 p-5 sm:p-8">
            <h2 className="max-w-[14ch] font-display text-[clamp(1.8rem,3.6vw,3.2rem)] font-medium leading-[1.02]">
              One photo. <span className="italic text-[#8FE3D4]">Every room in the house.</span>
            </h2>
            <div className="hidden gap-1.5 pt-2 sm:flex">
              {ROOMS.map((r, j) => (
                <span key={r.room} className={`h-1.5 rounded-full transition-all duration-500 ${j === at ? 'w-8 bg-[#8FE3D4]' : 'w-3 bg-white/35'}`} />
              ))}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-[5] flex flex-wrap items-end justify-between gap-4 p-5 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={cur.room}
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.4 }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8FE3D4]">
                  {String(at + 1).padStart(2, '0')} / {String(ROOMS.length).padStart(2, '0')} · {cur.style}
                </p>
                <p className="mt-1 font-display text-[clamp(1.8rem,3.4vw,2.8rem)] font-medium leading-none">{cur.room}</p>
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              {end && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Link
                    to="/signup"
                    className="pointer-events-auto group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#0A1C18] transition-transform hover:scale-[1.03]"
                  >
                    Start with one room <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
