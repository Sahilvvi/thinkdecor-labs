import { useState, type ImgHTMLAttributes } from 'react';
import { BeforeAfterSlider } from '@/components/shared/BeforeAfterSlider';
import { useStoredImageUrl } from '@/lib/generation';
import { useGenerationProducts } from '@/lib/products';
import { cn } from '@/lib/utils';

type StoredImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  /** A bucket path from the private `generations` bucket, or any displayable URL. */
  src?: string | null;
};

/**
 * <img> for room photos: signs private bucket paths on demand. A soft shimmer
 * holds the space while the link is signed and the image downloads, then the
 * photo sharpens in over it.
 */
export function StoredImage({ src, className, alt = '', style, onLoad, ...rest }: StoredImageProps) {
  const url = useStoredImageUrl(src);
  const [loaded, setLoaded] = useState(false);
  if (!url) return <div className={cn('shimmer', className)} style={style} aria-hidden />;
  return (
    <img
      src={url}
      alt={alt}
      // shimmer shows as the img's own background until the photo paints over it
      className={cn(loaded ? 'photo-in' : 'shimmer', className)}
      style={style}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      {...rest}
    />
  );
}

/** Before/after slider for a stored photo and its redesign. */
export function StoredCompare({
  before,
  after,
  aspectRatio = 'aspect-[4/3]',
  generationId,
  intro,
}: {
  before: string;
  after?: string | null;
  aspectRatio?: string;
  /** When given, shows a clickable "shop this" dot for any real product that
   *  was composited into this result and could be located in the image. */
  generationId?: string | null;
  /** See BeforeAfterSlider: 'reveal' for a result that was just made. */
  intro?: 'reveal' | 'nudge' | 'none';
}) {
  const beforeUrl = useStoredImageUrl(before);
  const afterUrl = useStoredImageUrl(after ?? before);
  const { data: hotspots } = useGenerationProducts(generationId);

  if (!beforeUrl || !afterUrl) {
    return <div className={cn('shimmer w-full', aspectRatio)} aria-hidden />;
  }

  return (
    <BeforeAfterSlider
      beforeSrc={beforeUrl}
      afterSrc={afterUrl}
      beforeAlt="Your original photo"
      afterAlt="The redesigned room"
      aspectRatio={aspectRatio}
      hotspots={hotspots}
      intro={intro}
    />
  );
}
