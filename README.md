# Cluster Map

An interactive 2D map of İcra auction listings across Türkiye, built as a
drop-in React component.

Everything on the map is a MapLibre GL layer rather than a React marker, so
panning and zooming cost no React renders and the frame budget does not grow
with the listing count. Dense areas collapse into cluster pins whose outline is
banded by category mix; clicking one expands it. Search, filtering and the
Turkish text handling are all client-side, with no backend.

The map engine is behind a code-split boundary, so importing the component does
not pull MapLibre into your entry chunk.

## Install

Not published to npm. Install from the repository:

```bash
npm install github:Emre-Kurubas/Cluster-Map maplibre-gl react react-dom
```

`react`, `react-dom` and `maplibre-gl` are peer dependencies. MapLibre
especially: it is 477 kB and ships its own worker, and two copies on one page
fight over WebGL contexts.

Consuming it from a checkout means building it first — `npm run build:lib`
writes the package into `dist/`, which is what `exports` points at and what is
git-ignored. See [Development](#development).

## Using the component

```tsx
import { ListingMap } from 'cluster-map';
import type { Listing } from 'cluster-map';

<ListingMap
  listings={listings}
  onListingOpen={(listing) => router.push(listing.detailUrl)}
/>
```

**The stylesheet is a separate import and it is required.** Vite's library build
extracts CSS rather than leaving it in the JS, so nothing pulls it in for you:

```ts
import 'cluster-map/styles.css';
```

Omit it and you get a working but entirely unstyled map, with no error to
explain it. Import it once, wherever your app imports its other global CSS.

Every rule in it is scoped to `.cluster-map`, the class on the component's root
element, and to everything inside it — the emitted selectors read
`:is(.cluster-map, .cluster-map *)`, so the root is covered by its own scope
rather than only its descendants. Nothing it ships can reach the rest of your
page, and nothing on your page collides with it — including its copy of
MapLibre's own stylesheet, so you do not need to import that separately either.

### Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `listings` | `Listing[]` | required | Invalid coordinates are dropped with a warning |
| `styleUrl` | `string` | OpenFreeMap positron | Point at self-hosted vector tiles |
| `onListingSelect` | `(l: Listing) => void` | — | Fires on pin or card selection |
| `onListingOpen` | `(l: Listing) => void` | — | Detail CTA. The component never navigates |
| `className` | `string` | `''` | Applied to the root |

The root element fills its container — `height: 100%` — so the parent needs a
definite height. Give it one in pixels, `vh`, or a grid/flex track; a parent
left at `height: auto` collapses the component to zero pixels tall. That failure
is silent: the component mounts, MapLibre initialises, tiles and fonts load, the
listing count logs, and the page shows nothing. Measure the `.cluster-map`
element first when a map does not appear.

## Choosing what renders

Every piece of chrome is a slot. `false` removes it, a component replaces it,
and an omitted key keeps the default — so the common case stays `<ListingMap
listings={listings} />` with nothing to configure.

```tsx
import { ListingMap } from 'cluster-map';

// A map with no results rail.
<ListingMap listings={listings} slots={{ rail: false }} />
```

A replacement is rendered exactly where the default was, and is handed exactly
what the default would have been handed:

```tsx
import { useListingStore } from 'cluster-map/primitives';
import type { ResultsRailProps } from 'cluster-map/primitives';

function CompactRail({ listings }: ResultsRailProps) {
  const select = useListingStore((state) => state.select);
  return (
    <ul>
      {listings.map((listing) => (
        <li key={listing.id}>
          <button onClick={() => select(listing.id)}>{listing.title}</button>
        </li>
      ))}
    </ul>
  );
}

<ListingMap listings={listings} slots={{ rail: CompactRail }} />
```

| Slot | Default | Receives |
|---|---|---|
| `searchBar` | `SearchBar` | `onFlyTo(bbox)` |
| `filterBar` | `FilterBar` | — |
| `rail` | `ResultsRail` | `listings`, `onFocus?` |
| `railToggle` | `RailToggle` | — |
| `categoryDock` | `CategoryDock` | — |
| `mapControls` | `MapControls` | `engine` |
| `errorNotice` | `ErrorNotice` | `kind`, `onDismiss` |
| `focusView` | `FocusView` | `listing`, `engine`, `size`, `onOpen` |
| `detail` | `ListingDetail` | `listing`, `onOpen` |

Each slot's prop type is exported from `cluster-map/primitives` under the
default's name — `SearchBarProps`, `ResultsRailProps`, and so on. Note these are
the *connected* component's props, not its `View` twin's: a slot is a drop-in
for the whole piece, and anything else it needs it reads with `useListingStore`.

Two things worth knowing:

- **`rail` covers both places the list appears** — the desktop rail and the
  bottom sheet below `md`. One component in two positions, not two slots.
  Switching it off also removes `railToggle`, because a handle that expands a
  rail which is not there toggles nothing.
- **Hold your components still across renders.** An arrow function written
  inline in the `slots` object is a new component type on every render, so React
  unmounts and remounts the slot each time and any state inside it is lost.
  Define them at module scope, or memoize.

### What slots do not do

They change what renders at a position, not where the positions are. The
overlay grid, the rail's width collapse, focus mode clearing the chrome, the
`md` breakpoint — all of that stays with `<ListingMap>`, which is the point: a
replacement inherits the whole arrangement for free.

If you want a genuinely different arrangement, use
[`cluster-map/primitives`](#composing-your-own-layout) instead and build the
layout yourself.

For restyling rather than replacing, reach for the [theming
tokens](#theming) first — they cover colour, type and easing without any of
this. Slots are for when you need to change a piece's structure, and wrapping
the default in your own element inside a slot handles per-piece layout tweaks.

The table above is the complete list, and two things people expect to find on
it are deliberately absent:

- **The pins and clusters are not slots.** They are MapLibre GL symbol layers
  drawing sprites rasterized at runtime, not React components, so nothing in
  this section reaches them. Their colours come from `getCategoryConfig` rather
  than from CSS, which is why the `--cluster-map-cat-*` tokens restyle the
  legend but leave the pins alone — see [Theming](#theming).
- **A slot is a whole panel.** The parts inside one — the focus view's circular
  photo, its header, the connector line to the pin — are internal and are not
  exported. Changing one of them means replacing the entire `focusView`.

### Attribution — the host page must carry it

The component renders **no** attribution control. MapLibre's collapsed "i"
button was removed because it landed in the bottom-right corner already occupied
by the category legend and the zoom stack.

The default basemap is OpenFreeMap positron, built from OpenStreetMap data under
the ODbL, and both require the credit to appear. Since this component no longer
shows it, the embedding page must — for example:

```html
<p>© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
   katkıda bulunanlar · <a href="https://openfreemap.org">OpenFreeMap</a></p>
```

Self-hosted tiles passed via `styleUrl` carry whatever obligations their source
data does; the same applies.

## MapLibre's worker — read this before you file a bug

**Symptom:** the map area is blank, and the console carries a worker parse
error or a 404 for `maplibre-gl-worker.mjs`.

MapLibre derives its worker URL at runtime, from its own module location:

```js
new URL(`./maplibre-gl-worker.mjs`, import.meta.url)
```

That template literal is dynamic, so no bundler can see it statically and none
emits the worker. In a production build `import.meta.url` points at your hashed
entry chunk, so the worker is requested from a directory it was never copied to.
A dev server answers that request with SPA-fallback HTML, which a module worker
then fails to parse.

This is MapLibre's behaviour, not this package's — but because `maplibre-gl` is
a peer dependency, resolving it is your build's job. It is the most likely cause
of a failed first integration.

For Vite, both halves are needed:

```ts
// vite.config.ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);

function maplibreWorkerAssets(): Plugin {
  const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
  return {
    name: 'maplibre-worker-assets',
    apply: 'build',
    generateBundle() {
      const dist = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
      for (const file of FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${file}`,
          source: readFileSync(join(dist, file), 'utf8'),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [maplibreWorkerAssets()],
  // Dev counterpart: pre-bundling relocates MapLibre's entry into .vite/deps/
  // without its worker sibling, so the same derived URL 404s.
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
```

The shared chunk is required too — the worker imports it as a sibling. Other
bundlers need their own equivalent: copy both files next to the chunk that
imports MapLibre.

## Theming

Brand, ink, surface and category colours are CSS custom properties on the
component's root. Redeclare any of them in your own stylesheet — no rebuild, no
fork, no Tailwind config to import:

```css
.cluster-map {
  --cluster-map-brand-500: #0a5ed7;
  --cluster-map-cat-arsa:  #2f7a66;
}
```

| Token | Default | Used for |
|---|---|---|
| `--cluster-map-brand-100` | `#fdf1e5` | Selected card background, focus ring |
| `--cluster-map-brand-500` | `#f5821f` | Accents, slider thumbs, focus outlines |
| `--cluster-map-brand-700` | `#b4560a` | Prices, primary buttons |
| `--cluster-map-brand-900` | `#8f4408` | Primary button hover |
| `--cluster-map-ink-300` | `#8ea0ad` | Secondary text |
| `--cluster-map-ink-500` | `#485a6a` | Body text |
| `--cluster-map-ink-900` | `#22313f` | Headings, cluster counts |
| `--cluster-map-surface` | `#f2f6f9` | Behind the map canvas |
| `--cluster-map-line` | `#e9ecf3` | Hairline rules |
| `--cluster-map-danger` | `#ef4836` | Sale-type badge |
| `--cluster-map-cat-gayrimenkul` | `#4f6bd1` | Category swatch |
| `--cluster-map-cat-arsa` | `#3d9a82` | Category swatch |
| `--cluster-map-cat-arac` | `#e0912f` | Category swatch |
| `--cluster-map-font-sans` | `Inter, …` | All type |
| `--cluster-map-ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | Most transitions |
| `--cluster-map-ease-smooth` | `cubic-bezier(0.32, 0.08, 0.24, 1)` | Long size changes |

Pin and cluster colours are drawn into sprites at runtime from
`getCategoryConfig`, so the three `--cluster-map-cat-*` tokens restyle the chrome
but not the pins. Keep them in step by hand.

## Composing your own layout

`cluster-map/primitives` exports the parts `<ListingMap>` is assembled
from, for consumers who want a different arrangement around the same behaviour.

The naming rule is one sentence: **`X` reads the surrounding store and needs a
provider above it; `XView` is pure, takes props and renders anywhere.**
Components that never read the store — `ListingCard`, `MapControls`,
`CategoryDock`, and the `GlassPanel` / `Chip` / `IconButton` / `Lightbox` /
`ListingImage` kit — have no `View` twin, because inventing one would be
ceremony. `FocusViewView` is that rule applied consistently, not a typo.

```tsx
import {
  ListingStoreProvider, createListingStore,
  SearchBar, ResultsRail, MapCanvas,
} from 'cluster-map/primitives';

const [store] = useState(createListingStore);

<ListingStoreProvider store={store}>
  <MyLayout>
    <SearchBar onFlyTo={flyTo} />
    <ResultsRail listings={filtered} />
    <MapCanvas listings={filtered} styleUrl={url} … />
  </MyLayout>
</ListingStoreProvider>
```

`createListingStore` returns one store per map. Using a `useState` initialiser
rather than calling it inline matters: called inline it rebuilds on every render
and throws the user's filters away.

**The derivation is exported too**, which is what makes `filtered` above
something you can get rather than something you have to build.
`useFilteredListings(listings)` returns `{ filtered, mapListings, selected }` —
the same three the assembled component runs on, so a hand-built layout gets the
Turkish search index, the intent parsing, the fuzzy matching and the sort
without reimplementing any of it. `mapListings` is `filtered` restored to
dataset order, and handing the map anything else redraws the clusters, since
MapLibre's clustering walks the source features in order.

`useMapSelection(engine, selected, onListingSelect)` keeps selection, hover and
the camera in step; `useSmartSearch(onFlyTo)` drives the query-to-chips
pipeline a custom search field needs; `useContainerSize(ref)` is what
`FocusView` measures against.

`useListingStore(selector)` reads a slice, and throws a message naming the fix
if used outside a provider. `ListingState` is public and semver-bound. Two
fields deserve a note:

- `filters.categories` (inclusion, from the search query) and
  `filters.hiddenCategories` (exclusion, from the legend) carry **opposite
  polarity**. `categories: []` means "no inclusion filter", not "nothing shown".
- `visibleIds` is rewritten on every map `idle`. Subscribe to it deliberately.

### Peer requirements

React 18+ (developed against 19) and `maplibre-gl` 6. **Tailwind is not
required** — the package ships precompiled CSS.

## Development

```bash
npm install
npm run build:lib  # build the package into dist/ — do this first
npm run dev        # demo at http://localhost:5173, consuming dist/
npm run test       # correctness suite
npm run test:perf  # 4 benchmarks, run without file parallelism
npm run verify     # build:lib + test + test:perf + build
npm run build      # demo build
```

`verify` builds the package before running the suite, because part of the suite
reads `dist/` — the guards in `build/package.test.ts` that check what the
published stylesheet and bundles actually contain skip themselves when there is
nothing built, and a release gate that quietly skips its release checks is worth
nothing.

The library lives in `src/` and the demo in `demo/`. The demo imports
`cluster-map` by its published name, aliased to `dist/` — so a broken
package build fails the demo rather than reaching a consumer. Run `build:lib`
before `dev`, and again after changing anything under `src/`.

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
- **The stylesheet is scoped after the build, in `build/scopeCss.ts`.** Every
  selector is rewritten to `:is(.cluster-map, .cluster-map *)`, which includes
  the root element; the descendant form it replaced could not match the root
  against itself, and the root is the element that carries both the scope class
  and the utilities sizing the component. `:is()` takes the specificity of its
  most specific argument, so no rule changes weight.

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

- `thumbnailUrl` points at a placeholder host that does not resolve. Every image
  falls back to a category illustration by design. Supply a working CDN through
  `imageBaseUrl` to see real thumbnails.
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

## License

MIT — see [LICENSE](LICENSE). Use it, change it, ship it in something you sell;
just keep the copyright notice with it.

The dependencies carry their own terms, and two are worth knowing about:
`maplibre-gl` is BSD-3-Clause, and the default basemap is OpenFreeMap serving
OpenStreetMap data under the ODbL, which requires the credit to appear on the
page. This component deliberately renders no attribution control, so that
obligation is yours — see
[Attribution](#attribution--the-host-page-must-carry-it).
