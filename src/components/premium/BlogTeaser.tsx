import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './Motion';
import { listPublished, type BlogPost } from '@/lib/blog';

const FALLBACK_COVER = '/assets/samples/styled_room.png';

function fmt(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "From the journal" — a landing-page teaser for the Blog feature, which
 * otherwise lives entirely behind /blog. Follows Testimonials.tsx's visual
 * idiom (rounded-22px cards, hover lift, Stagger entrance, eyebrow with a
 * pulsing dot) rather than copying Blog.tsx's own card markup verbatim.
 * Renders nothing once loaded if there are no published posts yet, so an
 * empty CMS never shows a broken/empty section on the homepage.
 */
export function BlogTeaser() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listPublished()
      .then((all) => { if (!cancelled) setPosts(all.slice(0, 3)); })
      .catch((e: Error) => console.error('BlogTeaser: failed to load posts:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section
      id="journal"
      className="relative scroll-mt-24 overflow-hidden py-16 lg:py-20"
    >
      <Reveal className="container relative z-10 mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-6 px-6 sm:px-8">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            From the journal
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3.2rem)] font-medium leading-[1.05] text-foreground">
            Notes on spatial <em className="text-primary not-italic font-normal italic">intelligence</em>
          </h2>
        </div>
        <Link
          to="/blog"
          className="group inline-flex items-center gap-2 rounded-full bg-card px-5 py-3 font-label text-[13px] font-bold text-primary shadow-[inset_0_0_0_1.5px_hsl(var(--primary))] transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          View all articles
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </Reveal>

      {!loading && posts.length > 0 && (
        <Stagger
          className="container mx-auto mt-10 grid gap-5 px-6 sm:px-8 sm:grid-cols-2 lg:grid-cols-3"
          gap={0.07}
        >
          {posts.map((p) => (
            <motion.div key={p.id} variants={staggerItem}>
              <Link
                to={`/blog/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-[22px] bg-card shadow-[inset_0_0_0_1px_hsl(var(--border))] transition-all duration-300 hover:-translate-y-1 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35),0_24px_40px_-26px_hsl(168_40%_15%/0.5)]"
              >
                <figure className="relative m-0 aspect-video overflow-hidden">
                  <img data-curtain
                    src={p.cover_url || FALLBACK_COVER}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  {p.tag && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1.5 font-label text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground backdrop-blur-md">
                      {p.tag}
                    </span>
                  )}
                </figure>
                <div className="flex flex-1 flex-col gap-2.5 p-6">
                  <h3 className="font-display text-[20px] leading-[1.25] text-foreground">
                    {p.title}
                  </h3>
                  {p.excerpt && (
                    <p className="line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
                      {p.excerpt}
                    </p>
                  )}
                  <span className="mt-auto flex items-center gap-2 border-t border-border pt-3.5 font-label text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                    <span>{fmt(p.published_at)}</span>
                    <span className="h-1 w-1 rounded-full bg-foreground/20" />
                    <span>{p.read_minutes ?? 4} min</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </Stagger>
      )}
    </section>
  );
}
