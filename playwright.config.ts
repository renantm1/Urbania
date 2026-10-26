import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const baseURL = `http://127.0.0.1:4173${process.env.VITE_BASE_PATH || '/'}`;

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  timeout: 90_000, expect: { timeout: 10_000 },
  use: {
    baseURL, viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath: process.env.URBANIA_CHROMIUM_PATH || (!process.env.CI && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: baseURL, reuseExistingServer: !process.env.CI, timeout: 30_000 },
});
