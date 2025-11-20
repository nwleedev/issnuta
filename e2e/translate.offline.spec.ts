import { test, expect } from '@playwright/test'

// E2E: Verify local NLLB model prefetch + offline translation works.
// Assumes the app is running at http://localhost:3000 and that
// public/models/Xenova/nllb-200-distilled-600M and public/wasm/* exist.

test.describe('KO↔JA 번역 (오프라인 캐시 + WASM)', () => {
  test.setTimeout(15 * 60 * 1000)

  test('모델 프리페치 → 온라인 번역 → 오프라인 번역', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Service Worker/offline flow is most stable on Chromium')

    // 1) 홈 진입
    await page.goto('http://localhost:3000/')

    // 2) SW 준비 대기(dev/prod 모두 대응)
    await page.waitForFunction(() => 'serviceWorker' in navigator)
    await page.waitForFunction(
      () => 'serviceWorker' in navigator && !!(navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker?.ready,
      { timeout: 30_000 }
    )
    await page.waitForFunction(
      () => 'serviceWorker' in navigator && !!(navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker?.controller,
      { timeout: 30_000 }
    ).catch(() => {})

    // 3) 모델 프리페치
    const prefetchBtn = page.getByRole('button', { name: '오프라인용 모델 다운로드' })
    await prefetchBtn.click()
    await expect(page.getByText(/다운로드 중/i)).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText(/모델 다운로드 완료/i)).toBeVisible({ timeout: 15 * 60 * 1000 })

    // 4) 온라인 번역(일→한)
    await page.getByPlaceholder('번역할 문장을 입력하세요').fill('こんにちは。はじめまして。')
    await page.getByRole('button', { name: '번역' }).click()
    await expect(page.getByRole('heading', { name: '결과' })).toBeVisible({ timeout: 120_000 })
    const onlineOut = await page.locator('pre').innerText()
    expect(onlineOut).toMatch(/[가-힣]/)

    // 5) 오프라인 전환 후 번역(일→한)
    await context.setOffline(true)
    await page.getByPlaceholder('번역할 문장을 입력하세요').fill('おはようございます')
    await page.getByRole('button', { name: '번역' }).click()
    const offlineOut = await page.locator('pre').innerText()
    expect(offlineOut).toMatch(/[가-힣]/)
  })
})
