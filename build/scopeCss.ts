import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import postcss from 'postcss';
import type { Container } from 'postcss';
import type { Plugin } from 'vite';

/** The class `ListingMapView` puts on its root element. */
export const SCOPE = '.uyap-listing-map';

/**
 * At-rules whose contents must not be touched.
 *
 * `keyframes` holds percentage selectors, not element selectors — prefixing
 * `from`/`to`/`50%` would produce nonsense and silently kill every animation.
 * The rest have no selectors to scope at all.
 */
const OPAQUE = /^(-\w+-)?(keyframes|font-face|property|import|charset|namespace)$/;

function scopeSelector(selector: string): string {
  const trimmed = selector.trim();
  if (!trimmed || trimmed.includes('uyap-listing-map')) return trimmed;

  /**
   * `:root` and `:host` carry the theme's custom properties. Left alone they
   * would put every token on the consumer's document — including the
   * unprefixed Tailwind ones, which are internal names we reserve the right to
   * change. Becoming the scope itself puts them exactly where they are read.
   */
  if (trimmed === ':root' || trimmed === ':host') return SCOPE;

  return `${SCOPE} ${trimmed}`;
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
