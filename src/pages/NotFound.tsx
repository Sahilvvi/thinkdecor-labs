import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';

/** Shown for any URL that is not a real page. Marked noindex so mistyped or old links never get indexed. */
const NotFound = () => (
  <div className="min-h-screen bg-background">
    <SEO title="Page not found | Think Decor" description="This page doesn't exist. Head back to the Think Decor homepage." noindex />
    <Navbar />
    <main className="mx-auto flex min-h-[70vh] max-w-[640px] flex-col items-center justify-center px-6 pt-24 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(2.4rem,6vw,4rem)] font-medium leading-[1.05] text-foreground">
        We couldn&rsquo;t find that page.
      </h1>
      <p className="mt-4 text-[16px] text-muted-foreground">
        The link may be old or mistyped. Try one of these instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-primary-foreground">Home</Link>
        <Link to="/ai-room-redesign" className="rounded-full px-6 py-3 text-[14px] font-semibold text-foreground ring-1 ring-inset ring-foreground/20">Room redesign</Link>
        <Link to="/blog" className="rounded-full px-6 py-3 text-[14px] font-semibold text-foreground ring-1 ring-inset ring-foreground/20">Journal</Link>
      </div>
    </main>
    <Footer />
  </div>
);

export default NotFound;
