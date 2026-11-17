import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Subpath base for free GitHub Pages hosting at https://<user>.github.io/luma-wholesale/.
// Change this to '/' if deploying to a domain root.
export default defineConfig({
  plugins: [react()],
  base: '/luma-wholesale/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
