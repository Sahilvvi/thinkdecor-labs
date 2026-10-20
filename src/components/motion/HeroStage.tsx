import { useEffect, useRef, useState } from 'react';
import { PLAY_STORE_URL } from '@/lib/appLinks';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Magnetic, Reveal, RevealWords, Stagger, staggerItem } from '@/components/premium/Motion';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DEMO_ROOMS, DEMO_STYLES, type StyleKey } from '@/lib/heroRooms';
import { DepthStage, type StageTransition } from '@/components/lab/DepthStage';
import { MaterialWords } from '@/components/lab/KineticType';
import { useIntroDone } from '@/lib/introState';

/** How long the "Mantha AI is redesigning…" beat plays before the new photo swaps in. */
const GENERATE_MS = 700;

/** Style names the hero's top line flips through. */
const FLIP_STYLES = ['7 styles', 'Minimal', 'Scandinavian', 'Japanese', 'Japandi', 'Maximalism', 'Classic', 'Noir'];

/**
 * Hero — an illustrative example room (not the visitor's own photo): tap a
 * dot on the sofa, floor or furniture and pick a colour to see it change,
 * switch rooms, try a style.
 * Nothing here calls the API; it's a fixed demo, same "illustrative, not
 * live" convention the marquee testimonials use, just for the value prop
 * instead of social proof.
 */
