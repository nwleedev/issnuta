---
name: tanstack-query-pattern
description: TanStack Query v5 전문가. 데이터 패칭, 캐싱, 무효화 전략 구현 시 PROACTIVELY 사용. Suspense와 Error Boundary 통합 패턴 제공.
tools: Read, Grep, Glob, Edit
model: inherit
---

# TanStack Query Patterns (2025 H2)

본 문서는 TanStack Query(v5) 베스트 프랙티스/패턴과 본 프로젝트(Next.js 15 · React 19 · TS strict · FSD)에서의 적용 방법을 정리합니다. 초기 단계는 무백엔드(클라 전용)이나, 추후 `app/api/*` 또는 외부 API 연동을 고려합니다.

## 1) 핵심 원칙

- 서버 주도 데이터만 관리: 서버/영속 출처의 데이터를 캐시/동기화. 순수 UI 상태는 컴포넌트/로컬 스토어(Zustand 등)로.
- 안정적 `queryKey`: 배열 기반, 도메인·파라미터를 정규화해 키 충돌 방지. 키는 생성기 헬퍼로 일원화.
- "Effect 지양": 데이터 획득/동기화는 `useQuery`/`useMutation`로 처리. 파생 계산은 렌더에서.
- 에러 경계 + 서스펜스: React 19에서 Suspense 기반 로딩, Error Boundary로 실패 격리.
- 일관된 Fetch 레이어: 공통 fetcher, 에러 포맷, 타임아웃/Abort, 재시도 규칙을 통일.

## 2) FSD 배치 전략

- shared/api
  - `http.ts`: 공통 fetcher, 에러 타입/파서, 타임아웃, 인증 헤더 등.
  - `queryKeys.ts`: 전역/공용 키 util(또는 도메인별 키 팩토리만 유지).
- entities/<domain>
  - `types.ts`: DTO/엔티티 타입, 파서/정규화.
  - `api.ts`: 도메인 API 클라이언트(HTTP 호출), 캐시-불가지.
- features/<feature>/model
  - `queries.ts`: `useXxxQuery` 훅(React Query), 키 생성기 import.
  - `mutations.ts`: `useXxxMutation` 훅, 낙관적 업데이트/무효화 규칙.
- entries
  - 조립/프리패치(Hydration). 서버/클라 경계 관리.

권장 의존: entries → features → entities → shared

## 3) Provider/Hydration(Next App Router)

- 클라이언트 Provider

```tsx
// app/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
// 개발 시: import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
```

- 레이아웃에 Provider 배치

```tsx
// app/layout.tsx
import { AppProviders } from "./providers";
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

- 서버 프리패치(선택): RSC에서 fetch로 데이터를 받아 children에 전달하거나, route handler에서 응답 생성. React Query Hydration은 `prefetchQuery` + `dehydrate`도 사용 가능하나, App Router에서는 RSC fetch가 단순.

## 4) 공통 Fetch 레이어(shared/api/http.ts)

```ts
export class HttpError extends Error {
  constructor(public status: number, public body?: unknown) {
    super(`HTTP ${status}`);
  }
}

export async function jsonFetch<T>(
  input: RequestInfo,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const controller = new AbortController();
  const id = init?.timeoutMs
    ? setTimeout(() => controller.abort(), init.timeoutMs)
    : null;
  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json")
      ? await res.json()
      : await res.text();
    if (!res.ok) throw new HttpError(res.status, body);
    return body as T;
  } finally {
    if (id) clearTimeout(id);
  }
}
```

## 5) Query Key 패턴(typed factory)

```ts
// entities/image/keys.ts
export const imageKeys = {
  all: () => ["image"] as const,
  list: (scope?: string) =>
    [...imageKeys.all(), "list", { scope: scope ?? "default" }] as const,
  byId: (id: string) => [...imageKeys.all(), "by-id", { id }] as const,
} as const;
```

- 객체 파라미터는 정렬된 키만 사용해 안정성 유지(여기서는 키 이름 고정).

## 6) 도메인 API + 타입

```ts
// entities/image/types.ts
export type ImageMetaDTO = {
  id: string;
  name: string;
  createdAt: string;
  width: number;
  height: number;
  format: "png" | "jpeg" | "webp";
};
export type ImageMeta = {
  id: string;
  name: string;
  createdAt: Date;
  size: { w: number; h: number };
  format: "png" | "jpeg" | "webp";
};
export const toImageMeta = (d: ImageMetaDTO): ImageMeta => ({
  id: d.id,
  name: d.name,
  createdAt: new Date(d.createdAt),
  size: { w: d.width, h: d.height },
  format: d.format,
});

