import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Motion';

/**
 * What's in development, in one compact panel instead of two full
 * sections: room measurement and floor-plan recognition, each a card with
 * a small drawn-in visual. Clearly labelled as not available yet.
 */

const draw = (delay = 0) => ({
  initial: { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, margin: '-15% 0px' },
  transition: { pathLength: { duration: 1.4, delay, ease: [0.65, 0, 0.35, 1] as const }, opacity: { duration: 0.2, delay } },
});

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 6 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-15% 0px' },
  transition: { duration: 0.5, delay },
});

function MeasureVisual() {
  const reduce = useReducedMotion();
  const ink = '#00A08C';
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full">
      <defs>
        <pattern id="cs-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="rgba(0,89,78,0.07)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill="url(#cs-grid)" />
      {/* the room, traced wall by wall */}
      <motion.path d="M70 40 H250 V150 H170 V170 H70 Z" fill="none" stroke={ink} strokeWidth="3" strokeLinejoin="round" {...draw(0)} />
      {/* door swing and window */}
      <motion.path d="M70 120 A30 30 0 0 1 100 150" fill="none" stroke={ink} strokeWidth="1.5" strokeDasharray="3 3" {...draw(0.9)} />
      <motion.path d="M140 40 H200" stroke="#8FE3D4" strokeWidth="6" strokeLinecap="round" {...draw(1)} />
      {/* dimension lines */}
      <motion.path d="M70 24 H250 M70 19 V29 M250 19 V29" stroke="rgba(0,51,44,0.5)" strokeWidth="1" {...draw(1.2)} />
      <motion.path d="M266 40 V150 M261 40 H271 M261 150 H271" stroke="rgba(0,51,44,0.5)" strokeWidth="1" {...draw(1.3)} />
      <motion.text x="160" y="18" textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#00332C" {...fadeIn(1.6)}>4.20 m</motion.text>
      <motion.text x="290" y="99" textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#00332C" {...fadeIn(1.7)}>3.60 m</motion.text>
      <motion.g {...fadeIn(1.9)}>
        <rect x="118" y="86" width="84" height="26" rx="13" fill="#00594E" />
        <text x="160" y="103" textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#8FE3D4">15.1 m²</text>
      </motion.g>
      {/* the phone's scan sweeping the room */}
      {!reduce && (
        <motion.rect
          x="70" width="180" height="10" fill="url(#cs-beam)"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: [40, 160, 40], opacity: [0, 0.9, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      )}
      <defs>
        <linearGradient id="cs-beam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8FE3D4" stopOpacity="0" />
          <stop offset="0.5" stopColor="#8FE3D4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#8FE3D4" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PlanVisual() {
  const ink = '#00A08C';
  return (
    <div className="relative h-full w-full">
      <img
        src="/assets/rooms/room-living-scandinavian.webp"
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover [clip-path:polygon(58%_0,100%_0,100%_100%,42%_100%)]"
      />
      <svg viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="cs-grid2" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="rgba(0,89,78,0.07)" strokeWidth="1" />
          </pattern>
          <clipPath id="cs-left">
            <polygon points="0,0 186,0 134,200 0,200" />
          </clipPath>
        </defs>
        <g clipPath="url(#cs-left)">
          <rect width="320" height="200" fill="url(#cs-grid2)" />
          <motion.path d="M24 30 H170 V170 H24 Z M24 100 H96 V170 M96 30 V70" fill="none" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" {...draw(0)} />
          <motion.rect x="38" y="44" width="40" height="22" rx="4" fill="none" stroke={ink} strokeWidth="1.5" {...draw(0.8)} />
          <motion.circle cx="58" cy="135" r="13" fill="none" stroke={ink} strokeWidth="1.5" {...draw(1)} />
        </g>
        <motion.path d="M186 0 L134 200" stroke="#00594E" strokeWidth="2" {...draw(0.4)} />
        <motion.g {...fadeIn(1.4)}>
          <circle cx="160" cy="100" r="13" fill="#00594E" />
          <path d="M155 100 H165 M161 96 L165 100 L161 104" stroke="#8FE3D4" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      </svg>
    </div>
  );
}

const CARDS = [
  {
    k: 'measure',
    title: 'Room Measurement',
    body: 'Record a room with your phone and get an editable floor plan — wall lengths, doors, windows and total area.',
    Visual: MeasureVisual,
  },
  {
    k: 'plan',
    title: 'Floor Plan Recognition',
    body: 'Upload a plan on paper and Think Decor rebuilds it as a furnished 3D home you can walk through and edit.',
    Visual: PlanVisual,
  },
];

export function ComingSoonStrip() {
  return (
    <section className="relative py-16 lg:py-20">
      <div className="container mx-auto max-w-[1200px] px-6 sm:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F2A93B]" /> In development · not available yet
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-medium leading-[1.04] text-foreground">
              What Mantha learns <span className="italic text-[#00A08C]">next.</span>
            </h2>
          </div>
          <a
            href="#newsletter"
            className="group inline-flex items-center gap-2 rounded-full bg-[#00594E] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-transform duration-300 hover:scale-[1.03]"
          >
            Tell me when it&rsquo;s ready
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {CARDS.map(({ k, title, body, Visual }, i) => (
            <Reveal key={k} delay={i * 0.08} y={28}>
              <article className="group h-full overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_-34px_rgba(0,52,45,0.45),inset_0_0_0_1px_rgba(0,89,78,0.08)] transition-transform duration-500 hover:-translate-y-1">
                <div className="aspect-[16/10] overflow-hidden bg-[#F4FAF8]">
                  <Visual />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[19px] font-bold tracking-[-0.01em] text-foreground">{title}</h3>
                    <span className="rounded-full bg-[#F2A93B]/12 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#9A6A12]">Coming soon</span>
                  </div>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-foreground/62">{body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
