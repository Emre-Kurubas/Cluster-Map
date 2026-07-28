import { describe, it, expect } from 'vitest';
import { resolveSlot } from './slots';

function Default() { return null; }
function Replacement() { return null; }

/**
 * Three cases, and the middle one is the reason this is a function rather than
 * `slots?.x ?? Default` at each call site: `false` and `undefined` are both
 * falsy and mean opposite things.
 */
describe('resolveSlot', () => {
  it('falls back to the default when the slot is not given', () => {
    expect(resolveSlot(undefined, Default)).toBe(Default);
  });

  it('returns the replacement when one is given', () => {
    expect(resolveSlot(Replacement, Default)).toBe(Replacement);
  });

  it('returns null when the slot is switched off', () => {
    expect(resolveSlot(false, Default)).toBeNull();
  });
});
