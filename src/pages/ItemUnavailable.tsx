import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';

/** Landing page for a shop link whose product has no live listing (see supabase/functions/product-link). */
export default function ItemUnavailable() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Item unavailable | Think Decor"
        description="This item isn't available right now."
        canonical="https://www.thinkdecor.app/item-unavailable"
        noindex
      />
      <Navbar />
      <main className="container mx-auto max-w-xl px-4 pb-24 pt-36 text-center">
        <h1 className="text-3xl font-bold">This item isn&apos;t available right now</h1>
        <p className="mt-4 text-muted-foreground">
          We couldn&apos;t find a live listing for it. Head back and pick something similar.
        </p>
        <Link to="/app/create">
          <Button variant="hero" className="mt-8">Back to Think Decor</Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
