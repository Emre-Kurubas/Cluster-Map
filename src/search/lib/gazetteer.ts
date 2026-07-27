import { normalizeTr } from '../../lib/normalize';
import type { BBox, LngLat } from '../../types/map';

export interface Province {
  name: string;
  normalized: string;
  center: LngLat;
  bbox: BBox;
}

/** [name, lng, lat] in plate-code order. */
const RAW: Array<[string, number, number]> = [
  ['Adana', 35.3213, 37.0000], ['Adıyaman', 38.2786, 37.7648],
  ['Afyonkarahisar', 30.5387, 38.7507], ['Ağrı', 43.0503, 39.7191],
  ['Amasya', 35.8353, 40.6499], ['Ankara', 32.8597, 39.9334],
  ['Antalya', 30.7133, 36.8969], ['Artvin', 41.8194, 41.1828],
  ['Aydın', 27.8456, 37.8560], ['Balıkesir', 27.8826, 39.6484],
  ['Bilecik', 29.9833, 40.1506], ['Bingöl', 40.4986, 38.8853],
  ['Bitlis', 42.1075, 38.4006], ['Bolu', 31.6061, 40.7396],
  ['Burdur', 30.2908, 37.7203], ['Bursa', 29.0610, 40.1826],
  ['Çanakkale', 26.4086, 40.1553], ['Çankırı', 33.6134, 40.6013],
  ['Çorum', 34.9556, 40.5506], ['Denizli', 29.0875, 37.7765],
  ['Diyarbakır', 40.2306, 37.9144], ['Edirne', 26.5557, 41.6771],
  ['Elazığ', 39.2264, 38.6810], ['Erzincan', 39.4900, 39.7500],
  ['Erzurum', 41.2769, 39.9000], ['Eskişehir', 30.5206, 39.7767],
  ['Gaziantep', 37.3781, 37.0662], ['Giresun', 38.3895, 40.9128],
  ['Gümüşhane', 39.4814, 40.4386], ['Hakkari', 43.7408, 37.5744],
  ['Hatay', 36.1611, 36.2025], ['Isparta', 30.5533, 37.7648],
  ['Mersin', 34.6415, 36.8121], ['İstanbul', 28.9784, 41.0082],
  ['İzmir', 27.1428, 38.4237], ['Kars', 43.0975, 40.6013],
  ['Kastamonu', 33.7827, 41.3887], ['Kayseri', 35.4787, 38.7312],
  ['Kırklareli', 27.2256, 41.7355], ['Kırşehir', 34.1709, 39.1425],
  ['Kocaeli', 29.9200, 40.8533], ['Konya', 32.4846, 37.8746],
  ['Kütahya', 29.9833, 39.4242], ['Malatya', 38.3095, 38.3552],
  ['Manisa', 27.4305, 38.6191], ['Kahramanmaraş', 36.9371, 37.5858],
  ['Mardin', 40.7245, 37.3212], ['Muğla', 28.3665, 37.2153],
  ['Muş', 41.4911, 38.9462], ['Nevşehir', 34.7139, 38.6939],
  ['Niğde', 34.6857, 37.9667], ['Ordu', 37.8764, 40.9839],
  ['Rize', 40.5219, 41.0201], ['Sakarya', 30.4033, 40.7569],
  ['Samsun', 36.3300, 41.2867], ['Siirt', 41.9333, 37.9333],
  ['Sinop', 35.1551, 42.0231], ['Sivas', 37.0179, 39.7477],
  ['Tekirdağ', 27.5110, 40.9781], ['Tokat', 36.5544, 40.3167],
  ['Trabzon', 39.7168, 41.0015], ['Tunceli', 39.5401, 39.1079],
  ['Şanlıurfa', 38.7955, 37.1591], ['Uşak', 29.4082, 38.6823],
  ['Van', 43.4089, 38.4891], ['Yozgat', 34.8147, 39.8181],
  ['Zonguldak', 31.7987, 41.4564], ['Aksaray', 34.0254, 38.3687],
  ['Bayburt', 40.2249, 40.2552], ['Karaman', 33.2287, 37.1759],
  ['Kırıkkale', 33.5153, 39.8468], ['Batman', 41.1351, 37.8812],
  ['Şırnak', 42.4918, 37.5164], ['Bartın', 32.3375, 41.6344],
  ['Ardahan', 42.7022, 41.1105], ['Iğdır', 44.0448, 39.8880],
  ['Yalova', 29.2769, 40.6500], ['Karabük', 32.6204, 41.2061],
  ['Kilis', 37.1147, 36.7184], ['Osmaniye', 36.2478, 37.0742],
  ['Düzce', 31.1565, 40.8438],
];

const PAD = 0.55;

export const PROVINCES: Province[] = RAW.map(([name, lng, lat]) => ({
  name,
  normalized: normalizeTr(name),
  center: [lng, lat] as LngLat,
  bbox: [lng - PAD, lat - PAD, lng + PAD, lat + PAD] as BBox,
}));

const BY_NORMALIZED = new Map(PROVINCES.map((p) => [p.normalized, p]));

/**
 * Scan tokens for a province name. Returns the match plus the token indices it
 * consumed, so the caller can strip them before fuzzy-matching the remainder.
 */
export function findProvinceInTokens(
  tokens: string[],
): { province: Province; indices: number[] } | null {
  for (let i = 0; i < tokens.length; i += 1) {
    const single = BY_NORMALIZED.get(tokens[i]);
    if (single) return { province: single, indices: [i] };
  }
  return null;
}

/** Nearest province centroid by squared degree distance. */
export function nearestProvince(lng: number, lat: number): Province {
  let best = PROVINCES[0];
  let bestDistance = Infinity;
  for (const province of PROVINCES) {
    const dx = province.center[0] - lng;
    const dy = province.center[1] - lat;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = province;
    }
  }
  return best;
}
