---
name: tdd-guide
description: TDD 전문가. 테스트 작성, 레드-그린-리팩터 사이클, Testing Library 패턴 적용 시 PROACTIVELY 사용. 접근성 우선 쿼리 제공.
tools: Read, Grep, Glob, Bash, Edit
model: inherit
---

# Test-Driven Development Guide (Offline Translator PWA)

본 문서는 본 프로젝트(Next.js 15 · React 19 · TS strict · Tailwind v4)의 테스트 주도 개발(TDD) 실천 지침을 정리합니다. Codex가 일관된 TDD 사이클을 유지하며 Phase별 요구사항을 안정적으로 달성하는 것을 목표로 합니다.

- 범위: 단위(Unit)·통합(Integration)·계약/아키텍처(Static)·E2E(최소) 테스트 운용
- 기준 문서: `AGENTS.md`, `FEATURES.md`, `TESTS.md`, `registry/ui-ux-guidelines.md`, `registry/features.md`, `registry/code-architecture.md`
- 공식 참고: nextjs.org/docs/app/building-your-application/testing, testing-library.com, vitest.dev, mswjs.io, playwright.dev, developer.mozilla.org(Canvas/Pointer Events)

---

## 1) TDD 핵심 사이클(레드–그린–리팩터)

- 레드: 실패하는 테스트를 먼저 작성합니다. 사용자 관점(역할/이름 기반 선택자) 또는 순수 로직의 기대 결과를 고정합니다.
- 그린: 통과에 필요한 최소 구현만 추가합니다. 외부 의존성은 모킹합니다.
- 리팩터: 중복 제거·명명 정리·FSD 경계 준수로 구조를 개선합니다. 테스트는 그대로 녹색 유지되어야 합니다.

권장 루프

1. 테스트 작성(실패 확인) → 2) 최소 구현(통과) → 3) 리팩터(통과 유지) → 4) 커밋

커밋 메시지(Conventional Commits)

- 예: `test(translate): add failing specs for translation length clamp`
- 예: `feat(preview): implement clamp + step to pass tests`
- 예: `refactor(preview): extract snap util from hook`

---

## 2) 테스트 기술 스택 및 설정

- 러너/환경: Vitest(jsdom) — `vitest.config.ts`, `tests/setup.ts`
- React 테스트: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- 접근성 검사: `jest-axe`
- 네트워크 모킹: `msw`(Node 모드) — `src/tests/msw.ts`
- 캔버스 모킹: `vitest-canvas-mock` + `toBlob` 폴리필(셋업 파일 포함)
- 아키텍처 규칙: `dependency-cruiser` — `architecture/depcruise.config.cjs`
- E2E: Playwright(핵심 시나리오 1개 중심)

명령

- 유닛/통합: `pnpm test` / `pnpm test:watch` / `pnpm test:ci`
- 아키텍처: `pnpm depcruise`(Node 22/24 권장 — Node 23 미지원)
- E2E: `pnpm e2e:browsers`(최초 1회), `pnpm test:e2e`

테스트 파일 배치(권장)

- 단위/통합: `features/**/__tests__/*.test.ts[x]`, `entities/**/__tests__/*.test.ts`
- 규칙/아키텍처: CI 단계에서 `pnpm depcruise`
- E2E: `e2e/*.spec.ts`

명명 규칙

- `describe`/`it`: 기능 단위 + 케이스 요약. 필요 시 `P{Phase}-TC{번호}`를 제목에 포함해 TESTS.md와 매핑.

---

## 3) FSD와 TDD의 결합

- entries: 라우트 조립만 — 테스트는 얕은 스냅샷/랜드마크/a11y 스모크 수준으로 제한.
- features: UI/훅/상호작용의 대부분을 테스트(통합/단위 중심).
- entities: 순수 로직/타입/키/메타 — 단위 테스트 비중이 가장 높음.
- shared: 유틸/토큰/공통 API — 순수성·불변을 강조, 테이블 기반 테스트 권장.

