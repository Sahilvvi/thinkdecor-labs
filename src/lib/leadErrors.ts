/** Turns a rejected contact/newsletter insert into something a visitor can act on. */
export function leadErrorMessage(err: unknown, fallback: string): string {
  const text = String((err as { message?: string } | null)?.message ?? '');
  if (text.includes('rate_limited')) return "You've sent a few messages already. Please wait a while, or email info@thinkdecor.app.";
  if (text.includes('invalid_email')) return 'That email address doesn’t look right. Please check it.';
  if (text.includes('too_long')) return 'That message is too long. Please shorten it a little.';
  return fallback;
}
