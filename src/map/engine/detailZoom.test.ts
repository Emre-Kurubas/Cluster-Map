import { describe, it, expect, vi } from 'vitest';
import { DETAIL_ZOOM_OVERRIDES, widenBasemapDetail } from './detailZoom';

/** The positron layers these overrides target, with their shipped ranges. */
const POSITRON = [
  { id: 'label_state', minzoom: 5, maxzoom: 8 },
  { id: 'label_town', minzoom: 6 },
  { id: 'boundary_3', minzoom: 8 },
  { id: 'highway_motorway_casing', minzoom: 6 },
  { id: 'highway_motorway_inner', minzoom: 6 },
  { id: 'highway_motorway_subtle', minzoom: 0, maxzoom: 6 },
  { id: 'water' },
];

const fakeMap = (layers: object[] = POSITRON) => {
  const applied: Array<[string, number, number]> = [];
  return {
    applied,
    getStyle: () => ({ layers }),
    setLayerZoomRange: (id: string, min: number, max: number) => {
      applied.push([id, min, max]);
    },
  };
};

const rangeFor = (map: ReturnType<typeof fakeMap>, id: string) =>
  map.applied.find(([applied]) => applied === id);

describe('widenBasemapDetail', () => {
  /**
   * The point of the whole thing: someone zooming out is looking at where the
   * listings sit in the country, which is exactly when these matter most.
   */
  it('brings province names and borders down to a country-wide view', () => {
    const map = fakeMap();
    widenBasemapDetail(map as never);

    expect(rangeFor(map, 'label_state')?.[1]).toBe(3);
    expect(rangeFor(map, 'boundary_3')?.[1]).toBe(4);
  });

  it('keeps the end of the range the style shipped when only one end moves', () => {
    const map = fakeMap();
    widenBasemapDetail(map as never);

    // label_state is z[5..8]; we move the floor and must not lose the ceiling.
    expect(rangeFor(map, 'label_state')).toEqual(['label_state', 3, 8]);
  });

  /**
   * positron draws a faint motorway hint below z6 and the real thing above it.
   * Bringing the real thing down without retiring the hint would draw every
   * motorway twice.
   */
  it('hands the motorways over without drawing them twice', () => {
    const map = fakeMap();
    widenBasemapDetail(map as never);

    const casing = rangeFor(map, 'highway_motorway_casing');
    const subtle = rangeFor(map, 'highway_motorway_subtle');

    expect(casing?.[1]).toBe(5);
    expect(subtle?.[2]).toBe(5);
    // The hint ends exactly where the real thing starts: no overlap, no gap.
    expect(subtle?.[2]).toBe(casing?.[1]);
  });

  it('leaves layers it has no opinion about alone', () => {
    const map = fakeMap();
    widenBasemapDetail(map as never);
    expect(rangeFor(map, 'water')).toBeUndefined();
  });

  /**
   * A style is remote data. It can rename or drop a layer between loads, and a
   * basemap that lost its town labels must not cost the map its listings.
   */
  it('skips ids the loaded style does not contain', () => {
    const map = fakeMap([{ id: 'water' }]);
    expect(() => widenBasemapDetail(map as never)).not.toThrow();
    expect(map.applied).toEqual([]);
  });

  it('survives a style that refuses the change', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const map = {
      getStyle: () => ({ layers: POSITRON }),
      setLayerZoomRange: () => { throw new Error('style is gone'); },
    };

    expect(() => widenBasemapDetail(map as never)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('only ever widens, never narrows, the floor', () => {
    const shipped = new Map(POSITRON.map((l) => [l.id, l]));
    for (const override of DETAIL_ZOOM_OVERRIDES) {
      if (override.minzoom === undefined) continue;
      const original = shipped.get(override.id)?.minzoom ?? 0;
      expect(override.minzoom, `${override.id} would hide detail, not reveal it`)
        .toBeLessThan(original);
    }
  });
});
