import { useEffect, useRef } from 'react';

/**
 * The colour-grade journey: scrolling the homepage is one day in the room.
 * Each story section sits at a time of day — pre-dawn at the hero, morning
 * for "how it works", midday for Mantha, golden hour, dusk, lamp-lit
 * evening, night for the final ask. As you scroll, the page background
 * between the panels and a soft colour grade over everything move through
 * the day together.
 */

type Stop = { id: string; minutes: number; label: string; bg: string; tint: string };

const STOPS: Stop[] = [
  { id: 'top', minutes: 5 * 60 + 50, label: 'Before sunrise', bg: '#D5E0DE', tint: 'rgba(60,100,160,0.55)' },
  { id: 'how-it-works', minutes: 8 * 60 + 10, label: 'Morning light', bg: '#EAF2EF', tint: 'rgba(170,205,235,0.40)' },
  { id: 'engine', minutes: 12 * 60 + 30, label: 'Midday', bg: '#F4F3EE', tint: 'rgba(255,255,255,0)' },
  { id: 'generator', minutes: 14 * 60 + 15, label: 'Afternoon', bg: '#F4EFE6', tint: 'rgba(255,220,170,0.25)' },
  { id: 'styles', minutes: 17 * 60 + 5, label: 'Late afternoon', bg: '#F2E6D3', tint: 'rgba(255,190,120,0.38)' },
  { id: 'every-angle', minutes: 18 * 60 + 40, label: 'Golden hour', bg: '#EDD6BC', tint: 'rgba(255,150,70,0.50)' },
  { id: 'measurement', minutes: 19 * 60 + 50, label: 'Dusk', bg: '#D8D3DD', tint: 'rgba(140,110,170,0.42)' },
  { id: 'faq', minutes: 21 * 60 + 20, label: 'Evening · lamps on', bg: '#D3DBD7', tint: 'rgba(255,165,85,0.30)' },
  { id: '__end', minutes: 23 * 60 + 10, label: 'Night', bg: '#0F2B26', tint: 'rgba(40,60,120,0.50)' },
];

function parse(c: string): [number, number, number, number] {
  if (c.startsWith('#')) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = c.match(/[\d.]+/g)!.map(Number);
  return [m[0], m[1], m[2], m[3] ?? 1];
}
const mix = (a: string, b: string, t: number) => {
  const x = parse(a);
  const y = parse(b);
  const v = x.map((n, i) => n + (y[i] - n) * t);
  return `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${v[3].toFixed(3)})`;
};

export function TimeOfDay() {
  const bg = useRef<HTMLDivElement>(null);
  const tint = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let marks: { y: number; stop: Stop }[] = [];

    const measure = () => {
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      marks = STOPS.map((stop) => {
        if (stop.id === '__end') return { y: docH - vh, stop };
        const el = document.getElementById(stop.id);
        // a section's time is reached when it fills the screen
        return el ? { y: el.getBoundingClientRect().top + window.scrollY - vh * 0.15, stop } : null;
      }).filter((m): m is { y: number; stop: Stop } => !!m).sort((a, b) => a.y - b.y);
      marks[0] = { ...marks[0], y: 0 };
    };

    const frame = () => {
      raf = 0;
      if (!marks.length) measure();
      const y = window.scrollY;
      let i = marks.findIndex((m) => m.y > y) - 1;
      if (i < 0) i = y <= marks[0].y ? 0 : marks.length - 2;
      const a = marks[Math.max(0, i)];
      const b = marks[Math.min(marks.length - 1, i + 1)];
      const t = b.y > a.y ? Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y))) : 0;
      if (bg.current) bg.current.style.backgroundColor = mix(a.stop.bg, b.stop.bg, t);
      if (tint.current) tint.current.style.backgroundColor = mix(a.stop.tint, b.stop.tint, t);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const remeasure = () => { measure(); kick(); };

    measure();
    kick();
    // sections settle their heights after images and pinned layouts measure
    const t1 = window.setTimeout(remeasure, 1200);
    const t2 = window.setTimeout(remeasure, 3500);
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', remeasure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', remeasure);
    };
  }, []);

  return (
    <>
      {/* the page itself, between the panels */}
      <div ref={bg} aria-hidden className="pointer-events-none fixed inset-0 z-0" />
      {/* a soft colour grade over everything: cool at dawn, warm at golden hour */}
      <div ref={tint} aria-hidden className="pointer-events-none fixed inset-0 z-[45] mix-blend-soft-light" />
    </>
  );
}
