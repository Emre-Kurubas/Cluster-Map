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
  plugins: [react(), tailwindcss(), maplibreWorkerAssets()],
  optimizeDeps: {
    // Dev counterpart to the plugin above: pre-bundling would relocate the
    // MapLibre entry into .vite/deps/ without its worker sibling, so the same
    // derived URL would 404. Serving it from node_modules keeps them together.
    exclude: ['maplibre-gl'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
