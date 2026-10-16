import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Pinned horizontal gallery: the section is as tall as its track is wide,
 * the inner frame sticks to the viewport, and vertical scroll slides the
 * track sideways through the style templates applied to the example rooms.
 * Uses the same redesign photos as the hero's style tiles.
 *
 * Lives OUTSIDE a StackPanel: panels are overflow-hidden, which stops
 * position:sticky from pinning anything inside them.
 */

const CARDS = [
  { style: 'Scandinavian', room: 'Living room', image: '/assets/rooms/room-living-scandinavian.webp' },
  { style: 'Japanese', room: 'Bedroom', image: '/assets/rooms/room-bedroom-japanese.webp' },
  { style: 'Maximalism', room: 'Living room', image: '/assets/rooms/room-living-maximalism.webp' },
  { style: 'Minimal', room: 'Kitchen', image: '/assets/rooms/room-kitchen-minimal.webp' },
  { style: 'Scandinavian', room: 'Hall', image: '/assets/rooms/room-hall-scandinavian.webp' },
  { style: 'Maximalism', room: 'Bedroom', image: '/assets/rooms/room-bedroom-maximalism.webp' },
  { style: 'Japanese', room: 'Kitchen', image: '/assets/rooms/room-kitchen-japanese.webp' },
  { style: 'Minimal', room: 'Living room', image: '/assets/rooms/room-living-minimal.webp' },
];

export function StyleGallery() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  // How far the track has to travel = its overflow past the viewport.
  useLayoutEffect(() => {
    const measure = () => {
      const t = trackRef.current;
      if (t) setDistance(Math.max(0, t.scrollWidth - window.innerWidth + 32));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0.05, 0.95], ['0%', '100%']);

  return (
    <section
      ref={ref}
      id="styles"
      className="relative px-3 sm:px-4"
      // One screen of pinned time per screen of horizontal travel, plus the frame itself.
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-[84px] pb-4">
        <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[28px] bg-[linear-gradient(170deg,#003B33,#00332C_60%,#002923)] py-8 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(55% 60% at 90% 10%, rgba(0,160,140,.28), transparent 62%)' }}
          />
          <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4 px-6 sm:px-10">
            <div>
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">Style templates</span>
              <h2 className="mt-2 font-display text-[clamp(1.9rem,3.8vw,3.4rem)] font-medium leading-[1]">
                Same rooms.{' '}
                <span className="italic font-normal text-[#8FE3D4]">Every personality.</span>
              </h2>
            </div>
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-[#00594E] transition-transform hover:scale-[1.04]"
            >
              Try it on your room <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <motion.div ref={trackRef} style={{ x }} data-cursor="Scroll" className="relative flex min-h-0 flex-1 gap-4 px-6 sm:gap-5 sm:px-10">
            {CARDS.map((c, i) => (
              <article
                key={c.image}
                className="group relative h-full max-h-[460px] flex-none overflow-hidden rounded-[22px] bg-[#08463E] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)]"
                style={{ aspectRatio: '4 / 5' }}
              >
                <img
                  src={c.image}
                  alt={`${c.room} in the ${c.style} style template`}
                  loading="lazy"
                  className="h-full w-full scale-[1.1] object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
                />
                <span className="absolute left-4 top-3.5 font-label text-[12px] font-bold text-white/80">{String(i + 1).padStart(2, '0')}</span>
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(0,35,29,0.88))] px-5 pb-4 pt-14">
                  <h3 className="font-display text-[28px] italic leading-none">{c.style}</h3>
                  <p className="mt-1 font-label text-[12px] text-white/65">{c.room}</p>
                </div>
              </article>
            ))}
          </motion.div>

          <div className="relative mx-6 mt-6 h-1 overflow-hidden rounded-full bg-white/10 sm:mx-10">
            <motion.i className="block h-full rounded-full bg-[linear-gradient(90deg,#00A08C,#8FE3D4)]" style={{ width: bar }} />
          </div>
        </div>
      </div>
    </section>
  );
}
