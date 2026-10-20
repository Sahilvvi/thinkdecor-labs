import { useEffect, useRef, useState } from 'react';

/**
 * "Tiny planet → 360° room": a pinned, scroll-driven section. A real 360°
 * photo starts as a little spinning planet inside a portal; as you scroll it
 * grows, unfolds (stereographic → rectilinear projection) and turns into a
 * normal, immersive view of the room.
 *
 * Plain WebGL2 + one fragment shader, no 3D library: the shader maps each
 * pixel to a view direction, blended between a stereographic "little
 * planet" projection (d = 1) and an ordinary perspective one (d = 0), and
 * samples the equirectangular photo along it.
 *
 * Lives OUTSIDE a StackPanel: panels are overflow-hidden, which stops
 * position:sticky from pinning anything inside them.
 *
 * Photo: "Cayley Interior" by Greg Zaal, Poly Haven (CC0).
 */

const PANO = '/assets/rooms/pano-living.jpg';

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPano;
uniform float uAspect, uD, uPitch, uYaw, uZoom, uMask, uSoft, uShift;
in vec2 vUv;
out vec4 outColor;
const float PI = 3.14159265359;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  p.y += uShift; // sits the little planet below the heading
  float r = length(p) * uZoom;
  float phi = atan(p.y, p.x);
  // hybrid inverse projection: stereographic (d=1) <-> rectilinear (d=0)
  float a = atan(r / (1.0 + uD));
  float theta = a + asin(clamp(uD * sin(a), -1.0, 1.0));
  vec3 dir = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), -cos(theta));
  float cp = cos(uPitch), sp = sin(uPitch);
  dir = vec3(dir.x, dir.y * cp - dir.z * sp, dir.y * sp + dir.z * cp);
  float cy = cos(uYaw), sy = sin(uYaw);
  dir = vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy);
  // direction -> equirectangular uv
  float lon = atan(dir.x, -dir.z);
  float lat = asin(clamp(dir.y, -1.0, 1.0));
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  // pick gradients from a copy of u shifted away from the wrap seam, so
  // mip selection doesn't spike to the smallest level along the seam
  vec2 uvAlt = vec2(fract(uv.x + 0.5), uv.y);
  vec2 gx = dFdx(uv), gy = dFdy(uv);
  vec2 gxa = dFdx(uvAlt), gya = dFdy(uvAlt);
  if (abs(gxa.x) + abs(gya.x) < abs(gx.x) + abs(gy.x)) { gx = gxa; gy = gya; }
  vec3 col = textureGrad(uPano, uv, gx, gy).rgb;
  float m = 1.0 - smoothstep(uMask - uSoft, uMask, length(p));
  outColor = vec4(col * m, m);
}`;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const smoother = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Piecewise-linear map of x through [x0..xn] -> [y0..yn], clamped at the ends. */
const keyframes = (x: number, xs: number[], ys: number[]) => {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1]));
  }
  return ys[ys.length - 1];
};

// Yaw (radians) that faces a horizontal position u (0..1) of the 360° photo.
const faceU = (u: number) => (0.5 - u) * Math.PI * 2;
// Where the walk-through starts and ends in the photo: the curtains by the
// dining table, panning across to the dining table and living room beyond
// (the glass doors and balcony sit at u ~ 0.5, so it never ends there).
const PAN_FROM = faceU(0.3);
const PAN_TO = faceU(0.14);
// The little planet turns half a revolution with the scroll before it opens.
const PLANET_TURN = Math.PI;
const PLANET_YAW0 = PAN_FROM - PLANET_TURN - 0.4;
// Zoom inside the circle: high enough that the whole room wraps round it —
// floor in the middle, walls and furniture round it, the ceiling as the rim.
const PLANET_ZOOM = 7.5;
const ROOM_ZOOM = 0.85;

/**
 * Scroll progress (0..1) -> shader state.
 *   0.00–0.12  the portal opens on the little planet
 *   0.00–0.38  the planet turns with the scroll (one half-turn)
 *   0.36–0.82  it unfolds into the room — one eased value drives the
 *              projection, pitch, zoom (in log space, so it feels even)
 *              and the circle opening, so they stay in step
 *   0.82–1.00  standing in the room: a slow pan across to the living room
 */
function stateAt(p: number) {
  const open = easeOut(p / 0.12);
  const turn = ease(p / 0.36);
  const u = ease((p - 0.36) / 0.46);
  const pan = ease((p - 0.82) / 0.18);
  const planetYaw = PLANET_YAW0 + PLANET_TURN * turn;
  return {
    u,
    // planet-phase portal size; during the unfold the frame loop opens it
    // steadily to the screen corners (see `mask` there)
    open,
    d: 1 - smoother((u - 0.1) / 0.9),
    pitch: lerp(-Math.PI / 2, -0.05, u),
    zoom: Math.exp(lerp(Math.log(PLANET_ZOOM), Math.log(ROOM_ZOOM), u)),
    yaw: p < 0.82 ? lerp(planetYaw, PAN_FROM, u) : lerp(PAN_FROM, PAN_TO, pan),
  };
}

export function TinyPlanet() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) { setFailed(true); return; }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
      return sh;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { aspect: u('uAspect'), d: u('uD'), pitch: u('uPitch'), yaw: u('uYaw'), zoom: u('uZoom'), mask: u('uMask'), soft: u('uSoft'), shift: u('uShift') };

    let ready = false;
    const tex = gl.createTexture();
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      ready = true;
    };
    img.onerror = () => setFailed(true);
    img.src = PANO;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Only render while the section is on screen.
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(section);

    const mouse = { x: 0, sx: 0 };
    const onMove = (e: PointerEvent) => { mouse.x = (e.clientX / window.innerWidth) * 2 - 1; };
    window.addEventListener('pointermove', onMove, { passive: true });

    // Eased copy of the scroll position: the scene glides after the
    // scrollbar instead of jumping with every wheel tick.
    let eased = -1;
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      // Scroll progress through the pinned section, measured directly each
      // frame (cheap, and immune to stale cached offsets).
      const rect = section.getBoundingClientRect();
      const target = clamp01(-rect.top / Math.max(1, rect.height - window.innerHeight));
      eased = eased < 0 ? target : eased + (target - eased) * Math.min(1, dt * 7);
      const p = eased;

      // text + ring, driven from the same progress as the shader
      const t1 = text1Ref.current, t2 = text2Ref.current, ring = ringRef.current;
      if (t1) {
        t1.style.opacity = String(keyframes(p, [0.03, 0.1, 0.3, 0.4], [0, 1, 1, 0]));
        t1.style.transform = `translateY(${keyframes(p, [0.03, 0.1, 0.3, 0.4], [30, 0, 0, -40])}px)`;
      }
      if (t2) {
        t2.style.opacity = String(keyframes(p, [0.84, 0.92], [0, 1]));
        t2.style.transform = `translateY(${keyframes(p, [0.84, 0.92], [30, 0])}px)`;
      }
      if (ring) ring.style.opacity = String(keyframes(p, [0.02, 0.1, 0.4, 0.7], [0, 1, 1, 0]));

      if (!ready) return;
      mouse.sx += (mouse.x - mouse.sx) * 0.05;
      const s = stateAt(p);
      // the little planet spins on its own; the spin fades out as it unfolds

      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      // portrait screens: shrink the portal (and the planet in it) to fit the width
      const k = Math.min(1, (aspect * 0.86) / 0.56);
      // The portal opens in step with the unfold and only reaches the
      // screen corners as the unfold completes, so the circle never snaps away.
      const corner = Math.hypot(aspect, 1) + 0.04;
      const mask = s.u > 0 ? lerp(0.56 * k, corner, s.u) : 0.56 * k * s.open;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.aspect, aspect);
      gl.uniform1f(U.d, s.d);
      gl.uniform1f(U.pitch, s.pitch);
      gl.uniform1f(U.zoom, s.zoom * (1 + (1 / k - 1) * s.d));
      gl.uniform1f(U.mask, mask);
      gl.uniform1f(U.soft, 0.012);
      // planet centred a little low while small, centred once it fills the frame
      const shift = 0.2 * (1 - smoother(s.u / 0.6));
      gl.uniform1f(U.shift, shift);
      gl.uniform1f(U.yaw, s.yaw + mouse.sx * 0.08 * s.u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (ringRef.current) {
        const px = mask * canvas.clientHeight;
        ringRef.current.style.width = ringRef.current.style.height = `${px}px`;
        ringRef.current.style.marginTop = `${shift * canvas.clientHeight / 2}px`;
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <section ref={sectionRef} id="every-angle" className="relative h-[300vh] px-3 sm:px-4">
      <div className="sticky top-0 flex h-[100svh] items-stretch pb-[84px] pt-[84px] md:pb-4">
        <div className="relative w-full overflow-hidden rounded-[28px] bg-[radial-gradient(80%_70%_at_50%_45%,#00463D,#002923_70%)]">
          {failed ? (
            <img src={PANO} alt="360° photo of an open-plan living and dining room" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <canvas ref={canvasRef} data-cursor="Scroll" aria-label="360° photo of an open-plan living room, shown as a spinning little planet that unfolds into the room as you scroll" role="img" className="absolute inset-0 h-full w-full" />
          )}

          {/* portal ring around the planet */}
          <div
            ref={ringRef}
            aria-hidden
            style={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_1px_rgba(143,227,212,0.55),0_0_60px_10px_rgba(0,160,140,0.35)]"
          />

          <div
            ref={text1Ref}
            style={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-[9%] px-6 text-center text-white"
          >
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">Every angle</p>
            <h2 className="mx-auto mt-2 max-w-[18ch] font-display text-[clamp(1.9rem,4vw,3.6rem)] font-medium leading-[1.02]">
              Every room is a <span className="italic font-normal text-[#8FE3D4]">world</span> of possibilities.
            </h2>
          </div>

          <div
            ref={text2Ref}
            style={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-6 left-4 right-4 max-w-[440px] rounded-[20px] bg-[#00231D]/60 p-5 text-white backdrop-blur-md sm:bottom-8 sm:left-8"
          >
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">Coming soon · 360° room scans</p>
            <h2 className="mt-1.5 font-display text-[clamp(1.6rem,3vw,2.4rem)] font-medium leading-[1.05]">
              One scan. <span className="italic font-normal text-[#8FE3D4]">Every</span> angle.
            </h2>
            <p className="mt-2 text-[14.5px] text-white/75">
              Capture the whole room, walls, floors and furniture, and redesign it from any viewpoint.
            </p>
          </div>

          <span className="absolute right-4 top-4 rounded-full bg-[#00231D]/60 px-3 py-1 font-label text-[11px] font-bold text-white/80 backdrop-blur">
            Example 360° photo
          </span>
        </div>
      </div>
    </section>
  );
}
