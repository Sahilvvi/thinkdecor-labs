import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useVisitorRoom } from '@/lib/visitorRoom';
import { cn } from '@/lib/utils';

/**
 * "Will it still look good at 9pm?" — pick a change to the example room (a
 * real Mantha edit: sage sofa, cream sofa, walnut floor, green cabinets),
 * then drag the sun to relight it from first light to night. A strip of four
 * stills shows that choice at morning, midday, golden hour and night side by
 * side, and an advice card says what that hour does to that choice.
 *
 * The light is a SIMULATION drawn with a WebGL shader over one photo
 * (labelled as such on the page), not separate Mantha renders: it shows
 * why light matters. Mantha itself keeps the real light of your photo.
 *
 * Once the visitor has used the free generator, their photo (or redesign) is
 * offered first. The example's window and lamp positions don't apply to an
 * unknown photo, so in that mode the shader uses a generic window (bright
 * upper area) and a warm lamp-light wash instead of the two lamps.
 */

const PHOTO = '/assets/rooms/hero.webp';

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uDay;        // daylight strength 0..1
uniform vec3 uSky;         // daylight colour
uniform vec3 uWindow;      // what the window shows at this hour
uniform float uWindowMix;  // how much the window is replaced by the hour's sky
uniform float uLamps;      // lamps 0..1
uniform float uGolden;     // low-sun warmth 0..1
uniform float uAspect;
uniform float uOwn;        // 1 = the visitor's photo: generic window and lamps
uniform vec2 uCover;       // object-fit: cover for photos of any shape

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

float lamp(vec2 uv, vec2 at, float r) {
  vec2 d = (uv - at) * vec2(uAspect, 1.0);
  return exp(-dot(d, d) / (r * r));
}

