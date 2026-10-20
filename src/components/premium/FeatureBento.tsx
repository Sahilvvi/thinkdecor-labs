import { useEffect, useState, type PointerEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptMorph } from '@/components/lab/PromptMorph';
import { SpringCompare } from '@/components/lab/SpringCompare';
import { ScrollWords } from '@/components/lab/KineticType';

/**
 * Feature bento — five cards, each with a small looping illustration of the
 * feature, a soft spotlight that follows the cursor and a gentle tilt.
 * Copy only describes what the product does today.
 */
export function FeatureBento() {
  return (
    <section className="relative py-16 lg:py-24">
      <div className="container mx-auto max-w-[1200px] px-6 sm:px-8">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Everything in one app</p>
          <ScrollWords
            className="mt-4 font-display text-[clamp(2rem,4.4vw,3.6rem)] font-medium leading-[1.02] text-foreground"
            segments={[{ text: 'Your pocket ' }, { text: 'interior designer.', className: 'italic font-normal text-[#00A08C]' }]}
          />
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Card className="md:col-span-3" title="Tap any item" body="Sofa, floor, cabinets, walls. Tap it, pick a colour or finish, and see it on the same photo.">
            <Swatches />
          </Card>
          <Card className="md:col-span-3" title="Style templates" body="Not sure where to start? Pick a finished look and Mantha AI restyles the whole room.">
            <StyleChips />
          </Card>
          <article className="relative overflow-hidden rounded-[24px] border border-border bg-[linear-gradient(160deg,#F4FAF8,#E6F3F0)] p-5 shadow-[0_18px_40px_-30px_rgba(0,52,45,0.45)] sm:p-7 md:col-span-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <h3 className="font-display text-[clamp(22px,2.4vw,30px)] leading-tight text-foreground">Describe a change</h3>
              <p className="max-w-[46ch] text-[14.5px] leading-relaxed text-foreground/65">
                Type it like you&rsquo;d say it, and watch the room follow the words.
              </p>
            </div>
            <PromptMorph />
          </article>
          <Card className="md:col-span-3" mediaClassName="h-[230px]" title="Before and after" body="Compare the redesign against your real room before you buy a thing.">
            <SpringCompare
              before="/assets/rooms/hero.webp"
              after="/assets/rooms/room-living-scandinavian.webp"
              autoplay
              className="absolute inset-0"
            />
          </Card>
          <Card className="md:col-span-3" mediaClassName="h-[230px]" title="Save, download, share" body="Every design is kept in your library to download or send as a link.">
            <Share />
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({ title, body, children, className, mediaClassName }: { title: string; body: string; children: ReactNode; className?: string; mediaClassName?: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty('--mx', `${x * 100}%`);
    e.currentTarget.style.setProperty('--my', `${y * 100}%`);
    setTilt({ x: (x - 0.5) * 6, y: -(y - 0.5) * 6 });
  };
  return (
    <motion.article
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      animate={{ rotateY: tilt.x, rotateX: tilt.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      style={{ transformPerspective: 900 }}
      className={cn(
        'group relative overflow-hidden rounded-[24px] border border-border bg-white p-6 shadow-[0_18px_40px_-30px_rgba(0,52,45,0.45)] transition-colors hover:border-[#00A08C]/40',
        className,
      )}
    >
      {/* cursor spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(380px circle at var(--mx,50%) var(--my,0%), rgba(0,160,140,0.12), transparent 45%)' }}
      />
      <div className={cn('relative grid h-[150px] place-items-center overflow-hidden rounded-[16px] bg-[linear-gradient(160deg,#EEF8F6,#E3F1EE)]', mediaClassName)}>
        {children}
      </div>
      <h3 className="relative mt-5 font-display text-[22px] leading-tight text-foreground">{title}</h3>
      <p className="relative mt-1.5 text-[14.5px] leading-relaxed text-foreground/65">{body}</p>
    </motion.article>
  );
}

const SWATCHES = ['#8A9F82', '#E9E1D3', '#B5603F', '#2C3E5C', '#C9962C', '#2F4A3A'];

function Swatches() {
  return (
    <div className="flex gap-3">
      {SWATCHES.map((c, i) => (
        <motion.span
          key={c}
          className="h-11 w-11 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1),0_8px_16px_-8px_rgba(0,0,0,0.4)]"
          style={{ background: c }}
          animate={{ y: [0, -12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.7, delay: i * 0.18, repeat: Infinity, repeatDelay: SWATCHES.length * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

const STYLES = ['Minimal', 'Scandinavian', 'Japanese', 'Maximalism', 'Japandi', 'Classic', 'Noir'];

function StyleChips() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % STYLES.length), 1100);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="flex max-w-[360px] flex-wrap justify-center gap-2 px-4">
      {STYLES.map((s, n) => (
        <span
          key={s}
          className={cn(
            'rounded-full px-3.5 py-1.5 font-label text-[12.5px] font-bold transition-all duration-300',
            n === i ? 'scale-105 bg-[#00A08C] text-white shadow-[0_8px_18px_-8px_rgba(0,160,140,0.8)]' : 'bg-white text-[#00594E] shadow-[inset_0_0_0_1px_#D3E6E2]',
          )}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function Share() {
  return (
    <div className="relative">
      <div className="flex -space-x-6">
        {['/assets/rooms/room-living-minimal.webp', '/assets/rooms/room-bedroom-japanese.webp', '/assets/rooms/room-kitchen-scandinavian.webp'].map((src, i) => (
          <motion.img
            key={src}
            src={src}
            alt=""
            className="h-20 w-16 rounded-[10px] object-cover shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] ring-2 ring-white"
            style={{ rotate: (i - 1) * 8 }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <motion.span
        className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#00A08C] px-2.5 py-1 font-label text-[11px] font-bold text-white shadow"
        animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -4] }}
        transition={{ duration: 3.2, times: [0, 0.15, 0.8, 1], repeat: Infinity, repeatDelay: 0.6 }}
      >
        <Check className="h-3 w-3" /> Link copied
      </motion.span>
      <span className="absolute -right-10 top-1 grid h-7 w-7 place-items-center rounded-full bg-white text-[#00594E] shadow"><Link2 className="h-3.5 w-3.5" /></span>
      <span className="absolute -left-10 top-1 grid h-7 w-7 place-items-center rounded-full bg-white text-[#00594E] shadow"><Download className="h-3.5 w-3.5" /></span>
    </div>
  );
}
