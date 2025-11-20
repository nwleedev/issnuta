/**
 * 프리페치 실행 유틸리티
 * - HEAD로 Content-Length 수집(가능 시)
 * - fetch → Cache.put으로 교차 출처 리소스도 캐시(필요 시 no-cors)
 * - 동시성 제한 + 진행률 콜백
 */

import { buildAllURLs, getBaseURL } from "./urls";

export type Progress = {
  done: number;
  total: number;
  doneBytes?: number;
  totalBytes?: number;
  current?: { url: string };
};

export type PrefetchOptions = {
  concurrency?: number; // default 4
  signal?: AbortSignal;
  onProgress?: (p: Progress) => void;
  cacheNames?: { ort?: string; model?: string; default?: string };
};

export type PrefetchInput = {
  ort: string[];
  model: string[];
};

export type PrefetchResult = {
  ok: string[];
  fail: Array<{ url: string; reason: string }>;
  bytes: { done: number; total?: number };
  counts: { done: number; total: number };
};

// Note: Transformers.js uses a fixed browser cache named 'transformers-cache'.
// To avoid re-fetching tokenizer/config after prefetch, store model artifacts there.
const DEFAULT_CACHE = {
  ort: "ort-wasm",
  model: "transformers-cache", // was 'mt-models'
  default: "offline-runtime",
} as const;

/**
 * HEAD 요청으로 Content-Length 수집(가능한 항목만)
 */
export async function headSizes(
  urls: string[],
  opts: { signal?: AbortSignal } = {}
): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "HEAD",
          mode: "cors",
          cache: "no-store",
          redirect: "follow",
          signal: opts.signal,
        });
        const len = res.headers.get("content-length");
        if (res.ok && len) {
          const n = Number(len);
          if (!Number.isNaN(n)) sizes.set(url, n);
        }
      } catch {
        // ignore — 교차 출처 HEAD 실패나 CORS 미지원
      }
    })
  );
  return sizes;
}

/**
 * 캐시에 이미 존재하는지 확인(있으면 스킵)
 */
async function isCached(url: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const match = await caches.match(url);
    return !!match;
  } catch {
    return false;
  }
}

/**
 * URL에 적합한 캐시 이름 결정
 */
function pickCacheName(url: string, names: Required<typeof DEFAULT_CACHE>) {
  if (/\/wasm\//i.test(url)) return names.ort;
  if (/\/models\//i.test(url)) return names.model;
  return names.default;
}

/**
 * 단일 URL 프리페치 후 Cache.put
 * - 우선 cors로 시도 → 실패 시 no-cors(opaque)로 재시도
 */
async function prefetchToCache(
  cacheName: string,
  url: string,
  opts: { signal?: AbortSignal }
): Promise<void> {
  if (typeof caches === "undefined") {
    throw new Error(
      "CacheStorage를 사용할 수 없습니다(브라우저 컨텍스트 필요)."
    );
  }
  // 이미 캐시된 경우 스킵
  if (await isCached(url)) return;

  const cache = await caches.open(cacheName);

  // 1) CORS 시도
  try {
    const req = new Request(url, { mode: "cors" });
    const res = await fetch(req, { signal: opts.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await cache.put(req, res.clone());
    return;
  } catch {
    // 2) no-cors(opaque) 폴백
    const req = new Request(url, { mode: "no-cors" });
    const res = await fetch(req, { signal: opts.signal });
    // opaque 응답은 ok=false이지만 Cache.put 가능
    await cache.put(req, res.clone());
  }
}

/**
 * 간단한 동시성 실행기
 */
async function runPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  onItemDone?: () => void
): Promise<T[]> {
  const results: T[] = [];
  const exec = async (i: number): Promise<void> => {
    if (i >= tasks.length) return;
    const task = tasks[i]!; // i < tasks.length ensures task exists
    const r = await task();
    results[i] = r;
    onItemDone?.();
    await exec(i + concurrency);
  };
  const starters = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    (_, k) => exec(k)
  );
  await Promise.all(starters);
  return results;
}

/**
 * 프리페치 실행(ORT + 모델)
 */
export async function runPrefetch(
  input: PrefetchInput,
  options: PrefetchOptions = {}
): Promise<PrefetchResult> {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const names = { ...DEFAULT_CACHE, ...(options.cacheNames ?? {}) } as Required<
    typeof DEFAULT_CACHE
  >;

  const all: Array<{ url: string; cache: string }> = [];
  for (const u of input.ort) all.push({ url: u, cache: names.ort });
  for (const u of input.model) all.push({ url: u, cache: names.model });

  const total = all.length;
  let done = 0;
  const ok: string[] = [];
  const fail: Array<{ url: string; reason: string }> = [];

  // 바이트 합계 추산(옵션)
  let doneBytes = 0;
  let totalBytes: number | undefined;
  try {
    const sizes = await headSizes(
      all.map((x) => x.url),
      { signal: options.signal }
    );
    const sum = Array.from(sizes.values()).reduce((a, b) => a + b, 0);
    totalBytes = sum > 0 ? sum : undefined;
  } catch {
    // ignore
  }

  const tasks = all.map(({ url, cache }) => async () => {
    try {
      await prefetchToCache(cache, url, { signal: options.signal });
      ok.push(url);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      fail.push({ url, reason });
    }
  });

  const update = () => {
    done += 1;
    options.onProgress?.({
      done,
      total,
      doneBytes,
      totalBytes,
      current: undefined,
    });
  };

  await runPool(tasks, concurrency, update);

  return {
    ok,
    fail,
    bytes: { done: doneBytes, total: totalBytes },
    counts: { done, total },
  };
}

/**
 * BASE와 modelId를 받아 전체 프리페치를 수행하는 헬퍼
 */
export async function prefetchAllForModel(
  modelId: string,
  opts: PrefetchOptions = {}
): Promise<PrefetchResult> {
  const base = getBaseURL();
  const { ort, model } = buildAllURLs(base, modelId);
  return runPrefetch({ ort, model }, opts);
}
