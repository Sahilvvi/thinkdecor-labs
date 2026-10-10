// Regenerates public/sitemap.xml before every build, so published blog
// posts are always in it — the old file was hand-written and never knew
// about a post that only exists in Supabase. Runs as `prebuild`, so the
// result lands in dist/ automatically when Vite copies public/.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://www.thinkdecor.app';
const today = new Date().toISOString().slice(0, 10);

const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/ai-room-redesign', changefreq: 'weekly', priority: '0.9' },
  { loc: '/pricing', changefreq: 'monthly', priority: '0.9' },
  { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.6' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.2' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.2' },
  { loc: '/refunds', changefreq: 'yearly', priority: '0.2' },
  { loc: '/about', changefreq: 'yearly', priority: '0.4' },
];

async function fetchPublishedSlugs() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn('[sitemap] VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY not set — sitemap will only have static pages.');
    return [];
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, tag, published_at, created_at, updated_at')
    .eq('published', true);
  if (error) {
    console.warn('[sitemap] could not read blog_posts, skipping post URLs:', error.message);
    return [];
  }
  return data ?? [];
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>\n    <loc>${SITE_URL}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  const posts = await fetchPublishedSlugs();

  const entries = [
    ...STATIC_PAGES.map((p) => urlEntry({ ...p, lastmod: today })),
    ...posts.map((p) => urlEntry({
      loc: `/blog/${p.slug}`,
      lastmod: (p.updated_at ?? today).slice(0, 10),
      changefreq: 'monthly',
      priority: '0.7',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  // RSS feed of the journal, so feed readers and aggregators (and crawlers that follow feeds) find new posts.
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const byDate = [...posts].sort((a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')));
  const items = byDate.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <description>${esc(p.excerpt)}</description>
      ${p.tag ? `<category>${esc(p.tag)}</category>
      ` : ''}<pubDate>${new Date(p.created_at ?? p.updated_at ?? Date.now()).toUTCString()}</pubDate>
    </item>`);
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ThinkDecor Journal</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Interior design ideas, style guides and how AI room redesign works.</description>
    <language>en-gb</language>
${items.join('\n')}
  </channel>
</rss>
`;
  if (posts.length) writeFileSync(join(__dirname, '..', 'public', 'rss.xml'), rss);

  const outPath = join(__dirname, '..', 'public', 'sitemap.xml');
  writeFileSync(outPath, xml);
  console.log(`[sitemap] wrote ${STATIC_PAGES.length} static + ${posts.length} post URL(s) to ${outPath}`);
}

main().catch((err) => {
  // Never fail the build over the sitemap — worst case it's stale, not broken.
  console.warn('[sitemap] generation failed, leaving existing public/sitemap.xml in place:', err);
});