의존 방향 보호

- `entries → processes → features → entities → shared` 외 금지. 위반은 `pnpm depcruise`로 검출.

---

## 4) Phase별 TDD 시작점(요약)

- Phase 0–1: 랜드마크/안전영역/a11y 스모크부터(빠른 UI 스펙 고정).
- Phase 2–3: 업로드·ObjectURL·메타 추출을 테스트로 명세 → 최소 구현.
- Phase 4–7: 번역 입력/스왑/디바운스 핵심(접근성/상태/클램프)을 테스트로 고정.
- Phase 8–9: 배경 모드(단색/블러) DOM/스타일·강도 조절 테스트 우선.
- Phase 10–11: 캔버스 합성·toBlob·파일명 규칙을 순수 함수 + 스파이 테스트.
- Phase 12–13: 모바일 제스처/아키텍처 규칙을 테스트로 락인.
- Phase 14: 핵심 E2E 시나리오 1개(회귀 보호). 나머지는 유닛/통합에 위임.
- Phase 15–17: 성능 관련 단위(스로틀, 렌더 횟수), 문서/스니펫 타입체크.

세부 케이스: `TESTS.md` 참조.

---

## 5) UI 테스트 가이드(Testing Library)

원칙

- 접근성 우선: `getByRole()/getByLabelText()`를 기본 선택자로 사용.
- 사용자 관점: `userEvent`로 상호작용(클릭/포인터/키보드) 수행.
- 비동기: DOM 변화는 `await`/`findBy…` 또는 `waitFor`로 안정화.

강화 규칙(업데이트)

- 금지: `container.querySelector`, `element.querySelector`, 직접 DOM 접근. 필요 시 `within(container).getByRole(...)`를 사용합니다.
- 기본 쿼리 우선순위: 1) `getByRole(..., { name })` 2) `getByLabelText()` 3) `getByPlaceholderText`/`getByText`/`getByAltText`/`getByTitle` 4) 최후수단 `getByTestId`.
- 전역 우선: `screen.getBy*` 사용, 컨테이너 범위 좁힘은 `within` 사용.
- 장식 레이어/비상호작용 노드는 접근 가능한 이름을 제공해 탐색 가능하게 합니다(예: `title="배경 레이어"`).
- ESLint: 테스트 파일에서 `testing-library/no-node-access`와 `no-container` 위반은 에러입니다.

쿼리 치트시트(빠른 선택)

- 버튼/링크/토글: `getByRole('button'|'link'|'switch', { name: /라벨/ })`
- 입력/라디오/체크박스: `getByLabelText(/라벨/)`
- 이미지: `getByRole('img', { name: /대체텍스트/ })`
- 장식 레이어: `getByTitle('배경 레이어')`(접근 가능한 이름 부여 필수)

실패 시 대체 순서

- 우선 `getByRole`·`getByLabelText`를 시도 → 대체로 이름이 없다면 제품 코드에 접근 가능한 이름을 추가
- 불가피할 때 `getByText`/`getByTitle` 사용 → 마지막으로 `getByTestId`

DO / DON'T

```tsx
// DO: 역할+이름 기반
screen.getByRole("button", { name: /다운로드/i });

// DON'T: DOM 직접 접근(금지)
// const btn = container.querySelector('button.download');
```

샘플 — 업로드 입력(P2-TC2)

```tsx
import { render, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import React from "react";
import { UploadButton } from "@/features/upload/ui/UploadButton";

test("accepts image file and exposes preview-ready state", async () => {
  render(<UploadButton />);
  const input = screen.getByLabelText(/이미지 업로드/i) as HTMLInputElement;
  const file = new File([new Uint8Array([0])], "a.png", { type: "image/png" });
  await user.upload(input, file);
  expect(screen.getByText(/미리보기 준비됨/i)).toBeInTheDocument();
});
```

접근성 검사

