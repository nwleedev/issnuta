---
name: form-query-pattern
description: RHF와 TanStack Query 통합 전문가. 비동기 defaultValues, ensureQueryData/fetchQuery 패턴 적용 시 PROACTIVELY 사용.
tools: Read, Grep, Glob, Edit
model: inherit
---

# useForm defaultValues with Query Client (RHF × TanStack Query)

본 문서는 React Hook Form(RHF)에서 `useForm({ defaultValues })`에 비동기 함수를 전달하고, TanStack Query의 Query Client 메서드(`ensureQueryData`, `fetchQuery`)로 데이터를 불러와 기본값을 설정하는 베스트 패턴을 정리합니다. 본 프로젝트(Next.js 15 · React 19 · TS strict · Tailwind + DaisyUI · FSD)에 바로 적용 가능한 예시를 제공합니다.

주의: 아래 패턴은 RHF v7.43+의 "async defaultValues"와 `formState.isLoading`을 전제로 합니다. TanStack Query는 v5 기준입니다.

## 왜 이 패턴을 쓰나?

- Effect 없이 폼 초기값을 서버/캐시 데이터로 설정합니다(You might not need effect).
- 캐시가 있으면 즉시 사용, 없거나 오래되면 자동 조회하여 일관된 UX 제공.
- FSD에서 데이터 접근은 entities/api·keys로, 폼은 features/ui·model에 배치해 관심사를 분리합니다.

## ensureQueryData vs fetchQuery

- `queryClient.ensureQueryData({ queryKey, queryFn, staleTime? })`
  - 캐시에 "신선한" 데이터가 있으면 그대로 반환. 없거나 stale이면 `queryFn` 실행 후 캐시에 저장하고 반환.
  - 일반적인 기본값 로딩에 권장(불필요한 네트워크 호출 회피).
- `queryClient.fetchQuery({ queryKey, queryFn })`
  - 항상 네트워크 fetch를 실행(진행 중 동일 키 요청은 dedupe). 최신성이 중요한 경우 사용.

## 1) 클라이언트에서 비동기 defaultValues 설정(권장)

```tsx
"use client";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// entities-layer
import { imageKeys } from "@/entities/image/keys";
import { fetchSavedImageById } from "@/entities/image/api";

const EditSchema = z.object({
  name: z.string().min(1),
  format: z.enum(["png", "jpeg", "webp"]),
});

type EditForm = z.infer<typeof EditSchema>;

function toForm(dto: {
  name: string;
  format: "png" | "jpeg" | "webp";
}): EditForm {
  return { name: dto.name, format: dto.format };
}

export function EditImageForm({ id }: { id: string }) {
  const qc = useQueryClient();
  const methods = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    // 비동기 defaultValues: 캐시 우선, 없거나 stale이면 fetch
    defaultValues: async () => {
      const dto = await qc.ensureQueryData({
        queryKey: imageKeys.byId(id),
        queryFn: () => fetchSavedImageById(id),
        staleTime: 30_000,
      });
      return toForm(dto);
    },
    // 언마운트 시 값 유지(옵션 패널/시트에 유용)
    shouldUnregister: false,
    mode: "onChange",
  });

  const {
    formState: { isLoading },
    handleSubmit,
    register,
  } = methods;
  if (isLoading) return <div className="skeleton h-24 w-full" />;

  const onSubmit = (data: EditForm) => {
    // TODO: mutation으로 서버 반영
    console.log("apply", data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="form-control gap-3">
        <label className="label">
          <span className="label-text">이름</span>
        </label>
        <input className="input input-bordered" {...register("name")} />
        <label className="label">
          <span className="label-text">포맷</span>
        </label>
        <select className="select select-bordered" {...register("format")}>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
        <button className="btn btn-accent" type="submit">
          저장
        </button>
      </form>
    </FormProvider>
  );
}
```

포인트

- `formState.isLoading`로 초기 로딩 분기(스켈레톤/스피너 표시).
- 캐시가 있으면 렌더가 지연되지 않고 즉시 값이 설정됩니다.

## 2) 서버 프리패치 + 클라이언트 defaultValues 동기화(최소 네트워크)

서버 컴포넌트에서 미리 쿼리를 프리패치하고, 클라이언트에서 캐시를 동기式으로 읽다가, 없을 때만 `ensureQueryData`로 보강합니다.

```tsx
// app/(entries)/images/[id]/page.tsx (Server Component)
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";
import { fetchSavedImageById } from "@/entities/image/api";
import { EditImageForm } from "@/features/image-edit/ui/EditImageForm";

export default async function Page({ params }: { params: { id: string } }) {
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: imageKeys.byId(params.id),
    queryFn: () => fetchSavedImageById(params.id),
    staleTime: 30_000,
  });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <EditImageForm id={params.id} />
    </HydrationBoundary>
  );
}
```

