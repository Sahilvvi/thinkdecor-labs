import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Mail, Loader2, Clock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { useAuthStore } from '@/stores/authStore';
import { isActiveSubscription, useSubscription } from '@/hooks/useProfile';
import { useCreditBalance } from '@/lib/generation';
import { syncBilling } from '@/lib/checkout';

/** How long to wait for the Stripe webhook before showing the "still activating" message. */
const CONFIRM_TIMEOUT_S = 20;

type Phase = 'confirming' | 'confirmed' | 'delayed' | 'signed-out';

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const queryClient = useQueryClient();
  const { user, initialized } = useAuthStore();

  // Stripe redirects back before its webhook has necessarily landed, so poll
  // for the subscription instead of guessing with a fixed delay.
  const [polling, setPolling] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const { data: subscription } = useSubscription({ refetchInterval: polling ? 2000 : false });
  const { data: credits } = useCreditBalance();

  const active = isActiveSubscription(subscription);

  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => {
      setElapsed((s) => s + 1);
      // Credits are granted by the same webhook — keep the count fresh too.
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    }, 1000);
    return () => clearInterval(timer);
  }, [polling, queryClient]);

  // Don't rely on the Stripe webhook alone: ask the server to pull the subscription and credits
  // straight from Stripe. Immediately, then every 4s until the plan shows as active.
  useEffect(() => {
    if (!user || active) return;
    let cancelled = false;
    const run = async () => {
      const res = await syncBilling();
      if (cancelled || !res) return;
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    };
    run();
    const id = setInterval(run, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user, active, queryClient]);

  useEffect(() => {
    if (active || elapsed >= CONFIRM_TIMEOUT_S) setPolling(false);
  }, [active, elapsed]);

  const phase: Phase = !initialized
    ? 'confirming'
    : !user
      ? 'signed-out'
      : active
        ? 'confirmed'
        : elapsed >= CONFIRM_TIMEOUT_S
          ? 'delayed'
          : 'confirming';

  const copy: Record<Phase, { title: string; body: string }> = {
    confirming: {
      title: 'Confirming your payment…',
      body: 'This takes a few seconds — please don’t close the page.',
    },
    confirmed: {
      title: "You're in.",
      body: `Your plan is active${credits !== undefined ? ` and you have ${credits} credits` : ''}. Your receipt is on its way by email.`,
    },
    delayed: {
      title: 'Payment received',
      body: 'Stripe has taken your payment. Your plan is still activating — this usually finishes within a minute, and your credits will appear automatically. You can start designing now.',
    },
    'signed-out': {
      title: 'Payment received',
      body: 'Your receipt is on its way by email. Sign in to your account to start designing.',
    },
  };

  const cta =
    phase === 'signed-out'
      ? { to: '/login', label: 'Sign in to start' }
      : { to: '/app/create', label: 'Start designing' };

  // Only Stripe's redirect (which always carries session_id) should land here;
  // a bare visit would otherwise claim a payment that never happened.
  if (!sessionId && initialized) return <Navigate to={user ? '/app' : '/pricing'} replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Payment complete | Think Decor" description="Your Think Decor purchase is confirmed." />
      <Navbar />

      <main className="relative pt-28">
        <section className="relative overflow-hidden py-20 lg:py-28">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[500px] w-[860px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />

          <div className="container relative mx-auto max-w-[620px] px-6 text-center sm:px-8">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
            >
              {phase === 'confirming' ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : phase === 'delayed' ? (
                <Clock className="h-7 w-7" />
              ) : (
                <Check className="h-7 w-7" />
              )}
            </motion.span>

            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="mt-8 text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-foreground">
                {copy[phase].title}
              </h1>
              <p className="mx-auto mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-foreground/58">
                {copy[phase].body}
              </p>

              {phase !== 'confirming' && (
                <>
                  <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                      to={cta.to}
                      className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-4 text-[15px] font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.03]"
                    >
                      {cta.label}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.14] px-7 py-4 text-[14.5px] font-medium text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Mail className="h-4 w-4" /> Need help?
                    </Link>
                  </div>

                  {sessionId && (
                    <p className="mt-10 font-mono text-[11px] text-foreground/32">
                      Reference {sessionId.slice(0, 28)}…
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
