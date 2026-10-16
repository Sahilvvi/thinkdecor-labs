import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { StoredImage } from '@/components/app/StoredImage';

/**
 * What a generation looks like while Mantha AI works on it (about 4–10 s):
 * the visitor's own photo under a soft scan line, a checklist of what is
 * happening ticking through, and a progress bar that eases towards the end
 * without ever claiming to be done. The stages are pacing, not telemetry —
 * the API reports nothing until the image is ready.
 */

const STAGES = [
  { at: 0, label: 'Reading walls and light' },
  { at: 2200, label: 'Choosing materials and colours' },
  { at: 4800, label: 'Rendering your room' },
  { at: 9000, label: 'Adding the finishing touches' },
];

export function DesigningPreview({
  sourceRef,
  label = 'Mantha AI is designing',
  overlay = false,
}: {
  sourceRef?: string | null;
  label?: string;
  /** Lay it over something already on screen (the Cleanup/Replace canvas)
   *  instead of drawing the photo itself. */
  overlay?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const t = window.setInterval(() => setElapsed(performance.now() - start), 120);
    return () => window.clearInterval(t);
  }, []);

  const stage = STAGES.reduce((cur, s, i) => (elapsed >= s.at ? i : cur), 0);
  // 1 - e^(-t/τ): quick at first, slowing as it nears the end, never reaching it.
  const progress = 1 - Math.exp(-elapsed / 5200);

  return (
    <div
      className={overlay ? undefined : 'turn-wait'}
      style={overlay ? { position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 16, zIndex: 5 } : { overflow: 'hidden' }}
      role="status" aria-live="polite" aria-label={`${label}: ${STAGES[stage].label}`}>
      {!overlay && <StoredImage
        src={sourceRef}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.55) blur(1.5px)', opacity: 0.85 }}
      />}
      {/* wash so the panel reads on any photo */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,35,29,.15), rgba(0,35,29,.55))', backdropFilter: overlay ? 'saturate(.6) blur(1.5px)' : undefined }} />
      {/* scan line */}
      <motion.div
        aria-hidden
        initial={{ top: '-30%' }}
        animate={{ top: '110%' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', left: 0, right: 0, height: '28%',
          background: 'linear-gradient(180deg, transparent, rgba(143,227,212,.35) 70%, rgba(255,255,255,.85) 98%, transparent)',
          mixBlendMode: 'screen',
        }}
      />

      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
        <div
          style={{
            margin: '0 auto', maxWidth: 340, borderRadius: 18, padding: '14px 16px',
            background: 'rgba(0,35,29,.72)', backdropFilter: 'blur(10px)', color: '#fff',
            boxShadow: '0 18px 40px -20px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8FE3D4' }}>
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-flex' }}>
              <Sparkles width={13} height={13} />
            </motion.span>
            {label}
          </div>
          <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STAGES.slice(0, 3).concat(stage === 3 ? [STAGES[3]] : []).map((s, i) => {
              const state = i < stage ? 'done' : i === stage ? 'now' : 'next';
              return (
                <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, opacity: state === 'next' ? 0.45 : 1, transition: 'opacity .4s' }}>
                  <span
                    style={{
                      width: 18, height: 18, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center',
                      background: state === 'done' ? '#00A08C' : 'transparent',
                      boxShadow: state === 'done' ? 'none' : 'inset 0 0 0 1.5px rgba(255,255,255,.45)',
                    }}
                  >
                    {state === 'done' && <Check width={11} height={11} />}
                    {state === 'now' && (
                      <motion.span
                        animate={{ scale: [0.6, 1, 0.6], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{ width: 7, height: 7, borderRadius: 999, background: '#8FE3D4' }}
                      />
                    )}
                  </span>
                  <span style={{ fontWeight: state === 'now' ? 600 : 400 }}>{s.label}</span>
                </li>
              );
            })}
          </ol>
          <div style={{ marginTop: 12, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(progress * 100).toFixed(1)}%`, background: 'linear-gradient(90deg,#00A08C,#8FE3D4)', transition: 'width .2s linear' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
