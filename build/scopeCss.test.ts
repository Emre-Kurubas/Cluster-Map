import { describe, it, expect } from 'vitest';
import { scopeCss, WITHIN } from './scopeCss.ts';

/** The selector text a single-rule stylesheet came out with. */
const selectorOf = (css: string) => scopeCss(css).split('{')[0];

/** Render markup and hand back its outermost element. */
const render = (html: string) => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
};

describe('scopeCss', () => {
  it('puts ordinary rules under the scope', () => {
    expect(scopeCss('.flex{display:flex}')).toContain(`${WITHIN}.flex`);
  });

  /**
   * The bug this file exists to prevent a second time. `.cluster-map .h-full`
   * cannot match the element against itself, and the root is both — it carries
   * `cluster-map` and `relative h-full w-full overflow-hidden bg-surface`. All
   * five were inert in the published stylesheet, so the component rendered at
   * zero pixels tall with its overlays positioned against the viewport, and
   * every consumer needed their own `.cluster-map { height: 100% }` to see a
   * map at all.
   */
  it('matches the scope root itself, not only its descendants', () => {
    const selector = selectorOf('.h-full{height:100%}');
    const root = render('<div class="cluster-map h-full"><span class="h-full"></span></div>');

    expect(root.matches(selector)).toBe(true);
    expect(root.querySelector('span')!.matches(selector)).toBe(true);
  });

  it('still reaches nothing outside the component', () => {
    const selector = selectorOf('.h-full{height:100%}');
    expect(render('<div class="h-full"></div>').matches(selector)).toBe(false);
  });

  /**
   * Only the leftmost compound is scoped: once its subject is known to be
   * inside the component, everything descending from it is too.
   */
  it('keeps combinators and their right-hand side intact', () => {
    const child = selectorOf('.a>.b{color:red}');
    expect(render('<div class="cluster-map"><i class="a"><b class="b"></b></i></div>')
      .querySelector('.b')!.matches(child)).toBe(true);
    // …including when the root is the left-hand side.
    expect(render('<div class="cluster-map a"><b class="b"></b></div>')
      .querySelector('.b')!.matches(child)).toBe(true);

    const sibling = selectorOf('.a+.b{color:red}');
    expect(render('<div class="cluster-map"><i class="a"></i><b class="b"></b></div>')
      .querySelector('.b')!.matches(sibling)).toBe(true);
  });

  /**
   * A type selector has to stay first in its compound: `input:is(…)[type]` is
   * valid where `:is(…)input[type]` is not, and an invalid selector takes its
   * whole rule down with it.
   */
  it('leaves a leading type or universal selector in front', () => {
    const typed = selectorOf("input[type='search']{appearance:none}");
    expect(typed).toBe(`input${WITHIN}[type='search']`);
    expect(render('<div class="cluster-map"><input type="search"></div>')
      .querySelector('input')!.matches(typed)).toBe(true);

    const universal = selectorOf('*{--tw-blur:initial}');
    expect(universal).toBe(`*${WITHIN}`);
    expect(render('<div class="cluster-map"></div>').matches(universal)).toBe(true);
  });

  /**
   * Tailwind escapes brackets, parens and operators into class names, and any
   * of them read as a combinator would cut the compound in half and emit a
   * selector matching something else entirely.
   */
  it('reads escapes, brackets and parens as part of the compound', () => {
    const arbitrary = selectorOf('.top-\\[calc\\(50\\%\\+2px\\)\\]{top:1px}');
    expect(arbitrary).toBe(`${WITHIN}.top-\\[calc\\(50\\%\\+2px\\)\\]`);

    const negated = selectorOf('.a:not(.b .c){color:red}');
    expect(negated).toBe(`${WITHIN}.a:not(.b .c)`);
    expect(render('<div class="cluster-map a"></div>').matches(negated)).toBe(true);
  });

  /** A pseudo-element cannot take the scope in front of it. */
  it('scopes the element a pseudo-element hangs off, not the pseudo-element', () => {
    expect(selectorOf('::backdrop{--tw-blur:initial}')).toBe(`${WITHIN}::backdrop`);
    expect(selectorOf('.a::before{content:""}')).toBe(`${WITHIN}.a::before`);
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
      .toContain(`${WITHIN}.a`);
    expect(scopeCss('@layer utilities{.b{color:red}}'))
      .toContain(`${WITHIN}.b`);
    expect(scopeCss('@supports (display:grid){.c{color:red}}'))
      .toContain(`${WITHIN}.c`);
  });

  it('scopes every selector in a list, not just the first', () => {
    const out = scopeCss('.a,.b{color:red}');
    expect(out).toContain(`${WITHIN}.a`);
    expect(out).toContain(`${WITHIN}.b`);
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
