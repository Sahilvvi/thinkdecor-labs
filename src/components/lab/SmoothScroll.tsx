import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Inertial smooth scrolling for the homepage (Lenis): wheel and trackpad
 * input glides instead of stepping, which is what makes the pinned,
 * scroll-scrubbed sections feel continuous. It still drives the native
 * window scroll, so sticky sections and scroll-linked motion keep working.
 * Touch keeps the phone's own native scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      wheelMultiplier: 0.95,
      anchors: { offset: -80 },
    });
    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
