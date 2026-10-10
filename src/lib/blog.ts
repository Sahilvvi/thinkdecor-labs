import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Per-article layout overrides — deliberately just a few named presets, not
 * a full block editor. Existing posts default to '{}' (today's fixed look)
 * so nothing already published needs migrating; an editor can dial in one
 * article's width/rhythm without touching markdown at all.
 */
export interface BlogPostLayout {
  proseWidth?: 'normal' | 'wide';
  rhythm?: 'compact' | 'normal' | 'relaxed';
  imageStyle?: 'inline' | 'full';
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  content: string;
  tag: string | null;
  read_minutes: number | null;
  author_name: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  layout: BlogPostLayout;
}

const TABLE = 'blog_posts' as never;

export function slugify(t: string) {
  return t.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function readingTime(md: string) {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function listPublished(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('published' as never, true as never)
    .order('published_at' as never, { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlogPost[];
}

export async function listAll(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('updated_at' as never, { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlogPost[];
}

export async function getBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('slug' as never, slug as never)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as BlogPost | null;
}

export async function createPost(p: Partial<BlogPost>) {
  const { data, error } = await supabase.from(TABLE).insert([p] as never).select().single();
  if (error) throw error;
  return data as unknown as BlogPost;
}

export async function updatePost(id: string, p: Partial<BlogPost>) {
  const { data, error } = await supabase
    .from(TABLE).update(p as never).eq('id' as never, id as never).select().single();
  if (error) throw error;
  return data as unknown as BlogPost;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq('id' as never, id as never);
  if (error) throw error;
}

/** Wrapper classes for `.post-body`, driven by a post's `layout` column. */
export function postBodyClassName(layout: BlogPostLayout | null | undefined) {
  const l = layout ?? {};
  return [
    'post-body',
    l.proseWidth === 'wide' && 'post-body--wide',
    l.rhythm === 'compact' && 'post-body--compact',
    l.rhythm === 'relaxed' && 'post-body--relaxed',
    l.imageStyle === 'full' && 'post-body--images-full',
  ].filter(Boolean).join(' ');
}

/** Minimal, safe markdown → HTML for post bodies. */
export function renderMarkdown(md: string) {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = esc(md).split('\n');
  const out: string[] = [];
  let inList = false;
  let inQuote = false;

  const closeBlocks = () => {
    if (inList) { out.push('</ul>'); inList = false; }
    if (inQuote) { out.push('</blockquote>'); inQuote = false; }
  };

  const inline = (t: string) =>
    t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
     .replace(/\*(.+?)\*/g, '<em>$1</em>')
     .replace(/`(.+?)`/g, '<code>$1</code>')
     .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
     // Site-relative links ("/ai-room-redesign") stay in the same tab.
     .replace(/\[(.+?)\]\((\/[^\s)]*)\)/g, '<a href="$2">$1</a>');

  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) { closeBlocks(); continue; }

    if (/^###\s+/.test(l)) { closeBlocks(); out.push(`<h3>${inline(l.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^##\s+/.test(l))  { closeBlocks(); out.push(`<h2>${inline(l.replace(/^##\s+/, ''))}</h2>`); continue; }
    if (/^#\s+/.test(l))   { closeBlocks(); out.push(`<h2>${inline(l.replace(/^#\s+/, ''))}</h2>`); continue; }
    if (/^!\[.*?\]\((.+?)\)$/.test(l)) {
      closeBlocks();
      const m = l.match(/^!\[(.*?)\]\((.+?)\)$/)!;
      // `![alt|wide](url)` or `![alt|full](url)` — a per-image size override
      // on top of the article's own default (see postBodyClassName above),
      // without needing a block editor for the one photo that runs big.
      const [altText, sizeMod] = m[1].split('|').map((s) => s.trim());
      const sizeClass = sizeMod === 'wide' ? ' post-img-wide' : sizeMod === 'full' ? ' post-img-full' : '';
      out.push(`<figure class="${sizeClass.trim()}"><img src="${m[2]}" alt="${altText}" loading="lazy" /></figure>`);
      continue;
    }
    // The text was HTML-escaped up front, so a quote marker is `&gt;` here, not `>`.
    if (/^&gt;\s?/.test(l)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
      out.push(`<p>${inline(l.replace(/^&gt;\s?/, ''))}</p>`);
      continue;
    }
    if (/^[-*]\s+/.test(l)) {
      if (inQuote) { out.push('</blockquote>'); inQuote = false; }
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    closeBlocks();
    out.push(`<p>${inline(l)}</p>`);
  }
  closeBlocks();
  return out.join('\n');
}

/** Sidebar nav badge (total article count). */
export function useBlogSummary() {
  return useQuery({
    queryKey: ['admin-blog-summary'],
    queryFn: async () => {
      const rows = await listAll();
      return { total: rows.length };
    },
    staleTime: 30_000,
  });
}
