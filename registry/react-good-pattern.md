# React + TypeScript Good Patterns (2025 H2)

본 문서는 본 프로젝트(Next.js 15 · React 19 · TS strict)에서 권장하는 타입스크립트-리액트 베스트 프랙티스/패턴을 요약합니다. FSD 구조(entries/processes/features/entities/shared)와 일치하도록 설계합니다.

## 1) TypeScript 기본 원칙

- `strict` 유지, `any` 지양. 외부값은 `unknown` → 내로잉.
- `satisfies`로 구성 객체의 타입 안전 검증, `as const`로 리터럴 불변화.
- 컴포넌트 타입: `React.FC` 지양, `({ ... }: Props) => JSX.Element` 선호. `children`은 필요 시 명시(`React.ReactNode`).
- 이벤트 타입: `React.ChangeEvent<HTMLInputElement>`, `React.PointerEvent<HTMLDivElement>` 등 구체 타입 사용.
- `useRef`는 초기값에 따라 `RefObject<T | null>` 또는 `useRef<T|null>(null)`로 선언.
- 유니온 분기에는 판별 속성(discriminated union)을 사용해 안전한 스위칭.
- 공용 유틸은 `shared/lib`, 타입은 `shared/types`, 상수는 `shared/config`에 배치.

## 2) 컴포넌트 구조/FSD 정렬

- entries는 얇은 조립만 담당. 상호작용/상태는 `features/*/ui|model|lib`로 이동.
- 도메인 모델은 `entities/*/model`, 재사용 UI는 `shared/ui`에 위치.
- 훅 네이밍은 `useXxx`, 컴포넌트는 PascalCase, 유틸은 lowerCamelCase.
- props는 최소화하고, 로직은 콜로케이션(근접 배치) 원칙.

## 3) 컴파운드 컴포넌트 패턴(번역 도메인)

컨테이너가 번역 상태/행위를 컨텍스트로 제공하고, 서브컴포넌트(Input/Controls/Output)가 이를 소비합니다.

```tsx
// features/translate/ui/Translator.tsx
"use client";
import * as React from "react";

type Lang = "ko" | "en" | "ja";
type TranslatorContextValue = {
  src: Lang;
  tgt: Lang;
  text: string;
  setText: (v: string) => void;
  result: string;
  isTranslating: boolean;
  swap: () => void;
  translate: () => Promise<void>;
};

const TranslatorCtx = React.createContext<TranslatorContextValue | null>(null);
const useTranslator = () => {
  const ctx = React.useContext(TranslatorCtx);
  if (!ctx) throw new Error("Translator.* must be used within <Translator>");
  return ctx;
};

export function Translator({ children }: { children?: React.ReactNode }) {
  const [src, setSrc] = React.useState<Lang>("ko");
  const [tgt, setTgt] = React.useState<Lang>("en");
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState("");
  const [isTranslating, setBusy] = React.useState(false);

  const swap = () => {
    setSrc(tgt);
    setTgt(src);
    setResult("");
  };
  const translate = React.useCallback(async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      // 실제 구현에서는 Transformers.js 파이프라인을 주입해 사용
      // 예: const pipe = await getPipeline(`${src}-${tgt}`);
      // const out = await pipe(text);
      const out = `[${src}->${tgt}] ` + text; // placeholder
      setResult(out);
    } finally {
      setBusy(false);
    }
  }, [text, src, tgt]);

  const value = React.useMemo(
    () => ({ src, tgt, text, setText, result, isTranslating, swap, translate }),
    [src, tgt, text, result, isTranslating]
  );
  return (
    <TranslatorCtx.Provider value={value}>{children}</TranslatorCtx.Provider>
  );
}

Translator.Input = function Input() {
  const { text, setText, isTranslating } = useTranslator();
  return (
    <textarea
      className="textarea textarea-bordered w-full"
      placeholder="번역할 텍스트"
      value={text}
      onChange={(e) => setText(e.target.value)}
      disabled={isTranslating}
    />
  );
};

Translator.Controls = function Controls() {
  const { src, tgt, swap, translate, isTranslating } = useTranslator();
  return (
    <div className="flex items-center gap-2">
      <span className="badge" aria-label="source">
        {src}
      </span>
      <button
        className="btn btn-ghost btn-sm"
        onClick={swap}
        aria-label="swap languages"
      >
        ↔︎
      </button>
      <span className="badge" aria-label="target">
        {tgt}
      </span>
      <button
        className="btn btn-primary ml-auto"
        onClick={translate}
        disabled={isTranslating}
      >
        번역
      </button>
    </div>
  );
};

Translator.Output = function Output() {
  const { result, isTranslating } = useTranslator();
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-12 whitespace-pre-wrap"
    >
      {isTranslating ? "번역 중…" : result}
    </div>
  );
};
```

