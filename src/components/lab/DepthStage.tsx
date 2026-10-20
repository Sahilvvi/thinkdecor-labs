import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * 2.5D depth stage for the hero room. The photo is drawn in WebGL with a
 * depth estimate (floor and near furniture close, the window wall far), so
 * the room shifts in perspective as the cursor moves or the phone tilts.
 *
 * Changing `src` plays a transition instead of a cut:
 *  - "sweep": a glowing wireframe "AI LiDAR" wave crosses the room left to
 *    right, bending with the room's depth, with the new photo behind it;
 *  - "ripple": the new photo spreads out radially from `origin` (a colour
 *    dot), with the same scan glow on its edge.
 *
 * The depth here is synthetic (a perspective prior tuned for interior
 * photos, refined by the image's own edges), not a per-photo ML depth map.
 * Falls back to a plain <img> where WebGL isn't available. With reduced
 * motion the transitions still play but the parallax drift is switched off.
 */

export type StageTransition = { mode: 'sweep' } | { mode: 'ripple'; origin: [number, number] };

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
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uMouse;      // -1..1, smoothed
uniform float uFront;     // transition front position, < 0 = idle (show A)
uniform float uMode;      // 0 sweep, 1 ripple
uniform vec2 uOrigin;     // ripple origin in uv
uniform float uAspect;
uniform float uTime;
uniform vec2 uTexel;

// Perspective prior for an eye-level interior photo: the floor (bottom)
// comes towards the camera, the far wall and window (upper middle) recede.
float depthAt(vec2 uv) {
  float floorNear = smoothstep(0.42, 1.0, uv.y);
  float sides = pow(abs(uv.x - 0.55) * 1.6, 2.0) * 0.25;
  float d = floorNear * 0.85 + sides;
  return clamp(d, 0.0, 1.0);
}

vec2 parallax(vec2 uv) {
  float d = depthAt(uv);
  vec2 c = uv - 0.5;
  // zoom in a touch so the shifted edges never show
  vec2 base = 0.5 + c / 1.06;
  return base - uMouse * (d - 0.35) * vec2(0.022, 0.014);
}

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 uv = parallax(vUv);
  vec3 a = texture2D(uA, uv).rgb;

  if (uFront < -0.5) {
    gl_FragColor = vec4(a, 1.0);
    return;
  }

  float d = depthAt(vUv);
  float s;
  if (uMode < 0.5) {
    // the wave front bends with depth so it reads as sweeping over geometry
    s = vUv.x + (d - 0.4) * 0.12 + sin(vUv.y * 9.0 + uTime * 2.0) * 0.006;
  } else {
    vec2 p = (vUv - uOrigin) * vec2(uAspect, 1.0);
    s = length(p) / 1.35;
  }

  float band = exp(-pow((s - uFront) / 0.075, 2.0));
  // a little geometric "morph" inside the band
  vec2 wob = vec2(sin(vUv.y * 70.0 + uTime * 9.0), cos(vUv.x * 60.0 - uTime * 7.0)) * 0.0035 * band;
  vec3 b = texture2D(uB, uv + wob).rgb;
  a = texture2D(uA, uv + wob).rgb;

  float mixK = 1.0 - smoothstep(uFront - 0.012, uFront + 0.012, s);
  vec3 col = mix(a, b, mixK);

  // wireframe: a depth-warped grid plus the photo's own edges, lit by the band
  vec2 g = vUv * vec2(42.0, 31.0) + vec2(0.0, d * 5.0);
  vec2 gf = abs(fract(g) - 0.5);
  float grid = smoothstep(0.44, 0.5, max(gf.x, gf.y));
  float ex = abs(luma(texture2D(uA, uv + vec2(uTexel.x, 0.0)).rgb) - luma(texture2D(uA, uv - vec2(uTexel.x, 0.0)).rgb));
  float ey = abs(luma(texture2D(uA, uv + vec2(0.0, uTexel.y)).rgb) - luma(texture2D(uA, uv - vec2(0.0, uTexel.y)).rgb));
  float edge = smoothstep(0.05, 0.22, ex + ey);

  vec3 mint = vec3(0.56, 0.89, 0.83);
  float trail = smoothstep(uFront - 0.18, uFront, s) * step(s, uFront + 0.01);
  col = mix(col, col * 0.55 + mint * 0.12, band * 0.55);
  col += mint * (grid * 0.55 + edge * 0.9) * (band * 1.2 + trail * 0.18);
  col += mint * band * 0.12 + vec3(1.0) * pow(band, 6.0) * 0.35;
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  return sh;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

const DURATION = { sweep: 1250, ripple: 950 };

export function DepthStage({
  src,
  alt,
  transition,
  className,
}: {
  src: string;
  alt: string;
  transition: StageTransition;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // the GL program and textures, owned by the effect below
  const glRef = useRef<{
    swap: (src: string, t: StageTransition) => void;
  } | null>(null);
  const transitionRef = useRef(transition);
  transitionRef.current = transition;
  const firstSrc = useRef(src);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) { setFailed(true); return; }

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
    } catch {
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(program, n);
    const U = {
      a: u('uA'), b: u('uB'), mouse: u('uMouse'), front: u('uFront'), mode: u('uMode'),
      origin: u('uOrigin'), aspect: u('uAspect'), time: u('uTime'), texel: u('uTexel'),
    };

    const makeTex = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };
    const texA = makeTex();
    const texB = makeTex();
    const upload = (tex: WebGLTexture, img: HTMLImageElement) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    };

    const state = {
      ready: false,
      front: -1,
      mode: 0,
      origin: [0.5, 0.5] as [number, number],
      start: 0,
      duration: 1000,
      mouse: [0, 0],
      target: [0, 0],
      visible: true,
      raf: 0,
      pending: null as null | { img: HTMLImageElement; t: StageTransition },
      currentSrc: firstSrc.current,
      texelW: 1 / 1024,
      texelH: 1 / 765,
      aspect: 1024 / 765,
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      state.aspect = r.width / Math.max(1, r.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      kick();
    };

    const render = (now: number) => {
      state.raf = 0;
      if (!state.ready) return;
      // ease the camera towards the pointer
      state.mouse[0] += (state.target[0] - state.mouse[0]) * 0.08;
      state.mouse[1] += (state.target[1] - state.mouse[1]) * 0.08;
      let animating = Math.abs(state.target[0] - state.mouse[0]) > 0.001 || Math.abs(state.target[1] - state.mouse[1]) > 0.001;

      if (state.front > -0.5) {
        const p = Math.min(1, (now - state.start) / state.duration);
        const eased = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
        state.front = -0.2 + eased * 1.45;
        if (p >= 1) {
          // the new photo becomes the base
          if (pendingImg) upload(texA, pendingImg);
          state.front = -1;
          if (state.pending) {
            const next = state.pending;
            state.pending = null;
            begin(next.img, next.t);
          }
        }
        animating = true;
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.uniform1i(U.a, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.uniform1i(U.b, 1);
      gl.uniform2f(U.mouse, state.mouse[0], state.mouse[1]);
      gl.uniform1f(U.front, state.front);
      gl.uniform1f(U.mode, state.mode);
      gl.uniform2f(U.origin, state.origin[0], state.origin[1]);
      gl.uniform1f(U.aspect, state.aspect);
      gl.uniform1f(U.time, now / 1000);
      gl.uniform2f(U.texel, state.texelW, state.texelH);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (animating && state.visible) state.raf = requestAnimationFrame(render);
    };
    const kick = () => {
      if (!state.raf && state.visible) state.raf = requestAnimationFrame(render);
    };

    let pendingImg: HTMLImageElement | null = null;
    const begin = (img: HTMLImageElement, t: StageTransition) => {
      pendingImg = img;
      upload(texB, img);
      state.mode = t.mode === 'ripple' ? 1 : 0;
      state.origin = t.mode === 'ripple' ? t.origin : [0.5, 0.5];
      state.duration = DURATION[t.mode];
      state.start = performance.now();
      state.front = -0.2;
      kick();
    };

    glRef.current = {
      swap: (next, t) => {
        if (next === state.currentSrc) return;
        state.currentSrc = next;
        loadImage(next).then((img) => {
          if (state.currentSrc !== next) return; // superseded
          if (state.front > -0.5) {
            state.pending = { img, t };
          } else {
            begin(img, t);
          }
        }).catch(() => undefined);
      },
    };

    loadImage(firstSrc.current).then((img) => {
      upload(texA, img);
      upload(texB, img);
      state.texelW = 1 / img.naturalWidth;
      state.texelH = 1 / img.naturalHeight;
      state.ready = true;
      kick();
    }).catch(() => setFailed(true));

    // pointer over the hero section drives the camera; phones use tilt
    const section = host.closest('section') ?? host;
    const onMove = (e: PointerEvent) => {
      if (reduce || e.pointerType !== 'mouse') return;
      const r = host.getBoundingClientRect();
      state.target[0] = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      state.target[1] = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    };
    const onLeave = () => { state.target = [0, 0]; kick(); };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (reduce) return;
      if (e.gamma == null || e.beta == null) return;
      state.target[0] = Math.max(-1, Math.min(1, e.gamma / 25));
      state.target[1] = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      kick();
    };
    section.addEventListener('pointermove', onMove as EventListener);
    section.addEventListener('pointerleave', onLeave);
    window.addEventListener('deviceorientation', onTilt);

    const io = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (state.visible) kick();
    });
    io.observe(host);
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const lost = (e: Event) => { e.preventDefault(); setFailed(true); };
    canvas.addEventListener('webglcontextlost', lost);

    return () => {
      cancelAnimationFrame(state.raf);
      io.disconnect();
      ro.disconnect();
      section.removeEventListener('pointermove', onMove as EventListener);
      section.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
      canvas.removeEventListener('webglcontextlost', lost);
      glRef.current = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [reduce]);

  useEffect(() => {
    glRef.current?.swap(src, transitionRef.current);
  }, [src]);

  if (failed) {
    return <img src={src} alt={alt} className={className ?? 'absolute inset-0 h-full w-full object-cover'} />;
  }

  return (
    <div ref={hostRef} className={className ?? 'absolute inset-0'}>
      <canvas ref={canvasRef} role="img" aria-label={alt} className="block h-full w-full" />
    </div>
  );
}
