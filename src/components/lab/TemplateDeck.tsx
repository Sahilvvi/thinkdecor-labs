import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollWords } from './KineticType';

/**
 * Templates as a deck you can flick through: the cards stand in 3D, the one
 * in front is the current template, and its palette appears beside it as
 * paint chips while the panel's light takes on its colours. Drag or swipe
 * the deck, tap a card, or use the arrows / arrow keys.
 */

const TEMPLATES = [
  {
    key: 'nordic-light',
    name: 'Nordic Light',
    changes: ['Paint', 'Floor'],
    line: 'Bright walls, pale oak underfoot and a cool blue note. Small rooms feel twice the size.',
    image: '/assets/rooms/t-scandi.webp',
    alt: 'Light Scandinavian dining room',
    chips: [{ hex: '#F2EFE9', name: 'Chalk' }, { hex: '#C9B79C', name: 'Pale oak' }, { hex: '#8FB5B8', name: 'Fjord' }],
  },
  {
    key: 'warm-classic',
    name: 'Warm Classic',
    changes: ['Paint'],
    line: 'Creamy walls and soft stone. Timeless, warm, and easy to live with.',
    image: '/assets/rooms/t-classic.webp',
    alt: 'Warm classic living room with fireplace',
    chips: [{ hex: '#E8DCC4', name: 'Cream' }, { hex: '#F6F1E6', name: 'Linen' }, { hex: '#B7A58B', name: 'Stone' }],
  },
  {
    key: 'evening-noir',
    name: 'Evening Noir',
    changes: ['Paint', 'Wallpaper'],
    line: 'Deep, lamp-lit and cosy. Dark walls that make a bedroom feel like a hotel.',
    image: '/assets/rooms/t-noir.webp',
    alt: 'Dark moody bedroom lit by lamps',
    chips: [{ hex: '#2A2521', name: 'Ink' }, { hex: '#6E5A45', name: 'Walnut' }, { hex: '#D8C6A8', name: 'Parchment' }],
  },
  {
    key: 'soft-japandi',
    name: 'Soft Japandi',
    changes: ['Paint', 'Floor'],
    line: 'Rice-paper calm, rattan warmth and plants. A room that slows you down.',
    image: '/assets/rooms/t-japandi.webp',
    alt: 'Calm bedroom with rattan and plants',
    chips: [{ hex: '#F3F1EC', name: 'Rice' }, { hex: '#CDB892', name: 'Rattan' }, { hex: '#7C8A6A', name: 'Moss' }],
  },
  {
    key: 'harbour-teal',
    name: 'Harbour Teal',
    changes: ['Paint', 'Textiles'],
    line: 'A bold teal against black and sand. Confident colour that still feels grown-up.',
    image: '/assets/rooms/t-teal.webp',
    alt: 'Living room with teal sofa and curtains',
    chips: [{ hex: '#2F7F86', name: 'Harbour' }, { hex: '#1F1F1F', name: 'Coal' }, { hex: '#E6D9BF', name: 'Sand' }],
  },
];

