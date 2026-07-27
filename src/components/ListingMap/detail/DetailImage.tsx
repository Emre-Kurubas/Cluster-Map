import { useState } from 'react';
import { Skeleton } from '../ui/Skeleton';
import { buildPinSvg } from '../map/sprite/pinShapes';
import { getCategoryConfig } from '../config/categories';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

/**
 * The dataset's thumbnail host does not resolve, so failure is the expected
 * path. Rather than a broken-image icon, fall back to the category pin on a
 * tinted field — recognizable, on-brand, and never empty.
 */
export function DetailImage({ listing }: { listing: Listing }) {
  const [failed, setFailed] = useState(!listing.thumbnailUrl);
  const [loaded, setLoaded] = useState(false);
  const { color } = getCategoryConfig(listing.category);

  if (failed) {
    return (
      <div
        data-testid="image-fallback"
        className="grid h-40 w-full place-items-center rounded-xl"
        style={{ backgroundColor: `${color}1a` }}
      >
        <div
          className="size-12 opacity-70"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: buildPinSvg(listing.category) }}
        />
        <span className="sr-only">{t.noImage}</span>
      </div>
    );
  }

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-xl">
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full" />}
      <img
        data-testid="detail-image"
        src={listing.thumbnailUrl}
        alt=""
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
