import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  test: { include: ['src/**/*.test.ts'], benchmark: { include: ['src/**/*.bench.ts'] } },
  build: {
    // Three.js is intentionally isolated for browser caching; its engine is ~704 kB.
    chunkSizeWarningLimit: 750,
    rollupOptions: { output: { manualChunks: {
      'three-engine': ['three'],
      'scene-runtime': ['@react-three/fiber', '@react-three/drei'],
      'react-runtime': ['react', 'react-dom', 'zustand'],
    } } },
  },
});
