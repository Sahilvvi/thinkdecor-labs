import { Link } from 'react-router-dom';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight, Check, Eraser, Repeat, Upload, Wand2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { Reveal, Stagger, staggerItem, Magnetic } from '@/components/premium/Motion';
import { motion } from 'framer-motion';
import { TEMPLATES } from '@/lib/templates';
import { FREE_SIGNUP_CREDITS } from '@/lib/generation';
import { PHASE1_PLAN, money, pence } from '@/lib/billing';
import { softwareApplicationSchema, faqPageSchema, breadcrumbSchema } from '@/lib/schema';

const INTRO = pence(PHASE1_PLAN.introPrice ?? 0.69);
const MONTHLY = money(PHASE1_PLAN.monthly);

const STEPS = [
  {
    icon: Upload, n: '01', title: 'Upload one photo',
    body: 'Straight-on, in daylight if you can. No LiDAR, no laser measure, no special hardware — any phone photo of the room works.',
  },
  {
    icon: Wand2, n: '02', title: 'Pick a style, or describe your own',
    body: 'Tap one of seven built-in styles, or skip templates entirely and just say what you want changed in plain English.',
  },
  {
    icon: Check, n: '03', title: 'Get a redesign in about 10 seconds',
    body: 'The room’s real walls, windows and layout stay exactly where they are. Only the surfaces you asked to change, change.',
  },
];

const TOOLS = [
  {
    icon: Wand2, name: 'Redesign', href: '/app/create',
    body: 'A full restyle of the room — new palette, new furniture, new mood — built from your own photo, not a stock render.',
  },
  {
    icon: Eraser, name: 'Cleanup', href: '/app/cleanup',
    body: 'Paint over a cable, a box, an old poster — anything in the way — and it’s erased, filled in to match the room around it.',
  },
  {
    icon: Repeat, name: 'Replace', href: '/app/replace',
    body: 'Paint over one thing and describe what should take its place instead: a different sofa, a new rug, anything.',
  },
];

const FAQS = [
  {
    q: 'Does AI room redesign actually keep my real room, or invent a new one?',
    a: 'Think Decor keeps your real walls, windows and layout fixed and only changes the surfaces and furnishings you ask it to. That’s a deliberate difference from tools that regenerate the whole room from a text prompt and can move architecture that was never meant to change.',
  },
  {
    q: 'How long does a redesign take?',
    a: 'About 10 seconds from photo to result. You can regenerate as many times as you like within your credits, refining the same photo instead of starting over.',
  },
  {
    q: 'What does it cost?',
    a: `Two free redesigns on signup, no card needed. After that, ${INTRO} for your first month, then ${MONTHLY}/month for ${PHASE1_PLAN.credits} designs a month.`,
  },
  {
    q: 'Can I remove or replace something instead of redesigning the whole room?',
    a: 'Yes — Cleanup erases anything you paint over, and Replace swaps it for something you describe. Both work on the same photo you’d use for a full redesign.',
  },
  {
    q: 'Do I need to measure my room first?',
    a: 'No. Redesign works from a single photo with no measurements needed. Precise, buy-ready measurements and floor plans are a separate feature still in development.',
  },
];

