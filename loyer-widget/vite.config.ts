import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
    // L'outil (/) et les pages de présentation /fr/, /de/, /en/ (générées par npm run pages)
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        fr: resolve(import.meta.dirname, 'fr/index.html'),
        de: resolve(import.meta.dirname, 'de/index.html'),
        en: resolve(import.meta.dirname, 'en/index.html'),
      },
    },
  },
});
