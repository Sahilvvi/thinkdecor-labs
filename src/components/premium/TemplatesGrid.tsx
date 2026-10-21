import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stagger, staggerItem } from './Motion';

/**
 * Templates — the original grid from the homepage's generator section, kept
 * as its own panel now that the generator is Mantha Studio: five finished
 * looks with their colour swatches, a "Tried it?" note and a "create your
 * own" card. Every card leads to sign-up, where templates are applied.
 */

// The prototype's own template photos — already correctly matched to their
// names (verified frame by frame), just never wired up on this page.
const TEMPLATE_GRID = [
  {
    key: 'nordic-light',
    label: 'Nordic Light',
    tag: 'Paint · Floor',
    image: '/assets/rooms/t-scandi.webp',
    alt: 'Light Scandinavian dining room',
    swatches: ['#F2EFE9', '#C9B79C', '#8FB5B8'],
  },
  {
    key: 'warm-classic',
    label: 'Warm Classic',
    tag: 'Paint',
    image: '/assets/rooms/t-classic.webp',
    alt: 'Warm classic living room with fireplace',
    swatches: ['#E8DCC4', '#F6F1E6', '#B7A58B'],
  },
  {
    key: 'evening-noir',
    label: 'Evening Noir',
    tag: 'Paint · Wallpaper',
    image: '/assets/rooms/t-noir.webp',
    alt: 'Dark moody bedroom lit by lamps',
    swatches: ['#2A2521', '#6E5A45', '#D8C6A8'],
  },
  {
    key: 'soft-japandi',
    label: 'Soft Japandi',
    tag: 'Paint · Floor',
    image: '/assets/rooms/t-japandi.webp',
    alt: 'Calm bedroom with rattan and plants',
    swatches: ['#F3F1EC', '#CDB892', '#7C8A6A'],
  },
  {
    key: 'harbour-teal',
    label: 'Harbour Teal',
    tag: 'Paint · Textiles',
    image: '/assets/rooms/t-teal.webp',
    alt: 'Living room with teal sofa and curtains',
    swatches: ['#2F7F86', '#1F1F1F', '#E6D9BF'],
  },
];

export function TemplatesGrid() {
  return (
    <section className="relative py-16 lg:py-20">
      <div className="container relative mx-auto max-w-[1200px] px-6 sm:px-8">
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-5" gap={0.06}>
          <motion.li variants={staggerItem} className="col-span-2 flex list-none flex-col justify-center gap-2.5 pr-2 sm:col-span-4 lg:col-span-1">
            <h3 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1] text-foreground">
              <em className="italic text-primary">Templates</em>
            </h3>
            <p className="text-[14.5px] text-foreground/58">
              A template is a finished look: colours, finish and flooring chosen to work
              together. Tap one and Mantha transforms your room in a single click.
            </p>
          </motion.li>

          {TEMPLATE_GRID.map((t) => (
            <motion.li key={t.key} variants={staggerItem} className="list-none">
              <Link
                to="/signup"
                aria-label={`Apply ${t.label} template`}
                className="group relative block aspect-[4/4.4] overflow-hidden rounded-[18px] bg-foreground"
              >
                <img data-curtain loading="lazy" decoding="async"
                  src={t.image}
                  alt={t.alt}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,52,45,0.85))]" />
                <span className="pointer-events-none absolute right-3 top-3 flex gap-1">
                  {t.swatches.map((c) => (
                    <i key={c} style={{ background: c }} className="h-3.5 w-3.5 rounded-full shadow-[0_0_0_1.5px_rgba(255,255,255,0.9)]" />
                  ))}
                </span>
                <span className="pointer-events-none absolute inset-x-3.5 bottom-3.5">
                  <span className="block font-label text-[10.5px] uppercase tracking-[0.08em] text-[#8FE3D4]">{t.tag}</span>
                  <b className="block font-display text-[19px] font-medium leading-[1.1] text-white">{t.label}</b>
                </span>
              </Link>
            </motion.li>
          ))}

          <motion.li variants={staggerItem} className="col-span-2 flex list-none flex-col justify-center gap-2.5 pr-2 sm:col-span-4 lg:col-span-1">
            <h3 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1] text-foreground">
              Tried it<em className="italic text-primary">?</em>
            </h3>
            <p className="text-[14.5px] text-foreground/58">
              Pick a template above, or mix your own from any paint, paper and floor in the
              catalogue, and keep it for the next room.
            </p>
          </motion.li>

          <motion.li variants={staggerItem} className="list-none">
            <Link
              to="/signup"
              aria-label="Create your own template"
              className="group relative block aspect-[4/4.4] overflow-hidden rounded-[18px] bg-[hsl(28_30%_30%)]"
            >
              <img loading="lazy" decoding="async" src="/assets/rooms/t-own.webp" alt="" className="h-full w-full object-cover opacity-35 grayscale transition-opacity duration-500 group-hover:opacity-45" />
              <span className="pointer-events-none absolute left-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[22px] leading-none text-primary-foreground">+</span>
              <span className="pointer-events-none absolute inset-x-3.5 bottom-3.5">
                <span className="block font-label text-[10.5px] uppercase tracking-[0.08em] text-[#8FE3D4]">Your mix</span>
                <b className="block font-display text-[17px] font-medium leading-[1.15] text-white">Create your own template</b>
              </span>
            </Link>
          </motion.li>
        </Stagger>
      </div>
    </section>
  );
}
