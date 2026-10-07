import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3101',
    viewport: { width: 1440, height: 1080 },
    screenshot: 'only-on-failure',
    launchOptions: fs.existsSync(chrome) ? { executablePath: chrome } : {},
  },
  webServer: {
    command: 'node scripts/e2e-server.js',
    url: 'http://127.0.0.1:3101/api/health',
    reuseExistingServer: false,
    timeout: 20000,
  },
});
