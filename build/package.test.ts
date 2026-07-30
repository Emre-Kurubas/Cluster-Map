import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import type { Container, Rule } from 'postcss';

// Vitest pins `test.root` to the repo root, so cwd is the reliable anchor here;
// `import.meta.url` does not survive its transform intact.
const root = (path: string) => join(process.cwd(), path);
const pkg = JSON.parse(readFileSync(root('package.json'), 'utf8'));

/** At-rules that hold no element selectors — see the scoping pass. */
const OPAQUE = /^(-\w+-)?(keyframes|font-face|property|import|charset|namespace)$/;

/** Every style rule in the sheet, at whatever nesting depth. */
function* rules(container: Container): Generator<Rule> {
  for (const node of container.nodes ?? []) {
    if (node.type === 'rule') yield node;
    else if (node.type === 'atrule' && !OPAQUE.test(node.name)) yield* rules(node);
  }
}

const stylesheet = () => postcss.parse(readFileSync(root('dist/styles.css'), 'utf8'));

describe('the package manifest', () => {
  /**
   * MapLibre especially: 477 kB with its own worker, and two copies on one page
   * fight over WebGL contexts. React for the obvious reason.
   */
  it('keeps the heavy runtime peers out of dependencies', () => {
    expect(pkg.peerDependencies).toMatchObject({
      react: expect.any(String),
      'react-dom': expect.any(String),
      'maplibre-gl': expect.any(String),
    });
    expect(pkg.dependencies).not.toHaveProperty('react');
    expect(pkg.dependencies).not.toHaveProperty('maplibre-gl');
  });

  // Without this a bundler tree-shakes the stylesheet away and the consumer
  // gets an unstyled map with no error to explain it.
  it('marks css as side-effectful', () => {
    expect(pkg.sideEffects).toContain('*.css');
  });

  it('exposes both entry points and the stylesheet', () => {
    expect(pkg.exports['.']).toBeDefined();
    expect(pkg.exports['./primitives']).toBeDefined();
    expect(pkg.exports['./styles.css']).toBeDefined();
  });

  it('is publishable', () => {
    expect(pkg.private).toBeUndefined();
    expect(pkg.name).toBe('cluster-map');
    expect(pkg.files).toContain('dist');
  });
});

describe('the built package', () => {
  // Skipped unless `npm run build:lib` has run, so the unit suite stays fast.
  const built = existsSync(root('dist/index.js'));

  it.skipIf(!built)('emits both entries, their types and the stylesheet', () => {
    expect(existsSync(root('dist/index.js'))).toBe(true);
    expect(existsSync(root('dist/primitives.js'))).toBe(true);
    expect(existsSync(root('dist/index.d.ts'))).toBe(true);
    expect(existsSync(root('dist/styles.css'))).toBe(true);
  });

  it.skipIf(!built)('does not inline the peers', () => {
    const bundle = readFileSync(root('dist/index.js'), 'utf8');
    expect(bundle).not.toContain('maplibregl');
    expect(bundle.length).toBeLessThan(400_000);
  });

  /**
   * MapLibre must stay behind the code-split boundary on the main entry. A
   * stray static import anywhere on the path from `index.js` welds it back into
   * the chunk a consumer downloads before anything is on screen — which is what
   * the boundary exists to prevent, and which nothing else would notice.
   *
   * `primitives.js` is deliberately exempt: it exports the eager `MapCanvas`,
   * because a consumer assembling their own layout picks their own loading
   * strategy and taking that decision away would be making it for them.
   */
  it.skipIf(!built)('keeps maplibre-gl out of the main entry graph', () => {
    const chunks = readdirSync(root('dist'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => ({ name, source: readFileSync(root(`dist/${name}`), 'utf8') }));

    const importsMaplibre = (source: string) => /from\s*["']maplibre-gl["']/.test(source);

    // Walk the static graph out from each entry point.
    const byName = new Map(chunks.map((chunk) => [chunk.name, chunk.source]));
    const eager = new Set<string>();
    const visit = (name: string) => {
      if (eager.has(name) || !byName.has(name)) return;
      eager.add(name);
      for (const [, target] of byName.get(name)!.matchAll(/from\s*["']\.\/([^"']+)["']/g)) {
        visit(target);
      }
    };
    visit('index.js');

    const offenders = [...eager].filter((name) => importsMaplibre(byName.get(name)!));
    expect(offenders, `reachable statically from index.js and importing maplibre: ${offenders.join(', ')}`)
      .toEqual([]);

    // And it must still be in the bundle somewhere, behind the dynamic import.
    expect(chunks.some((chunk) => importsMaplibre(chunk.source))).toBe(true);
  });

  /**
   * The narrowed ListingStore type exists precisely so this holds: once zustand
   * appears in a published .d.ts it stops being an implementation detail and
   * becomes a peer dependency we could never swap.
   */
  it.skipIf(!built)('keeps zustand out of the public types', () => {
    expect(readFileSync(root('dist/index.d.ts'), 'utf8')).not.toContain('zustand');
  });

  /**
   * The root element carries the scope class *and* the utilities that give the
   * component its box — `relative h-full w-full overflow-hidden bg-surface`.
   * Scoped as descendants those five could never match it, so the published
   * package rendered a correct, fully working map at zero pixels tall, with
   * nothing in any console to say why. Selector text is checked against the
   * real element here for that reason: the broken form read perfectly.
   */
  it.skipIf(!built)('styles the component root, not only its descendants', () => {
    const element = document.createElement('div');
    element.className = 'cluster-map relative h-full w-full overflow-hidden bg-surface';
    document.body.append(element);

    const applied = new Map<string, string>();
    for (const rule of rules(stylesheet())) {
      // A pseudo-element or vendor pseudo-class throws in jsdom rather than
      // returning false; none of them style the root anyway.
      const hits = rule.selectors.some((selector) => {
        try { return element.matches(selector); } catch { return false; }
      });
      if (hits) rule.walkDecls((decl) => { applied.set(decl.prop, decl.value); });
    }

    expect(Object.fromEntries(applied)).toMatchObject({
      position: 'relative',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
    });
    expect(applied.get('background-color')).toBeDefined();
  });

  it.skipIf(!built)('publishes no unscoped rules', () => {
    const unscoped = [...rules(stylesheet())]
      .flatMap((rule) => rule.selectors)
      .filter((selector) => !selector.includes('cluster-map'));

    expect(unscoped, `these would leak onto a host page: ${unscoped.join(', ')}`)
      .toEqual([]);
  });
});
