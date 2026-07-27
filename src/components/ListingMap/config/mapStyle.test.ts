import { describe, it, expect } from 'vitest';
import {
  LAYER_CLUSTERS, LAYER_CLUSTERS_ACTIVE, LAYER_PINS, LAYER_PINS_ACTIVE,
  isMutedBaseLayer,
} from './mapStyle';

describe('isMutedBaseLayer', () => {
  it('mutes the basemap decoration that competes with the pins', () => {
    expect(isMutedBaseLayer('poi_z14')).toBe(true);
    expect(isMutedBaseLayer('aeroway-runway')).toBe(true);
    expect(isMutedBaseLayer('building-3d')).toBe(true);
  });

  /**
   * These are the three positron layers whose filter reads `ref_length`, which
   * is null on any road without a `ref` — one worker warning per layer per tile,
   * forever. Hiding them stops the worker parsing them at all. They are US
   * highway shields, so nothing is lost on a map of Türkiye.
   */
  it('mutes the shield layers whose upstream filter compares null to a number', () => {
    expect(isMutedBaseLayer('highway-shield-non-us')).toBe(true);
    expect(isMutedBaseLayer('highway-shield-us-interstate')).toBe(true);
    expect(isMutedBaseLayer('road_shield_us')).toBe(true);
  });

  it('leaves the basemap a user needs to read a map alone', () => {
    for (const id of ['water', 'landuse-residential', 'road_major_motorway', 'place_label_city', 'boundary_3']) {
      expect(isMutedBaseLayer(id), `"${id}" must stay visible`).toBe(false);
    }
  });

  // Muting runs before our layers are added, but a prefix that swallowed one
  // would blank the listings and look like a data problem.
  it('never matches one of our own layers', () => {
    for (const id of [LAYER_PINS, LAYER_PINS_ACTIVE, LAYER_CLUSTERS, LAYER_CLUSTERS_ACTIVE]) {
      expect(isMutedBaseLayer(id), `"${id}" is ours`).toBe(false);
    }
  });
});
