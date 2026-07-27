import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { scopeComponentCss } from './build/scopeCss.ts';

/**
 * The library build.
 *
 * Deliberately omits `maplibreWorkerAssets`, the plugin the demo build uses.
 * That plugin copies MapLibre's worker into the output because MapLibre derives
 * its worker URL from `import.meta.url` at runtime, which no bundler can see
 * statically. With MapLibre external here, its worker is the consumer's build's
 * problem, and shipping a copy inside our dist would be wrong.
 *
 * The consumer therefore inherits that problem, which is why the README carries
 * the recipe in a section of its own rather than a footnote — it is the most
 * likely cause of a failed first integration.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), scopeComponentCss()],
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        primitives: 'src/primitives.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'maplibre-gl'],
      output: { assetFileNames: 'styles.css' },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
