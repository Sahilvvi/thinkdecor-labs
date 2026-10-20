import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Live prompt playground: a typewriter writes a change ("a green velvet
 * sofa") and the room follows the keystrokes — the edited photo blends in
 * character by character, only inside the item's bounding box, while the
 * key words light up as tokens once they're typed. Tap a chip to run one.
 * The edited photos are real pre-generated Mantha recolours of this room.
 */

const BASE = '/assets/rooms/hero.webp';

type Prompt = {
  text: string;
  tokens: string[];
  after: string;
  /** bounding box of the edited item, % of the photo: [left, top, right, bottom] */
  box: [number, number, number, number];
  item: string;
};

const SOFA_BOX: [number, number, number, number] = [17, 42, 89, 99];

const PROMPTS: Prompt[] = [
  { text: 'a green velvet sofa', tokens: ['green', 'velvet', 'sofa'], after: '/assets/rooms/colours/living-sofa-sage.webp', box: SOFA_BOX, item: 'Sofa' },
  { text: 'whitewashed oak floors', tokens: ['whitewashed', 'oak', 'floors'], after: '/assets/rooms/colours/living-floor-whitewash.webp', box: [0, 70, 100, 100], item: 'Floor' },
  { text: 'forest green cabinets', tokens: ['forest', 'green', 'cabinets'], after: '/assets/rooms/colours/living-storage-green.webp', box: [0, 3, 38, 73], item: 'Cabinets' },
  { text: 'a cream bouclé sofa', tokens: ['cream', 'bouclé', 'sofa'], after: '/assets/rooms/colours/living-sofa-cream.webp', box: SOFA_BOX, item: 'Sofa' },
];

const TYPE_MS = 70;
const HOLD_MS = 2200;

type Phase = 'typing' | 'hold' | 'clearing';

export function PromptMorph() {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host, { margin: '0px 0px -15% 0px' });
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const prompt = PROMPTS[index];

  // preload every edited photo once
  useEffect(() => { PROMPTS.forEach((p) => { const i = new Image(); i.src = p.after; }); }, []);

  useEffect(() => {
    if (!inView) return;
    let t: number;
    if (phase === 'typing') {
      if (typed < prompt.text.length) {
        t = window.setTimeout(() => {
          setTyped(typed + 1);
        }, TYPE_MS + Math.random() * 50);
      } else {
        t = window.setTimeout(() => setPhase('hold'), 120);
      }
    } else if (phase === 'hold') {
      t = window.setTimeout(() => setPhase('clearing'), HOLD_MS);
    } else {
      t = window.setTimeout(() => {
        setIndex((i) => (i + 1) % PROMPTS.length);
        setTyped(0);
        setPhase('typing');
      }, 650);
    }
    return () => window.clearTimeout(t);
  }, [inView, phase, typed, prompt]);

  const run = (i: number) => {
    setIndex(i);
    setTyped(0);
    setPhase('typing');
  };

  const progress = phase === 'clearing' ? 0 : typed / prompt.text.length;
  const eased = progress * progress * (3 - 2 * progress);
  const [l, t, r, b] = prompt.box;
  const boxStyle = { left: `${l}%`, top: `${t}%`, width: `${r - l}%`, height: `${b - t}%` };

  return (
    <div ref={host} className="grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-center">
      <div className="order-2 md:order-1">
        {/* the prompt bar */}
        <div className="rounded-[16px] bg-white p-4 shadow-[0_14px_34px_-18px_rgba(0,52,45,0.45),inset_0_0_0_1px_#D3E6E2]">
          <span className="flex items-center gap-1.5 font-label text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A08C]">
            <Sparkles className="h-3 w-3" /> Describe a change
          </span>
          <p className="mt-2 min-h-[30px] font-display text-[clamp(18px,2vw,23px)] leading-snug text-[#00332C]" aria-live="polite">
            <TypedText text={prompt.text} typed={typed} tokens={prompt.tokens} />
            <span className="ml-0.5 inline-block h-5 w-[2px] translate-y-1 animate-pulse bg-[#00A08C]" />
          </p>
          <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-[#E3F1EE]">
            <motion.span
              className="block h-full rounded-full bg-[linear-gradient(90deg,#00A08C,#8FE3D4)]"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.12 }}
            />
          </div>
          <p className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#4F6F6A]">
            <span>Target · {prompt.item}</span>
            <span>{phase === 'hold' ? 'Applied' : `${Math.round(progress * 100)}%`}</span>
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMPTS.map((p, i) => (
            <button
              key={p.text}
              type="button"
              onClick={() => run(i)}
              className={cn(
                'rounded-full px-3 py-1.5 font-label text-[12px] font-bold transition-colors',
                i === index ? 'bg-[#00A08C] text-white' : 'bg-white text-[#00594E] shadow-[inset_0_0_0_1px_#D3E6E2] hover:bg-[#EEF8F6]',
              )}
            >
              “{p.text}”
            </button>
          ))}
        </div>
      </div>

      {/* the room, following the keystrokes */}
      <div className="relative order-1 aspect-[1024/765] overflow-hidden rounded-[16px] md:order-2">
        <img src={BASE} alt="Living room the prompt is applied to" className="absolute inset-0 h-full w-full object-cover" />
        {PROMPTS.map((p, i) => (
          <img
            key={p.after}
            src={p.after}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-150"
            style={{
              opacity: i === index ? eased : 0,
              clipPath: `inset(${p.box[1]}% ${100 - p.box[2]}% ${100 - p.box[3]}% ${p.box[0]}% round 10px)`,
              transition: phase === 'clearing' ? 'opacity 0.6s ease' : 'opacity 0.12s linear',
            }}
          />
        ))}

        {/* bounding box + shimmer, only around the item being edited */}
        <AnimatePresence>
          {phase !== 'clearing' && typed > 0 && (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute"
              style={boxStyle}
            >
              {phase === 'typing' && (
                <span className="absolute inset-0 overflow-hidden rounded-[10px]">
                  <span className="lab-shimmer absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(143,227,212,0.35),transparent)]" />
                </span>
              )}
              <svg className="absolute inset-0 h-full w-full overflow-visible">
                <rect
                  x="0" y="0" width="100%" height="100%" rx="10"
                  fill="none" stroke="#8FE3D4" strokeWidth="1.6" strokeDasharray="7 5"
                  className="lab-dash"
                />
              </svg>
              {/* corner ticks */}
              {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'left-0 bottom-0 border-l-2 border-b-2', 'right-0 bottom-0 border-r-2 border-b-2'].map((c) => (
                <span key={c} className={cn('absolute h-3 w-3 border-white', c)} />
              ))}
              <span className="absolute -top-7 left-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#00231D]/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8FE3D4] backdrop-blur-md">
                {phase === 'hold' ? <><Check className="h-3 w-3" /> {prompt.item} · done</> : <>{prompt.item} · {Math.round(progress * 100)}%</>}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The typed text so far, with fully typed key words lit up as tokens. */
function TypedText({ text, typed, tokens }: { text: string; typed: number; tokens: string[] }) {
  const shown = text.slice(0, typed);
  // only typed characters are shown, so a word equals a token only once it's complete
  const parts = shown.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (!tokens.includes(part)) return <span key={i}>{part}</span>;
        return (
          <motion.span
            key={i}
            initial={{ backgroundColor: 'rgba(0,160,140,0)', boxShadow: '0 0 0 0 rgba(143,227,212,0)' }}
            animate={{ backgroundColor: 'rgba(0,160,140,0.14)', boxShadow: '0 0 18px 0 rgba(143,227,212,0.55)' }}
            transition={{ duration: 0.35 }}
            className="rounded-[6px] px-1 text-[#00796B] [box-decoration-break:clone]"
          >
            {part}
          </motion.span>
        );
      })}
    </>
  );
}