void main() {
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  vec3 base = texture2D(uTex, uv).rgb;
  float l = luma(base);

  // the window: bright pixels in the upper right of the example photo,
  // or the brightest pixels in the upper part of the visitor's
  float winHero = smoothstep(0.62, 0.86, l) * smoothstep(0.44, 0.52, uv.x) * (1.0 - smoothstep(0.5, 0.62, uv.y));
  float winOwn = smoothstep(0.72, 0.93, l) * (1.0 - smoothstep(0.45, 0.7, uv.y));
  float win = mix(winHero, winOwn, uOwn);

  // daylight: how much light comes in, and its colour; nearer the window is brighter
  float nearHero = clamp(1.0 - length((uv - vec2(0.82, 0.25)) * vec2(1.0, 1.3)) * 0.9, 0.0, 1.0);
  float nearWin = mix(nearHero, clamp(1.0 - uv.y * 1.1, 0.0, 1.0), uOwn);
  vec3 ambientNight = vec3(0.16, 0.2, 0.32);
  float exposure = mix(0.45, 1.05, uDay) * mix(0.8, 1.12, nearWin * uDay);
  vec3 col = base * mix(ambientNight, uSky, uDay) * exposure;

  // golden hour: a warm pool from the window across the floor and sofa
  vec2 pool = (uv - vec2(0.55, 0.82)) * vec2(0.9, 2.2);
  col += base * vec3(1.0, 0.55, 0.22) * uGolden * exp(-dot(pool, pool) * 2.5) * 0.9;
  col += vec3(1.0, 0.6, 0.3) * uGolden * win * 0.25;

  // the window shows the hour's sky
  col = mix(col, uWindow * mix(0.6, 1.0, l), win * uWindowMix);

  // lamps: the table lamp and the floor lamp, a warm glow plus a pool of light
  vec3 warm = vec3(1.0, 0.72, 0.42);
  float shades = lamp(uv, vec2(0.317, 0.33), 0.035) + lamp(uv, vec2(0.928, 0.29), 0.05);
  float pools = lamp(uv, vec2(0.33, 0.42), 0.22) + lamp(uv, vec2(0.86, 0.45), 0.28);
  float wash = lamp(uv, vec2(0.18, 0.62), 0.38) + lamp(uv, vec2(0.82, 0.62), 0.38);
  col += warm * uLamps * mix(shades * 1.4 + base * pools * 1.6, base * wash * 1.3, uOwn);

  gl_FragColor = vec4(col, 1.0);
}`;

type Key = { t: number; day: number; sky: [number, number, number]; win: [number, number, number]; winMix: number; lamps: number; golden: number };

// 06:00 → 23:00 mapped onto t = 0..1
const KEYS: Key[] = [
  { t: 0.0, day: 0.12, sky: [0.55, 0.62, 0.9], win: [0.28, 0.33, 0.55], winMix: 0.85, lamps: 0.55, golden: 0.0 },
  { t: 0.08, day: 0.45, sky: [0.92, 0.82, 0.86], win: [0.95, 0.72, 0.62], winMix: 0.55, lamps: 0.0, golden: 0.15 },
  { t: 0.22, day: 0.85, sky: [0.95, 0.97, 1.03], win: [0.9, 0.94, 1.0], winMix: 0.0, lamps: 0.0, golden: 0.0 },
  { t: 0.38, day: 1.0, sky: [1.0, 1.0, 1.0], win: [1.0, 1.0, 1.0], winMix: 0.0, lamps: 0.0, golden: 0.0 },
  { t: 0.62, day: 0.9, sky: [1.04, 0.97, 0.88], win: [1.0, 0.92, 0.78], winMix: 0.1, lamps: 0.0, golden: 0.25 },
  { t: 0.74, day: 0.62, sky: [1.12, 0.82, 0.58], win: [1.0, 0.62, 0.32], winMix: 0.55, lamps: 0.05, golden: 1.0 },
  { t: 0.82, day: 0.3, sky: [0.72, 0.6, 0.8], win: [0.55, 0.38, 0.6], winMix: 0.8, lamps: 0.6, golden: 0.35 },
  { t: 0.9, day: 0.1, sky: [0.45, 0.5, 0.8], win: [0.12, 0.16, 0.35], winMix: 0.95, lamps: 1.0, golden: 0.0 },
  { t: 1.0, day: 0.03, sky: [0.35, 0.4, 0.7], win: [0.04, 0.06, 0.16], winMix: 1.0, lamps: 1.0, golden: 0.0 },
];

function sample(t: number) {
  const i = KEYS.findIndex((k) => k.t >= t);
  if (i <= 0) return KEYS[Math.max(0, i)];
  const a = KEYS[i - 1];
  const b = KEYS[i];
  const f = (t - a.t) / (b.t - a.t);
  const m = (x: number, y: number) => x + (y - x) * f;
  const v = (x: number[], y: number[]) => x.map((n, k) => m(n, y[k])) as [number, number, number];
  return { t, day: m(a.day, b.day), sky: v(a.sky, b.sky), win: v(a.win, b.win), winMix: m(a.winMix, b.winMix), lamps: m(a.lamps, b.lamps), golden: m(a.golden, b.golden) };
}

const toClock = (t: number) => {
  const min = 6 * 60 + t * 17 * 60;
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
};
const nameOf = (t: number) =>
  t < 0.06 ? 'First light' : t < 0.2 ? 'Morning' : t < 0.55 ? 'Midday' : t < 0.68 ? 'Afternoon' : t < 0.78 ? 'Golden hour' : t < 0.87 ? 'Dusk' : 'Night · lamps on';

/** A change to the example room — each a real Mantha edit of the same photo. */
const CHANGES = [
  { key: 'original', label: 'As it is', image: PHOTO, swatch: '#3B2F2A' },
  { key: 'sage', label: 'Sage velvet sofa', image: '/assets/rooms/colours/living-sofa-sage.webp', swatch: '#93AA8E' },
  { key: 'cream', label: 'Cream bouclé sofa', image: '/assets/rooms/colours/living-sofa-cream.webp', swatch: '#E9E1D3' },
  { key: 'walnut', label: 'Walnut floor', image: '/assets/rooms/colours/living-floor-walnut.webp', swatch: '#5C4030' },
  { key: 'green', label: 'Green cabinets', image: '/assets/rooms/colours/living-storage-green.webp', swatch: '#4E6B5C' },
] as const;
type ChangeKey = (typeof CHANGES)[number]['key'] | 'own';

/** four moments of the day, as positions on the 06:00 → 23:00 track */
const MOMENTS = [
  { key: 'morning', label: 'Morning', t: 0.12 },
  { key: 'midday', label: 'Midday', t: 0.41 },
  { key: 'golden', label: 'Golden hour', t: 0.74 },
  { key: 'night', label: 'Night', t: 0.95 },
] as const;
type MomentKey = (typeof MOMENTS)[number]['key'];
const momentOf = (t: number): MomentKey => (t < 0.26 ? 'morning' : t < 0.62 ? 'midday' : t < 0.86 ? 'golden' : 'night');

/** what that hour does to that choice: plain colour advice, not a promise */
const ADVICE: Record<ChangeKey, Record<MomentKey, string>> = {
  original: {
    morning: 'Cool morning light flattens dark leather. It reads almost black.',
    midday: 'True colour. This is roughly how it looked in the shop.',
    golden: 'Low sun brings out the leather’s warm brown.',
    night: 'Under lamps the dark sofa sinks into the room.',
  },
  sage: {
    morning: 'By the window, sage looks cool and fresh.',
    midday: 'Sage at its truest: soft, calm green.',
    golden: 'Golden hour pushes sage towards olive.',
    night: 'Warm lamps grey it out. If you mostly sit here at night, pick a warmer sage.',
  },
  cream: {
    morning: 'Cream reads clean and bright in the morning.',
    midday: 'At noon cream can look stark. Fine in a sunny room.',
    golden: 'At sunset cream glows peach.',
    night: 'Warm bulbs turn cream yellow. A neutral-white bulb keeps it calm.',
  },
  walnut: {
    morning: 'Dark walnut drinks the morning light, so the room feels smaller.',
    midday: 'Midday shows the grain. Rich and grounded.',
    golden: 'Sunset makes walnut glow red-brown.',
    night: 'At night a dark floor makes the room cosy, and a little cave-like.',
  },
  green: {
    morning: 'Green cabinets look deep and cool in the morning.',
    midday: 'Midday shows the true green against the oak.',
    golden: 'Warm light makes the green read richer, almost bottle green.',
    night: 'Under lamps the green goes dark. Add a light under the cabinets.',
  },
  own: {
    morning: 'This is your room in cool morning light.',
    midday: 'Midday: the closest to the true colours in your photo.',
    golden: 'Golden hour warms everything. Check that your colours still work.',
    night: 'Night, lamps on. If it feels flat, warm bulbs or a lighter shade help.',
  },
};

export function LightScrub() {
  const visitor = useVisitorRoom();
  const ownPhoto = visitor.after ?? visitor.before;
  const [change, setChange] = useState<ChangeKey>('sage');
  // once the visitor has a photo, show it first
  useEffect(() => { if (ownPhoto) setChange('own'); }, [ownPhoto]);
  const own = change === 'own' && !!ownPhoto;
  const src = own ? ownPhoto! : (CHANGES.find((c) => c.key === change) ?? CHANGES[1]).image;

  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const inView = useInView(host, { margin: '0px 0px -20% 0px' });
  const t = useMotionValue(0.3);
  const [touched, setTouched] = useState(false);
  const [failed, setFailed] = useState(false);
  const [label, setLabel] = useState({ clock: toClock(0.3), name: nameOf(0.3), moment: momentOf(0.3) as MomentKey });
  const [thumbs, setThumbs] = useState<Partial<Record<MomentKey, string>>>({});
  const draw = useRef<(v: number) => void>(() => undefined);

  // WebGL setup, once per photo
  useEffect(() => {
    const c = canvas.current;
    const gl = c?.getContext('webgl', { premultipliedAlpha: false });
    if (!c || !gl) { setFailed(true); return; }
    const sh = (type: number, code: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { day: U('uDay'), sky: U('uSky'), win: U('uWindow'), winMix: U('uWindowMix'), lamps: U('uLamps'), golden: U('uGolden'), aspect: U('uAspect'), own: U('uOwn'), cover: U('uCover') };
    gl.uniform1f(u.own, own ? 1 : 0);

    const tex = gl.createTexture();
    let ready = false;
    let imgAspect = 1024 / 765;

    draw.current = (v: number) => {
      if (!ready) return;
      const k = sample(v);
      gl.uniform1f(u.day, k.day);
      gl.uniform3fv(u.sky, k.sky);
      gl.uniform3fv(u.win, k.win);
      gl.uniform1f(u.winMix, k.winMix);
      gl.uniform1f(u.lamps, k.lamps);
      gl.uniform1f(u.golden, k.golden);
      const aspect = c.width / c.height;
      gl.uniform1f(u.aspect, aspect);
      gl.uniform2f(u.cover, imgAspect > aspect ? aspect / imgAspect : 1, imgAspect > aspect ? 1 : imgAspect / aspect);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // the day strip: the same photo rendered at four moments, captured as stills
    const shoot = () => {
      const still = document.createElement('canvas');
      still.width = 360;
      still.height = Math.round((360 * c.height) / Math.max(1, c.width));
      const ctx = still.getContext('2d');
      if (!ctx) return;
      const out: Partial<Record<MomentKey, string>> = {};
      MOMENTS.forEach((m) => {
        draw.current(m.t);
        ctx.drawImage(c, 0, 0, still.width, still.height);
        out[m.key] = still.toDataURL('image/jpeg', 0.78);
      });
      draw.current(t.get());
      setThumbs(out);
    };

    const img = new Image();
    img.onload = () => {
      imgAspect = img.naturalWidth / img.naturalHeight || imgAspect;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      ready = true;
      draw.current(t.get());
      shoot();
    };
    img.src = src;

    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, c.width, c.height);
      draw.current(t.get());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();
    return () => { ro.disconnect(); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, [t, src, own]);

  useEffect(() => t.on('change', (v) => {
    draw.current(v);
    setLabel({ clock: toClock(v), name: nameOf(v), moment: momentOf(v) });
  }), [t]);

  // plays through the day on its own until the visitor takes the sun
  useEffect(() => {
    if (!inView || touched) return;
    const c = animate(t, [t.get(), 1, 0, t.get()], { duration: 16, ease: 'easeInOut', repeat: Infinity, times: [0, 0.45, 0.5, 1] });
    return () => c.stop();
  }, [inView, touched, t]);

  const jump = (to: number) => {
    setTouched(true);
    animate(t, to, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
  };

  // the sun (or moon) rides an arc above the photo
  const sunX = useTransform(t, (v) => `${v * 100}%`);
  const sunY = useTransform(t, (v) => `${(1 - Math.sin(Math.min(1, v / 0.9) * Math.PI)) * 100}%`);
  const night = useTransform(t, [0.8, 0.88], [0, 1]);
  const dayIcon = useTransform(night, (n) => 1 - n);

  const fromPointer = (clientX: number) => {
    const r = host.current?.getBoundingClientRect();
    if (!r) return;
    t.set(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
  };

  const options: { key: ChangeKey; label: string; swatch?: string; image?: string }[] = [
    ...(ownPhoto ? [{ key: 'own' as const, label: visitor.after ? 'Your redesign' : 'Your photo', image: ownPhoto }] : []),
    ...CHANGES.map((c) => ({ key: c.key as ChangeKey, label: c.label, swatch: c.swatch })),
  ];
  const advice = ADVICE[own ? 'own' : change][label.moment];

  return (
    <section className="relative py-16 lg:py-24">
      <div className="container mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{own ? 'Your room · real light' : 'Real light'}</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.6rem)] font-medium leading-[1.02] text-foreground">
            Will it still look good <span className="italic font-normal text-[#00A08C]">at 9pm?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[15.5px] leading-relaxed text-foreground/62">
            A colour that sings at noon can sulk at dusk. Pick a change, then watch it through the day before you buy it.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          {/* ---------- the room and the sun ---------- */}
          <div ref={host} className="relative min-w-0 select-none">
            <div
              className="relative mb-3 h-14 cursor-grab touch-none active:cursor-grabbing"
              role="slider"
              tabIndex={0}
              aria-label="Time of day"
              aria-valuemin={6}
              aria-valuemax={23}
              aria-valuetext={`${label.clock}, ${label.name}`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { setTouched(true); t.set(Math.min(1, t.get() + 0.04)); }
                if (e.key === 'ArrowLeft') { setTouched(true); t.set(Math.max(0, t.get() - 0.04)); }
              }}
              onPointerDown={(e) => { setTouched(true); e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e.clientX); }}
              onPointerMove={(e) => { if (e.buttons) fromPointer(e.clientX); }}
            >
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                <path d="M0 20 Q 45 -16 90 20" fill="none" stroke="rgba(0,89,78,0.25)" strokeWidth="0.4" strokeDasharray="1.2 1.2" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(0,89,78,0.2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </svg>
              <motion.span
                style={{ left: sunX, top: sunY }}
                className="absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(0,89,78,0.15)]"
              >
                <motion.span style={{ opacity: dayIcon }} className="absolute"><Sun className="h-5 w-5 text-[#F2A93B]" /></motion.span>
                <motion.span style={{ opacity: night }} className="absolute"><Moon className="h-5 w-5 text-[#3B4C8F]" /></motion.span>
              </motion.span>
            </div>

            <div className="relative aspect-[1024/765] overflow-hidden rounded-[22px] bg-[#0B1F1B] shadow-[0_40px_80px_-40px_rgba(0,52,45,0.6)]">
              {failed ? (
                <img src={src} alt={own ? 'Your room' : 'Living room'} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <canvas key={src} ref={canvas} role="img" aria-label={`${own ? 'Your room' : 'The example living room'} at ${label.clock}, ${label.name.toLowerCase()}`} className="absolute inset-0 h-full w-full" />
              )}
              <span className="absolute left-4 top-4 flex items-baseline gap-2 rounded-full bg-black/45 px-3.5 py-1.5 text-white backdrop-blur-md">
                <span className="font-mono text-[15px] font-semibold tabular-nums">{label.clock}</span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/75">{label.name}</span>
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-md">
                <span className="hidden sm:inline">Light simulation · </span>Illustrative
              </span>
              {!touched && (
                <span className="absolute bottom-3 left-3 rounded-full bg-[#00A08C]/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                  Drag the sun ↑
                </span>
              )}
            </div>

            {/* the day at a glance */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MOMENTS.map((m) => {
                const on = label.moment === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => jump(m.t)}
                    className={cn(
                      'group relative overflow-hidden rounded-[12px] text-left ring-1 transition-all',
                      on ? 'ring-2 ring-[#00A08C]' : 'ring-black/5 hover:ring-[#00A08C]/40',
                    )}
                  >
                    <span className="block aspect-[4/3] bg-[#0B1F1B]">
                      {thumbs[m.key] && <img src={thumbs[m.key]} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                    </span>
                    <span className={cn('absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-4 text-[10.5px] font-semibold text-white sm:text-[11.5px]', 'bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.65))]')}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------- the choice and the verdict ---------- */}
          <div className="min-w-0 lg:pt-[68px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/50">Try a change</p>
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible">
              {options.map((o) => {
                const on = o.key === change;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setChange(o.key)}
                    aria-pressed={on}
                    className={cn(
                      'flex flex-none items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-semibold ring-1 transition-colors lg:rounded-[14px] lg:py-2',
                      on ? 'bg-[#00594E] text-white ring-[#00594E]' : 'bg-white text-foreground ring-black/10 hover:ring-[#00A08C]/50',
                    )}
                  >
                    {o.image ? (
                      <img src={o.image} alt="" className="h-7 w-7 rounded-full object-cover lg:h-8 lg:w-8" />
                    ) : (
                      <span className="h-7 w-7 rounded-full ring-1 ring-black/10 lg:h-8 lg:w-8" style={{ background: o.swatch }} />
                    )}
                    <span className="whitespace-nowrap">{o.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${change}-${label.moment}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mt-4 rounded-[18px] bg-[#0B1F1B] p-5 text-white shadow-[0_24px_60px_-34px_rgba(0,40,34,0.7)]"
              >
                <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8FE3D4]">
                  {label.moment === 'night' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  {MOMENTS.find((m) => m.key === label.moment)?.label}
                </p>
                <p className="mt-2.5 font-display text-[19px] leading-snug">{advice}</p>
              </motion.div>
            </AnimatePresence>
            <p className="mt-3 text-[12px] leading-relaxed text-foreground/50">
              Each change is a real Mantha edit of this room. The light is a simulation, to show why it matters. Mantha keeps the real light of your photo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
