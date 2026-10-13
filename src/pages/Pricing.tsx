import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ArrowRight, Loader2, ShieldCheck, CreditCard, AlertTriangle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { Magnetic, Reveal, RevealWords } from '@/components/premium/Motion';
import { Testimonials } from '@/components/premium/Testimonials';
import { NewsletterBand } from '@/components/motion/NewsletterBand';
import { PHASE1_PLAN, money, pence } from '@/lib/billing';
import { startCheckout, CheckoutError } from '@/lib/checkout';
import { useAuthStore } from '@/stores/authStore';
import { isActiveSubscription, useSubscription } from '@/hooks/useProfile';
import { softwareApplicationSchema, faqPageSchema, breadcrumbSchema } from '@/lib/schema';

const FAQS = [
  {
    q: 'What do I pay, and when?',
    a: 'You pay 69p today for your first month. After that it renews at £4.99 a month until you cancel.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Cancel from your account and the plan stays active until the end of the period you have already paid for. No exit fee, no notice period.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'If Think Decor does not work for your rooms, email us within 14 days of your first payment and we will refund it in full.',
  },
  {
    q: 'Do I need any special equipment?',
    a: 'No. A photo of your room from any phone is enough — no LiDAR, laser measures or special hardware.',
  },
];

export default function Pricing() {
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const cancelled = params.get('checkout') === 'cancelled';
  // Affiliate / influencer links look like /pricing?ref=INFLUENCER10.
  // Resolved server-side against live Stripe promotion codes — an unknown
  // or mistyped code is silently ignored and the standard 69p offer applies.
  const promoCode = params.get('ref') ?? params.get('promo') ?? undefined;

  const [failure, setFailure] = useState<{ title: string; detail?: string } | null>(null);

  const plan = PHASE1_PLAN;
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: subscription } = useSubscription();

  const go = async () => {
    // Credits are granted to an account by the Stripe webhook. A buyer with no
    // account has nowhere for them to land, so checkout needs one first. The
    // return path keeps any ?ref= promo code intact.
    if (!user) {
      toast('Create a free account first — your plan and credits attach to it.');
      navigate('/signup', { state: { from: { pathname: '/pricing', search: location.search } } });
      return;
    }

    // Already subscribed: a second checkout would create a second subscription and charge twice.
    if (isActiveSubscription(subscription)) {
      toast('You already have an active plan. You can manage it here.');
      navigate('/app/settings?tab=plan');
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      await startCheckout(plan.key, 'month', promoCode);
      // On success the browser navigates to Stripe, so nothing runs after this.
    } catch (e) {
      const err = e as CheckoutError;
      // Toasts get missed. A dead button on a pricing page needs to say why.
      setFailure({ title: err.message, detail: err.detail });
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pricing: Room Design From 69p | Think Decor"
        description="Start for 69p, then £4.99 a month. Upload a photo of any room and Mantha AI redesigns it in the style you choose — 20 designs a month. Cancel anytime."
        canonical="https://www.thinkdecor.app/pricing"
        image="/og-pricing.png"
        schema={[
          breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }]),
          softwareApplicationSchema({
            price: plan.introPrice ?? 0.69,
            currency: 'GBP',
            description: `Upload a photo of any room and Mantha AI redesigns it in the style you choose — ${plan.credits} designs a month.`,
          }),
          faqPageSchema(FAQS),
        ]}
      />
      <Navbar />

      <main className="relative pt-28">
        {/* ---------------- HEADER ---------------- */}
        <section className="relative overflow-hidden px-3 pb-10 pt-2 sm:px-4">
          <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(170deg,#003B33,#00332C_60%,#002923)] py-14 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(70% 55% at 88% 8%, rgba(0,160,140,.30), transparent 62%), radial-gradient(55% 45% at 0% 100%, rgba(0,89,78,.55), transparent 65%)',
              }}
            />
            <div className="container relative mx-auto max-w-[1120px] px-6 text-center sm:px-8">
              <Reveal>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">
                  One simple plan
                </p>
              </Reveal>
              <h1 className="mx-auto mt-5 max-w-[16ch] font-display text-[clamp(2.2rem,5vw,3.7rem)] font-medium leading-[1.04] tracking-[-0.035em] text-white">
                <RevealWords text="Start for 69p." delay={0.12} />
              </h1>
              <Reveal delay={0.35}>
                <p className="mx-auto mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-white/75">
                  One plan, everything included. Your first month is 69p,
                  then £4.99 a month. Cancel anytime.
                </p>
              </Reveal>

              {failure && (
                <Reveal delay={0.42}>
                  <div className="mx-auto mt-8 max-w-[560px] rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-5 text-left backdrop-blur-sm">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-300" />
                      {failure.title}
                    </p>
                    {failure.detail && (
                      <p className="mt-2 pl-6 text-[13px] leading-relaxed text-white/65">
                        {failure.detail}
                      </p>
                    )}
                    <p className="mt-2 pl-6 text-[12.5px] text-white/45">
                      Nothing was charged. Full details are in the browser console.
                    </p>
                  </div>
                </Reveal>
              )}

              {cancelled && (
                <Reveal delay={0.42}>
                  <p className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-[13px] text-white/70">
                    Checkout cancelled — nothing was charged.
                  </p>
                </Reveal>
              )}

              {promoCode && (
                <Reveal delay={0.42}>
                  <p className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-[#8FE3D4]/30 bg-[#00A08C]/10 px-5 py-2.5 text-[13px] text-white/80">
                    Promo code <span className="font-semibold text-white">{promoCode}</span> will be applied at checkout.
                  </p>
                </Reveal>
              )}
            </div>
          </div>
        </section>

        {/* ---------------- THE ONE PLAN ---------------- */}
        <section className="pb-16">
          <div className="container mx-auto max-w-[560px] px-6 sm:px-8">
            <Reveal delay={0.1}>
              <div className="relative rounded-[28px] border border-primary/35 bg-card p-8 shadow-[0_30px_70px_-38px_hsl(168_70%_18%/0.42)] lg:p-10">
                {/* intro price */}
                <div className="text-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
                    First month
                  </p>
                  <div className="mt-3 flex items-end justify-center gap-2">
                    <span className="text-[64px] font-bold leading-none tracking-[-0.04em] text-foreground">
                      {pence(plan.introPrice ?? 0.69)}
                    </span>
                  </div>
                  <p className="mt-4 text-[15px] text-foreground/55">
                    then <span className="font-semibold text-foreground">{money(plan.monthly)}</span> a month
                  </p>
                  <p className="mt-1.5 text-[13px] text-foreground/45">Cancel anytime</p>
                </div>

                {/* what you get */}
                <ul className="mt-9 grid gap-3 border-t border-foreground/[0.08] pt-8 sm:grid-cols-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-foreground/70">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Magnetic className="!block w-full">
                  <button
                    onClick={go}
                    disabled={busy}
                    className="group mt-9 flex w-full items-center justify-center gap-2 rounded-full bg-[#00A08C] py-4 text-[15px] font-semibold text-white shadow-[0_20px_46px_-14px_rgba(0,160,140,0.5)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busy ? 'Opening checkout…' : plan.cta}
                    {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                  </button>
                </Magnetic>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[12.5px] text-foreground/45">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure payment by Stripe</span>
                <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-primary" /> Cancel any time</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 14-day refund</span>
              </p>
            </Reveal>
          </div>
        </section>


        <Testimonials />

        {/* ---------------- FAQ ---------------- */}
        <section className="pb-24 lg:pb-32">
          <div className="container mx-auto max-w-[820px] px-6 sm:px-8">
            <Reveal>
              <h2 className="text-[clamp(1.5rem,2.6vw,2.1rem)] font-bold tracking-[-0.03em] text-foreground">
                Billing questions.
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FAQS.map((f, i) => (
                <Reveal key={f.q} delay={i * 0.05}>
                  <div className="h-full rounded-[18px] border border-foreground/[0.08] bg-card p-6 shadow-[0_6px_20px_-14px_hsl(168_20%_10%/0.35)]">
                    <p className="text-[14.5px] font-semibold text-foreground">{f.q}</p>
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-foreground/55">{f.a}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <NewsletterBand />
      </main>

      <Footer />
    </div>
  );
}
