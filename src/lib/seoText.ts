/**
 * Length-safe title/description helpers. Search results cut titles around 60
 * characters and descriptions around 155; several journal titles were 63-79 and
 * one description was 207, so they were truncated mid-word by Google.
 */
export function seoTitle(title: string, suffix = ' | Think Decor', max = 60): string {
  const full = `${title}${suffix}`;
  if (full.length <= max) return full;
  // Too long with the suffix: drop the suffix. Never cut the title itself
  // (a literal "..." in <title> reads as unfinished); search engines truncate
  // long titles on their own.
  return title;
}

export function seoDescription(text: string | null | undefined, fallback: string, max = 155): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return fallback;
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentence > 80) return cut.slice(0, sentence + 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > 80 ? cut.slice(0, at) : cut).replace(/[\s,;:.-]+$/, '')}\u2026`;
}