export function HeroStage({ onStageBoxMount }: { onStageBoxMount?: (el: HTMLDivElement | null) => void }) {
  const [roomKey, setRoomKey] = useState(DEMO_ROOMS[0].key);
  // No style selected by default: the stage opens on the plain room photo
  // with its hotspots. Picking a style swaps in that room's AI redesign —
  // the hotspots (tied to the original decor) step aside for it.
  const [styleKey, setStyleKey] = useState<StyleKey | null>(null);
  // While a style is "applying", the stage holds the old photo under a brief
  // Mantha AI processing beat instead of snapping straight to the new one —
  // it reads as a redesign happening, not an instant image swap.
  const [pendingStyle, setPendingStyle] = useState<StyleKey | null>(null);
  // Which colour pin has its swatch picker open, and which swatch is applied.
  // One recolour at a time: picking a colour on another pin replaces it.
  const [openPin, setOpenPin] = useState<number | null>(null);
  const [colour, setColour] = useState<{ pin: string; swatch: string } | null>(null);
  const [pendingColour, setPendingColour] = useState<{ pin: string; swatch: string } | null>(null);
  // Swatch photos that failed to load — hidden from the picker.
  const [missing, setMissing] = useState<Set<string>>(() => new Set());
  // Nudges the visitor toward the style tiles until they've tried one once.
  const [hasTriedStyle, setHasTriedStyle] = useState(false);
  // How the next photo change plays on the depth stage: a wireframe sweep
  // for rooms and styles, a ripple out from the dot for a colour swap.
  const [transition, setTransition] = useState<StageTransition>({ mode: 'sweep' });
  // The swatch under the pointer, previewed through a 2.5x loupe on the item.
  const [loupe, setLoupe] = useState<{ pin: string; image: string; label: string } | null>(null);
  // the headline waits for the cinematic intro, then plays its own entrance
  const introDone = useIntroDone();
  const [material, setMaterial] = useState('Sage velvet');
  const stageRef = useRef<HTMLDivElement>(null);
  const generateTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (generateTimer.current) window.clearTimeout(generateTimer.current);
  }, []);

  const room = DEMO_ROOMS.find((r) => r.key === roomKey) ?? DEMO_ROOMS[0];
  const styled = styleKey ? room.styles[styleKey] : null;
  const appliedPin = colour ? room.pins.find((p) => p.key === colour.pin) : undefined;
  const appliedSwatch = appliedPin?.swatches.find((s) => s.key === colour?.swatch);
  const stageImage = styled ?? (appliedSwatch && appliedSwatch.key !== 'original'
    ? { image: appliedSwatch.image, alt: `${room.alt}, with the ${appliedPin!.name.toLowerCase()} in ${appliedSwatch.label.toLowerCase()}` }
    : room);
  const generating = pendingStyle !== null || pendingColour !== null;
  const pendingLabel = pendingStyle
    ?? (pendingColour ? room.pins.find((p) => p.key === pendingColour.pin)?.swatches.find((s) => s.key === pendingColour.swatch)?.label : null);
  const activePin = openPin !== null ? room.pins[openPin] : null;

  // Swatch photos confirmed to exist. A pin only appears once at least one
  // of its colours has a photo, and the picker only lists those colours —
  // so a room whose recolours haven't been made yet shows no empty pickers.
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    room.pins.forEach((pin) => pin.swatches.forEach((sw) => {
      if (sw.key === 'original') return;
      const img = new Image();
      img.onload = () => setReady((r) => (r.has(sw.image) ? r : new Set(r).add(sw.image)));
      img.src = sw.image;
    }));
  }, [room]);
  const isAvailable = (sw: { key: string; image: string }) =>
    sw.key === 'original' || (ready.has(sw.image) && !missing.has(sw.image));

  // Idle hint on the photo: cycles through what this room can become
  // ("Sofa → Sage velvet"), so the dots read as an invitation.
  const ideas = room.pins.flatMap((pin) =>
    pin.swatches.filter((sw) => sw.key !== 'original' && isAvailable(sw)).map((sw) => `${pin.name} → ${sw.label}`),
  );
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [flipIndex, setFlipIndex] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdeaIndex((n) => n + 1), 2600);
    const f = window.setInterval(() => setFlipIndex((n) => n + 1), 2200);
    return () => { window.clearInterval(t); window.clearInterval(f); };
  }, []);
  const idea = ideas.length ? ideas[ideaIndex % ideas.length] : null;

  const selectRoom = (key: typeof room.key) => {
    if (generateTimer.current) window.clearTimeout(generateTimer.current);
    setPendingStyle(null);
    setPendingColour(null);
    setOpenPin(null);
    setColour(null);
    setStyleKey(null);
    setTransition({ mode: 'sweep' });
    setRoomKey(key);
  };

  const selectStyle = (key: StyleKey) => {
    if (generating) return;
    setOpenPin(null);
    setColour(null);
    setHasTriedStyle(true);
    setTransition({ mode: 'sweep' });
    if (styleKey === key) {
      setStyleKey(null);
      return;
    }
    setPendingStyle(key);
    generateTimer.current = window.setTimeout(() => {
      setStyleKey(key);
      setPendingStyle(null);
    }, GENERATE_MS);
  };

  const togglePin = (index: number) => {
    setLoupe(null);
    setOpenPin((cur) => (cur === index ? null : index));
    // Warm the cache so the swap after a swatch tap is instant, and drop any
    // swatch whose photo hasn't been generated yet rather than offering a
    // colour that would blank the stage.
    room.pins[index].swatches.forEach((sw) => {
      if (sw.key === 'original') return;
      const img = new Image();
      img.onerror = () => setMissing((m) => new Set(m).add(sw.image));
      img.src = sw.image;
    });
  };

  const selectSwatch = (pinKey: string, swatchKey: string) => {
    if (generating) return;
    const current = colour?.pin === pinKey ? colour.swatch : 'original';
    if (current === swatchKey) return;
    const pin = room.pins.find((p) => p.key === pinKey);
    setTransition({ mode: 'ripple', origin: [(pin?.x ?? 50) / 100, (pin?.y ?? 50) / 100] });
    setLoupe(null);
    if (swatchKey === 'original') {
      setColour(null);
      return;
    }
    const sw = pin?.swatches.find((x) => x.key === swatchKey);
    if (!sw) return;
    // a tiny tap of feedback on phones that support it (Android)
    navigator.vibrate?.(12);
    setPendingColour({ pin: pinKey, swatch: swatchKey });
    // Swap only once the photo has actually loaded (and the processing beat
    // has played), so the stage never shows a blank frame.
    const img = new Image();
    const loaded = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = sw.image;
    const beat = new Promise((r) => { generateTimer.current = window.setTimeout(r, GENERATE_MS); });
    Promise.all([loaded, beat]).then(([ok]) => {
      setPendingColour((cur) => {
        if (cur?.pin !== pinKey || cur.swatch !== swatchKey) return cur; // superseded (room changed)
        if (ok) setColour({ pin: pinKey, swatch: swatchKey });
        else setMissing((m) => new Set(m).add(sw.image));
        return null;
      });
    });
  };

  // Popover position, clamped to the stage so it never spills off the image edge.
  const POP_W = 236;
  const popStyle = (() => {
    if (!activePin || !stageRef.current) return undefined;
    const W = stageRef.current.clientWidth;
    const H = stageRef.current.clientHeight;
    const popW = Math.min(POP_W, W - 16);
    const popH = 112;
    let left = (activePin.x / 100) * W + 18;
    const top = Math.max(8, Math.min((activePin.y / 100) * H - popH / 2, H - popH - 8));
    if (left + popW > W - 8) left = (activePin.x / 100) * W - 18 - popW;
    left = Math.max(8, Math.min(left, W - popW - 8));
    return { left, top, width: popW };
  })();

  const swatchCaption = (pin: (typeof room.pins)[number]) => {
    const key = pendingColour?.pin === pin.key
      ? pendingColour.swatch
      : colour?.pin === pin.key ? colour.swatch : 'original';
    const sw = pin.swatches.find((x) => x.key === key) ?? pin.swatches[0];
    return sw.key === 'original' ? `${sw.label} · original` : sw.label;
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(170deg,#003B33,#00332C_60%,#002923)] px-[clamp(18px,3.4vw,44px)] pb-[clamp(28px,4vw,48px)] pt-[calc(env(safe-area-inset-top,0px)+104px)] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 88% 8%, rgba(0,160,140,.30), transparent 62%), radial-gradient(55% 45% at 0% 100%, rgba(0,89,78,.55), transparent 65%)',
        }}
      />

      <div className="relative grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[5fr_7fr]">
        {/* ---------------- copy ---------------- */}
        <div className="flex flex-col gap-[22px] pt-2">
          {/* announcement pill */}
          <a
            href="#get-app"
            className="group inline-flex w-max items-center gap-2 rounded-full bg-white/[0.07] py-1 pl-1 pr-3 text-[12.5px] text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-colors hover:bg-white/[0.12]"
          >
            <span className="rounded-full bg-[#00A08C] px-2 py-0.5 font-label text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">✦ New</span>
            The Think Decor app for iPhone &amp; Android
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>

          <span className="flex items-center gap-1.5 whitespace-nowrap font-label text-[11px] font-bold uppercase leading-[1.35em] tracking-[0.16em] text-[#8FE3D4]">
            Mantha AI ·{' '}
            {/* style name that flips on its own */}
            <span className="relative inline-flex h-[1.35em] min-w-[11.2em] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={FLIP_STYLES[flipIndex % FLIP_STYLES.length]}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-0 whitespace-nowrap leading-[1.35em] text-white"
                >
                  {FLIP_STYLES[flipIndex % FLIP_STYLES.length]}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="hidden 2xl:inline">· Describe any change</span>
          </span>

          <h1 className="font-display text-[clamp(2.75rem,6.2vw,5.5rem)] font-medium leading-[0.98] text-white">
            {introDone ? <RevealWords text="Think it before" className="block" delay={0.1} /> : <span className="block opacity-0">Think it before</span>}
            <span className="relative block w-max italic font-normal text-[#8FE3D4]">
              {/* filled with real materials, cycling: sage velvet, oak, marble, bouclé */}
              <MaterialWords text="you buy it." play={introDone} delay={0.22} onMaterial={setMaterial} />
              <AnimatePresence mode="wait">
                {introDone && (
                  <motion.span
                    key={material}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                    className="absolute right-0 top-full mt-[0.42em] whitespace-nowrap font-mono text-[10.5px] not-italic leading-none tracking-[0.18em] text-[#8FE3D4]/75"
                    aria-hidden
                  >
                    — IN {material.toUpperCase()}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* hand-drawn underline that draws itself in after the words land */}
              <svg aria-hidden viewBox="0 0 220 24" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.14em] left-[38%] h-[0.3em] w-[62%] overflow-visible">
                <motion.path
                  d="M4 16C46 6 120 4 216 12"
                  fill="none"
                  stroke="#00A08C"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: introDone ? 1 : 0 }}
                  transition={{ duration: 1.1, delay: 0.9, ease: [0.65, 0, 0.35, 1] }}
                />
              </svg>
            </span>
          </h1>

          <Reveal delay={0.35}>
            <p className="max-w-[40ch] text-[18px] text-white/75">
              Photograph your room once. Pick a style or describe a change, and see it on
              your own room before you spend a penny.
            </p>
          </Reveal>

          <Reveal delay={0.42}>
            <div>
              {/* Moved up from below the stage image, in place of the old Paint/
                  Wallpaper/Floor row. All four in a single row (not 2x2) — the
                  taller 2-row grid was pushing the hero's height out a lot,
                  on both desktop and mobile, for a section that should read at
                  a glance. */}
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="flex items-center gap-1.5 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">
                  Style templates
                  {!hasTriedStyle && (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="h-3 w-3" />
                    </motion.span>
                  )}
                </span>
                <span className="font-label text-[12px] text-white/60">
                  {pendingStyle
                    ? `Redesigning in ${pendingStyle}…`
                    : styleKey
                      ? `${styleKey} selected`
                      : !hasTriedStyle
                        ? 'Tap one — see it redesigned ✨'
                        : 'Tap a style to apply it'}
                </span>
              </div>
              <Stagger className="grid grid-cols-4 gap-2">
                {DEMO_STYLES.map((s, i) => (
                  <motion.li key={s.key} variants={staggerItem} className="relative list-none">
                    {/* Nudges a first-time visitor toward the tiles — a sonar
                        ping on the first tile, same visual language as the
                        hotspot dots. Stops for good once any style is tried. */}
                    {!hasTriedStyle && i === 0 && (
                      <span className="pointer-events-none absolute -inset-1 z-[1] animate-ping rounded-[14px] bg-[#00A08C]/50" />
                    )}
                    <button
                      type="button"
                      aria-pressed={styleKey === s.key}
                      data-cursor="Apply"
                      disabled={generating}
                      onClick={() => selectStyle(s.key)}
                      className={cn(
                        'group relative z-[1] block aspect-square w-full overflow-hidden rounded-[12px] shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition-shadow disabled:cursor-wait',
                        styleKey === s.key && 'shadow-[0_0_0_2px_#00A08C]',
                        pendingStyle === s.key && 'shadow-[0_0_0_2px_#8FE3D4]',
                      )}
                    >
                      <img src={s.image} alt={s.alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,52,45,0)_55%,rgba(0,52,45,0.9))]" />
                      <span className={cn('absolute bottom-1.5 left-1.5 right-1.5 text-left font-label text-[10.5px] font-bold leading-[1.1] text-white', (styleKey === s.key || pendingStyle === s.key) && 'text-[#8FE3D4]')}>
                        {s.label}
                      </span>
                      {pendingStyle === s.key && (
                        <motion.span
                          aria-hidden
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                          className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full border-[1.5px] border-white/30 border-t-[#8FE3D4]"
                        />
                      )}
                    </button>
                  </motion.li>
                ))}
              </Stagger>
            </div>
          </Reveal>

          <Reveal delay={0.48} className="mt-1 flex flex-wrap items-center gap-3">
            <Magnetic>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[#00A08C] py-2 pl-7 pr-2 text-[15px] font-semibold text-white shadow-[0_20px_46px_-14px_rgba(0,160,140,0.5)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97]"
              >
                <span className="relative">Try our app</span>
                <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/15">
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-7" />
                  <ArrowRight className="absolute h-4 w-4 -translate-x-7 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0" />
                </span>
              </a>
            </Magnetic>
          </Reveal>

          <Reveal delay={0.55}>
            <p className="max-w-[48ch] border-t border-white/[0.14] pt-[18px] text-[15px] text-white/70">
              <b className="font-semibold text-white">We are Think Decor</b>, a home-design app
              built around Mantha AI. We help homeowners, renters and designers make décor
              decisions with their eyes open: the real room, the real light, the real price.
            </p>
          </Reveal>
        </div>

        {/*
          ---------------- interactive stage ----------------
          Deliberately not wrapped in <Reveal>: it's part of the hero, so it
          should be visible immediately, and it's tall enough (rooms + styles
          below the fold) that Reveal's viewport-intersection check never
          reliably fires for it — leaving it stuck at opacity:0.
        */}
        <div>
          <figure className="m-0">
            <div
              ref={(el) => { stageRef.current = el; onStageBoxMount?.(el); }}
              data-courier="hero"
              data-courier-src={stageImage.image}
              className="relative aspect-[1024/765] overflow-hidden rounded-[20px]"
              onClick={() => setOpenPin(null)}
            >
              {/* 2.5D depth stage: cursor/tilt parallax, plus a wireframe
                  scan wave (styles, rooms) or a ripple from the dot (colours)
                  whenever the photo changes. */}
              <DepthStage src={stageImage.image} alt={stageImage.alt} transition={transition} />
              <AnimatePresence mode="wait">
                {!styleKey && openPin === null && !generating && !colour && idea && (
                  <motion.span
                    key={idea}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.35 }}
                    className="pointer-events-none absolute left-3 top-3 z-[3] flex items-center gap-1.5 rounded-full bg-[#00231D]/65 px-3 py-1.5 font-label text-[11.5px] font-bold text-white backdrop-blur-md"
                  >
                    <Sparkles className="h-3 w-3 text-[#8FE3D4]" /> {idea}
                  </motion.span>
                )}
              </AnimatePresence>

              <MaterialLoupe loupe={loupe} room={room} stage={stageRef.current} popoverLeft={popStyle?.left} />

              {/* "Mantha AI is redesigning…" beat — plays over the old photo
                  for GENERATE_MS before the new one swaps in, so applying a
                  style reads as the AI actually doing something, not an
                  instant image replace. */}
              <AnimatePresence>
                {generating && (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-[4] flex flex-col items-center justify-center gap-3 overflow-hidden bg-[#00231D]/55 backdrop-blur-[3px]"
                  >
                    <motion.div
                      aria-hidden
                      initial={{ y: '-100%' }}
                      animate={{ y: '420%' }}
                      transition={{ duration: GENERATE_MS / 1000, ease: 'linear' }}
                      className="pointer-events-none absolute inset-x-0 h-1/4 bg-[linear-gradient(180deg,transparent,rgba(143,227,212,0.4),transparent)]"
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                      className="relative h-11 w-11 rounded-full border-2 border-white/20 border-t-[#8FE3D4]"
                    />
                    <span className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">
                      {pendingColour ? 'Mantha AI recolouring' : 'Mantha AI redesigning'}
                    </span>
                    <span className="font-label text-[12px] text-white/75">{pendingLabel}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!styleKey && room.pins.map((pin, i) => {
                if (!pin.swatches.some((sw) => sw.key !== 'original' && isAvailable(sw))) return null;
                const open = openPin === i;
                const applied = colour?.pin === pin.key ? pin.swatches.find((sw) => sw.key === colour.swatch) : undefined;
                return (
                  <button
                    key={`${room.key}-${pin.key}`}
                    type="button"
                    aria-label={`Change the ${pin.name.toLowerCase()} colour`}
                    data-cursor="Tap to swap"
                    aria-expanded={open}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(i);
                    }}
                    className="group absolute z-[2] grid h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition-transform hover:scale-110"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  >
                    {!open && <span className="absolute inset-[-6px] animate-ping rounded-full border-[1.5px] border-white/80" />}
                    {/* The dot shows the colour currently on that item, so a
                        recoloured piece is visible at a glance. */}
                    <span
                      className={cn('h-3 w-3 rounded-full ring-1 ring-black/10 transition-colors', open && 'ring-2 ring-[#00A08C]')}
                      style={{ background: applied?.hex ?? 'conic-gradient(#B5603F, #C9962C, #8A9F82, #2C3E5C, #D3A79E, #B5603F)' }}
                    />
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#00231D]/80 px-2 py-0.5 font-label text-[10.5px] font-bold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      {pin.name}
                    </span>
                  </button>
                );
              })}

              <AnimatePresence>
                {!styleKey && activePin && popStyle && (
                  <motion.div
                    key={`${room.key}-${activePin.key}`}
                    initial={{ opacity: 0, scale: 0.96, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-[5] rounded-[16px] bg-white p-3.5 text-[#00594E] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                    style={popStyle}
                    role="dialog"
                    aria-label={`${activePin.name} colours`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenPin(null)}
                      aria-label="Close"
                      className="absolute right-2.5 top-1.5 text-[18px] leading-none text-[#4F6F6A]"
                    >
                      ×
                    </button>
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A08C]">Try a colour</span>
                    <h3 className="pr-4 font-display text-[17px] leading-[1.15]">{activePin.name}</h3>
                    <div className="mt-2.5 flex gap-2" role="radiogroup" aria-label={`${activePin.name} colour`}>
                      {activePin.swatches.filter(isAvailable).map((sw) => {
                        const current = (colour?.pin === activePin.key ? colour.swatch : 'original') === sw.key;
                        const pending = pendingColour?.pin === activePin.key && pendingColour.swatch === sw.key;
                        return (
                          <button
                            key={sw.key}
                            type="button"
                            role="radio"
                            aria-checked={current}
                            aria-label={sw.key === 'original' ? `${sw.label} (original)` : sw.label}
                            title={sw.label}
                            disabled={generating}
                            onClick={() => selectSwatch(activePin.key, sw.key)}
                            onPointerEnter={() => sw.key !== 'original' && !current && setLoupe({ pin: activePin.key, image: sw.image, label: sw.label })}
                            onPointerLeave={() => setLoupe(null)}
                            onFocus={() => sw.key !== 'original' && !current && setLoupe({ pin: activePin.key, image: sw.image, label: sw.label })}
                            onBlur={() => setLoupe(null)}
                            className={cn(
                              'relative h-8 w-8 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-transform hover:scale-110 disabled:cursor-wait',
                              current && 'ring-2 ring-[#00A08C] ring-offset-2',
                              pending && 'ring-2 ring-[#8FE3D4] ring-offset-2',
                            )}
                            style={{ background: sw.hex }}
                          >
                            {sw.key === 'original' && (
                              <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-white text-[8px] font-bold text-[#00594E] shadow">↺</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 font-label text-[12px] text-[#4F6F6A]">{swatchCaption(activePin)}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <figcaption className="mt-3 flex justify-between gap-3 font-label text-[12px] tracking-[0.04em] text-white/60">
              <span>
                {styleKey
                  ? `● ${styleKey} redesign — tap another style to compare`
                  : '● Tap a dot, then pick a colour'}
              </span>
              <span>
                {styleKey
                  ? `${room.label} · ${styleKey}`
                  : appliedSwatch && appliedPin
                    ? `${appliedPin.name} · ${appliedSwatch.label}`
                    : room.label}
              </span>
            </figcaption>

            <div role="tablist" aria-label="Choose a room" className="mt-[18px] grid grid-cols-2 gap-2.5">
              {DEMO_ROOMS.map((r) => {
                const selected = r.key === roomKey;
                return (
                  <button
                    key={r.key}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectRoom(r.key)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-full py-2.5 pl-[18px] pr-3 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-colors',
                      selected ? 'bg-[#00A08C]' : 'bg-[#08463E] hover:bg-[#0E7466]',
                    )}
                  >
                    <span className="whitespace-nowrap font-label text-[15px] font-bold">{r.label}</span>
                    {/* A peek at the colours on offer in that room. */}
                    <span className="flex -space-x-1.5" aria-hidden>
                      {r.pins.map((pin) => (
                        <span
                          key={pin.key}
                          className={cn('h-4 w-4 rounded-full ring-2', selected ? 'ring-[#00A08C]' : 'ring-[#08463E]')}
                          style={{ background: pin.swatches[1]?.hex }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </figure>
        </div>
      </div>
      {/* scroll hint — the room's story starts right below */}
      <a href="#how-it-works" className="relative mx-auto mt-8 hidden w-max flex-col items-center gap-2.5 font-label text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white/85 lg:flex">
        Scroll to explore
        <span aria-hidden className="scroll-line block h-10 w-px origin-top bg-gradient-to-b from-[#8FE3D4] to-transparent" />
      </a>
    </section>
  );
}

/**
 * A 2.5x magnifying loupe over the item being recoloured: hovering a swatch
 * previews that material's weave or grain right on the sofa (or floor, or
 * cabinet), before committing. Sits beside the colour popover, not under it.
 */
function MaterialLoupe({
  loupe,
  room,
  stage,
  popoverLeft,
}: {
  loupe: { pin: string; image: string; label: string } | null;
  room: (typeof DEMO_ROOMS)[number];
  stage: HTMLDivElement | null;
  popoverLeft?: number;
}) {
  const ZOOM = 2.5;
  const pin = loupe ? room.pins.find((p) => p.key === loupe.pin) : undefined;
  const W = stage?.clientWidth ?? 0;
  const H = stage?.clientHeight ?? 0;
  const size = Math.min(170, W * 0.32);
  const r = size / 2;
  let cx = 0;
  let cy = 0;
  if (pin && W) {
    const px = (pin.x / 100) * W;
    const py = (pin.y / 100) * H;
    // put the loupe on the side away from the popover
    const popOnRight = popoverLeft !== undefined && popoverLeft > px;
    cx = Math.max(r + 6, Math.min(W - r - 6, popOnRight ? px - r * 0.75 : px + r * 0.75));
    cy = Math.max(r + 6, Math.min(H - r - 6, py - r * 0.35));
  }
  return (
    <AnimatePresence>
      {loupe && pin && W > 0 && (
        <motion.div
          key={loupe.image}
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="pointer-events-none absolute z-[4] rounded-full"
          style={{ left: cx - r, top: cy - r, width: size, height: size }}
        >
          <span
            className="absolute inset-0 rounded-full shadow-[0_20px_44px_-12px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.65),inset_0_0_0_6px_rgba(255,255,255,0.14)]"
            style={{
              backgroundImage: `url(${loupe.image})`,
              backgroundSize: `${W * ZOOM}px ${H * ZOOM}px`,
              backgroundPosition: `${-((pin.x / 100) * W * ZOOM - r)}px ${-((pin.y / 100) * H * ZOOM - r)}px`,
            }}
          />
          {/* glass: a soft specular arc and a frosted rim */}
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(120%_70%_at_30%_10%,rgba(255,255,255,0.38),transparent_45%)]" />
          <span className="absolute -inset-[5px] rounded-full border-[5px] border-white/25 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#00231D]/80 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8FE3D4] backdrop-blur-md">
            2.5× · {loupe.label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
