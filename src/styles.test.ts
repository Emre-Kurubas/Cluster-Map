import { describe, it, expect } from 'vitest';
// Read verbatim. Vitest stubs CSS imports to an empty string unless the file is
// named in `test.css.include`, which this one is — otherwise every assertion
// below would pass against nothing.
import css from './styles.css?raw';

describe('the package stylesheet', () => {
  it('carries the pieces the components cannot render without', () => {
    expect(css).toContain('--cluster-map-brand-500');
    expect(css).toContain('.range-thumb');
    expect(css).toContain('@keyframes connector-draw');
  });

  /**
   * These two were global in the app's stylesheet this was extracted from.
   * Published as-is they would set the cursor on every button on a consumer's
   * site and, under reduced motion, silence every animation on the page — not
   * only ours. A package that does either is one nobody can adopt.
   */
  it('scopes the rules that would otherwise reach outside the component', () => {
    expect(css).toMatch(/\.cluster-map[^{]*button:not\(:disabled\)/);
    expect(css).not.toMatch(/^\s*\*,\s*\*::before/m);
  });

  it('does not drag the app shell along with it', () => {
    expect(css).not.toContain('#root');
    expect(css).not.toMatch(/^\s*html\s*,/m);
  });

  /**
   * The stylesheet is the Tailwind entry, not a fragment an app has to wire up:
   * the library build compiles this file alone. It also has to name its own
   * sources, because Tailwind's detection starts from the CSS file's directory
   * and the Vite root is `demo/` — without this the build emitted a stylesheet
   * with no utilities in it at all, and nothing failed.
   */
  it('is self-sufficient', () => {
    expect(css).toContain('@import "tailwindcss"');
    expect(css).toContain('@source');
  });

  it('leaves no dead keyframes behind', () => {
    expect(css).not.toContain('@keyframes rail-in');
  });

  /**
   * Only the prefixed names are contract. The Tailwind tokens are internal and
   * must resolve through them, or a consumer overriding `--cluster-map-brand-500`
   * would change nothing.
   */
  it('routes every internal token through an overridable one', () => {
    expect(css).toMatch(/--color-brand-500:\s*var\(--cluster-map-brand-500\)/);
    expect(css).toMatch(/--color-cat-arsa:\s*var\(--cluster-map-cat-arsa\)/);
  });
});
