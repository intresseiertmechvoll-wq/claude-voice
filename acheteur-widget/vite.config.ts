import { defineConfig } from 'vite';

export default defineConfig({
  build: { outDir: 'dist', target: ['es2022', 'safari15', 'chrome100', 'firefox100'], assetsInlineLimit: 0 },
});