## 4) Zustand + React Context(SSR 안전, 드릴링 방지)

글로벌 단일 스토어 대신 “프로바이더당 스토어 인스턴스” 패턴으로 SSR/동시 렌더링 안전을 확보합니다.

```ts
// shared/lib/store.ts
import { createStore, StoreApi } from "zustand/vanilla";

export type TranslationState = {
  src: "ko" | "en" | "ja";
  tgt: "ko" | "en" | "ja";
  text: string;
  result: string;
  isTranslating: boolean;
  setLangs: (
    src: TranslationState["src"],
    tgt: TranslationState["tgt"]
  ) => void;
  setText: (v: string) => void;
  setResult: (v: string) => void;
  setBusy: (v: boolean) => void;
};
export type TranslationStore = StoreApi<TranslationState>;

export const createTranslationStore = (init?: Partial<TranslationState>) =>
  createStore<TranslationState>((set) => ({
    src: init?.src ?? "ko",
    tgt: init?.tgt ?? "en",
    text: init?.text ?? "",
    result: init?.result ?? "",
    isTranslating: init?.isTranslating ?? false,
    setLangs: (src, tgt) => set({ src, tgt, result: "" }),
    setText: (v) => set({ text: v }),
    setResult: (v) => set({ result: v }),
    setBusy: (v) => set({ isTranslating: v }),
  }));
```

```tsx
// features/translate/model/TranslatorProvider.tsx
import * as React from "react";
import { createTranslationStore, TranslationStore } from "@/shared/lib/store";
import { useStore } from "zustand";

const Ctx = React.createContext<TranslationStore | null>(null);
export const useTranslationStore = <T,>(sel: (s: unknown) => T) => {
  const api = React.useContext(Ctx);
  if (!api)
    throw new Error(
      "useTranslationStore must be used within <TranslatorProvider>"
    );
  return useStore(api, sel);
};

export function TranslatorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = React.useRef<TranslationStore>();
  if (!storeRef.current) storeRef.current = createTranslationStore();
  return <Ctx.Provider value={storeRef.current}>{children}</Ctx.Provider>;
}
```

- 이점
  - props 드릴링 없이 어디서든 `useTranslationStore((s) => s.text)` 등 선택적 구독.
  - 프로바이더마다 별도 인스턴스 → 테스트/중첩/격리 용이.
  - SSR 안전(zustand/vanilla + Provider).

## 5) Controllable State(제어/비제어 동시 지원)

컴포넌트가 `value`/`defaultValue`/`onChange`를 동시에 지원하여 재사용성을 높입니다.

```ts
// shared/lib/useControllableState.ts
import * as React from "react";

type Params<T> = { value?: T; defaultValue?: T; onChange?: (v: T) => void };
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: Params<T>) {
  const [uncontrolled, setUnc] = React.useState<T | undefined>(defaultValue);
  const isCtrl = value !== undefined;
  const state = isCtrl ? (value as T) : (uncontrolled as T);
  const setState = React.useCallback(
    (v: T) => {
      if (!isCtrl) setUnc(v);
      onChange?.(v);
    },
    [isCtrl, onChange]
  );
  return [state, setState] as const;
}
```

## 6) 성능/리렌더 최적화

- 파생값은 계산식으로, 중복 상태 지양. 무거운 계산만 `useMemo`.
- 핸들러는 필요 시 `useCallback`; 상태 저장 대신 `useRef`로 뮤터블 값 관리.
- 상태 범위를 좁게: 큰 컴포넌트 분리, Zustand 셀렉터로 미세 구독, 리스트는 가상화.
- 드래그/스크롤 루프는 rAF/쓰로틀; 레이아웃 스래싱 방지(읽기→쓰기 순서 유지).

## 7) 비동기/Suspense/에러 경계

- Next App Router: 서버 컴포넌트 기본, 클라이언트 상호작용만 `use client`.
- 클라이언트 데이터는 SWR/React Query 도입 전 Web API/단순 캐싱을 우선 검토.
- `error.js`/에러 바운더리로 실패 격리, Suspense로 지연 UI 제공.

## 8) 접근성 패턴(A11y)

- 라벨/역할/상태를 명시(예: `role="separator" aria-orientation`), 포커스 스타일 유지/보강.
- 키보드 경로 보장(Tab/Shift+Tab/화살표), 터치 타겟 ≥ 44×44px.

## 9) 테스트/유지보수

- 순수 함수(`lib`)를 우선 테스트. UI는 역할 기반 셀렉터 사용.
- 컴포넌트는 작은 책임으로 분리하고, 변경은 slice 단위로 좁게.

