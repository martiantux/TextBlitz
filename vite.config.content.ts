import { defineConfig } from 'vite';
import { resolve } from 'path';

// Separate config for content script - builds as IIFE for maximum Chrome compatibility
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't empty - main build will handle that
    lib: {
      entry: resolve(__dirname, 'src/content/expander.ts'),
      formats: ['iife'],
      name: 'TextBlitzExpander',
      fileName: () => 'content/expander.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
  },
});
