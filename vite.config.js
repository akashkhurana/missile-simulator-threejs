import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/missile-simulator-threejs/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
  },
});
