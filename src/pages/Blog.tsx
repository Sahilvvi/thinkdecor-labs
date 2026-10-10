import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Clock, Loader2, PenLine, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { Reveal, Stagger, staggerItem } from '@/components/premium/Motion';
import { listPublished, type BlogPost } from '@/lib/blog';
import { blogCollectionSchema, breadcrumbSchema } from '@/lib/schema';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_COVER = '/assets/samples/styled_room.png';

function fmt(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
}

/**
 * List page rebuilt to match the design prototype's #pg-blog block (huge
 * serif h1, gradient pill filter, dark-gradient feature hero, bordered
 * card grid, dark newsletter strip) — same brass→teal substitution
 * already used for Comparison.tsx. The prototype has no article detail
 * page (every prototype link there points back to the list itself), so
 * BlogPost.tsx extends this same visual language rather than copying
 * something that doesn't exist.
 */
export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    listPublished()
      .then(setPosts)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tags = useMemo(() => {
    const t = new Set<string>();
    posts.forEach((p) => p.tag && t.add(p.tag));
    return ['All', ...Array.from(t)];
  }, [posts]);

  const visible = useMemo(
    () => (filter === 'All' ? posts : posts.filter((p) => p.tag === filter)),
    [posts, filter],
  );

  const [lead, ...rest] = visible;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Interior Design Ideas & AI Room Guides | Think Decor"
        description="Room-by-room design ideas, style guides and how AI room redesign works, from the Think Decor team."
        canonical="https://www.thinkdecor.app/blog"
        image="/og-journal.png"
        schema={[
          breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Journal', path: '/blog' }]),
          ...(posts.length ? [blogCollectionSchema(posts)] : []),
        ]}
      />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pt-24 sm:px-8">
        {/* ---------------- HEADER (prototype .bl-head) ---------------- */}
        <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(60%_70%_at_100%_0%,rgba(0,160,140,0.18),transparent_60%),radial-gradient(40%_60%_at_0%_100%,rgba(0,89,78,0.08),transparent_60%)] px-[clamp(20px,4vw,64px)] pb-[clamp(28px,4vw,48px)] pt-[clamp(40px,6vw,88px)]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Journal</p>
              <h1 className="mt-3.5 max-w-[18ch] font-display text-[clamp(2.75rem,7.2vw,6.5rem)] font-normal leading-[0.92] tracking-[-0.02em] text-foreground">
                Interior design ideas &amp; <em className="italic text-primary">AI room</em> guides.
              </h1>
              <p className="mt-5 max-w-[42ch] text-[17px] text-muted-foreground">
                Room-by-room decor ideas, style guides, and how AI room redesign works, written by
                the people building it.
              </p>
            </Reveal>
          </div>

          {/* filter chips — sliding gradient pill, matching prototype .chips2 */}
          {!loading && !err && tags.length > 2 && (
            <Reveal delay={0.12}>
              <div className="relative mt-[clamp(24px,3vw,40px)] inline-flex flex-wrap gap-0.5 rounded-[26px] bg-[#EEF6F4] p-[5px] shadow-[inset_0_0_0_1px_hsl(168_20%_88%)]">
                {tags.map((t) => {
                  const active = filter === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setFilter(t)}
                      aria-pressed={active}
                      className={`relative z-10 rounded-full px-[18px] py-2.5 font-label text-[14.5px] font-bold transition-colors duration-250 ${
                        active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="blog-filter-pill"
                          className="absolute inset-0 -z-10 rounded-full bg-[linear-gradient(135deg,#00A08C,#00594E)] shadow-[inset_3px_3px_7px_rgba(0,0,0,0.35),inset_-2px_-2px_6px_rgba(255,255,255,0.2)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative">{t}</span>
                    </button>
                  );
                })}
              </div>
            </Reveal>
          )}
        </section>

        {/* ---------------- LOADING ---------------- */}
        {loading && (
          <div className="pb-12 pt-8">
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-4 rounded-3xl border border-foreground/[0.08] bg-card p-5">
                  <div className="h-48 rounded-2xl bg-foreground/[0.045]" />
                  <div className="h-4 w-2/3 rounded bg-foreground/[0.05]" />
                  <div className="h-3 w-1/2 rounded bg-foreground/[0.035]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- ERROR ---------------- */}
        {!loading && err && (
          <div className="pb-12 pt-8">
            <div className="rounded-[26px] border border-foreground/[0.09] bg-card px-8 py-14 text-center shadow-[0_20px_60px_-40px_hsl(168_30%_12%/0.3)]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.09] text-primary">
                <PenLine className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-[19px] font-bold tracking-[-0.02em] text-foreground">The journal isn't live yet</h2>
              <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-relaxed text-foreground/55">
                We couldn't reach the article store. If you're setting this up, run the
                <code className="mx-1.5 rounded bg-foreground/[0.05] px-1.5 py-0.5 text-[12.5px] text-primary">blog_posts</code>
                migration in Supabase and refresh.
              </p>
              <p className="mt-4 text-[12px] text-foreground/38">{err}</p>
            </div>
          </div>
        )}

        {/* ---------------- EMPTY ---------------- */}
        {!loading && !err && visible.length === 0 && (
          <div className="pb-12 pt-8">
            <div className="rounded-[26px] border border-foreground/[0.09] bg-card px-8 py-16 text-center shadow-[0_20px_60px_-40px_hsl(168_30%_12%/0.3)]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.09] text-primary">
                <PenLine className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-[19px] font-bold tracking-[-0.02em] text-foreground">
                {filter === 'All' ? 'First article coming soon.' : `Nothing filed under ${filter} yet.`}
              </h2>
              <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-relaxed text-foreground/55">
                We're writing about how rooms get measured, how the models see space, and what we get
                wrong along the way.
              </p>
              <Link
                to="/contact"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[14px] font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.03]"
              >
                <Mail className="h-4 w-4" />
                Tell me when it's up
              </Link>
            </div>
          </div>
        )}

        {/* ---------------- FEATURED (prototype .feat) ---------------- */}
        <AnimatePresence mode="wait">
          {!loading && !err && lead && (
            <motion.div
              key={`lead-${filter}-${lead.id}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4"
            >
              <Link
                to={`/blog/${lead.slug}`}
                className="group relative block overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#00594E,#00332C)] text-white shadow-[0_30px_60px_-36px_rgba(0,51,44,0.8)]"
              >
                <div className="grid lg:grid-cols-[1.25fr_1fr]">
                  <figure className="relative m-0 min-h-[300px] overflow-hidden lg:min-h-[420px]">
                    <img
                      src={lead.cover_url || FALLBACK_COVER}
                      alt={lead.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </figure>
                  <div className="relative flex flex-col justify-center gap-4 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(0,160,140,0.4),transparent_60%)] p-[clamp(28px,4vw,56px)]">
                    <span className="flex flex-wrap items-center gap-2.5 font-label text-[12.5px] font-bold uppercase tracking-[0.1em]">
                      <span className="rounded-full bg-white/[0.14] px-[11px] py-1.5 text-white">{lead.tag ?? 'Featured'}</span>
                      <span className="text-white/65">{fmt(lead.created_at)} · {lead.read_minutes ?? 4} min</span>
                    </span>
                    <h2 className="font-display text-[clamp(2.1rem,3.8vw,3.5rem)] font-normal leading-[1.02] text-white">
                      {lead.title}
                    </h2>
                    {lead.excerpt && (
                      <p className="max-w-[46ch] text-[17px] text-white/70">{lead.excerpt}</p>
                    )}
                    <span className="mt-2 inline-flex w-max items-center gap-2 self-start font-label text-[14px] font-bold text-white">
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------- GRID (prototype .posts) ---------------- */}
        {!loading && !err && rest.length > 0 && (
          <section className="pt-4">
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.07}>
              {rest.map((p) => (
                <motion.div key={p.id} variants={staggerItem}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[24px] bg-card shadow-[inset_0_0_0_1px_hsl(168_20%_88%)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[inset_0_0_0_1px_#A9D8CF,0_24px_40px_-26px_rgba(0,89,78,0.55)]"
                  >
                    <figure className="relative m-0 aspect-[16/10] overflow-hidden">
                      <img
                        src={p.cover_url || FALLBACK_COVER}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      {p.tag && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-[11px] py-1.5 font-label text-[12px] font-bold uppercase tracking-[0.08em] text-foreground backdrop-blur-md">
                          {p.tag}
                        </span>
                      )}
                    </figure>
                    <div className="flex flex-1 flex-col gap-2.5 p-[22px]">
                      <h3 className="font-display text-[25px] font-normal leading-[1.15] text-foreground">
                        {p.title}
                      </h3>
                      {p.excerpt && (
                        <p className="line-clamp-3 text-[15px] text-muted-foreground">{p.excerpt}</p>
                      )}
                      <span className="mt-auto flex items-center gap-2 pt-2.5 font-label text-[12.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        <span>{fmt(p.created_at)}</span>
                        <span className="h-1 w-1 rounded-full bg-foreground/20" />
                        <span>{p.read_minutes ?? 4} min</span>
                        <ArrowRight className="ml-auto h-3.5 w-3.5 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          </section>
        )}

        {/* ---------------- NEWSLETTER (prototype .news) ---------------- */}
        {!loading && <NewsletterStrip />}
      </main>

      <Footer />
    </div>
  );
}

/**
 * Matches the prototype's `.news` band exactly (dark teal gradient, inset
 * glass form) — the live site had no equivalent before. Writes to the same
 * `contact_submissions` table the footer's NewsletterBand already uses, so
 * it's a real capture, not a decorative fake-submit form like the
 * prototype's own JS.
 */
function NewsletterStrip() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
        message: 'Early-access email signup from the journal',
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
    <section className="my-4">
      <Reveal y={30}>
        <div className="relative grid items-center gap-6 overflow-hidden rounded-[28px] bg-[radial-gradient(50%_90%_at_0%_0%,rgba(143,227,212,0.35),transparent_70%),linear-gradient(120deg,#00A08C,#00594E_60%,#00332C)] p-[clamp(32px,5vw,64px)] text-white lg:grid-cols-2">
          <div>
            <h2 className="font-display text-[clamp(2.1rem,4vw,3.5rem)] font-normal leading-[1] text-white">
              Stay in the <em className="italic text-[#8FE3D4]">loop</em>.
            </h2>
            <p className="mt-2.5 max-w-[42ch] text-white/85">
              New articles, and a heads-up the moment room scanning and measured floor plans go live.
            </p>
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2 rounded-full bg-white/[0.12] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] backdrop-blur-md">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              aria-label="Email address"
              className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[16px] text-white placeholder:text-white/70 outline-none"
            />
            <button
              type="submit"
              disabled={loading || sent}
              className="flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 font-label text-[14px] font-bold text-foreground transition-transform duration-300 hover:scale-[1.03] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : sent ? <Check className="h-3.5 w-3.5" /> : null}
              {sent ? 'Joined' : 'Subscribe'}
            </button>
          </form>
        </div>
      </Reveal>
    </section>
  );
}
