import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'test' ? '/' : process.env.VITE_BASE_PATH || '/',
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), presenter: resolve(__dirname, 'presenter/index.html') } } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: false, include: ['src/**/*.test.{ts,tsx}'] }
}));