export default function AiRoomRedesign() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="AI Room Redesign From One Photo | Think Decor"
        description="Upload one photo of a room and Mantha AI redesigns it in the style you choose — real walls, real windows, real layout, only the surfaces change. Free to try."
        canonical="https://www.thinkdecor.app/ai-room-redesign"
        image="/og-ai-room-redesign.png"
        schema={[
          breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'AI Room Redesign', path: '/ai-room-redesign' }]),
          softwareApplicationSchema({
            price: PHASE1_PLAN.introPrice ?? 0.69,
            currency: 'GBP',
            description: 'Upload one photo of a room and Mantha AI redesigns it in the style you choose, keeping the real walls, windows and layout.',
          }),
          faqPageSchema(FAQS),
        ]}
      />
      <Navbar />

      <main className="relative z-10 pt-28">
        {/* ---------------- HERO ---------------- */}
        <section className="relative overflow-hidden px-3 pb-14 pt-2 sm:px-4">
          <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(170deg,#003B33,#00332C_60%,#002923)] py-16 sm:py-24">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(70% 55% at 88% 8%, rgba(0,160,140,.30), transparent 62%), radial-gradient(55% 45% at 0% 100%, rgba(0,89,78,.55), transparent 65%)',
              }}
            />
            <div className="container relative mx-auto max-w-[900px] px-6 text-center sm:px-8">
              <Reveal>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FE3D4]">
                  AI Room Redesign · The Complete Guide
                </p>
                <h1 className="mx-auto mt-5 max-w-[22ch] font-display text-[clamp(2.2rem,5.5vw,4.2rem)] font-medium leading-[1.04] tracking-[-0.03em] text-white">
                  Redesign a room, <em className="italic font-normal text-[#8FE3D4]">keep the walls</em>.
                </h1>
                <p className="mx-auto mt-6 max-w-[58ch] text-[16px] leading-relaxed text-white/70">
                  Upload one photo of any room. Mantha AI restyles it — new paint, new furniture, a whole new
                  mood — while the actual architecture, the walls, windows and layout you photographed, stays
                  exactly where it is. Here’s exactly how that works, what it costs, and how it compares.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <Magnetic>
                    <Link
                      to="/app/create"
                      className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[14.5px] font-semibold text-primary transition-transform duration-300 hover:scale-[1.03]"
                    >
                      Start free — {FREE_SIGNUP_CREDITS} redesigns
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Magnetic>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14.5px] font-semibold text-white/85 ring-1 ring-inset ring-white/20 transition-colors hover:text-white hover:ring-white/40"
                  >
                    See pricing
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------- DEFINITION (answer-first block: what search engines and AI answers quote) ---------------- */}
        <section className="px-3 pt-14 sm:px-4">
          <div className="container mx-auto max-w-[760px] px-6 sm:px-8">
            <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-medium text-foreground">What is AI room redesign?</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-foreground/80">
              AI room redesign is a tool that takes a photo of a real room and shows it restyled in a new colour scheme or
              design style, such as Scandinavian or Japandi. You upload one photo, pick a style, and the AI returns a
              redesigned image in seconds so you can compare options before you paint or buy furniture.
            </p>
            <p className="mt-3 text-[15px] text-foreground/60">
              Curious about the technology? Read <Link to="/blog/how-does-ai-interior-design-work" className="text-primary underline underline-offset-2">how AI interior design works</Link>, or browse{' '}
              <Link to="/blog/living-room-decor-ideas" className="text-primary underline underline-offset-2">living room decor ideas</Link> and{' '}
              <Link to="/blog/interior-design-styles-explained" className="text-primary underline underline-offset-2">interior design styles</Link> to pick a direction first.
            </p>
          </div>
        </section>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section className="px-3 py-14 sm:px-4">
          <div className="container mx-auto max-w-[1100px] px-6 sm:px-8">
            <Reveal className="mx-auto max-w-[640px] text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">How it works</p>
              <h2 className="mt-3 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-medium text-foreground">
                Three steps, about 10 seconds.
              </h2>
            </Reveal>
            <Stagger className="mt-10 grid gap-5 sm:grid-cols-3" gap={0.08}>
              {STEPS.map((s) => (
                <motion.div
                  key={s.n}
                  variants={staggerItem}
                  className="rounded-[22px] border border-border/70 bg-card p-7"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-[26px] italic text-primary/50">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-foreground/60">{s.body}</p>
                </motion.div>
              ))}
            </Stagger>
            <Reveal delay={0.1} className="mt-8 text-center">
              <Link to="/blog/how-does-ai-interior-design-work" className="text-[13.5px] font-semibold text-primary hover:underline">
                Read the full breakdown of how this actually works →
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ---------------- STYLES ---------------- */}
        <section className="px-3 py-14 sm:px-4">
          <div className="container mx-auto max-w-[1100px] px-6 sm:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">{TEMPLATES.length} styles</p>
                <h2 className="mt-3 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-medium text-foreground">
                  Start from a style, or your own words.
                </h2>
              </div>
              <Link to="/pricing" className="text-[13.5px] font-semibold text-primary hover:underline">All templates →</Link>
            </Reveal>
            <Stagger className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.05}>
              {TEMPLATES.map((t) => (
                <motion.div key={t.key} variants={staggerItem}>
                  <Link
                    to={`/app/create?template=${t.key}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-border/70 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={t.image} alt={`${t.label} interior style`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <p className="text-[14.5px] font-semibold text-foreground">{t.label}</p>
                      <p className="line-clamp-2 flex-1 text-[12.5px] text-foreground/55">{t.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ---------------- TOOLS ---------------- */}
        <section className="px-3 py-14 sm:px-4">
          <div className="container mx-auto max-w-[1100px] px-6 sm:px-8">
            <Reveal className="mx-auto max-w-[640px] text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Three tools</p>
              <h2 className="mt-3 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-medium text-foreground">
                Not every change needs a full redesign.
              </h2>
            </Reveal>
            <Stagger className="mt-9 grid gap-5 sm:grid-cols-3" gap={0.08}>
              {TOOLS.map((t) => (
                <motion.div key={t.name} variants={staggerItem}>
                  <Link
                    to={t.href}
                    className="group flex h-full flex-col rounded-[22px] border border-border/70 bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <t.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-[18px] font-semibold text-foreground">{t.name}</h3>
                    <p className="mt-2 flex-1 text-[14px] leading-relaxed text-foreground/60">{t.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                      Try {t.name.toLowerCase()} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ---------------- COMPARISON ---------------- */}

        {/* ---------------- READ MORE ---------------- */}
        <section className="px-3 py-14 sm:px-4">
          <div className="container mx-auto max-w-[1100px] px-6 sm:px-8">
            <Reveal className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Go deeper</p>
              <h2 className="mt-3 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-medium text-foreground">
                More from the journal.
              </h2>
            </Reveal>
            <Stagger className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
              {[
                { slug: 'how-does-ai-interior-design-work', title: 'How AI room redesign actually works' },
                { slug: 'thinkdecor-vs-roomgpt-vs-interior-ai', title: "Think Decor vs RoomGPT vs Interior AI" },
                { slug: 'scandinavian-living-room-ideas', title: 'Scandinavian living room ideas, with AI' },
                { slug: 'small-living-room-ai-redesign', title: 'Small living room, big change' },
                { slug: 'remove-clutter-room-photo-ai', title: 'Remove clutter before you redesign' },
                { slug: 'japandi-bedroom-ideas', title: 'Japandi bedroom ideas, generated in seconds' },
              ].map((p) => (
                <motion.div key={p.slug} variants={staggerItem}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="group flex h-full items-center justify-between gap-3 rounded-[16px] border border-border/70 bg-card px-5 py-4 transition-colors hover:border-primary/30"
                  >
                    <span className="text-[14px] font-medium text-foreground">{p.title}</span>
                    <ArrowRight className="h-4 w-4 flex-none text-primary/60 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section className="px-3 py-16 sm:px-4 lg:py-24">
          <div className="container mx-auto max-w-[900px] px-6 sm:px-8">
            <Reveal className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Questions</p>
              <h2 className="mt-3 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-medium text-foreground">
                About AI room redesign.
              </h2>
            </Reveal>
            <Stagger className="mt-10">
              <Accordion type="single" collapsible className="border-t-[1.5px] border-primary">
                {FAQS.map((f, i) => (
                  <motion.div key={f.q} variants={staggerItem}>
                    <AccordionItem value={`q-${i}`} className="border-b border-border">
                      <AccordionTrigger className="py-5 text-left font-display text-[clamp(16px,1.6vw,20px)] font-medium leading-[1.3] text-foreground hover:no-underline">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="max-w-[72ch] pb-6 text-[14px] leading-relaxed text-foreground/68">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </Stagger>
          </div>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <section className="px-3 pb-20 sm:px-4">
          <div className="container mx-auto max-w-[1100px] px-6 sm:px-8">
            <Reveal className="relative overflow-hidden rounded-[28px] bg-primary px-8 py-16 text-center sm:px-12">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.07] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/[0.05] blur-3xl" />
              <div className="relative">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary-foreground/60">Try it on your own room</p>
                <h2 className="mx-auto mt-4 max-w-[24ch] text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-primary-foreground">
                  Upload one photo. See it redesigned in 10 seconds.
                </h2>
                <Magnetic className="mt-8 inline-block">
                  <Link
                    to="/app/create"
                    className="group inline-flex items-center gap-2.5 rounded-full bg-background px-8 py-4 text-[15px] font-semibold text-primary transition-transform duration-300 hover:scale-[1.03]"
                  >
                    Start for free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
