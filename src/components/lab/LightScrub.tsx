import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useVisitorRoom } from '@/lib/visitorRoom';

/**
 * "Your light, all day": drag the sun across the sky and the example room
 * relights from first light to night — cool dawn, neutral noon, golden
 * hour through the window, dusk, then the two lamps come on. It plays on
 * its own until you grab the sun.
 *
 * This is a light SIMULATION drawn with a WebGL shader over one photo
 * (labelled as such on the page), not separate Mantha renders: it shows
 * why light matters. Mantha itself keeps the real light of your photo.
 *
 * Once the visitor has used the free generator, the section relights
 * *their* room instead (their redesign if they made one, else their
 * photo). The example's window and lamp positions don't apply to an
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

export function LightScrub() {
  const visitor = useVisitorRoom();
  const ownPhoto = visitor.after ?? visitor.before;
  const [showExample, setShowExample] = useState(false);
  const own = !!ownPhoto && !showExample;
  const src = own ? ownPhoto : PHOTO;
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const inView = useInView(host, { margin: '0px 0px -20% 0px' });
  const t = useMotionValue(0.3);
  const [touched, setTouched] = useState(false);
  const [failed, setFailed] = useState(false);
  const [label, setLabel] = useState({ clock: toClock(0.3), name: nameOf(0.3) });
  const draw = useRef<(v: number) => void>(() => undefined);

  // WebGL setup
  useEffect(() => {
    const c = canvas.current;
    const gl = c?.getContext('webgl', { premultipliedAlpha: false });
    if (!c || !gl) { setFailed(true); return; }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
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
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();
    return () => { ro.disconnect(); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, [t, src, own]);

  useEffect(() => t.on('change', (v) => {
    draw.current(v);
    setLabel({ clock: toClock(v), name: nameOf(v) });
  }), [t]);

  // plays through the day on its own until the visitor takes the sun
  useEffect(() => {
    if (!inView || touched) return;
    const c = animate(t, [t.get(), 1, 0, t.get()], { duration: 14, ease: 'easeInOut', repeat: Infinity, times: [0, 0.45, 0.5, 1] });
    return () => c.stop();
  }, [inView, touched, t]);

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

  return (
    <section className="relative py-16 lg:py-24">
      <div className="container mx-auto max-w-[1200px] px-6 sm:px-8">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{own ? 'Your room · real light' : 'Real light'}</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.6rem)] font-medium leading-[1.02] text-foreground">
            {own ? 'Your room, ' : 'The same room, '}<span className="italic font-normal text-[#00A08C]">all day long.</span>
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-foreground/62">
            A colour that sings at noon can sulk at dusk. Drag the sun and watch the light move through the room.
            That&rsquo;s why Mantha keeps your photo&rsquo;s real light: what you see is how it&rsquo;ll look.
          </p>
          {ownPhoto && (
            <button
              type="button"
              onClick={() => setShowExample((v) => !v)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#00594E]/[0.07] px-4 py-2 text-[13px] font-semibold text-[#00594E] ring-1 ring-[#00594E]/15 transition-colors hover:bg-[#00594E]/[0.12]"
            >
              <span className="h-2 w-2 rounded-full bg-[#00A08C]" />
              {own ? 'Showing your room · see the example' : 'Showing the example · see your room'}
            </button>
          )}
        </div>

        <div ref={host} className="relative mx-auto mt-10 max-w-[980px] select-none">
          {/* sky track with the draggable sun */}
          <div
            className="relative mb-3 h-16 cursor-grab touch-none active:cursor-grabbing"
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
              {own ? 'Your photo · ' : ''}Light simulation · illustrative
            </span>
            {!touched && (
              <span className="absolute bottom-3 left-3 rounded-full bg-[#00A08C]/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                Drag the sun ↑
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
