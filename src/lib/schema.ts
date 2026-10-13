/**
 * JSON-LD builders, passed straight into <SEO schema={...}>. Kept as plain
 * objects (not components) so pages can combine several — SEO.tsx wraps an
 * array in a single @graph automatically.
 */

const SITE_URL = 'https://www.thinkdecor.app';

export function organizationSchema() {
  return {
    '@type': 'Organization',
    name: 'Think Decor',
    legalName: 'Dreamverse Limited',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Flat 3, 20-22 St. Giles Street',
      addressLocality: 'Northampton',
      postalCode: 'NN1 1JA',
      addressCountry: 'GB',
    },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'info@thinkdecor.app', availableLanguage: 'English' },
    // Real profiles linked from the site footer. Add new ones here as they are created.
    sameAs: ['https://www.instagram.com/thinkdecor.app/', 'https://www.linkedin.com/company/thinkdecor/'],
  };
}

export function softwareApplicationSchema({
  price, currency, description,
}: { price: number; currency: string; description: string }) {
  return {
    '@type': 'SoftwareApplication',
    name: 'Think Decor',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    description,
    url: SITE_URL,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
    },
    brand: { '@type': 'Organization', name: 'Think Decor', url: SITE_URL },
  };
}

export function faqPageSchema(faqs: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function blogPostingSchema({
  title, excerpt, slug, coverUrl, publishedAt, updatedAt, authorName,
}: {
  title: string;
  excerpt?: string | null;
  slug: string;
  coverUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
}) {
  return {
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt ?? undefined,
    image: coverUrl ? (/^https?:\/\//i.test(coverUrl) ? coverUrl : `${SITE_URL}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`) : undefined,
    datePublished: publishedAt ?? undefined,
    dateModified: updatedAt ?? publishedAt ?? undefined,
    author: { '@type': 'Organization', name: authorName ?? 'Think Decor' },
    publisher: { '@type': 'Organization', name: 'Think Decor', logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` } },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

/** The /blog index: a CollectionPage whose mainEntity lists every article, so crawlers can enumerate them. */
export function blogCollectionSchema(posts: { slug: string; title: string }[]) {
  return {
    '@type': 'CollectionPage',
    name: 'Think Decor Journal: interior design ideas and room redesign guides',
    url: `${SITE_URL}/blog`,
    isPartOf: { '@type': 'WebSite', name: 'Think Decor', url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };
}
