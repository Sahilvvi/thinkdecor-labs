import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ImagePlus, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { downscaleImage } from '@/lib/image';
import { clearVisitorRoom, setVisitorRoom } from '@/lib/visitorRoom';
import { DEMO_ROOMS, type StyleKey } from '@/lib/heroRooms';
import { SpringCompare } from './SpringCompare';
import { ScrollWords } from './KineticType';

/**
 * Mantha Studio — the homepage's "try it" section, laid out like the app:
 *   1  pick a room: one of four sample rooms, or upload your own photo
 *   2  pick a look: four styles (or describe your own)
 *   3  see it: on a sample room the look is painted on instantly (these are
 *      real Mantha redesigns, generated ahead of time); on your own photo
 *      Mantha generates it live — one free redesign per device, via the
 *      demo-redesign edge function, as before.
 * Your upload and result also personalise the light section and the closing
 * card further down (lib/visitorRoom).
 */

const DEVICE_ID_KEY = 'thinkdecor_demo_device_id';
function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const STATUS_LINES = ['Finding the walls and floor…', 'Reading the light…', 'Painting the new look…', 'Finishing details…'];

const LOOKS: { key: StyleKey; name: string; line: string; swatches: [string, string, string] }[] = [
  { key: 'Scandinavian', name: 'Scandinavian', line: 'Pale oak, soft whites, linen', swatches: ['#F4F1EA', '#D8C3A0', '#9FB4A6'] },
  { key: 'Japanese', name: 'Japandi', line: 'Warm wood, low and quiet', swatches: ['#EFE7DA', '#B48B5E', '#5E6B4F'] },
  { key: 'Minimal', name: 'Minimal', line: 'Calm, pared back, nothing extra', swatches: ['#F2F0EB', '#CFC8BC', '#8E8A82'] },
  { key: 'Maximalism', name: 'Maximalist', line: 'Pattern, colour, collected', swatches: ['#B5603F', '#2C5A6B', '#D9A441'] },
];

type Source = { kind: 'sample'; room: (typeof DEMO_ROOMS)[number] } | { kind: 'upload'; url: string; name: string; file: File };
type Phase = 'idle' | 'generating' | 'result' | 'used';

