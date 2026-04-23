import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  root: 'playground',
  base: '/pdf-to-markdown-js/', // Use repository path for GitHub Pages
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
    outDir: 'dist',
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