```tsx
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

test("layout has no a11y violations", async () => {
  const { container } = render(<AppLayout />);
  expect(await axe(container)).toHaveNoViolations();
});
```

---

## 6) 입력/스왑/디바운스 테스트 패턴

핵심 목표: 번역 입력이 길이 제한을 준수하고, 언어 스왑/번역 트리거/디바운스 로직이 정확합니다.

셀렉터 정책

- 제품 코드(app/, features/, entities/, shared/, entries/)에는 `data-testid`를 부착하지 않습니다.
- 테스트는 역할/라벨 기반 쿼리를 우선 사용합니다. 불가피한 경우 테스트 하네스(테스트 전용 컴포넌트)에서만 `data-testid`를 사용합니다.

샘플 — useTranslator(P7-TC1~TC4)

```tsx
import { render, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import React from "react";
import { Translator } from "@/features/translate/ui/Translator";

test("swap languages and translate", async () => {
  render(
    <Translator>
      <Translator.Input />
      <Translator.Controls />
      <Translator.Output />
    </Translator>
  );

  // 입력
  await user.type(screen.getByPlaceholderText(/번역할 텍스트/i), "안녕하세요");
  // 스왑 → 번역
  await user.click(screen.getByRole("button", { name: /swap languages/i }));
  await user.click(screen.getByRole("button", { name: /번역/i }));

  // 결과 영역 상태 변화 확인(폴리트)
  expect(await screen.findByRole("status")).toHaveTextContent(/\S/);
});
```

길이 제한(P6-TC2)

```tsx
import { render, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import React from "react";
import { Translator } from "@/features/translate/ui/Translator";

test("input length is clamped to 300 chars", async () => {
  render(
    <Translator>
      <Translator.Input />
      <Translator.Controls />
      <Translator.Output />
    </Translator>
  );
  const ta = screen.getByPlaceholderText(
    /번역할 텍스트/i
  ) as HTMLTextAreaElement;
  const long = "x".repeat(600);
  await user.type(ta, long);
  expect(ta.value.length).toBeLessThanOrEqual(300);
});
```

---

## 7) 오프라인/캐시/업데이트 테스트 패턴

목표: 모델/토크나이저가 최초 온라인에서 캐시되고, 오프라인에서도 번역이 지속되며, 백그라운드 업데이트 적용이 안전합니다.

샘플 — 모델 캐시 및 오프라인 번역(P10~11)

```tsx
import { render, screen } from "@testing-library/react";
// PWA 컨텍스트 및 Service Worker 모킹은 테스트 하네스에서 처리(예: workbox-window 모킹)
test("translates while offline after initial cache", async () => {
  // 1) 온라인에서 모델 다운로드 완료 이벤트 시뮬레이션
  // 2) 오프라인 전환 후 동일 문장 번역 → 성공(로컬 캐시 사용)
});
import user from "@testing-library/user-event";
import { vi } from "vitest";

// toBlob 스파이 + URL 수명주기 스파이
const toBlob = vi.fn((cb) => cb(new Blob(["x"], { type: "image/jpeg" })));
// @ts-ignore
HTMLCanvasElement.prototype.toBlob = toBlob;

const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

render(<DownloadButton format="jpeg" quality={0.8} />);
await user.click(screen.getByRole("button", { name: /다운로드/i }));

expect(toBlob).toHaveBeenCalled();
expect(createSpy).toHaveBeenCalled();
expect(revokeSpy).toHaveBeenCalledWith("blob:url");
```

분리 전략

- 레이아웃 계산(contain/letterbox)은 순수 함수로 분리하여 단위 테스트.
- 캔버스 호출 순서/파라미터는 스파이로 검증.

---

## 8) 모킹/테스트 유틸 지침

