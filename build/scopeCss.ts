import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import postcss from 'postcss';
import type { Container } from 'postcss';
import type { Plugin } from 'vite';

/** The class `ListingMapView` puts on its root element. */
export const SCOPE = '.cluster-map';

/**
 * The scope root *or* anything inside it.
 *
 * A plain descendant combinator — `.cluster-map .h-full` — cannot match the
 * element against itself, and the root is both: it carries `cluster-map` and
 * the utilities `relative h-full w-full overflow-hidden bg-surface`. Scoped
 * that way all five were inert, so the published component rendered at zero
 * pixels tall with its overlays positioned against the viewport, and only a
 * consumer's own `.cluster-map { height: 100% }` override brought it back.
 *
 * `:is()` takes the specificity of its most specific argument, and both of
 * these are one class — so rules keep the exact weight the descendant form gave
 * them, and nothing in the sheet reorders.
 */
export const WITHIN = `:is(${SCOPE},${SCOPE} *)`;

/**
 * At-rules whose contents must not be touched.
 *
 * `keyframes` holds percentage selectors, not element selectors — prefixing
 * `from`/`to`/`50%` would produce nonsense and silently kill every animation.
 * The rest have no selectors to scope at all.
 */
const OPAQUE = /^(-\w+-)?(keyframes|font-face|property|import|charset|namespace)$/;

/** Combinators that end the leftmost compound selector. */
const COMBINATOR = /[\s>+~]/;

/**
 * A type or universal selector, which must stay first in its compound —
 * `div:is(…)` is valid where `:is(…)div` is not.
 */
const LEADING_TYPE = /^(?:\*|[a-zA-Z][\w-]*)/;

/**
 * Split a complex selector into its leftmost compound and everything after it.
 *
 * Only that first compound gets the scope: once its subject is known to be
 * inside the component, whatever descends from it is too. Parentheses, brackets
 * and quotes are tracked because Tailwind emits both `:not(.a .b)` and escaped
 * class names like `.w-\[calc\(100\%-1px\)\]`, either of which would otherwise
 * be cut in half at a space or a `+`.
 */
function splitLeadingCompound(selector: string): [compound: string, rest: string] {
  let depth = 0;
  let quote = '';

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    if (char === '\\') i++;
    else if (quote) { if (char === quote) quote = ''; }
    else if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (depth === 0 && COMBINATOR.test(char)) {
      return [selector.slice(0, i), selector.slice(i)];
    }
  }

  return [selector, ''];
}

function scopeSelector(selector: string): string {
  const trimmed = selector.trim();
  if (!trimmed || trimmed.includes('cluster-map')) return trimmed;

  /**
   * `:root` and `:host` carry the theme's custom properties. Left alone they
   * would put every token on the consumer's document — including the
   * unprefixed Tailwind ones, which are internal names we reserve the right to
   * change. Becoming the scope itself puts them exactly where they are read.
   */
  if (trimmed === ':root' || trimmed === ':host') return SCOPE;

  const [compound, rest] = splitLeadingCompound(trimmed);
  const type = LEADING_TYPE.exec(compound)?.[0] ?? '';

  return `${type}${WITHIN}${compound.slice(type.length)}${rest}`;
}

function walk(container: Container): void {
  container.each((node) => {
    if (node.type === 'rule') {
      node.selectors = node.selectors.map(scopeSelector);
    } else if (node.type === 'atrule') {
      if (OPAQUE.test(node.name)) return;
      // @media, @supports, @layer and friends hold rules of their own.
      walk(node);
    }
  });
}

/** Rewrite one stylesheet so every rule in it lives under the scope class. */
export function scopeCss(css: string): string {
  const root = postcss.parse(css);
  walk(root);
  return root.toString();
}

/**
 * Scope the emitted stylesheet to the component's root class.
 *
 * Two rules in this component's CSS were written global — the button cursor and
 * the reduced-motion override — and published unscoped they would restyle every
 * button on the host's site and silence the host's own animations. Scoping the
 * whole sheet fixes both, stops our utility classes colliding with a consumer's
 * own `.flex` or `.absolute`, and lets our rules win inside our own subtree on
 * specificity.
 *
 * Done here, over the built output, rather than through Tailwind's `prefix()`
 * option: that would rename every utility and mean rewriting every `className`
 * in the component.
 *
 * Build only. In dev the styles stay global, which is strictly more permissive
 * — the component renders the same either way.
 */
export function scopeComponentCss(): Plugin {
  return {
    name: 'scope-listing-map-css',
    apply: 'build',
    /**
     * `writeBundle`, not `generateBundle`: Vite emits the stylesheet after
     * generateBundle runs, so the bundle it hands you has no CSS asset in it at
     * all. The library build sailed through with an entirely unscoped
     * stylesheet until the output was checked on disk.
     */
    writeBundle(options) {
      const dir = options.dir ?? (options.file ? dirname(options.file) : undefined);
      if (!dir) return;

      for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
        if (!file.endsWith('.css')) continue;
        const path = join(dir, file);
        writeFileSync(path, scopeCss(readFileSync(path, 'utf8')));
      }
    },
  };
}
