import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { Reveal, Stagger, staggerItem } from '@/components/premium/Motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail, Phone, MapPin, Clock, ArrowRight, Send, Check,
  Building2, Headphones, BookOpen, HelpCircle, ShieldCheck,
} from 'lucide-react';

const companySizes = ['1-10', '11-50', '51-200', '201-500', '500+'];
const industries = ['Furniture', 'Home Decor', 'Flooring', 'Wallpaper', 'Interior Design', 'Real Estate', 'Architecture', 'Other'];
const regions = ['United Kingdom', 'Europe', 'North America', 'Asia Pacific', 'Middle East', 'Africa', 'Latin America', 'India'];

const reasons = [
  { icon: Building2, label: 'Brand partnership', desc: 'Bring Think Decor to your product line' },
  { icon: Headphones, label: 'Product support', desc: 'Help with an existing account' },
  { icon: BookOpen, label: 'Media & press', desc: 'Press kits, interviews, collaborations' },
  { icon: HelpCircle, label: 'Something else', desc: 'Questions, feedback, or just curious' },
];

const details = [
  { icon: Mail, label: 'Email', value: 'info@thinkdecor.app', href: 'mailto:info@thinkdecor.app', note: 'Replies within a day' },
  { icon: Phone, label: 'Phone', value: '+44 7741 018327', href: 'tel:+447741018327', note: 'UK line · +91 8692 964404 (India)' },
  { icon: MapPin, label: 'Studio', value: 'Northampton, United Kingdom', note: 'Visits by appointment' },
  { icon: Clock, label: 'Hours', value: '9:00 – 18:00 UK time', note: 'Monday to Friday' },
];

const faqs = [
  { q: 'Can I try Think Decor before paying?', a: 'Yes. Try the free demo on the homepage, or create a free account for 2 more redesigns of your own rooms.' },
  { q: 'How do I cancel or get a refund?', a: 'Manage or cancel your plan from Settings in your account. Our Refund Policy explains the 14-day refund on your first payment.' },
  { q: 'Do you work with brands and retailers?', a: 'We are open to conversations about partnerships. Choose "Brand partnership" above and tell us what you have in mind. We do not offer a ready-made integration yet.' },
  { q: 'How quickly will you reply?', a: 'Usually within one working day, UK time.' },
];

/* ------------------------------------------------------------------ */
/* Field primitives — light theme, teal focus ring                     */
/* ------------------------------------------------------------------ */
const fieldBase =
  'w-full rounded-xl border border-foreground/[0.12] bg-background px-4 py-3 text-[14.5px] text-foreground ' +
  'placeholder:text-foreground/35 outline-none transition-all duration-300 ' +
  'focus:border-primary/45 focus:ring-4 focus:ring-primary/[0.09] hover:border-foreground/20';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50">{label}</span>
      {children}
    </label>
  );
}

