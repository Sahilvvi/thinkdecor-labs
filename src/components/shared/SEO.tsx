import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SITE_URL = 'https://www.thinkdecor.app';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  schema?: object | object[];
  /** Social preview image. Relative paths are made absolute. Defaults to the site card. */
  image?: string | null;
  /** Open Graph type. "article" for journal posts. */
  type?: 'website' | 'article';
  /** ISO dates for articles (og article:* tags). */
  publishedTime?: string | null;
  modifiedTime?: string | null;
  /** Keep this page out of search results. Auto-on for app, admin and auth screens. */
  noindex?: boolean;
}

// Pages that should never appear in search: the signed-in app, the admin panel and
// the account/checkout utility screens. (robots.txt already blocks /app and /admin;
// noindex covers the ones crawlers are allowed to fetch.)
const NOINDEX_PATH = /^\/(app|admin|super|login|signup|forgot-password|reset-password|checkout|demo)(\/|$)/;

// A whole deployment can opt out of search (e.g. a test copy of the site on its
// own Vercel project) with VITE_SITE_NOINDEX=1. Off unless set, so production is
// unaffected.
const SITE_NOINDEX = import.meta.env.VITE_SITE_NOINDEX === '1';

function absolute(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelectorAll(`meta[${attr}="${key}"]`).forEach((el) => el.remove());
}

/**
 * Per-page head tags. index.html ships static fallbacks (title, canonical, og:*,
 * twitter:*) for crawlers that don't run JavaScript; this takes those over instead
 * of adding a second copy. Previously it created its own canonical next to the
 * static homepage one, so every page carried two conflicting canonicals, and the
 * twitter:* tags and og:type never changed from the homepage values.
 */
export function SEO({
  title, description, canonical, schema, image, type = 'website', publishedTime, modifiedTime, noindex,
}: SEOProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const hidden = SITE_NOINDEX || (noindex ?? NOINDEX_PATH.test(pathname));
    const url = canonical ?? `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;
    const img = absolute(image || DEFAULT_IMAGE);

    document.title = title;
    upsertMeta('name', 'description', description);

    // Exactly one canonical: reuse whichever exists (the static one) and drop any extras.
    const canonicals = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    let canonicalEl = canonicals[0];
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicals.slice(1).forEach((el) => el.remove());
    canonicalEl.href = url;

    if (hidden) upsertMeta('name', 'robots', 'noindex,follow');
    else removeMeta('name', 'robots');

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:image', img);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', img);

    if (type === 'article' && publishedTime) upsertMeta('property', 'article:published_time', publishedTime);
    else removeMeta('property', 'article:published_time');
    if (type === 'article' && modifiedTime) upsertMeta('property', 'article:modified_time', modifiedTime);
    else removeMeta('property', 'article:modified_time');

    // JSON-LD schema
    const schemaId = 'seo-schema-ld';
    document.getElementById(schemaId)?.remove();
    if (schema) {
      const script = document.createElement('script');
      script.id = schemaId;
      script.type = 'application/ld+json';
      // A bare object needs its own @context or Google ignores it (BlogPosting used to ship without one).
      script.textContent = JSON.stringify(
        Array.isArray(schema) ? { '@context': 'https://schema.org', '@graph': schema } : { '@context': 'https://schema.org', ...schema },
      );
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(schemaId)?.remove();
    };
  }, [title, description, canonical, schema, image, type, publishedTime, modifiedTime, noindex, pathname]);

  return null;
}
