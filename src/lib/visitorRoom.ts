/**
 * The visitor's own room on the homepage. Once someone drops a photo into
 * the free generator, later sections (the light simulation, the closing
 * card) show *their* room instead of the example one. Both images live only
 * in this tab's memory: `before` is an object URL of the file they chose,
 * `after` is Mantha's result as a data URL. Nothing here is stored or sent.
 */
import { useSyncExternalStore } from 'react';

export type VisitorRoom = { before: string | null; after: string | null };

const EMPTY: VisitorRoom = { before: null, after: null };
let state: VisitorRoom = EMPTY;
const listeners = new Set<() => void>();

export function setVisitorRoom(next: Partial<VisitorRoom>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function clearVisitorRoom() {
  state = EMPTY;
  listeners.forEach((l) => l());
}

export function useVisitorRoom() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => EMPTY,
  );
}
