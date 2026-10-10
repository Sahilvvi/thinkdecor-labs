// Snapshots the marketing routes (home, AI room redesign hub, pricing, blog list,
// every published post) into static HTML after the build, so crawlers that don't
// run JavaScript (GPTBot, ClaudeBot, PerplexityBot, and Googlebot's first pass)
// see real content instead of an empty <div id="root">.
//
// Deliberately NOT server-side rendering: this drives a real headless Chrome
// against the already-built dist/ output and captures what a normal browser
// renders, so nothing about how the app runs has to change. The app's own
// client-side JS still boots afterwards and takes over.
//
// Layout of the output:
//   dist/spa.html          the untouched app shell. vercel.json rewrites every
//                          non-file route (/login, /app/*, unknown URLs) here.
//   dist/index.html        the prerendered homepage.
//   dist/<route>/index.html  one file per prerendered route. Vercel serves a
//                          matching static file before it applies the rewrite.
//   dist/prerender-status.json  what worked / failed, so a silent failure on a
//                          build machine can be read from the live site.
//
// Chrome: on Vercel (and with PRERENDER_CHROMIUM=1) it uses @sparticuz/chromium,
// a Chromium build that ships inside the npm package. The earlier version used
// puppeteer's own download, which needs a post-install script that Bun (and some
// CI installs) skip, so on Vercel it failed quietly and every route stayed an
// empty shell. Locally it uses puppeteer's Chrome.
//
// Fails soft: if anything here breaks, the build still succeeds with the plain
// client-rendered site, and prerender-status.json says why.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = 45231;
const status = { at: new Date().toISOString(), mode: null, routes: {}, error: null };

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.txt': 'text/plain', '.xml': 'application/xml',
};

function serveDist(shellPath) {
  return createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = join(DIST, decodeURIComponent(urlPath));
    // Same behaviour as production: a real file wins, everything else is the app shell.
    if (!existsSync(filePath) || urlPath.endsWith('/') || extname(filePath) === '') filePath = shellPath;
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(readFileSync(filePath));
  }).listen(PORT);
}

async function fetchPublishedPosts() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('blog_posts').select('slug').eq('published', true);
  if (error) {
    console.warn('[prerender] could not read blog_posts, skipping post routes:', error.message);
    status.routes['(blog_posts)'] = `skipped: ${error.message}`;
    return [];
  }
  return (data ?? []).map((p) => p.slug);
}

async function launchBrowser() {
  const useServerless = !!process.env.VERCEL || process.env.PRERENDER_CHROMIUM === '1';
  if (useServerless) {
    status.mode = 'sparticuz-chromium';
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    });
  }
  status.mode = 'local-puppeteer';
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Builds a route's HTML from the ORIGINAL shell + what the browser rendered. */
function buildHtml(snapshot, shellHtml) {
  let out = shellHtml;
  // Drop every static per-page head tag the shell ships (they describe the
  // homepage) and put back the ones this page actually rendered.
  out = out
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<link[^>]*rel="canonical"[^>]*>/g, '')
    .replace(/<meta[^>]*name="description"[^>]*>/g, '')
    .replace(/<meta[^>]*name="robots"[^>]*>/g, '')
    .replace(/<meta[^>]*property="(?:og|article):[^"]*"[^>]*>/g, '')
    .replace(/<meta[^>]*name="twitter:(?:title|description|image|card)"[^>]*>/g, '')
    .replace(/<script id="seo-schema-ld"[\s\S]*?<\/script>/g, '');
  const injected = [
    `<title>${esc(snapshot.title)}</title>`,
    snapshot.headTags,
    snapshot.schemaJson ? `<script id="seo-schema-ld" type="application/ld+json">${snapshot.schemaJson.replace(/<\/script/gi, '<\\/script')}</script>` : '',
  ].filter(Boolean).join('\n    ');
  out = out.replace('</head>', `    ${injected}\n  </head>`);
  // The shell's root is empty; put the rendered page in it. (Function replacer:
  // the snapshot contains "$" characters that a string replacement would mangle.)
  out = out.replace(/<div id="root"><\/div>/, () => snapshot.rootHtml);
  return out;
}

