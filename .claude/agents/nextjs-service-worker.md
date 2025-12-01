---
name: nextjs-service-worker
description: Next.js PWA/Service Worker 전문가. Serwist 설정, 오프라인 캐시 전략, 모델 프리캐시 구현 시 PROACTIVELY 사용.
tools: Read, Grep, Glob, Bash, Edit
model: inherit
---

# Next.js PWA & 오프라인(Serwist) 지시사항

본 문서는 App Router(Next.js 15) 기반 프로젝트에서 Serwist를 이용해 서비스 워커를 빌드·등록하고, 오프라인 캐시 전략을 구성하는 방법을 규정합니다. 이 문서는 레포 루트 기준 경로와 파일명을 안정 식별자로 참조합니다(라인 번호 금지).

## 적용 범위

- 프레임워크: Next.js(App Router)
- 통합: `@serwist/next` + `serwist`
- 서비스 워커 소스: `app/sw.ts`
- 서비스 워커 번들 산출물: `public/sw.js`

## 목표

- PWA 설치 가능(Manifest)
- 오프라인 캐시(HTML/RSC/정적자원) 및 모델/런타임 아티팩트 캐시
- Dev 환경은 네트워크 우선(개발 루프 안전), Prod에서는 오프라인 동작 보장

---

## 1) 설치 및 준비

1. 패키지
   - `@serwist/next`(런타임+Next 플러그인), `serwist`(워커 SDK)
   - 이미 설치되어 있지 않다면:
     - `pnpm add @serwist/next && pnpm add -D serwist`

2. TS 구성(`tsconfig.json`)
   - 서비스 워커 타입을 활성화하고 Serwist 전역 타입을 추가합니다.
   - 권장 설정:

     ```json
     {
       "compilerOptions": {
         "types": [
           "@serwist/next/typings"
         ],
         "lib": [
           "dom",
           "es2022",
           "webworker"
         ]
       },
       "exclude": [
         "public/sw.js"
       ]
     }
     ```

3. Git 제외(`.gitignore`)
   - 빌드 산출물은 커밋하지 않습니다.
   - 규칙 예: `public/sw*`, `public/swe-worker*`

4. 보안 요건
   - 서비스 워커는 보안 컨텍스트(HTTPS)에서만 활성화됩니다. 로컬 개발은 `http://localhost` 예외가 적용됩니다.

---

## 2) Next.js 통합(`next.config.ts`)

- 기본 패턴(예: 레포의 `next.config.ts` 참고):

  ```ts
  import withSerwistInit from "@serwist/next";
  import type { NextConfig } from "next";

  const withSerwist = withSerwistInit({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    register: true,            // 자동 등록 (엔트리포인트에 주입)
    cacheOnNavigation: true,   // 라우팅 시 추가 캐시
    // scope: "/",            // 필요 시 SW 스코프 커스터마이즈
    // reloadOnOnline: true,   // 온라인 복귀 시 새로고침
  });

  const nextConfig: NextConfig = { /* 기존 설정 유지 */ };

  // 개발 중 빈번한 리빌드/캐시 간섭을 피하려면 프로덕션에서만 적용
  const isProd = process.env.NODE_ENV === "production";
  export default isProd ? withSerwist(nextConfig) : nextConfig;
  ```

- 참고
  - `register: true`면 서비스 워커 등록 코드가 자동 주입됩니다. 수동 등록이 필요하면 `register: false`로 두고 클라이언트 컴포넌트에서 `window.serwist.register()`를 호출하세요(아래 4) 참조).
  - 개발 모드에서는 Serwist의 기본 캐시가 네트워크 전용 동작을 사용하므로(오프라인 캐시 비활성화) 개발 루프에 영향이 적습니다. 프로덕션 빌드에서 오프라인 캐시가 활성화됩니다.

---

## 3) 서비스 워커 소스(`app/sw.ts`)

- 최소 템플릿(권장 시작점):

  ```ts
  import { defaultCache } from "@serwist/next/worker";
  import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
  import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkFirst, ExpirationPlugin } from "serwist";

  declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
      __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
  }

  declare const self: ServiceWorkerGlobalScope;

  const runtime = [
    // 예) 모델/토크나이저/ONNX 아티팩트 — 용량 크고 장기간 재사용
    {
      matcher: /\/models\//i,
      handler: new CacheFirst({
        cacheName: "mt-models",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 180 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
    {
      matcher: /\/ort\//i,
      handler: new CacheFirst({
        cacheName: "ort-runtime",
        plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 365 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
    // 정적 리소스
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: new CacheFirst({
        cacheName: "static-image-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
    {
      matcher: /\/_next\/static.+\.js$/i,
      handler: new CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
    {
      matcher: /\.(?:js)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
    {
      matcher: /\.(?:css|less)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    },
    // HTML/네비게이션 — 온라인 우선, 오프라인 시 캐시 폴백
    {
      matcher: /^https?.*/,
      handler: new NetworkFirst({ cacheName: "offlineCache", plugins: [new ExpirationPlugin({ maxEntries: 200 })] }),
    },
  ];

  const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    precacheOptions: { cleanupOutdatedCaches: true, concurrency: 10, ignoreURLParametersMatching: [/.*/], matchOptions: { ignoreSearch: true } },
    runtimeCaching: [...defaultCache, ...runtime],
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: false,
  });

  serwist.addEventListeners();
  ```

