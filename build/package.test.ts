import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import type { Container } from 'postcss';

// Vitest pins `test.root` to the repo root, so cwd is the reliable anchor here;
// `import.meta.url` does not survive its transform intact.
const root = (path: string) => join(process.cwd(), path);
const pkg = JSON.parse(readFileSync(root('package.json'), 'utf8'));

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
    expect(pkg.name).toBe('@uyap/listing-map');
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
   * The narrowed ListingStore type exists precisely so this holds: once zustand
   * appears in a published .d.ts it stops being an implementation detail and
   * becomes a peer dependency we could never swap.
   */
  it.skipIf(!built)('keeps zustand out of the public types', () => {
    expect(readFileSync(root('dist/index.d.ts'), 'utf8')).not.toContain('zustand');
  });

  it.skipIf(!built)('publishes no unscoped rules', () => {
    const opaque = /^(-\w+-)?(keyframes|font-face|property|import|charset|namespace)$/;
    const unscoped: string[] = [];

    const walk = (container: Container) => {
      container.each((node) => {
        if (node.type === 'rule') {
          for (const selector of node.selectors) {
            if (!selector.includes('uyap-listing-map')) unscoped.push(selector);
          }
        } else if (node.type === 'atrule' && !opaque.test(node.name)) {
          walk(node);
        }
      });
    };
    walk(postcss.parse(readFileSync(root('dist/styles.css'), 'utf8')));

    expect(unscoped, `these would leak onto a host page: ${unscoped.join(', ')}`)
      .toEqual([]);
  });
});
