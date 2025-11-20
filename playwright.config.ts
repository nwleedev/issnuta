import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  workers: (isCI ? '50%' : 1) as unknown as string | number,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    colorScheme: 'light',
    timezoneId: 'UTC',
    testIdAttribute: 'data-testid',
    serviceWorkers: 'allow',
  },
  webServer: [
    {
      command: 'sh -c "pnpm build && pnpm start -p 3000"',
      url: 'http://localhost:3000',
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  ],
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 14'] } },
  ],
});
