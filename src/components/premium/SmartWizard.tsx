import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Square, RectangleHorizontal, Grid2X2, Check } from 'lucide-react';
import { Reveal, Magnetic, Counter } from './Motion';

const SHAPES = [
  { id: 'sq', label: 'Square', icon: Square, d: 'M60,50 h200 v160 h-200 Z' },
  { id: 'rect', label: 'Rectangle', icon: RectangleHorizontal, d: 'M34,66 h252 v128 h-252 Z' },
  { id: 'l', label: 'L-shaped', icon: Grid2X2, d: 'M50,46 h150 v80 h86 v88 h-236 Z' },
];

const ROOMS = ['Living room', 'Bedroom', 'Kitchen', 'Office', 'Bathroom', 'Kids room'];
const LOOKS = [
  { id: 'scandi', label: 'Scandinavian', img: '/assets/samples/1.jpg' },
  { id: 'modern', label: 'Modern', img: '/assets/samples/styled_room.png' },
  { id: 'classic', label: 'Classic', img: '/assets/samples/3.jpg' },
];

/** Smart Wizard — pick shape, room and style; watch 2D + 3D generate. */
export function SmartWizard() {
  const [shape, setShape] = useState(0);
  const [room, setRoom] = useState(0);
  const [look, setLook] = useState(1);

  return (
    <section id="wizard" className="scroll-mt-24 py-16 lg:py-20">
      <div className="container mx-auto max-w-[1200px] px-6 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
          {/* ---------- visual ---------- */}
          <Reveal y={36} blur={16}>
            <div className="relative overflow-hidden rounded-[26px] border border-foreground/[0.10] bg-white shadow-[0_30px_80px_-24px_hsl(168_30%_15%/0.20)]">
              {/* floating counters */}
              <div className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 gap-2">
                <span className="flex items-baseline gap-1.5 rounded-full border border-foreground/15 bg-black/42 px-3.5 py-1.5 backdrop-blur-md">
                  <span className="text-[13px] font-semibold text-foreground"><Counter to={6} /></span>
                  <span className="text-[11px] text-foreground/58">room types</span>
                </span>
                <span className="flex items-baseline gap-1.5 rounded-full border border-foreground/15 bg-black/42 px-3.5 py-1.5 backdrop-blur-md">
                  <span className="text-[13px] font-semibold text-foreground"><Counter to={22} /></span>
                  <span className="text-[11px] text-foreground/58">interior styles</span>
                </span>
              </div>

              <div className="relative aspect-[4/3]">
                {/* 3D result side */}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={LOOKS[look].id}
                    src={LOOKS[look].img}
                    alt={`${LOOKS[look].label} result`}
                    initial={{ opacity: 0, scale: 1.04, filter: 'blur(14px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
                  />
                </AnimatePresence>

                {/* 2D plan side */}
                <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}>
                  <svg viewBox="0 0 320 260" className="h-full w-full">
                    <g opacity="0.16">
                      {Array.from({ length: 17 }).map((_, i) => (
                        <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="260" stroke="hsl(168 40% 45%)" strokeWidth="0.5" />
                      ))}
                      {Array.from({ length: 14 }).map((_, i) => (
                        <line key={`h${i}`} x1="0" y1={i * 20} x2="320" y2={i * 20} stroke="hsl(168 40% 45%)" strokeWidth="0.5" />
                      ))}
                    </g>
                    <AnimatePresence mode="wait">
                      <motion.path
                        key={SHAPES[shape].id}
                        d={SHAPES[shape].d}
                        fill="hsl(168 100% 17% / 0.22)"
                        stroke="hsl(160 84% 52%)"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </AnimatePresence>
                    <motion.text
                      key={`${ROOMS[room]}-label`}
                      x="160" y="130" textAnchor="middle" fill="white" fontSize="13" fontWeight="600"
                      initial={{ opacity: 0, y: 138 }} animate={{ opacity: 0.92, y: 130 }} transition={{ duration: 0.5 }}
                    >
                      {ROOMS[room]}
                    </motion.text>
                    <motion.text
                      x="160" y="147" textAnchor="middle" fill="hsl(160 70% 62%)" fontSize="10" fontFamily="monospace"
                      initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.2 }}
                    >
                      2D plan
                    </motion.text>
                  </svg>
                </div>

                {/* seam */}
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-gradient-to-b from-[hsl(160_84%_55%)] via-[hsl(160_84%_45%)] to-[hsl(168_100%_25%)] shadow-[0_0_28px_hsl(160_84%_45%/0.85)]" />

                <span className="absolute bottom-5 left-5 rounded-full border border-foreground/15 bg-black/42 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 backdrop-blur-md">2D</span>
                <span className="absolute bottom-5 right-5 rounded-full border border-primary/40 bg-primary/85 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground backdrop-blur-md">3D</span>
              </div>

              {/* wizard controls */}
              <div className="space-y-3 border-t border-foreground/[0.08] bg-black/35 p-5 backdrop-blur-xl">
                {[
                  { label: 'Shape', items: SHAPES.map((s) => s.label), value: shape, set: setShape },
                  { label: 'Room', items: ROOMS, value: room, set: setRoom },
                  { label: 'Style', items: LOOKS.map((l) => l.label), value: look, set: setLook },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-12 flex-shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/45">{row.label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {row.items.map((it, i) => (
                        <button
                          key={it}
                          onClick={() => row.set(i)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all duration-300 ${
                            row.value === i
                              ? 'bg-primary font-medium text-primary-foreground'
                              : 'border border-foreground/[0.10] bg-foreground/[0.025] text-foreground/58 hover:text-foreground/85'
                          }`}
                        >
                          {row.value === i && <Check className="h-3 w-3" />}
                          {it}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ---------- copy ---------- */}
          <div>
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">In development</p>
              <h2 className="mt-5 text-[clamp(2rem,4.2vw,3.2rem)] font-bold leading-[1.06] tracking-[-0.025em] text-foreground">
                Smart Wizard
              </h2>
              <p className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-foreground/58">
                No existing project? Pick the shape, style and type of room you need and
                Think Decor does the rest. In a few moments you get a professional{' '}
                <span className="text-primary">2D</span> and <span className="text-primary">3D</span>{' '}
                design you can customise however you like.
              </p>
            </Reveal>

            <Reveal delay={0.12} className="mt-8 grid grid-cols-3 gap-3">
              {[
                { v: 6, l: 'Room types' },
                { v: 22, l: 'Interior styles' },
                { v: 3, l: 'Clicks to design' },
              ].map((m) => (
                <div key={m.l} className="rounded-2xl border border-foreground/[0.09] bg-foreground/[0.025] px-4 py-5 text-center backdrop-blur-xl">
                  <div className="text-[26px] font-bold text-foreground"><Counter to={m.v} /></div>
                  <p className="mt-1 text-[12px] text-foreground/50">{m.l}</p>
                </div>
              ))}
            </Reveal>

            <Reveal delay={0.2} className="mt-8">
              <Magnetic>
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-7 py-3.5 text-[14.5px] font-semibold text-primary-foreground shadow-[0_14px_32px_-12px_hsl(168_100%_17%/0.45)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
                >
                  Try photo redesigns free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Magnetic>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
