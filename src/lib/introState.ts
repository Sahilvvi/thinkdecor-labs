/**
 * Whether the homepage's cinematic intro still has the screen. The hero
 * waits for it before playing its own headline reveal, so the two never
 * run on top of each other. The intro plays once per browser session and
 * never for headless browsers (the prerender snapshot must not bake it in).
 */
import { useSyncExternalStore } from 'react';

const SEEN_KEY = 'td_intro_seen';

function shouldPlay() {
  if (typeof window === 'undefined') return false;
  if (navigator.webdriver) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

let playing = shouldPlay();
const listeners = new Set<() => void>();

export function introShouldPlay() {
  return playing;
}

export function finishIntro() {
  if (!playing) return;
  playing = false;
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // fine: it may play again next visit
  }
  listeners.forEach((l) => l());
}

/** True once the intro is over (or was never going to play). */
export function useIntroDone() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => !playing,
    () => true,
  );
}