// entities/image/api.ts
import { jsonFetch } from "@/shared/api/http";
export async function fetchSavedImages(): Promise<ImageMetaDTO[]> {
  return jsonFetch("/api/images");
}
export async function deleteImage(id: string): Promise<void> {
  await jsonFetch(`/api/images/${id}`, { method: "DELETE" });
}
export async function saveImage(payload: FormData): Promise<ImageMetaDTO> {
  // Payload 타입이 있어야 함
  return jsonFetch("/api/images", { method: "POST", body: payload as Payload });
}
```

## 7) Feature 훅(queries/mutations)

```ts
// features/gallery/model/queries.ts
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";
import { fetchSavedImages } from "@/entities/image/api";
import { toImageMeta } from "@/entities/image/types";

export function useSavedImages(
  scope?: string,
  opts?: Omit<UseQueryOptions, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: imageKeys.list(scope),
    queryFn: async () => (await fetchSavedImages()).map(toImageMeta),
    select: (data) =>
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    ...opts,
  });
}
```

```ts
// features/gallery/model/mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";
import { deleteImage, saveImage } from "@/entities/image/api";
import { toImageMeta } from "@/entities/image/types";

export function useDeleteImage(scope?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: imageKeys.list(scope) }),
  });
}

export function useSaveImage(scope?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fd: FormData) => toImageMeta(await saveImage(fd)),
    onSuccess: () => qc.invalidateQueries({ queryKey: imageKeys.list(scope) }),
  });
}
```

- 낙관적 업데이트가 유효할 때는 `onMutate`에서 `setQueryData`로 즉시 반영 + 실패 시 롤백.

## 8) Suspense + Error Boundary UI

```tsx
// features/gallery/ui/GalleryList.tsx
"use client";
import { useSavedImages, useDeleteImage } from "@/features/gallery/model";

