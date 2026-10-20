import { useEffect, useRef } from 'react';

/**
 * Shared-element storytelling: the hero's room photo physically travels down
 * the page instead of each section starting fresh.
 *
 *   leg 1  hero stage   → the phone's upload tile   ("you upload the photo")
 *   leg 2  phone result → the Mantha stage          ("rewind: how Mantha did it")
 *
 * One fixed "courier" image flies between the two anchors' live positions
 * (both are moving while you scroll, so it lerps between moving rects),
 * scrubbed by scroll. While it's in flight both anchors are hidden, so it
 * reads as the same object leaving one place and arriving at another.
 * Anchors are plain elements marked with data-courier="…".
 */

type Leg = {
  from: string;
  to: string;
  /** images the courier shows; with two, it cross-fades mid-flight */
  images: (fromEl: HTMLElement) => [string, string?];
  /** scroll range (document Y) over which the flight happens */
  range: (q: (name: string) => HTMLElement | null) => [number, number] | null;
  label?: string;
  radius: [number, number];
};

const SCANDI = '/assets/rooms/room-living-scandinavian.webp';
const ORIGINAL = '/assets/rooms/hero.webp';

const docTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

const LEGS: Leg[] = [
  {
    from: 'hero',
    to: 'phone-tile',
    images: (el) => [el.dataset.courierSrc || ORIGINAL],
    radius: [20, 14],
    range: (q) => {
      const hero = q('hero');
      const phone = q('phone-tile')?.closest('section');
      if (!hero || !phone) return null;
      const vh = window.innerHeight;
      // the hero is pinned under the type portal first: don't fly mid-dive
      const pinned = Number(document.querySelector<HTMLElement>('[data-pin-until]')?.dataset.pinUntil) || 0;
      const start = Math.max(pinned, docTop(hero) - vh * 0.22);
      const end = docTop(phone) + (phone.offsetHeight - vh) * 0.06;
      return end > start + 50 ? [start, end] : null;
    },
  },
  {
    from: 'phone-card',
    to: 'engine',
    images: () => [SCANDI, ORIGINAL],
    label: '↺ Rewind · how Mantha did it',
    radius: [18, 18],
    range: (q) => {
      const phone = q('phone-card')?.closest('section');
      const engine = q('engine')?.closest('section');
      if (!phone || !engine) return null;
      const vh = window.innerHeight;
      const start = docTop(phone) + (phone.offsetHeight - vh) * 0.93;
      const end = docTop(engine) + 4;
      return end > start + 50 ? [start, end] : null;
    },
  },
];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function RoomCourier() {
  const box = useRef<HTMLDivElement>(null);
  const imgA = useRef<HTMLImageElement>(null);
  const imgB = useRef<HTMLImageElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const q = (name: string) => document.querySelector<HTMLElement>(`[data-courier="${name}"]`);
    let raf = 0;
    const hidden = new Set<HTMLElement>();

    const setHidden = (anchor: HTMLElement | null, hide: boolean) => {
      if (!anchor) return;
      if (hide && !hidden.has(anchor)) { anchor.style.visibility = 'hidden'; hidden.add(anchor); }
      if (!hide && hidden.has(anchor)) { anchor.style.visibility = ''; hidden.delete(anchor); }
    };

    const frame = () => {
      raf = 0;
      const y = window.scrollY;
      let active = false;
      for (const leg of LEGS) {
        const from = q(leg.from);
        const to = q(leg.to);
        const range = leg.range(q);
        if (!from || !to || !range) { setHidden(from, false); setHidden(to, false); continue; }
        const raw = (y - range[0]) / (range[1] - range[0]);
        const [first, second] = leg.images(from);
        // never swap the real photo for a courier that hasn't loaded yet:
        // that left an empty box where the hero photo was on a cold load
        if (raw > 0 && raw < 1 && !active && imgA.current && imgA.current.getAttribute('src') !== first) {
          imgA.current.src = first;
        }
        const loaded = !!imgA.current?.complete && imgA.current.naturalWidth > 0;
        if (!loaded) kickWhenLoaded();
        const inFlight = raw > 0 && raw < 1 && !active && loaded;
        setHidden(from, inFlight);
        setHidden(to, inFlight);
        if (!inFlight) continue;
        active = true;

        const t = ease(raw);
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const left = lerp(a.left, b.left, t);
        const top = lerp(a.top, b.top, t);
        const w = lerp(a.width, b.width, t);
        const h = lerp(a.height, b.height, t);
        // a little lift and tilt mid-flight, like an object picked up and set down
        const arc = Math.sin(raw * Math.PI);
        el.style.transform = `translate3d(${left}px, ${top}px, 0) rotate(${arc * -3}deg) scale(${1 + arc * 0.04})`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.borderRadius = `${lerp(leg.radius[0], leg.radius[1], t)}px`;
        el.style.boxShadow = `0 ${20 + arc * 40}px ${40 + arc * 60}px -20px rgba(0,30,25,${0.35 + arc * 0.25}), 0 0 0 ${arc * 2}px rgba(143,227,212,${arc * 0.7})`;
        el.style.opacity = '1';

        if (imgB.current) {
          if (second) {
            if (imgB.current.getAttribute('src') !== second) imgB.current.src = second;
            imgB.current.style.opacity = String(Math.max(0, Math.min(1, (raw - 0.2) / 0.45)));
          } else {
            imgB.current.style.opacity = '0';
          }
        }
        if (pill.current) {
          pill.current.textContent = leg.label ?? '';
          pill.current.style.opacity = leg.label ? String(arc) : '0';
        }
      }
      if (!active) el.style.opacity = '0';
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const kickWhenLoaded = () => { imgA.current?.addEventListener('load', kick, { once: true }); };
    // warm the cache so the first flight has its photo ready
    [ORIGINAL, SCANDI].forEach((src) => { new Image().src = src; });

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    kick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      hidden.forEach((a) => { a.style.visibility = ''; });
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-40 overflow-hidden opacity-0 will-change-transform"
      style={{ width: 0, height: 0 }}
    >
      <img ref={imgA} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <img ref={imgB} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0" />
      <span
        ref={pill}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#00231D]/80 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#8FE3D4] opacity-0 backdrop-blur-md"
      />
    </div>
  );
}