- URL API: `vi.spyOn(URL, 'createObjectURL'|'revokeObjectURL')`
- 로컬 스토리지: `vi.spyOn(window.localStorage.__proto__, 'setItem'|'getItem')`
- matchMedia: `tests/setup.ts`에서 경량 스텁 제공
- 이미지 로딩: 필요 시 `Image.prototype.decode`/`onload`를 모킹해 동기 완료
- 네트워크: `src/tests/msw.ts`에 핸들러 추가 후 `server.use(...)`
- 캔버스: `vitest-canvas-mock` + `toBlob` 폴리필(셋업 파일 포함)

안정화 팁

- rAF: `vi.useFakeTimers()` + `vi.advanceTimersByTime(16)`
- user-event: 실제 사용자 시맨틱을 모방(`pointer`, `keyboard`)하고 타이밍은 `await`로 맞춤
- a11y: `jest-axe`는 컨테이너에 대해 1회 검사(지나치게 빈번한 호출 지양)

---

## 9) 아키텍처 규칙 TDD

- 규칙을 먼저 추가하여(금지 의존), 위반이 생기면 CI에서 즉시 실패합니다.
- 실행: `pnpm depcruise`
- Node 버전 제약: dependency-cruiser는 Node ^20.12 || ^22 || >=24 지원(현재 23.x는 미지원). CI/로컬 모두 LTS(22) 또는 최신(24) 권장.

---

## 10) CI 파이프라인 권장 순서

1. `pnpm install`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test:ci`
5. `pnpm depcruise`(Node 22/24 런타임에서)
6. `pnpm test:e2e`(선택/주기적)

초기에는 `test:ci`에 `--passWithNoTests`가 설정되어 있습니다. 테스트가 도입되면 제거하여 무테스트를 실패로 전환하세요.

---

## 11) 흔한 함정과 회피법

- 네트워크 경계: 오프라인/느린 연결 전환을 테스트로 고정합니다(`context.setOffline(true)`).
- 디바운스/지연: 입력 디바운스/버튼 상태를 테스트로 고정해 UX 회귀를 방지합니다.
- SSR/CSR 경계: 브라우저 전용 로직은 클라이언트 컴포넌트/훅에서만 사용하고, 테스트도 jsdom로 한정합니다.
- 셀렉터 불안정: `getByTestId` 남용 금지. 역할/이름 기반 셀렉터로 스펙을 고정합니다. 제품 코드에는 `data-testid` 부착 금지.

---

## 12) Phase 실행 체크리스트(샘플)

- P6(TranslatorControls)
  - [ ] `swap languages` 버튼/라벨 존재, 포커스 이동 정상
  - [ ] 번역 버튼 `disabled` 상태 토글(진행 중)
  - [ ] 입력 길이 제한/경고 표시
- P7(useTranslator)
  - [ ] 언어 스왑 시 상태/출력 초기화
  - [ ] 디바운스/버튼 트리거로 파이프라인 호출 1회 보장
  - [ ] 에러 시 폴백/토스트 표시
- P10–11(오프라인/PWA)
  - [ ] 최초 온라인에서 모델 캐시
  - [ ] 오프라인에서도 번역 가능(Cache Storage)
  - [ ] 백그라운드 업데이트 적용 토스트

---

## 13) 작업 흐름 예시(끝까지 TDD)

1. `features/translate/model/useTranslator.test.ts`에 실패 테스트 작성(P7-TC1~TC4)
2. 훅 최소 구현 → 통과 → 파이프라인 어댑터(브라우저/폴백)를 분리하여 리팩터
3. `features/translate/ui/TranslatorControls.test.tsx` 접근성/상태 테스트 → UI 구현
4. `features/pwa/model/modelCache.test.ts` 추가 → 모델 캐시/오프라인 동작 검증
5. Playwright로 온라인 최초 다운로드→오프라인 번역 시나리오 1개 작성(Phase 14)

이 가이드를 기반으로 모든 Phase는 “테스트로 스펙 고정 → 최소 구현 → 리팩터” 사이클을 준수하세요. 테스트 케이스의 상세 목록은 `TESTS.md`에 유지하며, 구현 계획은 `FEATURES.md`를 따릅니다.
