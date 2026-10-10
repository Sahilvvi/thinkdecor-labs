import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Magnetic, Reveal } from '@/components/premium/Motion';

/* ------------------------------------------------------------------ *
 *  Stay in the loop — pulled out of the footer's dense link columns
 *  (where it was easy to miss) into its own highlighted band, right
 *  before the footer itself.
 * ------------------------------------------------------------------ */
export function NewsletterBand() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: 'Newsletter signup',
        email: trimmed,
        reason: 'newsletter',
        message: 'Early-access email signup from footer',
      });
      if (error) throw error;
      setSent(true);
      setEmail('');
      toast.success("You're on the list — we'll be in touch.");
    } catch (err) {
      console.error('Newsletter signup failed:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-14 lg:py-16">
      <div className="container mx-auto max-w-[1240px] px-6 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] border border-primary/[0.14] bg-[linear-gradient(135deg,hsl(168_26%_95.5%),hsl(168_35%_98%)_60%,hsl(168_26%_95.5%))] p-8 shadow-[0_24px_60px_-36px_hsl(168_30%_15%/0.3)] sm:p-10 lg:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(168_30%_20%/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(168_30%_20%/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_100%_at_15%_50%,#000,transparent)]"
            />
            <div aria-hidden className="pointer-events-none absolute -right-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/[0.08] blur-3xl" />

            <div className="relative flex flex-col items-center gap-7 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:text-left">
              <div>
                <p className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-primary lg:justify-start">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Stay in the loop
                </p>
                <h3 className="mt-3 max-w-[26ch] text-[22px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[26px]">
                  Be first to know when room scanning launches.
                </h3>
                <p className="mt-2 max-w-[46ch] text-[14px] text-foreground/55">
                  No spam — just a heads up when measured floor plans go live.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-shrink-0 flex-col gap-2.5 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  aria-label="Email address"
                  className="w-full flex-1 rounded-full border border-foreground/[0.12] bg-white px-5 py-3 text-[14px] text-foreground shadow-[0_4px_14px_-8px_hsl(168_30%_15%/0.25)] outline-none transition-colors focus:border-primary"
                />
                <Magnetic className="flex-shrink-0">
                  <button
                    type="submit"
                    disabled={loading || sent}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-primary-foreground shadow-[0_14px_32px_-14px_hsl(168_100%_17%/0.55)] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-70 disabled:hover:scale-100 sm:w-auto"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : sent ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : null}
                    {sent ? 'Joined' : 'Join the list'}
                  </button>
                </Magnetic>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
