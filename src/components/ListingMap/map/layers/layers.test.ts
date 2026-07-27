import { describe, it, expect } from 'vitest';
import { buildPinLayer } from './pins';
import { buildClusterLayers } from './clusters';
import { SOURCE_ID } from '../../config/mapStyle';

describe('buildPinLayer', () => {
  const layer = buildPinLayer();

  it('is a symbol layer bound to the listing source', () => {
    expect(layer.type).toBe('symbol');
    expect((layer as { source: string }).source).toBe(SOURCE_ID);
  });

  it('hides clustered points so only leaves draw pins', () => {
    expect((layer as { filter?: unknown }).filter).toEqual(['!', ['has', 'point_count']]);
  });

  it('maps the category property onto ascii sprite ids', () => {
    const iconImage = (layer.layout as Record<string, unknown>)['icon-image'] as unknown[];
    expect(iconImage[0]).toBe('match');
    expect(iconImage[1]).toEqual(['get', 'category']);
    const serialized = JSON.stringify(iconImage);
    expect(serialized).toContain('Araç');
    expect(serialized).toContain('pin-arac');
  });

  it('falls back to a known sprite for an unrecognized category', () => {
    const iconImage = (layer.layout as Record<string, unknown>)['icon-image'] as unknown[];
    expect(iconImage[iconImage.length - 1]).toBe('pin-gayrimenkul');
  });

  it('scales up on the feature-state selected flag, not via React', () => {
    const iconSize = (layer.layout as Record<string, unknown>)['icon-size'];
    expect(JSON.stringify(iconSize)).toContain('feature-state');
    expect(JSON.stringify(iconSize)).toContain('selected');
  });

  it('allows overlap so dense areas keep every pin visible', () => {
    expect((layer.layout as Record<string, unknown>)['icon-allow-overlap']).toBe(true);
  });
});

describe('buildClusterLayers', () => {
  const layers = buildClusterLayers();

  it('produces a circle layer and a count label layer', () => {
    expect(layers.map((l) => l.type)).toEqual(['circle', 'symbol']);
  });

  it('draws only clustered features', () => {
    for (const layer of layers) {
      expect((layer as { filter?: unknown }).filter).toEqual(['has', 'point_count']);
    }
  });

  it('interpolates circle radius on point_count rather than using a fixed size', () => {
    const radius = (layers[0].paint as Record<string, unknown>)['circle-radius'];
    expect(JSON.stringify(radius)).toContain('point_count');
    expect(JSON.stringify(radius)).toContain('interpolate');
  });

  it('renders the abbreviated count text', () => {
    const textField = (layers[1].layout as Record<string, unknown>)['text-field'];
    expect(textField).toEqual(['get', 'point_count_abbreviated']);
  });
});