export function ManthaStudio() {
  const [source, setSource] = useState<Source>({ kind: 'sample', room: DEMO_ROOMS[0] });
  const [look, setLook] = useState<StyleKey | null>(null);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [paintId, setPaintId] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const deviceId = useRef<string>();
  if (!deviceId.current) deviceId.current = getDeviceId();

  useEffect(() => () => {
    clearVisitorRoom();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const isSample = source.kind === 'sample';
  const before = isSample ? source.room.image : source.url;
  const preview = isSample && look ? source.room.styles[look].image : null;
  const lookInfo = LOOKS.find((l) => l.key === look);
  const busy = phase === 'generating';

  const pickRoom = (room: (typeof DEMO_ROOMS)[number]) => {
    if (busy) return;
    setSource({ kind: 'sample', room });
    setPhase('idle');
    setResult(null);
    setError(null);
    if (look) setPaintId((n) => n + 1);
  };

  const pickLook = (k: StyleKey) => {
    if (busy) return;
    setLook(k);
    if (isSample) setPaintId((n) => n + 1);
  };

  const takeFile = (file: File | undefined) => {
    if (!file || busy) return;
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Choose a JPG, PNG or WebP photo.'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError('That photo is over 10MB. Try a smaller one.'); return; }
    setError(null);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    setSource({ kind: 'upload', url, name: file.name, file });
    setPhase('idle');
    setResult(null);
    // later sections switch to the visitor's own room
    setVisitorRoom({ before: url, after: null });
  };

  const generate = async () => {
    if (source.kind !== 'upload' || busy) return;
    setError(null);
    setPhase('generating');
    setStatus(0);
    setElapsed(0);
    const startedAt = Date.now();
    timer.current = window.setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);
      setStatus(Math.min(STATUS_LINES.length - 1, Math.floor(secs / 3)));
    }, 1000);
    try {
      const toSend = await downscaleImage(source.file);
      const imageBase64 = await fileToBase64(toSend);
      const prompt = [lookInfo ? `${lookInfo.key} style` : '', note.trim()].filter(Boolean).join('. ');
      const { data, error: fnError } = await supabase.functions.invoke('demo-redesign', {
        body: { deviceId: deviceId.current, imageBase64, imageMimeType: toSend.type || 'image/png', prompt: prompt || undefined },
      });
      if (fnError) {
        const context = (fnError as { context?: Response }).context;
        const payload = context && typeof context.json === 'function' ? await context.json().catch(() => null) : null;
        if (payload?.code === 'demo_used') { setPhase('used'); return; }
        throw new Error(payload?.error ?? 'Something went wrong. Try again.');
      }
      const { imageBase64: outB64, mimeType } = data as { imageBase64: string; mimeType: string };
      const out = `data:${mimeType};base64,${outB64}`;
      setResult(out);
      setVisitorRoom({ before: source.url, after: out });
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setPhase('idle');
    } finally {
      if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    }
  };

  return (
    <section id="generator" className="relative scroll-mt-24 py-16 lg:py-24">
      <div className="container mx-auto max-w-[1240px] px-4 sm:px-8">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Mantha Studio · try it free</p>
          <ScrollWords
            className="mt-3 font-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-medium leading-[1] text-foreground"
            segments={[{ text: 'See it on a ' }, { text: 'real', className: 'italic text-[#00A08C]' }, { text: ' room.' }]}
          />
          <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-relaxed text-foreground/62">
            Pick a room, pick a look, and watch Mantha paint it on. Then try it on a photo of your own room.
          </p>
        </div>

        {/* ------------------------------ the studio ------------------------------ */}
        <div className="relative mt-10 overflow-hidden rounded-[30px] bg-[#0A1C18] p-3 text-white shadow-[0_50px_120px_-50px_rgba(0,40,34,0.75)] sm:p-4 lg:mt-14">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(0,190,160,0.22),transparent_70%)] blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,170,110,0.12),transparent_70%)] blur-2xl" />

          <div className="relative grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)_250px] lg:gap-4">
            {/* ---------- 1 · room ---------- */}
            <div className="order-2 min-w-0 lg:order-1">
              <RailTitle n="1" title="Your room" />
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); takeFile(e.dataTransfer.files[0]); }}
                  className={cn(
                    'group relative flex h-[76px] w-[120px] flex-none flex-col items-center justify-center gap-1 overflow-hidden rounded-[14px] border border-dashed text-center transition-colors lg:h-[70px] lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-left',
                    source.kind === 'upload' ? 'border-[#8FE3D4] bg-[#8FE3D4]/10' : 'border-white/25 hover:border-white/50 hover:bg-white/[0.04]',
                    dragging && 'border-[#8FE3D4] bg-[#8FE3D4]/15',
                  )}
                >
                  {source.kind === 'upload' ? (
                    <img src={source.url} alt="" className="h-9 w-12 flex-none rounded-md object-cover lg:h-12 lg:w-14" />
                  ) : (
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white text-[#0A1C18] transition-transform group-hover:scale-105">
                      <ImagePlus className="h-4 w-4" />
                    </span>
                  )}
                  <span>
                    <b className="block text-[12.5px] font-semibold leading-tight">{source.kind === 'upload' ? 'Your photo' : 'Upload yours'}</b>
                    <span className="hidden text-[11px] text-white/50 lg:block">{source.kind === 'upload' ? 'Tap to change' : 'or drop it here'}</span>
                  </span>
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ''; }}
                />
                {DEMO_ROOMS.map((r) => {
                  const on = isSample && source.room.key === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => pickRoom(r)}
                      aria-pressed={on}
                      className={cn(
                        'group relative h-[76px] w-[110px] flex-none overflow-hidden rounded-[14px] text-left ring-1 transition-all lg:h-[70px] lg:w-full',
                        on ? 'ring-2 ring-[#8FE3D4]' : 'ring-white/10 hover:ring-white/30',
                      )}
                    >
                      <img src={r.image} alt="" loading="lazy" className={cn('absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105', !on && 'opacity-70')} />
                      <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.65))]" />
                      <span className="absolute bottom-1.5 left-2 text-[11.5px] font-semibold">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---------- the stage ---------- */}
            <div className="order-1 min-w-0 lg:order-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-black/40">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.img
                    key={before}
                    src={before}
                    alt={isSample ? source.room.alt : 'Your room'}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </AnimatePresence>

                {/* a sample room with a look: painted on, then yours to compare */}
                {preview && (
                  <SpringCompare
                    key={`${paintId}-${preview}`}
                    reveal
                    before={before}
                    after={preview}
                    beforeLabel="Before"
                    afterLabel={lookInfo?.name ?? 'After'}
                    className="absolute inset-0"
                  />
                )}

                {/* your photo, redesigned live */}
                {phase === 'result' && result && source.kind === 'upload' && (
                  <SpringCompare reveal before={source.url} after={result} beforeLabel="Your photo" afterLabel="Your redesign" className="absolute inset-0" />
                )}

                {/* nothing chosen yet: a nudge */}
                {!look && phase === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-[linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.55))] p-4"
                  >
                    <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-medium backdrop-blur-md">
                      <Wand2 className="h-4 w-4 text-[#8FE3D4]" /> Pick a look to paint it on
                    </span>
                  </motion.div>
                )}

                {/* live generation */}
                <AnimatePresence>
                  {busy && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#00231D]/55 backdrop-blur-[2px]"
                    >
                      <motion.div
                        aria-hidden
                        animate={{ y: ['-100%', '480%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                        className="pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-[linear-gradient(180deg,transparent,rgba(143,227,212,0.45),transparent)]"
                      />
                      <div className="relative h-14 w-14">
                        <motion.span
                          className="absolute inset-0 rounded-full border-2 border-white/15 border-t-[#8FE3D4]"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                        />
                        <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-[#8FE3D4]" />
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={status}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="font-display text-[19px] font-medium"
                        >
                          {STATUS_LINES[status]}
                        </motion.p>
                      </AnimatePresence>
                      <p className="text-[12px] text-white/60">{elapsed}s · usually about 10 seconds</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {phase === 'used' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#00231D]/80 px-6 text-center backdrop-blur-[3px]">
                    <Sparkles className="h-6 w-6 text-[#8FE3D4]" />
                    <p className="font-display text-[20px] font-medium">You've used your free preview</p>
                    <p className="max-w-[32ch] text-[13px] text-white/70">Create a free account for 2 more redesigns of your own rooms.</p>
                  </div>
                )}

                {/* what's on screen (once a look is chosen; until then the nudge has the spot) */}
                {(look || phase !== 'idle') && (
                <div className="pointer-events-none absolute bottom-3 left-3 z-[4] flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-black/45 px-3 py-1.5 text-[11.5px] font-medium backdrop-blur-md">
                    {isSample ? `Sample · ${source.room.label}` : 'Your photo'}
                  </span>
                  {lookInfo && (
                    <span className="flex items-center gap-1.5 rounded-full bg-black/45 py-1.5 pl-2 pr-3 text-[11.5px] font-medium backdrop-blur-md">
                      <span className="flex">
                        {lookInfo.swatches.map((c) => <i key={c} className="-ml-1 h-3 w-3 rounded-full ring-1 ring-black/30 first:ml-0" style={{ background: c }} />)}
                      </span>
                      {lookInfo.name}
                    </span>
                  )}
                </div>
                )}
              </div>
            </div>

            {/* ---------- 2 · look ---------- */}
            <div className="order-3 min-w-0">
              <RailTitle n="2" title="Pick a look" />
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible">
                {LOOKS.map((l) => {
                  const on = look === l.key;
                  const thumb = isSample ? source.room.styles[l.key].image : DEMO_ROOMS[0].styles[l.key].image;
                  return (
                    <motion.button
                      key={l.key}
                      type="button"
                      onClick={() => pickLook(l.key)}
                      aria-pressed={on}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'relative flex w-[200px] flex-none items-center gap-3 rounded-[14px] p-2 text-left ring-1 transition-colors lg:w-full',
                        on ? 'bg-white text-[#0A1C18] ring-white' : 'bg-white/[0.04] ring-white/10 hover:bg-white/[0.08]',
                      )}
                    >
                      <img src={thumb} alt="" loading="lazy" className="h-12 w-14 flex-none rounded-[9px] object-cover" />
                      <span className="min-w-0">
                        <b className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                          {l.name}
                          {on && <Check className="h-3.5 w-3.5 text-[#00A08C]" />}
                        </b>
                        <span className={cn('block truncate text-[11.5px]', on ? 'text-[#0A1C18]/60' : 'text-white/50')}>{l.line}</span>
                        <span className="mt-1 flex gap-1">
                          {l.swatches.map((c) => <i key={c} className="h-2.5 w-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {source.kind === 'upload' && (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add anything: green velvet sofa, oak floors"
                  className="mt-2 block w-full resize-none rounded-[14px] border border-white/15 bg-white/[0.05] px-3 py-2.5 text-[13.5px] text-white outline-none placeholder:text-white/40 focus:border-[#8FE3D4]"
                />
              )}
            </div>
          </div>

          {/* ---------- 3 · go ---------- */}
          <div className="relative mt-3 flex flex-col items-stretch gap-3 rounded-[20px] bg-white/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between sm:pl-5 lg:mt-4">
            <p className="text-[13px] leading-snug text-white/65">
              {phase === 'result'
                ? 'That’s your room, redesigned by Mantha. Drag to compare.'
                : isSample
                  ? <>Sample rooms show real Mantha redesigns, instantly. <b className="font-semibold text-white">Upload your room</b> for a live one, free.</>
                  : 'Your photo stays in this tab. One free live redesign per device.'}
            </p>
            {error && <p className="text-[12.5px] text-[#FF9A8A]">{error}</p>}
            <div className="flex flex-none gap-2">
              {phase === 'result' || phase === 'used' ? (
                <>
                  {phase === 'result' && (
                    <button
                      type="button"
                      onClick={() => { setPhase('idle'); setResult(null); fileInput.current?.click(); }}
                      className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold ring-1 ring-white/25 transition-colors hover:bg-white/10"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Another photo
                    </button>
                  )}
                  <Link to="/signup" className="flex items-center gap-2 rounded-full bg-[#8FE3D4] px-5 py-2.5 text-[14px] font-semibold text-[#00231D] transition-transform hover:scale-[1.03]">
                    Get more redesigns <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : isSample ? (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#0A1C18] transition-transform hover:scale-[1.03]"
                >
                  <ImagePlus className="h-4 w-4" /> Try it on my room
                </button>
              ) : (
                <button
                  type="button"
                  onClick={generate}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#8FE3D4] px-6 py-3 text-[14.5px] font-semibold text-[#00231D] transition-transform hover:enabled:scale-[1.03] disabled:cursor-wait disabled:opacity-80"
                >
                  <Sparkles className="h-4 w-4" /> {busy ? 'Redesigning…' : look ? `Redesign as ${lookInfo?.name}` : 'Redesign my room'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RailTitle({ n, title }: { n: string; title: string }) {
  return (
    <p className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] text-[#8FE3D4]">{n}</span>
      {title}
    </p>
  );
}
