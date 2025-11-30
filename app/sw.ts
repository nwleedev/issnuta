/*
 * Service Worker (Serwist) — Runtime caching for translation bucket
 * - Caches model/tokenizer/ONNX under `${BASE}/models/**`
 * - Caches ORT runtime files under `${BASE}/wasm/**`
 * - Includes Next defaultCache via @serwist/next/worker
 * - Falls back to cached responses on 5xx server errors
 */

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Compute BASE from env — prefer single var, otherwise compose from ORIGIN + BASE.
const DIRECT_BASE = (process.env.NEXT_PUBLIC_TRANSLATIONS_BASE ?? "").trim();
const ORIGIN = (process.env.NEXT_PUBLIC_STORAGE_ORIGIN ?? "").trim();
const BASE_PATH = (process.env.NEXT_PUBLIC_STORAGE_BASE ?? "").trim();

const JSEP_ORIGIN = (process.env.NEXT_PUBLIC_JSEP_ORIGIN ?? "").trim();
const JSEP_URL = (process.env.NEXT_PUBLIC_JSEP_URL ?? "").trim();
const JSEP_PATHNAME = (process.env.NEXT_PUBLIC_JSEP_PATHNAME ?? "").trim();

function computeBaseURL(): URL | null {
  try {
    if (DIRECT_BASE) return new URL(DIRECT_BASE);
    if (ORIGIN && BASE_PATH) {
      const origin = ORIGIN.replace(/\/+$/, "");
      const base = BASE_PATH.startsWith("/") ? BASE_PATH : `/${BASE_PATH}`;
      return new URL(`${origin}${base}`);
    }
  } catch {
    // ignore
  }
  return null;
}

const BASE_URL = computeBaseURL();

function computeJsepBaseURL(): URL | null {
  try {
    // 1) Absolute URL via JSEP_URL
    if (JSEP_URL && /^https?:\/\//i.test(JSEP_URL)) return new URL(JSEP_URL);

    // 2) ORIGIN + PATHNAME
    if (JSEP_PATHNAME && (JSEP_ORIGIN || ORIGIN)) {
      const origin = (JSEP_ORIGIN || ORIGIN).replace(/\/+$/, "");
      const path = JSEP_PATHNAME.startsWith("/")
        ? JSEP_PATHNAME
        : `/${JSEP_PATHNAME}`;
      return new URL(`${origin}${path}`);
    }
    // 폴백: 일반 BASE
    return BASE_URL;
  } catch {
    return BASE_URL;
  }
}

const JSEP_BASE_URL = computeJsepBaseURL();

/**
 * 5xx 서버 에러 시 캐시된 응답으로 폴백하는 플러그인
 * - fetchDidSucceed: 5xx 응답 시 에러를 throw하여 handlerDidError 트리거
 * - handlerDidError: 캐시에서 이전에 저장된 응답 반환
 */
const serverErrorFallbackPlugin = {
  fetchDidSucceed: async ({
    response,
    request,
  }: {
    response: Response;
    request: Request;
  }) => {
    if (response.status >= 500) {
      console.warn(
        `[SW] Server error ${response.status} for ${request.url}, falling back to cache`
      );
      throw new Error(`Server error: ${response.status}`);
    }
    return response;
  },
  handlerDidError: async ({ request }: { request: Request }) => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) {
      console.log(`[SW] Serving cached response for ${request.url}`);
      return cached;
    }
    // 캐시에 없으면 null 반환 (setCatchHandler로 위임)
    return null;
  },
};

const runtime = [
  // ORT runtime artifacts (.wasm/.jsep.mjs)
  {
    matcher: ({ url }: { url: URL }) => {
      const prefixes: string[] = [];
      if (BASE_URL) prefixes.push(`${BASE_URL.href.replace(/\/$/, "")}/wasm/`);
      if (JSEP_BASE_URL)
        prefixes.push(`${JSEP_BASE_URL.href.replace(/\/$/, "")}/wasm/`);
      return (
        prefixes.some((p) => url.href.startsWith(p)) ||
        /\/wasm\//i.test(url.pathname)
      );
    },
    handler: new CacheFirst({
      cacheName: "ort-wasm",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // Models/Tokenizer/ONNX
  // {
  //   matcher: ({ url }: { url: URL }) =>
  //     BASE_URL
  //       ? url.href.startsWith(`${BASE_URL.href.replace(/\/$/, "")}/models/`)
  //       : /\/models\//i.test(url.pathname),
  //   handler: new CacheFirst({
  //     cacheName: "mt-models",
  //     plugins: [
  //       new ExpirationPlugin({
  //         maxEntries: 50,
  //         maxAgeSeconds: 180 * 24 * 60 * 60,
  //         maxAgeFrom: "last-used",
  //       }),
  //     ],
  //   }),
  // },
];

// Static assets (images, css/js) — mild defaults
const fallback = [
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new CacheFirst({
      cacheName: "static-image-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: /\.(?:css|less)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-style-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: /\.(?:js)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-js-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // HTML/Navigation — online-first with offline fallback
  // 5xx 서버 에러 시 캐시된 응답으로 폴백
  {
    matcher: /^https?.*/,
    handler: new NetworkFirst({
      cacheName: "offlineCache",
      plugins: [
        new ExpirationPlugin({ maxEntries: 200 }),
        serverErrorFallbackPlugin,
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    concurrency: 10,
    ignoreURLParametersMatching: [/.*/],
    matchOptions: { ignoreSearch: true },
  },
  runtimeCaching: [...defaultCache, ...runtime, ...fallback],
  // 사용자 제어 업데이트: 자동 skipWaiting/clientsClaim 비활성화
  // 새 서비스 워커는 "waiting" 상태로 대기하고, 사용자가 업데이트를 승인하면 활성화
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: false,
});

/**
 * 전역 에러 핸들러 — 모든 전략 실패 시 최종 폴백 제공
 * - handlerDidError가 null을 반환한 경우 (캐시 미스)
 * - 네트워크 실패 + 캐시 미스
 */
serwist.setCatchHandler(async ({ request }) => {
  const dest = request.destination;

  // HTML 문서 요청 시 오프라인 페이지 반환
  if (dest === "document") {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // 프리캐시된 오프라인 페이지 반환
    const offlinePage = await serwist.matchPrecache("/offline");
    if (offlinePage) return offlinePage;

    console.warn(`[SW] No fallback for document: ${request.url}`);
  }

  // 스크립트/스타일 요청 시 캐시 반환
  if (dest === "script" || dest === "style") {
    const cached = await caches.match(request);
    if (cached) return cached;
  }

  return Response.error();
});

serwist.addEventListeners();

/**
 * 클라이언트 메시지 핸들러 — 사용자 제어 업데이트 지원
 * - SKIP_WAITING: 사용자가 업데이트를 승인하면 waiting 상태의 서비스 워커를 활성화
 * - 오프라인 상태에서 캐시 무효화를 방지하기 위해 사용자 명시적 동의 필요
 */
type SkipWaitingMessageEvent = Omit<ExtendableMessageEvent, "data"> & {
  data: { type: "SKIP_WAITING" };
};
self.addEventListener("message", (event: SkipWaitingMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
