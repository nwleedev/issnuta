---
name: react-hook-form-pattern
description: React Hook Form 전문가. 폼 구현, 유효성 검증, Zod 스키마 통합 시 PROACTIVELY 사용. 비제어 입력 우선 패턴 제공.
tools: Read, Grep, Glob, Edit
model: inherit
---

# React Hook Form Patterns (2025 H2)

본 문서는 React Hook Form(RHF) 베스트 프랙티스/패턴과 본 프로젝트(Next.js 15 · React 19 · TS strict · Tailwind + DaisyUI)에서의 활용 방법을 정리합니다. 폼은 주로 옵션 편집(배경/포맷/품질 등)과 파일 업로드 검증에 사용합니다.

## 1) 핵심 원칙

- 비제어 입력 우선: RHF는 등록(`register`)을 통해 비제어 입력을 관리하므로 리렌더가 적고 성능 우수.
- 스키마 기반 검증: Zod + `@hookform/resolvers/zod`로 타입/검증 일치, 오류 메시지를 일원화.
- FormProvider로 분리/조립: `FormProvider` + `useFormContext`로 깊은 트리에 props drilling 없이 폼 상태 공유.
- Controller는 예외적으로: ref 미노출/완전 제어형(예: 써드파티 Select/Slider/DaisyUI 일부 컴포넌트)에만 `Controller` 사용.
- 언마운트 정책: 옵션 시트/탭 전환 시 필드는 `shouldUnregister: false`로 값 유지(또는 바텀시트를 언마운트하지 않음).
- 외부 스토어 연동: 최종 적용 시점에만 Zustand store 업데이트(불필요한 useEffect 지양, handleSubmit에서 커밋).

## 2) 설치/셋업(개념)

- 패키지: `react-hook-form` + `zod` + `@hookform/resolvers`.
- TS: 스키마로부터 `z.infer<typeof Schema>` 타입 생성.
- UI: DaisyUI의 `form-control`, `label`, `input`, `select`, `range`, `btn` 조합.

## 3) 스키마/폼 값 정의(본 프로젝트 옵션)

```ts
import { z } from "zod";

export const OptionsSchema = z.object({
  backgroundMode: z.enum(["solid", "blur"]).default("solid"),
  backgroundColor: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    .default("#111827"),
  blur: z
    .number()
    .min(0)
    .max(24)
    .default(12)
    .refine((v, ctx) => {
      const mode = ctx.parent?.backgroundMode;
      return mode === "blur" ? v >= 0 : true;
    }, "블러 모드일 때만 유효"),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
  quality: z.number().min(0).max(1).default(0.92), // jpeg/webp에만 의미
});

export type OptionsFormValues = z.infer<typeof OptionsSchema>;
```

## 4) useForm 생성/제공

```tsx
"use client";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function OptionsProvider({ children }: { children: React.ReactNode }) {
  const methods = useForm<OptionsFormValues>({
    resolver: zodResolver(OptionsSchema),
    defaultValues: OptionsSchema.parse({}),
    shouldUnregister: false,
    mode: "onChange", // 실시간 피드백(필요 시 onSubmit)
    criteriaMode: "firstError",
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}
```

## 5) DaisyUI + RHF 매핑 패턴

- 기본 입력: `register`와 `aria-invalid`, 에러 텍스트는 `.error` 또는 `helper` 영역에 연결.
- 셀렉트/토글: 네이티브 `select`/`input[type=checkbox|radio]` 우선. 커스텀 컴포넌트는 `Controller`.
- Range 슬라이더: `input[type=range]` 또는 DaisyUI `range` + `register`(number 변환은 `setValueAs`).

```tsx
import { useFormContext, Controller } from "react-hook-form";

export function BackgroundSection() {
  const {
    register,
    control,
    formState: { errors },
    watch,
  } = useFormContext<OptionsFormValues>();
  const mode = watch("backgroundMode");
  return (
    <div className="form-control gap-2">
      <label className="label">
        <span className="label-text">배경 모드</span>
      </label>
      <select
        className="select select-bordered"
        {...register("backgroundMode")}
      >
        <option value="solid">단색</option>
        <option value="blur">블러</option>
      </select>

      {mode === "solid" && (
        <>
          <label className="label">
            <span className="label-text">배경 색상</span>
          </label>
          <input
            type="color"
            className="input input-bordered h-10 p-1"
            {...register("backgroundColor")}
          />
          {errors.backgroundColor && (
            <p className="text-error text-sm" role="alert">
              {errors.backgroundColor.message}
            </p>
          )}
        </>
      )}

      {mode === "blur" && (
        <>
          <label className="label">
            <span className="label-text">블러 강도</span>
          </label>
          <input
            type="range"
            min={0}
            max={24}
            className="range"
            {...register("blur", { valueAsNumber: true })}
          />
        </>
      )}
    </div>
  );
}
```

## 6) 파일 업로드와 RHF

- 파일 입력은 네이티브 `input[type=file]` + `register('file')`로 검증만 수행하고, 실제 미리보기/상태는 feature 스토어(Zustand 등)로 이동.
- 검증 예: 타입/용량 제한, 이미지 디코드 시도 후 실패 처리.

