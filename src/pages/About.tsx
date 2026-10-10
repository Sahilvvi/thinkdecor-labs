import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { PHASE1_PLAN, money, pence } from '@/lib/billing';

const INTRO = pence(PHASE1_PLAN.introPrice ?? 0.69);
const MONTHLY = money(PHASE1_PLAN.monthly);

const sections = [
  {
    title: 'What Think Decor does',
    body: [
      'Think Decor is an AI interior design tool. You upload a photo of a room, choose one of seven styles or describe the change you want, and Mantha AI redesigns the photo so you can see the result before you spend money on paint, flooring or furniture.',
      'The results are AI visualisations. They are a guide to how a room could look, not an exact representation of a product or a finished room.',
    ],
  },
  {
    title: 'Who is behind it',
    body: [
      'Think Decor is a trading name of Dreamverse Limited, a company registered in England and Wales (company no. 16446982). Our registered office is Flat 3, 20–22 St. Giles Street, Northampton NN1 1JA, United Kingdom.',
      'You can reach us at info@thinkdecor.app. We reply within one working day, UK time.',
    ],
  },
  {
    title: 'How we make money',
    body: [
      `Think Decor is paid for by subscription: ${INTRO} for your first month, then ${MONTHLY} a month. You can cancel at any time.`,
      'Some product links inside the app may in future earn us a commission if you buy. If that happens we will say so beside the link and on this page, and it will never change what we show you.',
    ],
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="About Think Decor | AI Room Redesign From a Photo"
        description="Think Decor is a trading name of Dreamverse Limited (company no. 16446982), Northampton, UK. What we do, who is behind it and how we make money."
        canonical="https://www.thinkdecor.app/about"
      />
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">About Think Decor</h1>
          <div className="mt-10 space-y-10">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-xl font-bold text-foreground">{s.title}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                  {s.body.map((p) => <p key={p}>{p}</p>)}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-12 text-sm text-muted-foreground">
            Questions? See our <Link className="underline" to="/contact">contact page</Link>,{' '}
            <Link className="underline" to="/privacy">Privacy Policy</Link> and{' '}
            <Link className="underline" to="/refunds">Refund Policy</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