export function GalleryList() {
  const { data } = useSavedImages(); // suspense 모드 사용 시 에러/로딩은 경계로 위임
  const del = useDeleteImage();
  return (
    <ul className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
      {data?.map((img) => (
        <li key={img.id} className="card bg-base-200">
          <div className="card-body">
            <div className="text-sm">{img.name}</div>
            <button
              className="btn btn-error btn-sm"
              onClick={() => del.mutate(img.id)}
            >
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- 엔트리에서 경계 배치

```tsx
// app/(entries)/page.tsx
import { Suspense } from "react";
import { GalleryList } from "@/features/gallery/ui/GalleryList";

export default function Home() {
  return (
    <main className="p-4">
      <Suspense fallback={<div className="skeleton h-24 w-full" />}>
        <GalleryList />
      </Suspense>
    </main>
  );
}
```

## 9) 키/무효화/리패칭 규칙

- 무효화는 리스트 키 단위: 생성/삭제/업데이트 후 `invalidateQueries({ queryKey: imageKeys.list(scope) })`.
- 상세-리스트 연계: 상세 업데이트 시 상세와 리스트 모두 무효화 또는 리스트에서 부분 패치.
- 재시도/재검증: 오류 유형 별 재시도 횟수 조절(4xx는 재시도 X, 네트워크/5xx만 재시도).

## 10) 성능/동시성

- `select`로 파생 데이터 계산, 컴포넌트에서의 재계산 최소화.
- `placeholderData: keepPreviousData`로 페이지네이션 전환 매끄럽게.
- `staleTime`으로 과도한 refetch 방지, 백그라운드 업데이트는 `refetchOnReconnect`/`refetchOnFocus` 필요 시만.
- 큰 응답은 DTO→엔티티 변환 후 필요한 필드만 저장.

## 11) 보안/안전

- 인증 토큰/민감 정보는 fetcher 레이어에서만 처리. 쿼리 키/캐시에 PII 저장 금지.
- 업로드는 `FormData` + 서버 검증. 미리보기 Blob URL은 별도 로컬 상태.

## 12) DevTools/퍼시스턴스(선택)

- 개발 시 DevTools로 캐시/키 확인.
- 오프라인 편집/임시 저장이 필요하면 `@tanstack/query-persist-client` + localStorage persister 고려(추후).

## 13) 서버 프리패치(대안 흐름)

- App Router에서는 RSC에서 `fetch`로 데이터를 받아 클라에 props로 전달하는 것이 단순합니다.
- React Query의 `prefetchQuery`/`dehydrate`를 사용할 경우, 서버에서 쿼리 클라이언트를 만들고, `HydrationBoundary`로 감쌉니다(복잡도↑). 초기에 RSC fetch를 우선 권장.

## 14) 예시 체크리스트

- [ ] QueryClientProvider + Hydration이 레이아웃에 배치됨.
- [ ] shared/api/http.ts로 fetch 규칙이 일원화됨.
- [ ] queryKey는 팩토리(imageKeys 등)로만 생성됨.
- [ ] features/\*/model에 queries/mutations 훅이 존재함.
- [ ] 엔트리에서 Suspense/ErrorBoundary로 로딩/오류를 격리함.
- [ ] 변이 후 무효화 규칙이 정의/일관 적용됨.
- [ ] 캐시에 PII가 없고, 인증/보안이 fetcher에서 캡슐화됨.

---

위 패턴을 기반으로 저장 이미지 갤러리/다운로드 이력 등 서버 데이터가 도입될 때 최소 변경으로 확장할 수 있습니다. 초기 무백엔드 단계에서는 features 쿼리 훅의 queryFn을 목 구현으로 두고, API가 준비되면 entities의 `api.ts`만 실제 호출로 교체하세요.

## 15) Best Examples: Server Prefetch(서버 프리패치)

```tsx
// app/(entries)/gallery/page.tsx (Server Component)
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";
import { fetchSavedImages } from "@/entities/image/api";
import { toImageMeta } from "@/entities/image/types";
import { GalleryList } from "@/features/gallery/ui/GalleryList"; // Client Component

export default async function Page() {
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: imageKeys.list("default"),
    queryFn: async () => (await fetchSavedImages()).map(toImageMeta),
    staleTime: 30_000,
  });
  const state = dehydrate(qc);
  return (
    <HydrationBoundary state={state}>
      {/* 내부는 클라이언트에서 즉시 캐시 사용 */}
      <GalleryList />
    </HydrationBoundary>
  );
}
```

## 16) Best Examples: 동시성(Parallel/Dependent Queries)

```tsx
// features/dashboard/model/queries.ts
import { useQueries, UseQueryResult } from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";
import { fetchSavedImages } from "@/entities/image/api";

export function useDashboardData(userId: string | null) {
  const results = useQueries({
    queries: [
      {
        queryKey: imageKeys.list("default"),
        queryFn: fetchSavedImages,
        select: (dtos: unknown[]) => dtos.length,
      },
      {
        // 의존 쿼리: userId 없으면 대기
        queryKey: ["user", { id: userId }],
        queryFn: ({ signal }) =>
          fetch(`/api/users/${userId}`, { signal }).then((r) => r.json()),
        enabled: !!userId,
      },
    ],
    combine: (res: UseQueryResult[]) => ({
      imagesCount: res[0].data as number | undefined,
      user: res[1].data as { id: string; name: string } | undefined,
      isPending: res.some((r) => r.isPending),
      isError: res.some((r) => r.isError),
    }),
  });
  return results;
}
```

```tsx
// fetch 취소/중복 방지: queryFn에서 AbortSignal 사용 (v5 컨텍스트)
import { useQuery } from "@tanstack/react-query";

function useProfile(id: string) {
  return useQuery({
    queryKey: ["profile", { id }],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/profile/${id}`, { signal });
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    staleTime: 60_000,
  });
}
```

## 17) Best Examples: invalidateQueries(정밀 무효화/부분 패치)

```ts
// features/image-edit/model/mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";

type UpdateNamePayload = { id: string; name: string };

export function useUpdateImageName(scope?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: UpdateNamePayload) => {
      const res = await fetch(`/api/images/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("update failed");
      return { id, name };
    },
    onSuccess: (data) => {
      // 상세만 부분 패치(있다면)
      qc.setQueryData<ImageMeta>(imageKeys.byId(data.id), (prev) =>
        prev ? { ...prev, name: data.name } : prev
      );
      // 리스트 무효화로 서버 소스 오브 트루스 반영
      qc.invalidateQueries({ queryKey: imageKeys.list(scope) });
    },
  });
}
```

## 18) Best Examples: Suspense Query(서스펜스 기반 로딩)

```tsx
// app/(entries)/page.tsx (Client wrapper 예시)
"use client";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

function Stats() {
  const { data } = useSuspenseQuery({
    queryKey: ["stats"],
    queryFn: async () => (await fetch("/api/stats")).json(),
    staleTime: 10_000,
  });
  return <div className="stat">총 이미지: {data.total}</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton h-10 w-full" />}>
      <Stats />
    </Suspense>
  );
}
```

## 19) Best Examples: Optimistic Update(낙관적 업데이트 + 롤백)

```ts
// features/gallery/model/mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";

type DeletePayload = { id: string; scope?: string };

export function useDeleteImageOptimistic(scope?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeletePayload) => {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      return { id };
    },
    onMutate: async ({ id }) => {
      // 진행 중 쿼리 취소 → 레이스 방지
      await qc.cancelQueries({ queryKey: imageKeys.list(scope) });
      // 스냅샷 저장
      const prev = qc.getQueryData<ImageMeta[]>(imageKeys.list(scope));
      // 낙관적 리스트 갱신
      qc.setQueryData<ImageMeta[]>(imageKeys.list(scope), (old) =>
        old ? old.filter((it) => it.id !== id) : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // 롤백
      if (ctx?.prev) qc.setQueryData(imageKeys.list(scope), ctx.prev);
    },
    onSettled: () => {
      // 서버 소스로 재검증
      qc.invalidateQueries({ queryKey: imageKeys.list(scope) });
    },
  });
}
```
