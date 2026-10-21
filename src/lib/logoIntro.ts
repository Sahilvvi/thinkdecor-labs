/**
 * Whether the homepage's logo intro still has the screen. It plays once per
 * browser session and never for headless browsers (the prerender snapshot
 * must not bake it in). The type portal waits for it before setting its
 * letters in, so the two never run on top of each other.
 */
import { useSyncExternalStore } from 'react';

const SEEN_KEY = 'td_logo_intro_seen';

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

export function logoIntroShouldPlay() {
  return playing;
}

export function finishLogoIntro() {
  if (!playing) return;
  playing = false;
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // fine: it may play again next visit
  }
  listeners.forEach((l) => l());
}

/** True once the logo intro is over (or was never going to play). */
export function useLogoIntroDone() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => !playing,
    () => true,
  );
}