## 10) 번역 유틸 패턴(요약)

언어 스왑/디바운스/클립보드 등 번역 UI에 특화된 경량 훅입니다.

```ts
// shared/lib/useSwapLanguages.ts
export function useSwapLanguages<T extends string>() {
  return (a: T, b: T) => [b, a] as const;
}
```

```ts
// shared/lib/useDebounced.ts
import * as React from "react";
export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
```

이 문서의 패턴은 `features/translate`, `features/phrasebook`, `features/download` 구현에 바로 적용 가능합니다. 필요 시 예시 코드를 실제 컴포넌트로 스캐폴딩하겠습니다.

## 11) You Might Not Need useEffect(불필요한 useEffect 줄이기)

- 원칙: Effect는 "React밖의 시스템과 동기화"가 필요할 때만 사용합니다(타이머/구독/DOM API/스토리지/로그 등). 렌더만으로 가능한 일은 렌더 단계에서 처리하세요.

- 파생 상태는 렌더에서 계산하기

  - Bad
    ```tsx
    const [fullName, setFullName] = useState("");
    useEffect(() => setFullName(`${first} ${last}`), [first, last]);
    ```
  - Good
    ```tsx
    const fullName = `${first} ${last}`; // 혹은 useMemo(first/last가 무거울 때)
    ```

- 이벤트로 일어난 일은 이벤트 핸들러에서 처리

  - Bad: 값 변경을 Effect에서 감지해 처리
    ```tsx
    const [count, setCount] = useState(0);
    useEffect(() => {
      log("changed", count);
    }, [count]);
    ```
  - Good: 변경을 유발한 핸들러에서 처리
    ```tsx
    const onInc = () => {
      setCount((c) => {
        const n = c + 1;
        log("changed", n);
        return n;
      });
    };
    ```

- 데이터 패칭은 서버 컴포넌트/라우트 우선(Next App Router)

  - 페이지/엔트리에서는 서버 컴포넌트에서 패칭하고, 클라이언트 상호작용이 필요할 때만 클라이언트 훅 사용.
  - 클라이언트에서 패칭이 꼭 필요하면 라이브러리(SWR/React Query)나 커스텀 훅에 캡슐화하고, AbortController/경쟁 상태 취소를 포함.

- 로컬 스토리지: 초기 읽기는 useState 이니셜라이저, 쓰기는 이벤트 시점에

  - Bad
    ```tsx
    const [value, setValue] = useState("");
    useEffect(() => localStorage.setItem("k", value), [value]);
    ```
  - Good
    ```tsx
    const [value, setValue] = useState(() => localStorage.getItem("k") ?? "");
    const onSave = () => localStorage.setItem("k", value); // 저장이 필요한 순간에만
    ```

- URL 동기화: Effect 대신 라우터 API 사용

  - 검색/옵션 변경 시 바로 `router.replace({ query })` 같은 이벤트 기반 업데이트를 사용하고, 초기 상태는 쿼리에서 파싱하여 useState 초기값으로.

- 외부 스토어 구독은 `useSyncExternalStore`/전용 훅 사용

  - Zustand 등은 전용 훅을 사용해 구독/해제를 캡슐화. 컴포넌트에서 Effect 불필요.

- DOM 조작/포커스: 가능하면 속성으로, 불가하면 Effect 최소화

  - `autoFocus`/`focus()`는 마운트 직후 1회만 필요. 의존성 배열을 빈 배열로 유지하고, 조건부 포커스는 키로 remount하는 방식도 고려.

- 비싼 계산/포맷팅은 useMemo, 변경 불필요 참조는 useRef

  - Effect로 setState하여 캐시하지 말고, 메모이제이션/참조로 해결.

- 타이머/인터벌은 Effect가 맞지만, 상태 변경 원인은 이벤트로 이동

  - 예: "N초 후 닫기"는 Effect로 타이머 설치 + 클린업, 하지만 닫힘 처리/로그는 이벤트(타이머 콜백) 내부에서.

- SSR/클라이언트 구분: 레이아웃 측정은 `useLayoutEffect`(클라 전용)로 제한적으로

  - 서버에서 실행되지 않도록 해당 컴포넌트를 클라이언트로 분리(`"use client"`).

- 체크리스트(Effect 필요한지 자문)
  - [ ] 외부 시스템과 동기화가 필요한가? 아니면 렌더에서 계산 가능한가?
  - [ ] setState로 파생 값을 복제하고 있지 않은가?
  - [ ] 이벤트로 옮길 수 있는 부수효과인가?
  - [ ] 초기 읽기는 useState 이니셜라이저로 가능하지 않은가?
  - [ ] 구독/타이머에는 올바른 클린업이 있는가?
