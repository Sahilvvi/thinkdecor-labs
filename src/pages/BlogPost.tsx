import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { Reveal } from '@/components/premium/Motion';
import {
  getBySlug, listPublished, postBodyClassName, renderMarkdown, type BlogPost as Post,
} from '@/lib/blog';
import { blogPostingSchema, breadcrumbSchema } from '@/lib/schema';
import { seoDescription, seoTitle } from '@/lib/seoText';

const FALLBACK_COVER = '/assets/samples/styled_room.png';

function fmt(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [more, setMore] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    window.scrollTo(0, 0);

    (async () => {
      let found: Post | null = null;
      let siblings: Post[] = [];

      try {
        found = await getBySlug(slug);
        if (found) siblings = await listPublished();
      } catch (e) {
        console.error('[blog] could not load post:', e);
      }

      setPost(found);
      // Same-topic articles first: better for readers and gives each post strong internal links.
      setMore(found ? siblings.filter((x) => x.slug !== found!.slug)
        .sort((a, b) => Number(b.tag === found!.tag) - Number(a.tag === found!.tag)).slice(0, 3) : []);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={post ? seoTitle(post.title) : 'Article | Think Decor'}
        description={seoDescription(post?.excerpt, 'An article from the Think Decor journal.')}
        canonical={`https://www.thinkdecor.app/blog/${slug}`}
        type="article"
        image={post?.cover_url}
        publishedTime={post?.created_at}
        modifiedTime={post?.updated_at}
        noindex={!loading && !post}
        schema={post && slug ? [breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Journal', path: '/blog' }, { name: post.title, path: `/blog/${slug}` }]), blogPostingSchema({
          title: post.title,
          excerpt: post.excerpt,
          slug,
          coverUrl: post.cover_url,
          publishedAt: post.created_at,
          updatedAt: post.updated_at,
          authorName: post.author_name,
        })] : undefined}
      />
      <motion.div style={{ scaleX: bar }} className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-primary to-[hsl(160_84%_45%)]" />
      <Navbar />

      <main className="relative z-10 pt-32">
        {loading && (
          <div className="container mx-auto max-w-[760px] animate-pulse space-y-5 px-6 pb-32 sm:px-8">
            <div className="h-4 w-32 rounded bg-foreground/[0.04]" />
            <div className="h-12 w-full rounded bg-foreground/[0.04]" />
            <div className="h-72 w-full rounded-3xl bg-foreground/[0.035]" />
          </div>
        )}

        {!loading && !post && (
          <div className="container mx-auto max-w-[760px] px-6 pb-32 text-center sm:px-8">
            <h1 className="text-[28px] font-bold text-foreground">Article not found</h1>
            <p className="mt-3 text-foreground/55">It may have been unpublished or the link is wrong.</p>
            <Link to="/blog" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[14px] font-semibold text-primary-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to the journal
            </Link>
          </div>
        )}

        {!loading && post && (
          <>
            {/* header */}
            <article>
              <header className="container mx-auto max-w-[760px] px-6 sm:px-8">
                <Reveal>
                  <Link to="/blog" className="group inline-flex items-center gap-2 text-[13px] text-foreground/50 transition-colors hover:text-primary">
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                    Journal
                  </Link>

                  <div className="mt-7 flex flex-wrap items-center gap-3 text-[11.5px] uppercase tracking-[0.16em]">
                    {post.tag && <span className="rounded-full bg-primary/12 px-3 py-1 font-medium text-primary">{post.tag}</span>}
                    <span className="text-foreground/42">{fmt(post.created_at)}</span>
                    <span className="flex items-center gap-1.5 text-foreground/42"><Clock className="h-3 w-3" />{post.read_minutes ?? 4} min</span>
                  </div>

                  <h1 className="mt-6 text-[clamp(2.1rem,4.6vw,3.4rem)] font-bold leading-[1.08] tracking-[-0.03em] text-foreground">
                    {post.title}
                  </h1>

                  {post.excerpt && (
                    <p className="mt-6 text-[clamp(1.02rem,1.5vw,1.2rem)] font-light leading-relaxed text-foreground/60">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="mt-8 flex items-center gap-3 border-t border-foreground/[0.09] pt-6">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">
                      {(post.author_name ?? 'T').slice(0, 1)}
                    </span>
                    <span className="text-[13.5px] text-foreground/65">{post.author_name ?? 'Think Decor'}</span>
                    {post.updated_at && new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 86400000 && (
                      <span className="ml-auto text-[12.5px] text-foreground/45">Updated {fmt(post.updated_at)}</span>
                    )}
                  </div>
                </Reveal>
              </header>

              {/* cover */}
              <Reveal delay={0.1} y={30} className="mt-12">
                <div className="container mx-auto max-w-[980px] px-6 sm:px-8">
                  <div className="overflow-hidden rounded-[26px] border border-foreground/[0.10]">
                    <img src={post.cover_url || FALLBACK_COVER} alt={post.title} className="aspect-[16/9] w-full object-cover" />
                  </div>
                </div>
              </Reveal>

              {/* body — the container itself has to widen for post-body--wide too,
                  or the inner max-width just gets clipped by this narrower parent */}
              <div className={`container mx-auto px-6 pb-20 pt-14 sm:px-8 ${post.layout?.proseWidth === 'wide' ? 'max-w-[900px]' : 'max-w-[720px]'}`}>
                <div
                  className={postBodyClassName(post.layout)}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
                />
                <aside className="mt-12 rounded-2xl border border-foreground/[0.1] bg-card p-6">
                  <p className="font-display text-[20px] text-foreground">See it in your own room</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-foreground/70">
                    Upload one photo and get a redesign in seconds. Read how <Link to="/ai-room-redesign" className="text-primary underline underline-offset-2">AI room redesign works</Link>, or <Link to="/pricing" className="text-primary underline underline-offset-2">start from 69p</Link>.
                  </p>
                </aside>
              </div>
            </article>

            {/* more */}
            {more.length > 0 && (
              <section className="border-t border-foreground/[0.08] py-16 lg:py-20">
                <div className="container mx-auto max-w-[1100px] px-6 sm:px-8">
                  <h2 className="text-[13px] font-medium uppercase tracking-[0.2em] text-foreground/45">Keep reading</h2>
                  <div className="mt-8 grid gap-6 sm:grid-cols-3">
                    {more.map((p) => (
                      <Link key={p.id} to={`/blog/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-foreground/[0.08] bg-card shadow-[0_8px_26px_-20px_hsl(168_20%_10%/0.4)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/28 hover:shadow-[0_26px_56px_-34px_hsl(168_60%_15%/0.32)]">
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img src={p.cover_url || FALLBACK_COVER} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        </div>
                        <div className="p-5">
                          <p className="text-[14.5px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">{p.title}</p>
                          <p className="mt-2 text-[12px] text-foreground/42">{p.read_minutes ?? 4} min read</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* cta */}
            <section className="pb-24 pt-4 lg:pb-32">
              <div className="container mx-auto max-w-[1100px] px-6 sm:px-8">
                <div className="relative overflow-hidden rounded-[28px] bg-primary px-8 py-16 text-center sm:px-12">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.07] blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/[0.05] blur-3xl" />
                  <div className="relative">
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary-foreground/60">Try it free</p>
                    <h2 className="mx-auto mt-4 max-w-[20ch] text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-primary-foreground">
                      Redesign your first room with Think Decor.
                    </h2>
                    <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-primary-foreground/70">
                      Create a free account and try a redesign on a photo of your own room.
                    </p>
                    <Link
                      to="/signup"
                      className="group mt-9 inline-flex items-center gap-2.5 rounded-full bg-background px-8 py-4 text-[15px] font-semibold text-primary transition-transform duration-300 hover:scale-[1.03]"
                    >
                      Try it on your room
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
