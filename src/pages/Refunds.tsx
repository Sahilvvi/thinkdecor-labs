import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { Reveal } from '@/components/premium/Motion';
import { Link } from 'react-router-dom';
import { RotateCcw, FileText, Mail, ArrowRight } from 'lucide-react';

const sections = [
  {
    title: 'Cancelling a subscription',
    content: [
      'You can cancel at any time — from your account, or by emailing info@thinkdecor.app from the address on the account.',
      'Cancelling stops the next renewal. Your plan stays active until the end of the period you have already paid for, and you keep your remaining credits for that period.',
      'There is no cancellation fee and no notice period.',
    ],
  },
  {
    title: '14-day refund on your first payment',
    content: [
      'If Think Decor does not work for your rooms, email us within 14 days of your first payment and we will refund it in full.',
      'This applies to the first payment on a new account. It is not a rolling monthly guarantee.',
      'You do not need to give a reason, though telling us what went wrong genuinely helps us fix it.',
    ],
  },
  {
    title: 'Renewals',
    content: [
      'We email a receipt for every payment, including automatic renewals.',
      'If a renewal caught you by surprise and you have not used the service in that period, contact us within 7 days of the charge and we will refund it.',
      'We would rather refund an unwanted renewal than argue about it.',
    ],
  },
  {
    title: 'How refunds are paid',
    content: [
      'Refunds go back to the original payment method. We cannot send a refund anywhere else.',
      'Stripe typically takes 5 to 10 business days to return the money to your bank or card.',
      'You will receive confirmation by email as soon as we process it.',
    ],
  },
  {
    title: 'Your statutory rights',
    content: [
      'Nothing here reduces your rights under UK consumer law.',
      'Under the Consumer Contracts Regulations 2013 you generally have 14 days to cancel a digital service bought online, unless you asked us to start immediately and acknowledged losing that right.',
      'If you believe a charge is wrong, contact us first — we can usually resolve it faster than a card dispute.',
    ],
  },
];

export default function Refunds() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Refund Policy | Think Decor"
        description="How cancellations and refunds work at Think Decor — 14-day refund on your first payment, pro rata refunds on unused credit packs."
        canonical="https://www.thinkdecor.app/refunds"
      />
      <Navbar />

      <main className="relative pt-28">
        {/* header */}
        <section className="relative overflow-hidden pb-10 pt-8">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[460px] w-[860px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[150px]" />
          <div className="container relative mx-auto max-w-[820px] px-6 sm:px-8">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-[12px] font-medium text-primary">
                <RotateCcw className="h-3.5 w-3.5" />
                Refund Policy
              </span>
              <h1 className="mt-6 max-w-[18ch] text-[clamp(2.1rem,4.6vw,3.2rem)] font-bold leading-[1.05] tracking-[-0.035em] text-foreground">
                Cancel any time. Refunds without a fight.
              </h1>
              <p className="mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-foreground/58">
                We would rather refund someone than keep money they are unhappy about.
                Here is exactly how it works.
              </p>
              <p className="mt-4 text-[12.5px] text-foreground/40">
                Last updated:{' '}
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </Reveal>
          </div>
        </section>

        {/* sections */}
        <section className="pb-16">
          <div className="container mx-auto max-w-[820px] px-6 sm:px-8">
            <div className="space-y-4">
              {sections.map((sec, i) => (
                <Reveal key={sec.title} delay={i * 0.04}>
                  <div className="rounded-[20px] border border-foreground/[0.08] bg-card p-6 shadow-[0_8px_26px_-20px_hsl(168_20%_10%/0.4)] sm:p-8">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.09]">
                        <FileText className="h-4 w-4 text-primary" />
                      </span>
                      <h2 className="text-[17px] font-bold tracking-[-0.02em] text-foreground">{sec.title}</h2>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {sec.content.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-[14.5px] leading-relaxed text-foreground/62">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* contact strip */}
        <section className="pb-24 lg:pb-32">
          <div className="container mx-auto max-w-[820px] px-6 sm:px-8">
            <Reveal y={30}>
              <div className="relative overflow-hidden rounded-[26px] bg-primary px-8 py-12 sm:px-12">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.07] blur-3xl" />
                <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-[22px] font-bold tracking-[-0.02em] text-primary-foreground">
                      Need a refund?
                    </h2>
                    <p className="mt-2 max-w-[42ch] text-[14.5px] leading-relaxed text-primary-foreground/70">
                      Email us from the address on your account and we will sort it. No forms, no hoops.
                    </p>
                  </div>
                  <a
                    href="mailto:info@thinkdecor.app?subject=Refund%20request"
                    className="group inline-flex flex-shrink-0 items-center gap-2.5 rounded-full bg-background px-7 py-3.5 text-[14.5px] font-semibold text-primary transition-transform duration-300 hover:scale-[1.03]"
                  >
                    <Mail className="h-4 w-4" />
                    info@thinkdecor.app
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 text-center text-[13px] text-foreground/45">
                See also{' '}
                <Link to="/terms" className="font-medium text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>
                <ArrowRight className="ml-1 inline h-3 w-3 text-primary" />
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