export function TemplateDeck() {
  const [active, setActive] = useState(0);
  const go = (i: number) => setActive((i + TEMPLATES.length) % TEMPLATES.length);
  const t = TEMPLATES[active];

  const onPanEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -40 || info.velocity.x < -300) go(active + 1);
    else if (info.offset.x > 40 || info.velocity.x > 300) go(active - 1);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { go(active + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(active - 1); e.preventDefault(); }
  };

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      {/* the panel's light takes on the template's colours */}
      <AnimatePresence initial={false}>
        <motion.div
          key={t.key}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60% 55% at 70% 45%, ${t.chips[2].hex}33, transparent 70%), radial-gradient(45% 50% at 20% 80%, ${t.chips[1].hex}40, transparent 70%)`,
          }}
        />
      </AnimatePresence>

      <div className="container relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          {/* ---------- the words and the palette ---------- */}
          <div className="order-2 lg:order-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Templates</p>
            <ScrollWords
              className="mt-3 font-display text-[clamp(2.1rem,4.2vw,3.5rem)] font-medium leading-[1] text-foreground"
              segments={[{ text: 'A finished look, ' }, { text: 'one tap.', className: 'italic text-[#00A08C]' }]}
            />
            <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-foreground/62">
              Each template is a palette of paint, floors and fabrics chosen to work together. Pick one and Mantha applies it to your room.
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={t.key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-[28px] font-medium leading-none text-foreground">{t.name}</h3>
                  <span className="font-mono text-[11px] text-foreground/40">
                    {String(active + 1).padStart(2, '0')} / {String(TEMPLATES.length).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/62">{t.line}</p>

                {/* paint chips */}
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {t.chips.map((c, i) => (
                    <motion.div
                      key={c.hex}
                      initial={{ opacity: 0, y: 18, rotate: -4 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      transition={{ delay: 0.08 + i * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
                      className="overflow-hidden rounded-[12px] bg-white shadow-[0_12px_28px_-16px_rgba(0,40,34,0.45),inset_0_0_0_1px_rgba(0,0,0,0.05)]"
                    >
                      <div className="h-14" style={{ background: c.hex }} />
                      <div className="px-2.5 py-2">
                        <b className="block text-[12.5px] font-semibold text-foreground">{c.name}</b>
                        <span className="font-mono text-[10px] uppercase text-foreground/45">{c.hex}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-foreground/50">Changes</span>
                  {t.changes.map((c) => (
                    <span key={c} className="rounded-full bg-[#00594E]/[0.07] px-3 py-1 text-[12px] font-semibold text-[#00594E]">{c}</span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-3">
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-[#00594E] px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:scale-[1.03]"
              >
                Use {t.name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button type="button" aria-label="Previous template" onClick={() => go(active - 1)} className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Next template" onClick={() => go(active + 1)} className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ---------- the deck ---------- */}
          <motion.div
            className="relative order-1 h-[clamp(320px,52vw,500px)] cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing lg:order-2"
            onPanEnd={onPanEnd}
            tabIndex={0}
            role="listbox"
            aria-label="Templates"
            aria-activedescendant={`tpl-${t.key}`}
            onKeyDown={onKey}
          >
            {TEMPLATES.map((tp, i) => {
              // shortest signed distance around the ring, so it wraps both ways
              let d = i - active;
              if (d > TEMPLATES.length / 2) d -= TEMPLATES.length;
              if (d < -TEMPLATES.length / 2) d += TEMPLATES.length;
              const far = Math.abs(d);
              return (
                <div key={tp.key} className="pointer-events-none absolute inset-0 flex items-center justify-center [perspective:1600px]" style={{ zIndex: 10 - far }}>
                <motion.button
                  id={`tpl-${tp.key}`}
                  role="option"
                  aria-selected={d === 0}
                  type="button"
                  onClick={() => go(i)}
                  className="pointer-events-auto relative aspect-[4/5] h-[86%] overflow-hidden rounded-[24px] bg-[#0A1C18] text-left shadow-[0_40px_80px_-30px_rgba(0,30,25,0.6)]"
                  initial={false}
                  animate={{
                    x: `${d * 46}%`,
                    rotateY: d * -32,
                    z: -far * 160,
                    scale: d === 0 ? 1 : 0.86,
                    opacity: far > 2 ? 0 : 1 - far * 0.18,
                    filter: d === 0 ? 'brightness(1)' : 'brightness(0.62)',
                  }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                >
                  <img src={tp.image} alt={tp.alt} draggable={false} loading="lazy" className="h-full w-full object-cover" />
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(0,20,17,0.85))]" />
                  <span className="pointer-events-none absolute right-3 top-3 flex">
                    {tp.chips.map((c) => (
                      <i key={c.hex} style={{ background: c.hex }} className="-ml-1.5 h-5 w-5 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.9)] first:ml-0" />
                    ))}
                  </span>
                  <span className={cn('pointer-events-none absolute inset-x-4 bottom-4 transition-opacity', d === 0 ? 'opacity-100' : 'opacity-0')}>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#8FE3D4]">{tp.changes.join(' · ')}</span>
                    <b className="block font-display text-[24px] font-medium leading-tight text-white">{tp.name}</b>
                  </span>
                </motion.button>
                </div>
              );
            })}
            <p className="pointer-events-none absolute inset-x-0 -bottom-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/35">
              Drag or swipe the deck
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
