/*
 * Service Worker (Serwist) — Runtime caching for translation bucket
 * - Caches model/tokenizer/ONNX under `${BASE}/models/**`
 * - Caches ORT runtime files under `${BASE}/wasm/**`
 * - Includes Next defaultCache via @serwist/next/worker
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
      const path = JSEP_PATHNAME.startsWith("/") ? JSEP_PATHNAME : `/${JSEP_PATHNAME}`;
      return new URL(`${origin}${path}`);
    }
    // 폴백: 일반 BASE
    return BASE_URL;
  } catch {
    return BASE_URL;
  }
}

const JSEP_BASE_URL = computeJsepBaseURL();

const runtime = [
  // ORT runtime artifacts (.wasm/.jsep.mjs)
  {
    matcher: ({ url }: { url: URL }) => {
      const prefixes: string[] = [];
      if (BASE_URL) prefixes.push(`${BASE_URL.href.replace(/\/$/, "")}/wasm/`);
      if (JSEP_BASE_URL) prefixes.push(`${JSEP_BASE_URL.href.replace(/\/$/, "")}/wasm/`);
      return prefixes.some((p) => url.href.startsWith(p)) || /\/wasm\//i.test(url.pathname);
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
  {
    matcher: /^https?.*/,
    handler: new NetworkFirst({
      cacheName: "offlineCache",
      plugins: [new ExpirationPlugin({ maxEntries: 200 })],
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
  runtimeCaching: [...defaultCache, ...runtime],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
});

serwist.addEventListeners();
