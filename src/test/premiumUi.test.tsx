import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BeforeAfterSlider } from '@/components/shared/BeforeAfterSlider';
import { DesigningPreview } from '@/components/app/DesigningPreview';

// The preview's photo needs Supabase signed URLs; not under test here.
vi.mock('@/components/app/StoredImage', () => ({ StoredImage: () => null }));

// Rendered with react-dom directly: @testing-library/react is installed but
// its @testing-library/dom peer isn't.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;
function mount(ui: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const key = (el: Element, k: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); });
const pointer = (el: Element, type: string) => act(() => { el.dispatchEvent(new PointerEvent(type, { bubbles: true })); });

beforeAll(() => {
  // jsdom has neither of these
  window.matchMedia ??= ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  // never intersects, so intro animations stay put and the tests are deterministic
  window.IntersectionObserver ??= class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds = [];
  } as unknown as typeof IntersectionObserver;
  window.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
});

describe('BeforeAfterSlider', () => {
  it('is a keyboard-operable slider', () => {
    const el = mount(<BeforeAfterSlider beforeSrc="/a.jpg" afterSrc="/b.jpg" intro="none" />);
    const slider = el.querySelector('[role="slider"]')!;
    expect(slider.getAttribute('aria-valuenow')).toBe('50');
    key(slider, 'ArrowRight');
    expect(slider.getAttribute('aria-valuenow')).toBe('55');
    key(slider, 'ArrowLeft');
    key(slider, 'ArrowLeft');
    expect(slider.getAttribute('aria-valuenow')).toBe('45');
  });

  it('shows the whole original while "Hold for original" is held', () => {
    const el = mount(<BeforeAfterSlider beforeSrc="/a.jpg" afterSrc="/b.jpg" intro="none" />);
    const hold = el.querySelector('button[aria-label*="original"]')!;
    const beforeLayer = el.querySelector('img[alt="Before"]')!.parentElement as HTMLElement;
    expect(beforeLayer.style.width).toBe('50%');
    pointer(hold, 'pointerdown');
    expect(hold.getAttribute('aria-pressed')).toBe('true');
    expect(beforeLayer.style.width).toBe('100%');
    pointer(hold, 'pointerup');
    expect(hold.getAttribute('aria-pressed')).toBe('false');
    expect(beforeLayer.style.width).toBe('50%');
  });

  it('starts a just-made result fully covered, ready to wipe in', () => {
    const el = mount(<BeforeAfterSlider beforeSrc="/a.jpg" afterSrc="/b.jpg" intro="reveal" />);
    expect(el.querySelector('[role="slider"]')!.getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('DesigningPreview', () => {
  it('ticks through its stages while Mantha AI works', () => {
    vi.useFakeTimers();
    const t0 = performance.now();
    const now = vi.spyOn(performance, 'now').mockReturnValue(t0);
    const el = mount(<DesigningPreview sourceRef="x" />);
    const status = () => el.querySelector('[role="status"]')!.getAttribute('aria-label');
    expect(status()).toMatch(/Reading walls and light/);
    now.mockReturnValue(t0 + 5000);
    act(() => { vi.advanceTimersByTime(200); });
    expect(status()).toMatch(/Rendering your room/);
    now.mockRestore();
    vi.useRealTimers();
  });
});
