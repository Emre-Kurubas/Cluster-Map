import { describe, it, expect } from 'vitest';
import { scopeCss } from './scopeCss.ts';

describe('scopeCss', () => {
  it('puts ordinary rules under the scope', () => {
    expect(scopeCss('.flex{display:flex}')).toContain('.cluster-map .flex');
  });

  /**
   * The theme's custom properties live on `:root`. Left there they would land
   * on the consumer's document — including the unprefixed Tailwind names, which
   * are internal and reserved for renaming.
   */
  it('folds :root and :host into the scope itself', () => {
    expect(scopeCss(':root{--a:1}')).toContain('.cluster-map{--a:1}');
    expect(scopeCss(':host{--a:1}')).toContain('.cluster-map{--a:1}');
  });

  /**
   * Keyframe steps are percentages, not selectors. Prefixing `from` and `to`
   * would produce nonsense that parses fine and silently kills the animation.
   */
  it('leaves keyframe steps alone', () => {
    const out = scopeCss('@keyframes fade{from{opacity:0}to{opacity:1}}');
    expect(out).toContain('from{opacity:0}');
    expect(out).toContain('to{opacity:1}');
    expect(out).not.toContain('cluster-map from');
  });

  it('descends into media, supports and layer blocks', () => {
    expect(scopeCss('@media (min-width:40rem){.a{color:red}}'))
      .toContain('.cluster-map .a');
    expect(scopeCss('@layer utilities{.b{color:red}}'))
      .toContain('.cluster-map .b');
    expect(scopeCss('@supports (display:grid){.c{color:red}}'))
      .toContain('.cluster-map .c');
  });

  it('scopes every selector in a list, not just the first', () => {
    const out = scopeCss('.a,.b{color:red}');
    expect(out).toContain('.cluster-map .a');
    expect(out).toContain('.cluster-map .b');
  });

  // Running the pass twice must not double-prefix; the build is not required to
  // be idempotent, but a stray second pass should not corrupt the output.
  it('does not re-scope what is already scoped', () => {
    const once = scopeCss('.a{color:red}');
    expect(scopeCss(once)).toBe(once);
  });

  it('leaves @font-face and @property untouched', () => {
    expect(scopeCss('@font-face{font-family:X}')).toContain('@font-face');
    expect(scopeCss('@property --x{syntax:"*"}')).toContain('@property --x');
  });
});
