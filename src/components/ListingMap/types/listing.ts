export type Category = 'Arsa' | 'Gayrimenkul' | 'Araç';

export interface Listing {
  id: number;
  title: string;
  subTitle: string;
  description: string;
  price: number;
  category: Category;
  saleType: string;
  location: { lat: number; lng: number };
  thumbnailUrl: string;
  detailUrl: string;
}

/** A Listing plus precomputed search fields. Built once by useSearchIndex. */
export interface IndexedListing {
  listing: Listing;
  /** Normalized, whitespace-joined title + subTitle + description. */
  haystack: string;
  /** Normalized tokens of the title only — weighted highest when scoring. */
  titleTokens: string[];
  /** Normalized tokens of subTitle + description. */
  bodyTokens: string[];
  /** Province name derived from coordinates via nearestProvince(). */
  province: string;
}
