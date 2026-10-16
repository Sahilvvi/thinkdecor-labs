import { useEffect } from 'react';

/**
 * Editorial "curtain" reveal for marked images (`<img data-curtain>`): each
 * one wipes up into view, settling from a slight zoom, the first time it
 * scrolls on screen. Mount once per page.
 *
 * Progressive: the hiding class is only added here, by script, so with no
 * JS (or reduced motion) the images simply show. Uses a plain
 * IntersectionObserver — framer's useInView misreports inside StackPanels.
 */
export function CurtainReveals() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('img[data-curtain]'));
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add('curtain-in');
        io.unobserve(el);
        // once it has landed, hand the image back to its own styles (some
        // have their own scale / hover zoom that `transform` would override)
        window.setTimeout(() => el.classList.remove('curtain', 'curtain-in'), 1700);
      }
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => {
      // already on screen when the page loads: leave it alone
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) return;
      el.classList.add('curtain');
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
