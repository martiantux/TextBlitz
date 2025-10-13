import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        // Content script is built separately with vite.config.content.ts
        'ui/options/options': resolve(__dirname, 'src/ui/options/options.ts'),
        'ui/popup/popup': resolve(__dirname, 'src/ui/popup/popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Ensure shared code isn't split into separate chunks
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    {
      name: 'copy-files',
      closeBundle() {
        // Copy manifest
        copyFileSync(
          resolve(__dirname, 'public/manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );

        // Copy HTML and CSS files for options
        const optionsDir = resolve(__dirname, 'dist/ui/options');
        if (!existsSync(optionsDir)) {
          mkdirSync(optionsDir, { recursive: true });
        }
        copyFileSync(
          resolve(__dirname, 'src/ui/options/options.html'),
          resolve(__dirname, 'dist/ui/options/options.html')
        );
        copyFileSync(
          resolve(__dirname, 'src/ui/options/options.css'),
          resolve(__dirname, 'dist/ui/options/options.css')
        );

        const popupDir = resolve(__dirname, 'dist/ui/popup');
        if (!existsSync(popupDir)) {
          mkdirSync(popupDir, { recursive: true });
        }
        copyFileSync(
          resolve(__dirname, 'src/ui/popup/popup.html'),
          resolve(__dirname, 'dist/ui/popup/popup.html')
        );

        // Copy icons
        const iconsDir = resolve(__dirname, 'dist/icons');
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }
        copyFileSync(
          resolve(__dirname, 'public/icons/icon.svg'),
          resolve(__dirname, 'dist/icons/icon.svg')
        );
      },
    },
  ],
});