```tsx
// features/image-edit/ui/EditImageForm.tsx (Client)
"use client";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { imageKeys } from "@/entities/image/keys";
import { fetchSavedImageById } from "@/entities/image/api";

export function EditImageForm({ id }: { id: string }) {
  const qc = useQueryClient();
  const methods = useForm<EditForm>({
    defaultValues: async () => {
      // 1) 서버 Hydration으로 채워진 캐시를 먼저 시도
      const cached = qc.getQueryData<
        Awaited<ReturnType<typeof fetchSavedImageById>>
      >(imageKeys.byId(id));
      if (cached) return toForm(cached);
      // 2) 없으면 ensureQueryData로 보강
      const dto = await qc.ensureQueryData({
        queryKey: imageKeys.byId(id),
        queryFn: () => fetchSavedImageById(id),
      });
      return toForm(dto);
    },
  });
  // ... 이하 동일
}
```

## 3) 최신성 우선: fetchQuery 사용 예

데이터 변이가 잦아 기본값으로도 항상 최신값이 필요하다면 `fetchQuery`로 강제 갱신합니다.

```ts
const dto = await qc.fetchQuery({
  queryKey: imageKeys.byId(id),
  queryFn: () => fetchSavedImageById(id),
});
return toForm(dto);
```

## 4) RHF Options 폼(우리 프로젝트)과의 통합 예

이미지 편집 옵션(배경/블러/포맷/품질)을 서버/스토리지에서 불러 기본값으로 설정합니다.

```tsx
"use client";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  OptionsSchema,
  OptionsFormValues,
} from "@/features/download/model/optionsSchema"; // 예시 경로
import { userKeys, fetchUserOptions } from "@/entities/userOptions/api"; // 예시 API

export default function OptionsSheet({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const methods = useForm<OptionsFormValues>({
    resolver: zodResolver(OptionsSchema),
    defaultValues: async () => {
      try {
        const data = await qc.ensureQueryData({
          queryKey: userKeys.options(userId),
          queryFn: () => fetchUserOptions(userId),
          staleTime: 60_000,
        });
        return data; // 서버 스키마가 폼 스키마와 일치할 때
      } catch {
        // 실패 시 스키마 기본값으로 폴백
        return OptionsSchema.parse({});
      }
    },
    shouldUnregister: false,
    mode: "onChange",
  });

  const {
    formState: { isLoading },
  } = methods;
  if (isLoading) return <div className="skeleton h-24 w-full" />;

  return (
    <FormProvider {...methods}>
      {/* BackgroundSection, DownloadSection 등 서브 섹션 배치 */}
    </FormProvider>
  );
}
```

## 5) 에러/로딩/권한 처리 베스트 프랙티스

- 로딩: `formState.isLoading`로 폼 UI를 잠시 대체(스켈레톤/스피너). 섹션별 프리셋이 있을 땐 일부 필드만 기본값 적용 후 나머지 필드 비활성화도 가능.
- 에러: `defaultValues` 프로미스가 reject되면 폼 초기화가 실패합니다. 위 예시처럼 try/catch로 스키마 기본값으로 폴백하거나, 상위에서 ErrorBoundary로 분기하세요.
- 권한/404: `ensureQueryData`에서 401/404가 발생하면 폴백 경로(리다이렉트/메시지)로 안내.

## 6) FSD 배치 가이드

- `entities/<domain>/keys.ts`: `userKeys.options(userId)` 같은 키 팩토리.
- `entities/<domain>/api.ts`: `fetchUserOptions(userId)` 등 HTTP 호출(공통 fetcher 사용).
- `features/<feature>/ui/*.tsx`: RHF 폼 컴포넌트(여기서 defaultValues async + Query Client).
- `features/<feature>/model/*`: 스키마/타입(또는 registry 문서에 정의된 스키마를 코드로 추출).

## 7) 체크리스트

- [ ] RHF v7.43+와 TanStack Query v5가 설치/구성되어 있음.
- [ ] Provider: `QueryClientProvider`가 `app/layout.tsx` 트리에 배치되어 있음.
- [ ] defaultValues는 `ensureQueryData`(캐시 우선) 또는 `fetchQuery`(최신성 우선)를 사용.
- [ ] `formState.isLoading`로 초기 로딩을 처리.
- [ ] 실패 시 스키마 기본값 폴백 또는 ErrorBoundary 분기.
- [ ] 키/쿼리 함수/스키마가 FSD 위치에 일관 배치됨.

---

Tip: 이미 라우트 서버 컴포넌트에서 프리패치를 수행한다면, 클라이언트 폼에서는 `getQueryData` → 없을 때만 `ensureQueryData` 순으로 접근해 네트워크 호출을 최소화하세요.
