import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 20_000,
  fullyParallel: false,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5174',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  reporter: [['list']],
});
