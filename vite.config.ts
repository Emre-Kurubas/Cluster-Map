import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const require = createRequire(import.meta.url);

/**
 * MapLibre loads its web worker from a URL derived at runtime from its own
 * module location:
 *
 *   new URL(`./maplibre-gl-worker.mjs`, import.meta.url)
 *
 * The template literal is dynamic, so Vite cannot statically detect it and
 * never emits the worker. In a production build `import.meta.url` points at
 * `/assets/index-<hash>.js`, so the worker is requested from `/assets/` — where
 * it does not exist. The dev server answers that request with SPA-fallback
 * HTML, which a module worker then fails to parse, and the map never renders.
 *
 * Emitting both files into `assets/` puts them exactly where that derived URL
 * looks. The shared chunk is required too: the worker imports it as a sibling.
 */
function maplibreWorkerAssets(): Plugin {
  const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

  return {
    name: 'maplibre-worker-assets',
    apply: 'build',
    generateBundle() {
      const distDir = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
      for (const file of FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${file}`,
          source: readFileSync(join(distDir, file), 'utf8'),
        });
      }
    },
  };
}

export default defineConfig({
  // The demo is the app this config builds; the library it consumes lives in
  // src/ and gets its own config in vite.lib.config.ts.
  root: 'demo',
  publicDir: 'public',
  build: { outDir: '../dist-demo', emptyOutDir: true },
  plugins: [react(), tailwindcss(), maplibreWorkerAssets()],
  optimizeDeps: {
    // Dev counterpart to the plugin above: pre-bundling would relocate the
    // MapLibre entry into .vite/deps/ without its worker sibling, so the same
    // derived URL would 404. Serving it from node_modules keeps them together.
    exclude: ['maplibre-gl'],
  },
  test: {
    // The demo is the Vite root, but the tests live beside the library they
    // exercise, so the test runner keeps the repo root.
    root: '.',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    // Vitest stubs every CSS import to an empty string, so a `?raw` read of
    // MapLibre's stylesheet came back blank and the cascade guard in
    // MapCanvas.test.tsx passed against nothing. Let that one file through.
    css: { include: [/maplibre-gl\.css/] },
  },
});