function writeRoute(route, html) {
  if (route === '/') {
    writeFileSync(join(DIST, 'index.html'), html);
    return;
  }
  const dir = join(DIST, route.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html not found — run `vite build` first. Skipping.');
    status.error = 'dist/index.html missing';
    return;
  }
  // Keep the pristine shell: it's the template for every route AND the SPA fallback.
  const shellPath = join(DIST, 'spa.html');
  if (!existsSync(shellPath)) {
    copyFileSync(join(DIST, 'index.html'), shellPath);
    // The shell answers for /login, /app/*, /admin/* and unknown URLs, none of which are the
    // homepage, so it must not claim the homepage as its canonical. (The app sets the right
    // tags in the browser; leaving them out here just lets a crawler decide for itself.)
    writeFileSync(
      shellPath,
      readFileSync(shellPath, 'utf-8')
        .replace(/<link[^>]*rel="canonical"[^>]*>\s*/g, '')
        .replace(/<meta[^>]*property="og:url"[^>]*>\s*/g, ''),
    );
  }
  const shellHtml = readFileSync(shellPath, 'utf-8');
  const server = serveDist(shellPath);

  const slugs = await fetchPublishedPosts();
  // Every indexable page in the sitemap needs real HTML, so the small ones (contact, legal) are included too.
  const routes = [
    '/', '/ai-room-redesign', '/pricing', '/blog', '/contact', '/terms', '/privacy', '/refunds', '/about',
    ...slugs.map((s) => `/blog/${s}`),
  ];

  let browser;
  try {
    browser = await launchBrowser();
    for (const route of routes) {
      const page = await browser.newPage();
      try {
        await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 45000 });
        // Blog posts, FAQ schema etc. arrive via effects after mount; give them a beat past networkidle.
        await new Promise((r) => setTimeout(r, 900));
        const snapshot = await page.evaluate(() => {
          const all = (sel) => Array.from(document.head.querySelectorAll(sel)).map((el) => el.outerHTML);
          return {
            rootHtml: document.getElementById('root')?.outerHTML ?? '',
            title: document.title,
            headTags: [
              ...all('link[rel="canonical"]'),
              ...all('meta[name="description"]'),
              ...all('meta[name="robots"]'),
              ...all('meta[property^="og:"]'),
              ...all('meta[property^="article:"]'),
              ...all('meta[name^="twitter:"]'),
            ].join('\n    '),
            schemaJson: document.getElementById('seo-schema-ld')?.textContent ?? '',
            words: (document.getElementById('root')?.innerText ?? '').split(/\s+/).filter(Boolean).length,
          };
        });
        if (!snapshot.rootHtml || snapshot.words < 40) throw new Error(`rendered page looks empty (${snapshot.words} words)`);
        writeRoute(route, buildHtml(snapshot, shellHtml));
        status.routes[route] = `ok (${snapshot.words} words)`;
        console.log(`[prerender] ${route} -> ${snapshot.words} words`);
      } catch (err) {
        status.routes[route] = `failed: ${err.message}`;
        console.warn(`[prerender] failed on ${route}, leaving the SPA shell for it:`, err.message);
      } finally {
        await page.close();
      }
    }
  } catch (err) {
    status.error = `browser: ${err.message}`;
    console.warn('[prerender] could not run a browser:', err.message);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main()
  .catch((err) => {
    // Never fail the build over prerendering: worst case every route is the plain client-rendered shell.
    status.error = `unexpected: ${err?.message ?? err}`;
    console.warn('[prerender] failed, dist/ still has a working client-rendered build:', err);
  })
  .finally(() => {
    try {
      if (existsSync(DIST)) writeFileSync(join(DIST, 'prerender-status.json'), JSON.stringify(status, null, 2));
    } catch { /* status is best-effort */ }
  });
