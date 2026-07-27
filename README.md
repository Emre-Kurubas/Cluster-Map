# Uyap E-Satış — İlan Haritası

An interactive 2D map of İcra auction listings across Türkiye, built as a
drop-in React component.

## Using the component

The deliverable is `src/components/ListingMap/`. Copy that folder into the host
project — nothing inside it imports from outside itself.

```tsx
import { ListingMap } from './components/ListingMap';
import type { Listing } from './components/ListingMap';

<ListingMap
  listings={listings}
  onListingOpen={(listing) => router.push(listing.detailUrl)}
/>
```

### Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `listings` | `Listing[]` | required | Invalid coordinates are dropped with a warning |
| `styleUrl` | `string` | OpenFreeMap positron | Point at self-hosted vector tiles |
| `onListingSelect` | `(l: Listing) => void` | — | Fires on pin or card selection |
| `onListingOpen` | `(l: Listing) => void` | — | Detail CTA. The component never navigates |
| `className` | `string` | `''` | Applied to the root |

The root element fills its container, so give the parent a definite height.

### Peer requirements

React 18+ (developed against 19), Tailwind CSS v4. The `@theme` token block in
`src/index.css` must be present in the host's stylesheet — it defines the brand,
ink, surface and category colors every component reads.

## Development

```bash
npm install
npm run dev        # harness at http://localhost:5173
npm run test       # 165 correctness tests
npm run test:perf  # 4 benchmarks, run without file parallelism
npm run verify     # test + test:perf + build
npm run build      # production build
```

Benchmarks are deliberately excluded from `npm run test` and run single-threaded.
A wall-clock assertion competing with 22 other test files measures the OS
scheduler, not the code — indexing 50k listings takes ~790ms on an idle CPU but
exceeded a 2000ms budget under that contention. Separating them keeps the
budgets meaningful and the correctness suite trustworthy.

## Architecture notes

- **Pins and clusters are MapLibre GL layers, not React markers.** Pan and zoom
  cost zero React renders, so the frame budget does not depend on listing count.
- **`backdrop-filter` lives only in `ui/GlassPanel.tsx`.** Applying it per-item
  multiplies compositor work and is the usual cause of glassmorphism jank.
- **State is Zustand, not Context.** Map events fire at up to 60Hz; selector
  subscriptions keep a viewport change from re-rendering the tree.
- **The visible list comes from `queryRenderedFeatures`**, not from bbox-testing
  listings in React. The map already knows what it drew.
- **Search is fully client-side** — Turkish normalization, intent parsing and
  bounded fuzzy matching, with no backend.

### Turkish text handling

`lib/normalize.ts` folds diacritics *before* lowercasing. This matters: JS
lowercases `İ` to `i` plus a combining dot, which breaks equality against a
typed `i`, and `toLocaleLowerCase('tr')` maps `I` to `ı`. Both are folded to
plain `i` so users typing either form get matches.

### Fuzzy search performance

`tokenScore` screens candidates with a character-histogram lower bound before
running the Levenshtein DP. Every edit changes the character multiset by at most
2, so `distance >= sumAbsDiff / 2` — an exact bound that never rejects a pair the
DP would accept. Combined with skipping body tokens after a perfect title hit,
this took a 50k-listing fuzzy search from 810ms to ~101ms.

## Verified behavior

Measured on 50,000 synthetic listings (`lib/perf.test.ts`):

| Operation | Budget | Actual |
|---|---|---|
| Build search index | 2000ms | ~790ms |
| Filter + sort | 150ms | ~10ms |
| Fuzzy search | 400ms | ~101ms |
| GeoJSON conversion | 300ms | ~7ms |

## Known data gaps

- `thumbnailUrl` points at `cdn.adalet.com`, which does not resolve. Every image
  falls back to a category illustration by design. Supply a working CDN to see
  real thumbnails.
- Listings carry no province field. Province is derived from coordinates via the
  bundled 81-province gazetteer, which also powers "fly to Ankara" in search.
- `saleType` is `İcra` for all 162 records, so that filter would show a single
  option until the data varies.

## Search examples

| Query | Result |
|---|---|
| `ankara 2 milyon alti arsa` | Ankara chip + `≤ 2.000.000 ₺` chip + Arsa chip, map flies to Ankara |
| `adyaman dubleks` | Typo tolerated → Adıyaman listings |
| `500 bin ustu` | `≥ 500.000 ₺` chip |
| `1 3 milyon arasi` | `1.000.000 – 3.000.000 ₺` chip |
| `2024 esas` | No price chip — esas numbers are not mistaken for prices |

Every chip is removable, so the parser is never silently authoritative.
