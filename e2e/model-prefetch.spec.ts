import { test, expect } from "@playwright/test";

test.describe("Offline model prefetch opt-in", () => {
  test("service worker registers and button is visible", async ({ page }) => {
    await page.goto("/");
    // Wait for SW ready (Serwist registers in production by plugin)
    await page.waitForFunction(() => 'serviceWorker' in navigator);
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
    await expect(page.getByRole('button', { name: /오프라인 모델 저장/i })).toBeVisible();
  });

  test("prefetch-model enables caching and stores file.svg in model cache", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => 'serviceWorker' in navigator);
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));

    // Ask SW to prefetch a tiny local file to avoid large downloads
    const completed = await page.evaluate(() => {
      type PrefetchComplete = { type: 'prefetch-complete'; total: number; done: number };
      type PrefetchError = { type: 'prefetch-error'; message: string };
      return new Promise<boolean>(async (resolve) => {
        const reg = await navigator.serviceWorker.ready;
        const sw = navigator.serviceWorker.controller || reg.active;
        if (!sw) return resolve(false);
        const mc = new MessageChannel();
        mc.port1.onmessage = (ev) => {
          const m: unknown = ev.data;
          if (m && (m as PrefetchComplete).type === 'prefetch-complete') return resolve(true);
          if (m && (m as PrefetchError).type === 'prefetch-error') return resolve(false);
        };
        sw.postMessage({ type: 'prefetch-model', urls: ['/file.svg'] }, [mc.port2]);
      });
    });
    expect(completed).toBeTruthy();

    // Verify via SW query message instead of direct CacheStorage access
    const hit = await page.evaluate(async () => {
      type HasCacheResult = { type: 'has-cache-result'; url: string; cache: string; hit: boolean };
      const reg = await navigator.serviceWorker.ready;
      const sw = navigator.serviceWorker.controller || reg.active;
      if (!sw) return false;
      return new Promise<boolean>((resolve) => {
        const mc = new MessageChannel();
        mc.port1.onmessage = (ev) => {
          const d: unknown = ev.data;
          if (d && (d as HasCacheResult).type === 'has-cache-result' && (d as HasCacheResult).url === '/file.svg') {
            resolve(!!d.hit);
          }
        };
        sw.postMessage({ type: 'has-cache', cache: 'models', url: '/file.svg' }, [mc.port2]);
      });
    });
    expect(hit).toBeTruthy();
  });
});