- 유의사항
  - 교차 출처(opaque) 응답은 `CacheFirst`로는 기본 미캐시일 수 있습니다. 교차출처 리소스는 `NetworkFirst`/`StaleWhileRevalidate`를 우선 고려하세요.
  - 대용량 리소스 캐시는 `ExpirationPlugin`으로 엔트리 수·보존 기간을 제한합니다.

---

## 4) 수동 등록(옵션)

- 자동 등록을 끄려면 `next.config.ts`에서 `register: false`로 설정하고, 다음과 같이 클라이언트 컴포넌트에서 등록합니다.

  ```tsx
  "use client";
  import { useEffect } from "react";

  export default function RegisterPWA() {
    useEffect(() => {
      if ("serviceWorker" in navigator && typeof window !== "undefined" && (window as any).serwist) {
        (window as any).serwist.register();
      }
    }, []);
    return null;
  }
  ```

---

## 5) 웹 앱 매니페스트

- App Router에서는 `app/manifest.json` 또는 `app/manifest.ts`를 사용합니다. 예시:

  ```ts
  // app/manifest.ts
  import type { MetadataRoute } from "next";
  export default function manifest(): MetadataRoute.Manifest {
    return {
      name: "issnuta",
      short_name: "issnuta",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#000000",
      icons: [
        { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
      ],
    };
  }
  ```

---

## 6) 개발/운영 동작 차이

- 개발(`pnpm dev`): Serwist 기본 `defaultCache`가 네트워크 전용으로 동작하므로 오프라인 캐시는 기대하지 않습니다.
- 운영(`pnpm build && pnpm start`): `public/sw.js`가 생성·서빙되며 오프라인 캐시가 활성화됩니다.

---

## 7) 테스트 체크리스트

1. 빌드/실행: `pnpm build && pnpm start`
2. DevTools Application 탭 → Service Workers: `public/sw.js` 등록 확인, `skipWaiting/clientsClaim` 상태 확인
3. Application → Cache Storage: `mt-models`, `ort-runtime`, `next-static-js-assets` 등 캐시 생성 확인
4. 네트워크 오프라인 전환 후 라우팅 및 번역 모델 사용 여부 확인

---

## 8) 트러블슈팅

- `app/sw.ts` 인식 실패
  - `next.config.ts`의 `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js" })`를 확인하세요.
  - 산출물(`public/sw.js`)이 빌드 후 존재하는지와, 실제로 루트 스코프(`/`)에서 서빙되는지 확인합니다.

- 서비스 워커 미등록
  - `register: true`가 비활성화되어 있거나, HTTPS가 아닌 경우입니다. 로컬이 아닌 배포 환경에서는 반드시 HTTPS로 접근하세요.
  - 과거 등록된 워커가 남아 있을 수 있습니다. DevTools → Application → Service Workers → `Unregister` 후 페이지 새로고침.

- 매니페스트 오류
  - `app/manifest.(json|ts)` 경로/응답이 200 JSON인지 확인합니다. 커스텀 라우팅/미들웨어가 매니페스트 경로를 가로채지 않도록 주의하세요.

---

## 9) 레포 의존 경로 상호작용

- `next.config.ts`: Serwist 플러그인 적용·옵션, 개발용 모델/ORT 리라이트(`rewrites`)
- `app/sw.ts`: 런타임 캐시 전략·프리캐시 옵션 정의
- `app/layout.tsx`: 메타데이터·테마 컬러·아이콘 등 헤드 메타(선택)
- `app/manifest.(json|ts)`: PWA 설치 정보
- `public/`: `sw.js`(빌드 산출물), 아이콘 파일

---

## 10) 권장 캐시 전략 요약

- 모델/런타임 바이너리: `CacheFirst` + `ExpirationPlugin`(엔트리/보존기간 제한)
- 정적 에셋(JS/CSS/이미지): `StaleWhileRevalidate`(일부 해시 정적 JS는 `CacheFirst`)
- HTML/네비게이션: `NetworkFirst`(오프라인 폴백 보장)

---

## 11) 보안·프라이버시 유의사항

- HTTPS 배포 및 SW 스코프 최소화(`scope` 옵션)
- 대용량 캐싱 전 사용자 동의·저장소 용량 점검 필요 시 Storage Manager API 검토

---

## 참고 파일(레포)

- `next.config.ts`
- `app/sw.ts`
- `app/layout.tsx`
- `app/manifest.(json|ts)`
- `public/sw.js`

---

## 변경 이력(문서)

- 2025-11-12: 초안 작성