```tsx
const FileSchema = z.object({
  file: z
    .instanceof(FileList)
    .refine((fl) => fl.length === 1, "하나의 이미지만 업로드")
    .refine(
      (fl) => /^(image\/)\w+/.test(fl[0]?.type ?? ""),
      "이미지 파일만 허용"
    )
    .refine((fl) => (fl[0]?.size ?? 0) <= 10 * 1024 * 1024, "최대 10MB"),
});

export function UploadField({ onValid }: { onValid: (file: File) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ file: FileList }>({ resolver: zodResolver(FileSchema) });
  return (
    <form
      onSubmit={handleSubmit(({ file }) => onValid(file[0]))}
      className="form-control gap-2"
    >
      <input
        type="file"
        accept="image/*"
        className="file-input file-input-bordered"
        {...register("file")}
      />
      {errors.file && (
        <p className="text-error text-sm" role="alert">
          {errors.file.message}
        </p>
      )}
      <button className="btn btn-primary" type="submit">
        업로드
      </button>
    </form>
  );
}
```

## 7) Controller가 필요한 경우

- DaisyUI 컴포넌트가 네이티브 입력을 래핑해 `ref` 전달이 불가하거나, 완전 제어형인 경우.
- 예: 커스텀 Select/Combobox, 색상 피커 라이브러리.

```tsx
<Controller
  name="quality"
  control={control}
  render={({ field }) => (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      className="range"
      {...field}
    />
  )}
/>
```

## 8) 폼 상태 → 기능 적용 흐름

- 바텀 시트/옵션 패널에서 `handleSubmit(apply)`로 최종 값 커밋 → 다운로드/프리뷰에 반영.
- 실시간 반영이 필요하면 `useWatch`로 특정 필드만 구독하고, 변경 시점에 feature 스토어로 동기화(Effect는 외부 시스템 동기화일 때만).

```tsx
const quality = useWatch<OptionsFormValues>({ name: "quality" });
// 필요 시 onChange 시그널만 store로 전달(불필요 리렌더 방지)
```

## 9) 다단/조건부 폼

- 조건부 필드는 `shouldUnregister: false`로 값 유지. 탭/시트 전환 시 값 손실 방지.
- 다단계의 경우 상위에 FormProvider를 유지하고, 스텝만 show/hide 처리.

## 10) 제출/에러 UX

- 제출 실패 시 첫 오류로 스크롤/포커스 이동: `methods.setFocus(path)`.
- 에러 메시지는 label과 시각적 관계를 유지하고, `role="alert"`/`aria-describedby`로 연결.

## 11) 성능 최적화

- `mode: 'onSubmit'`은 리렌더 최소화, `onChange`는 실시간 피드백용. 프로젝트 옵션 편집은 `onChange` 권장, 다운로드 직전 유효성 재확인.
- `useWatch({ name, exact: true })`로 필요한 필드만 구독(React 19 환경에서 불필요 리렌더 억제).
- `shouldUnregister: false`로 언마운트 시 값 유지. 대형 폼은 섹션별로 나눠 렌더.

## 12) 예시: 옵션 폼 + 적용

```tsx
"use client";
import { OptionsProvider, BackgroundSection } from "./OptionsSections";
import { useFormContext } from "react-hook-form";

function DownloadSection() {
  const { register, handleSubmit, watch } = useFormContext<OptionsFormValues>();
  const fmt = watch("format");
  const onApply = (v: OptionsFormValues) => {
    // 여기서 features/download로 커밋(예: zustand store 업데이트)
    // downloadStore.applyOptions(v)
  };
  return (
    <form onSubmit={handleSubmit(onApply)} className="form-control gap-3">
      <label className="label">
        <span className="label-text">포맷</span>
      </label>
      <select className="select select-bordered" {...register("format")}>
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
        <option value="webp">WebP</option>
      </select>

      {(fmt === "jpeg" || fmt === "webp") && (
        <>
          <label className="label">
            <span className="label-text">품질</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            className="range"
            {...register("quality", { valueAsNumber: true })}
          />
        </>
      )}

      <button type="submit" className="btn btn-accent">
        옵션 적용
      </button>
    </form>
  );
}

export default function OptionsSheet() {
  return (
    <OptionsProvider>
      <div className="p-4 grid gap-4">
        <BackgroundSection />
        <DownloadSection />
      </div>
    </OptionsProvider>
  );
}
```

## 13) 체크리스트

- [ ] 스키마(Zod)와 타입( infer )이 일치하고, 기본값은 스키마에서 파생.
- [ ] 네이티브 입력은 `register`, 제어형만 `Controller`.
- [ ] 옵션 시트 언마운트 시 값 유지(`shouldUnregister: false`) 또는 시트를 유지.
- [ ] 최종 적용은 `handleSubmit`에서 외부 스토어로 커밋(불필요한 useEffect 금지).
- [ ] 오류 표시/접근성 속성(aria-invalid, role=alert) 준수.
- [ ] 파일 입력은 검증만 RHF, 도메인 상태는 feature 스토어로 이동.

---

이 패턴을 기준으로 `features/download/ui`의 옵션 패널과 `features/upload/ui`의 업로드 검증을 구현하세요. 필요한 경우 공통 폼 프리미티브는 `shared/ui/form/*`로 추출합니다.
