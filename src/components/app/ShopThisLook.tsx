import { ExternalLink } from 'lucide-react';
import { useGenerationProductDetails, productShopUrl } from '@/lib/products';

/** Every real product used in a generation, listed with a direct link to
 *  buy it — a full list to complement the on-image "shop this" dots, which
 *  are easy to miss and only show for products whose position was detected. */
export function ShopThisLook({ generationId }: { generationId?: string | null }) {
  const { data } = useGenerationProductDetails(generationId);
  // A product with no listing link would open a dead page — only list ones that can actually be bought.
  const products = data?.filter((p) => p.source_url);
  if (!products?.length) return null;

  return (
    <div className="rounded-2xl px-4 py-3.5" style={{ boxShadow: 'inset 0 0 0 1px var(--stone-2)' }}>
      <p className="kicker" style={{ fontSize: 10.5, marginBottom: 10 }}>Shop this look</p>
      <div className="flex flex-col gap-2.5">
        {products.map((p) => (
          <a
            key={p.id}
            href={productShopUrl(p.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-black/[0.03]"
          >
            <div className="h-12 w-12 flex-none overflow-hidden rounded-lg bg-black/[0.04]">
              {p.display_image_url && (
                <img src={p.display_image_url} alt={p.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{p.name}</p>
              {p.price != null && (
                <p className="text-[12px]" style={{ color: 'var(--taupe)' }}>{p.currency} {p.price}</p>
              )}
            </div>
            <span className="ico-btn flex-none" aria-hidden>
              <ExternalLink width={13} height={13} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
