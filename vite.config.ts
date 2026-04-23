import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  root: 'playground',
  base: './', // Use relative paths for assets to work in subfolders
  plugins: [
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist/playground',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'playground/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      // Alias for the library to point to source
      '@lib': path.resolve(__dirname, 'src'),
    },
  },
});
