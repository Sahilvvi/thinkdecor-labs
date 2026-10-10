import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { OPEN_SETTINGS_EVENT, getConsent, setConsent } from '@/lib/consent';

/** First-visit cookie choice. "Reject" and "Accept" carry equal weight; reopen from the footer's "Cookie settings". */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(getConsent() === null);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (c: 'accepted' | 'rejected') => {
    setConsent(c);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-5"
    >
      <p className="text-sm text-foreground">
        We use essential cookies to keep you signed in. With your permission we also use analytics and advertising
        cookies (Google, Meta, Reddit, Spotify, Pinterest) to measure and improve our marketing. See our{' '}
        <Link to="/privacy#cookies" className="underline underline-offset-2">cookie details</Link>.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={() => choose('rejected')}>Reject non-essential</Button>
        <Button variant="outline" className="flex-1" onClick={() => choose('accepted')}>Accept all</Button>
      </div>
    </div>
  );
}
