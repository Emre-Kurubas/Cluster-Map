/**
 * Back-fills `address` on the demo listings from their coordinates.
 *
 * Manual one-off: run it with `npm run geocode`. Nothing at build or request
 * time depends on it, and the focus header falls back to the province name for
 * any listing it skips.
 *
 * Nominatim's usage policy requires an identifying User-Agent and at most one
 * request per second. The file is rewritten after every lookup, so an
 * interrupted run resumes where it stopped and a completed run is a no-op.
 *
 * The demo coordinates are synthetic city-centre points, so the addresses this
 * writes are real streets that do not correspond to the actual properties.
 * Fine for a demo; do not mistake them for real data.
 */
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/data/listings.json', import.meta.url);
const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'uyap-esatis-map-demo/1.0 (listing address back-fill)';
const DELAY_MS = 1100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * True when the part at `index` adds nothing to the list — a duplicate of an
 * earlier part, or a prefix of any other at a word boundary. Nominatim
 * routinely returns both "Meşrutiyet" and "Meşrutiyet Mahallesi" for the same
 * place, and "Meşrutiyet, Meşrutiyet Mahallesi, Zonguldak" reads as a bug.
 *
 * Equality is resolved by position, never symmetrically: treating "Yalova" and
 * "Yalova" as mutually redundant drops both and loses the city entirely.
 */
function isRedundant(parts, index) {
  return parts.some((other, j) => {
    if (j === index) return false;
    if (other === parts[index]) return j < index;
    return other.startsWith(`${parts[index]} `);
  });
}

/**
 * Strips OSM's administrative-boundary labels. Nominatim answers "Yalova
 * Belediye sınırı" for the municipality, which names a boundary object rather
 * than a place and has no business in an address line.
 */
function stripBoundaryLabel(part) {
  return part.replace(/\s+(Belediye sınırı|Belediyesi sınırı)$/u, '').trim();
}

/** "Neighbourhood, district, province" from Nominatim's address object. */
function composeAddress(address) {
  if (!address) return null;
  const local =
    address.neighbourhood ?? address.suburb ?? address.road ?? address.quarter;
  const district =
    address.town ?? address.city_district ?? address.county ?? address.district;
  const province = address.province ?? address.state ?? address.city;

  const candidates = [local, district, province]
    .filter(Boolean)
    .map(stripBoundaryLabel)
    .filter(Boolean);
  const parts = candidates.filter((_, index) => !isRedundant(candidates, index));
  return parts.length ? parts.join(', ') : null;
}

async function reverse(lat, lon) {
  const url = `${ENDPOINT}?format=jsonv2&zoom=16&addressdetails=1&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'tr' },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return composeAddress((await response.json()).address);
}

const listings = JSON.parse(await readFile(FILE, 'utf8'));
const pending = listings.filter((listing) => !listing.address);

console.log(`${pending.length} of ${listings.length} listing(s) need an address`);

for (const [index, listing] of pending.entries()) {
  const progress = `[${index + 1}/${pending.length}]`;
  try {
    const address = await reverse(listing.location.lat, listing.location.lng);
    if (address) {
      listing.address = address;
      await writeFile(FILE, `${JSON.stringify(listings, null, 2)}\n`, 'utf8');
      console.log(`${progress} ${listing.id} -> ${address}`);
    } else {
      console.warn(`${progress} ${listing.id} -> no address`);
    }
  } catch (error) {
    console.error(`${progress} ${listing.id} failed: ${error.message}`);
  }
  await sleep(DELAY_MS);
}

console.log('done');
