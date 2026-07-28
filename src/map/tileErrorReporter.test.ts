import { describe, it, expect, vi } from 'vitest';
import { createTileErrorReporter, TILE_FAILURE_THRESHOLD } from './tileErrorReporter';
import { SOURCE_ID } from '../config/mapStyle';

const tileFailure = (message = 'Failed to fetch tile') => ({
  error: { message },
  sourceId: 'openmaptiles',
});

function setup(threshold = TILE_FAILURE_THRESHOLD) {
  const onError = vi.fn();
  const onRecover = vi.fn();
  return {
    onError,
    onRecover,
    reporter: createTileErrorReporter(onError, onRecover, threshold),
  };
}

describe('createTileErrorReporter', () => {
  describe('before the style has loaded', () => {
    it('reports the first failure — there is no basemap to speak of', () => {
      const { reporter, onError } = setup();
      reporter.report(tileFailure(), false);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('once the style is up', () => {
    // Regression: MapLibre aborts in-flight tiles on every fly and pan. One
    // dropped request raised a permanent "basemap unavailable" banner over a
    // map that was drawing perfectly well.
    it('stays quiet through a handful of dropped requests', () => {
      const { reporter, onError } = setup();
      for (let i = 0; i < TILE_FAILURE_THRESHOLD - 1; i += 1) {
        reporter.report(tileFailure(), true);
      }
      expect(onError).not.toHaveBeenCalled();
    });

    it('reports once failures are sustained', () => {
      const { reporter, onError } = setup();
      for (let i = 0; i < TILE_FAILURE_THRESHOLD; i += 1) {
        reporter.report(tileFailure(), true);
      }
      expect(onError).toHaveBeenCalled();
    });

    it('keeps reporting while the outage lasts', () => {
      const { reporter, onError } = setup(2);
      reporter.report(tileFailure(), true);
      reporter.report(tileFailure(), true);
      reporter.report(tileFailure(), true);
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });

  describe('what it refuses to blame the network for', () => {
    it('ignores errors raised by our own listings source', () => {
      const { reporter, onError } = setup();
      reporter.report({ error: { message: 'tile load failed' }, sourceId: SOURCE_ID }, false);
      expect(onError).not.toHaveBeenCalled();
    });

    it('ignores errors that are not about a request at all', () => {
      const { reporter, onError } = setup();
      reporter.report({ error: { message: 'Expected value to be of type number' } }, false);
      expect(onError).not.toHaveBeenCalled();
    });

    it('ignores a malformed event rather than throwing', () => {
      const { reporter, onError } = setup();
      expect(() => reporter.report(undefined, false)).not.toThrow();
      expect(() => reporter.report({}, false)).not.toThrow();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('recovery', () => {
    it('retracts the notice after one clean render cycle', () => {
      const { reporter, onError, onRecover } = setup(1);
      reporter.report(tileFailure(), true);
      expect(onError).toHaveBeenCalled();

      reporter.settle(); // the cycle the failure happened in
      reporter.settle(); // a clean one
      expect(onRecover).toHaveBeenCalledTimes(1);
    });

    it('holds the notice while every cycle still fails', () => {
      const { reporter, onRecover } = setup(1);
      for (let i = 0; i < 3; i += 1) {
        reporter.report(tileFailure(), true);
        reporter.settle();
      }
      expect(onRecover).not.toHaveBeenCalled();
    });

    it('says nothing about recovery when nothing ever failed', () => {
      const { reporter, onRecover } = setup();
      reporter.settle();
      reporter.settle();
      expect(onRecover).not.toHaveBeenCalled();
    });

    it('starts the tolerance over after recovering', () => {
      const { reporter, onError } = setup(2);
      reporter.report(tileFailure(), true);
      reporter.settle();
      reporter.settle(); // clean cycle: back to a working basemap

      reporter.report(tileFailure(), true);
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
