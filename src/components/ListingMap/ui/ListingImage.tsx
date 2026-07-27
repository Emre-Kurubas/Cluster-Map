import { useEffect, useState } from 'react';
import { Skeleton } from './Skeleton';
import { buildPinSvg } from '../map/sprite/pinShapes';
import { getCategoryConfig } from '../config/categories';
import { resolveImageUrl } from '../lib/resolveImageUrl';
import { useImageBaseUrl } from '../lib/imageBaseUrl';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

interface ListingImageProps {
  listing: Listing;
  /** Sizing for the image box. */
  className?: string;
  /** Sizing for the pin drawn in the fallback. */
  iconClassName?: string;
  testId: string;
  fallbackTestId: string;
}

/**
 * A listing photo, or the category pin on a tinted field when there isn't one.
 *
 * Shared by the rail cards and the detail panel so both degrade identically:
 * until `imageBaseUrl` points at a host that serves these files, failure is the
 * expected path, and a broken-image icon in every card would look like a bug.
 */
export function ListingImage({
  listing,
  className = 'h-40 w-full',
  iconClassName = 'size-12',
  testId,
  fallbackTestId,
}: ListingImageProps) {
  const imageBaseUrl = useImageBaseUrl();
  const src = resolveImageUrl(listing, imageBaseUrl);

  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);

  // A new src is a new chance: pointing the component at a working CDN must
  // clear a failure recorded against the old one.
  useEffect(() => {
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  const { color } = getCategoryConfig(listing.category);

  if (failed) {
    return (
      <div
        data-testid={fallbackTestId}
        className={`grid shrink-0 place-items-center rounded-xl ${className}`}
        style={{ backgroundColor: `${color}1a` }}
      >
        <div
          className={`${iconClassName} opacity-70`}
          aria-hidden
          dangerouslySetInnerHTML={{ __html: buildPinSvg(listing.category) }}
        />
        <span className="sr-only">{t.noImage}</span>
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl ${className}`}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full" />}
      <img
        data-testid={testId}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
