import { test, expect } from '@playwright/test';

// Opt-in gate: define tests only when enabled
if (process.env.E2E_TF === '1') {
test.describe('Transformers mode offline E2E (opt-in)', () => {
  test('online prime → offline translate', async ({ page, context }) => {
    test.setTimeout(180_000);
    // Ensure transformers mode is ON before app mounts
    await context.addInitScript(() => {
      try {
        localStorage.setItem('issnuta_use_tf_v1', '1');
        localStorage.setItem('issnuta_notice_transformers_v1', '1');
      } catch {}
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /텍스트 번역/i })).toBeVisible();

    // Online: first translation triggers model download/cache
    await page.getByPlaceholder('번역할 텍스트').fill('안녕하세요');
    await page.getByRole('button', { name: '번역' }).click();
    await expect(page.getByRole('status')).toContainText(/\S/, { timeout: 120_000 });

    // Go offline and translate again (should hit local cache)
    await context.setOffline(true);
    await page.getByRole('button', { name: '번역' }).click();
    await expect(page.getByRole('status')).toContainText(/\S/, { timeout: 30_000 });
  });
});
}
