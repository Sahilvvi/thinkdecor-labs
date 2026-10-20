/**
 * Hand-traced outlines of the example living room (hero.webp, 1024 x 765),
 * shared by the homepage sections that cut items out of that photo.
 */
export const W = 1024;
export const H = 765;

export const pct = (pts: [number, number][]) =>
  `polygon(${pts.map(([x, y]) => `${((x / W) * 100).toFixed(2)}% ${((y / H) * 100).toFixed(2)}%`).join(', ')})`;
export const pathOf = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;

export const SOFA: [number, number][] = [
  [185, 470], [200, 452], [318, 440], [322, 400], [345, 390], [470, 335], [600, 328], [720, 338],
  [845, 352], [882, 375], [886, 440], [906, 462], [906, 600], [872, 612], [765, 604], [765, 650],
  [748, 700], [748, 752], [400, 752], [398, 660], [415, 602], [350, 588], [260, 580], [200, 574], [186, 540],
];
export const FLOOR: [number, number][] = [[0, 552], [1024, 598], [1024, 765], [0, 765]];
export const STORAGE: [number, number][] = [[0, 30], [380, 30], [380, 553], [0, 553]];