function Picker({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldBase} appearance-none pr-9 ${value ? 'text-foreground' : 'text-foreground/35'}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-foreground">{o}</option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/35"
        viewBox="0 0 12 12" fill="none"
      >
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedReason, setSelectedReason] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const submission = {
      name: (fd.get('name') as string)?.trim(),
      email: (fd.get('email') as string)?.trim(),
      phone: (fd.get('phone') as string)?.trim() || null,
      company: (fd.get('company') as string)?.trim() || null,
      company_size: companySize || null,
      industry: industry || null,
      region: region || null,
      reason: selectedReason !== null ? reasons[selectedReason].label : null,
      message: (fd.get('message') as string)?.trim(),
    };

    try {
      const { error } = await supabase.from('contact_submissions').insert(submission);
      if (error) throw error;

      // Best-effort email alert. The lead is already saved, so a failure here
      // must never surface to the visitor as a failed submission.
      supabase.functions
        .invoke('notify-lead', { body: submission })
        .catch((e) => console.warn('notify-lead failed (lead still saved):', e));

      form.reset();
      setSelectedReason(null);
      setCompanySize('');
      setIndustry('');
      setRegion('');
      setSent(true);
      toast.success("Message sent — we'll be in touch.");
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error('Something went wrong. Please email info@thinkdecor.app.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact Think Decor | AI Room Design App, UK"
        description="Questions, partnerships or early access? Email the Think Decor team in Northampton. We reply within a day."
        canonical="https://www.thinkdecor.app/contact"
      />
      <Navbar />

      <main className="relative pt-28">
        {/* ---------------- HERO + FORM ---------------- */}
        <section className="relative overflow-hidden pb-16 pt-8 lg:pb-24">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[150px]" />

          <div className="container relative mx-auto max-w-[1180px] px-6 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              {/* ---- left rail ---- */}
              <div className="lg:pt-4">
                <Reveal>
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Contact</p>
                  <h1 className="mt-5 max-w-[12ch] text-[clamp(2.3rem,4.6vw,3.6rem)] font-bold leading-[1.04] tracking-[-0.035em] text-foreground">
                    Let's talk about your rooms.
                  </h1>
                  <p className="mt-5 max-w-[42ch] text-[15.5px] leading-relaxed text-foreground/58">
                    Whether you're a brand looking to put your catalogue inside real customer rooms, or
                    you just want early access — send us a note. A person reads every one.
                  </p>
                </Reveal>

                {/* detail rows */}
                <Stagger className="mt-10 space-y-2.5" gap={0.07}>
                  {details.map((d) => {
                    const Icon = d.icon;
                    const inner = (
                      <div className="flex items-start gap-4 rounded-2xl border border-foreground/[0.08] bg-card px-4 py-3.5 shadow-[0_4px_16px_-12px_hsl(168_20%_10%/0.35)] transition-all duration-400 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_14px_34px_-18px_hsl(168_60%_15%/0.28)]">
                        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/[0.09] text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/40">{d.label}</span>
                          <span className="mt-0.5 block text-[14.5px] font-medium text-foreground">{d.value}</span>
                          <span className="mt-0.5 block text-[12.5px] text-foreground/48">{d.note}</span>
                        </span>
                      </div>
                    );
                    return (
                      <motion.div key={d.label} variants={staggerItem} className="group">
                        {d.href ? <a href={d.href} className="block">{inner}</a> : inner}
                      </motion.div>
                    );
                  })}
                </Stagger>

                <Reveal delay={0.15}>
                  <p className="mt-6 flex items-center gap-2 text-[12.5px] text-foreground/45">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Your details stay with us — never sold, never shared.
                  </p>
                </Reveal>
              </div>

              {/* ---- right: form card ---- */}
              <Reveal delay={0.1} y={36}>
                <div className="relative rounded-[26px] border border-foreground/[0.09] bg-card p-6 shadow-[0_30px_80px_-40px_hsl(168_30%_12%/0.30)] sm:p-8 lg:p-9">
                  <AnimatePresence mode="wait">
                    {sent ? (
                      <motion.div
                        key="done"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="flex min-h-[420px] flex-col items-center justify-center text-center"
                      >
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                          <Check className="h-6 w-6" />
                        </span>
                        <h2 className="mt-6 text-[22px] font-bold tracking-[-0.02em] text-foreground">Message received.</h2>
                        <p className="mt-3 max-w-[34ch] text-[14.5px] leading-relaxed text-foreground/55">
                          Thanks for reaching out. We read everything and usually reply within one working day.
                        </p>
                        <button
                          onClick={() => setSent(false)}
                          className="mt-7 inline-flex items-center gap-2 text-[13.5px] font-semibold text-primary transition-transform duration-300 hover:translate-x-0.5"
                        >
                          Send another <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="form"
                        onSubmit={handleSubmit}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                      >
                        {/* reason chips */}
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                            What's this about?
                          </span>
                          <div className="mt-3 grid grid-cols-2 gap-2.5">
                            {reasons.map((r, i) => {
                              const Icon = r.icon;
                              const active = selectedReason === i;
                              return (
                                <button
                                  type="button"
                                  key={r.label}
                                  onClick={() => setSelectedReason(active ? null : i)}
                                  className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-350 ${
                                    active
                                      ? 'border-primary/45 bg-primary/[0.06] shadow-[0_10px_26px_-16px_hsl(168_70%_18%/0.5)]'
                                      : 'border-foreground/[0.10] bg-background hover:-translate-y-0.5 hover:border-foreground/20'
                                  }`}
                                >
                                  <span
                                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-350 ${
                                      active ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.05] text-primary group-hover:bg-primary/10'
                                    }`}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                  </span>
                                  <span className={`mt-2.5 block text-[13px] font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>
                                    {r.label}
                                  </span>
                                  <span className="mt-0.5 block text-[11.5px] leading-snug text-foreground/45">{r.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="h-px bg-foreground/[0.07]" />

                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field label="Full name">
                            <input name="name" required placeholder="Your name" className={fieldBase} />
                          </Field>
                          <Field label="Email">
                            <input name="email" type="email" required placeholder="you@company.com" className={fieldBase} />
                          </Field>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field label="Phone">
                            <input name="phone" type="tel" placeholder="Optional" className={fieldBase} />
                          </Field>
                          <Field label="Company">
                            <input name="company" placeholder="Optional" className={fieldBase} />
                          </Field>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-3">
                          <Field label="Team size">
                            <Picker value={companySize} onChange={setCompanySize} options={companySizes} placeholder="Select" />
                          </Field>
                          <Field label="Industry">
                            <Picker value={industry} onChange={setIndustry} options={industries} placeholder="Select" />
                          </Field>
                          <Field label="Region">
                            <Picker value={region} onChange={setRegion} options={regions} placeholder="Select" />
                          </Field>
                        </div>

                        <Field label="Message">
                          <textarea
                            name="message"
                            required
                            rows={5}
                            placeholder="Tell us what you're working on, or what you'd like to see."
                            className={`${fieldBase} resize-none leading-relaxed`}
                          />
                        </Field>

                        <button
                          type="submit"
                          disabled={loading}
                          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-8 py-4 text-[14.5px] font-semibold text-primary-foreground transition-all duration-350 hover:shadow-[0_18px_40px_-16px_hsl(168_100%_17%/0.6)] disabled:opacity-60"
                        >
                          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/18 to-transparent transition-transform duration-[900ms] group-hover:translate-x-full" />
                          {loading ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Send message
                            </>
                          )}
                        </button>

                        <p className="text-center text-[12px] text-foreground/40">
                          By sending this you agree to us storing your details so we can reply.
                        </p>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section className="pb-24 lg:pb-32">
          <div className="container mx-auto max-w-[820px] px-6 sm:px-8">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Before you write</p>
              <h2 className="mt-4 text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
                A few things people usually ask.
              </h2>
            </Reveal>

            <div className="mt-9 space-y-3">
              {faqs.map((f, i) => {
                const open = openFaq === i;
                return (
                  <Reveal key={f.q} delay={i * 0.05}>
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className={`w-full rounded-[18px] border bg-card px-5 py-4 text-left transition-all duration-400 sm:px-6 ${
                        open
                          ? 'border-primary/30 shadow-[0_18px_44px_-24px_hsl(168_60%_15%/0.32)]'
                          : 'border-foreground/[0.08] shadow-[0_6px_20px_-14px_hsl(168_20%_10%/0.35)] hover:-translate-y-0.5 hover:border-primary/22'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-5">
                        <span className={`text-[15px] font-semibold leading-snug transition-colors ${open ? 'text-primary' : 'text-foreground'}`}>
                          {f.q}
                        </span>
                        <span
                          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[15px] leading-none transition-all duration-400 ${
                            open ? 'rotate-45 border-primary bg-primary text-primary-foreground' : 'border-foreground/15 text-foreground/45'
                          }`}
                        >
                          +
                        </span>
                      </span>
                      <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <span className="overflow-hidden">
                          <span className="block max-w-[62ch] text-[14px] leading-relaxed text-foreground/58">{f.a}</span>
                        </span>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
