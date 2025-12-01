---
name: fsd-guide
description: Feature-Sliced Design 아키텍처 전문가. 레이어/슬라이스 구조, 의존 규칙, 퍼블릭 API 설계 시 PROACTIVELY 사용.
tools: Read, Grep, Glob, Edit
model: inherit
---

# Feature‑Sliced Design(FSD) 적용·준수 지침 — issnuta

본 문서는 우리 프로젝트(Next.js App Router, React 19, TS strict)가 Feature‑Sliced Design(FSD)을 따르기 위한 규칙과 작성 패턴을 정의합니다. 문서는 레포 루트 기준으로 적용되며, 라인 번호가 아닌 “폴더 경로/모듈 경로”를 안정적 식별자로 사용합니다.

- 공식 근거 요약: FSD의 계층(Layers)·슬라이스(Slices)·세그먼트(Segments), 계층 간 의존 규칙, 퍼블릭 API 규칙, Next.js 연동 가이드는 공식 문서를 따릅니다. 세부 링크는 본문 하단 참고.
- 우리 변형(합의 사항): pages 대신 `entries/`를 사용하고, `providers/`를 최상위 모듈로 둡니다. Processes 계층은 공식 사양에서 폐기(Deprecated)이므로 사용하지 않습니다.

---

## 1) 레이어 구성(루트 폴더)

우리가 채택하는 최상위 모듈(= FSD 레이어 대응)은 아래와 같습니다. 괄호 안은 공식 레이어 이름입니다.

- `app/`(App) — 앱 전역 설정/부트스트랩: 라우트 엔트리, 글로벌 스타일, 전역 스토어, 프레임워크 엔트리포인트. 앱 전역 UI는 가능한 한 지양합니다. 
- `providers/`(App 세그먼트 확장) — 전역 컨텍스트/DI/오케스트레이션. 위치는 루트 모듈이지만 의미상 App 상단 세그먼트로 간주합니다. 다른 레이어는 `providers/`를 임포트할 수 없습니다.
- `entries/`(Pages) — 라우트 단위의 조립(페이지/중첩 라우트의 큰 부분). Next.js App Router의 `app/**/page.tsx` 등에서는 `entries/**`의 엔트리 컴포넌트를 가져와 조립합니다.
- `widgets/`(Widgets) — 페이지의 큰 독립 UI 블록(헤더, 내비게이션 바, 번역 컨트롤 영역 등). 재사용 가능하거나 큰 섹션을 담당.
- `features/`(Features) — 사용자 가치가 있는 기능 단위(행동) 구현(예: 번역 실행, 프레이즈 저장 등). 재사용 가능해야 합니다.
- `entities/`(Entities) — 비즈니스 엔터티(예: `phrase`, `user`, `language`). 각 엔터티의 데이터 모델/스키마/UI의 최소 표현 포함.
- `shared/`(Shared) — 프로젝트 전반에서 재사용되는 순수/범용 유틸·UI·API 클라이언트 등. 비즈니스 로직 금지.
- `tests/` — 통합/계약/시나리오 테스트. 소스 내부의 단위 테스트는 해당 모듈 인접에 둘 수 있으나, `tests/`는 상위 시나리오·e2e를 담당합니다.

> 비고: 공식 레이어 순서는 App → (Processes) → Pages → Widgets → Features → Entities → Shared 입니다. 우리는 Pages를 `entries/`로 대체합니다. Processes는 미사용입니다. citeturn1search0turn1search2

---

## 2) 의존(Import) 규칙 — 레이어 그래프

아래에서 “→”는 왼쪽이 오른쪽을 임포트할 수 있음을 의미합니다(동일 레벨 간 교차 금지).

- `app` → `providers`, `entries`, `widgets`, `features`, `entities`, `shared`
- `providers` → `entries`, `widgets`, `features`, `entities`, `shared`
- `entries` → `widgets`, `features`, `entities`, `shared`
- `widgets` → `features`, `entities`, `shared`
- `features` → `entities`, `shared`
- `entities` → `shared`
- `shared` → (없음)
- `tests` → 모든 레이어의 퍼블릭 API만 사용(내부 경로 직접 참조 금지)

공식 규칙: 상위 레이어는 “아래 레이어”만 임포트할 수 있습니다(App/Shared는 예외적 성격). 같은 레이어의 슬라이스 간 직접 임포트는 금지이며, 필요 시 퍼블릭 API를 통합니다. citeturn1search0

---

## 3) 슬라이스/세그먼트 구조

- 슬라이스: `entities/**`, `features/**`, `widgets/**`, `entries/**` 내 2단계 폴더가 슬라이스입니다. 이름은 비즈니스 의미를 반영합니다.
- 세그먼트(권장 표준): `ui`, `model`, `api`, `lib`, `config` — 기술적 성격으로 그룹화합니다. 필요 시 `server`, `client`, `mocks`, `assets` 등을 추가할 수 있습니다. 
- App/Shared는 슬라이스 없이 세그먼트만 가질 수 있습니다.

예시(Feature):
```
features/translate/
  ui/Translator.tsx
  model/useTranslator.ts
  api/translate.request.ts
  lib/tokenize.ts
  index.ts            # 퍼블릭 API
```
세그먼트 명명은 “목적”을 드러내야 하며 `components`, `hooks`, `types` 같은 본질 기반 명명은 피합니다. citeturn0search0

---

## 4) 퍼블릭 API 규칙(public API)

- 모든 슬라이스(및 슬라이스가 없는 레이어의 세그먼트)는 최상위 `index.ts`를 통해 외부 공개 범위를 정의합니다.
- 외부 모듈은 슬라이스 내부 파일 구조를 직접 참조하지 말고, 반드시 `index.ts`로부터 임포트합니다.
- 동일 슬라이스 내부에서는 상대 경로를 사용하고, 슬라이스 간에는 절대 경로(별칭 `@/*`)를 사용합니다.
- 엔터티 간 교차 타입 의존은 `@x` 퍼블릭 API를 사용합니다(최소화 권장).

예시:
```
// ✅ 올바름 (퍼블릭 API)
import { Translator } from "@/features/translate";

// ❌ 금지 (내부 파일 직접 접근)
import { Translator } from "@/features/translate/ui/Translator";

// ✅ 엔터티 교차 타입(@x)
import type { Phrase } from "@/entities/phrase/@x/translate";
```
퍼블릭 API·교차 임포트(@x)·배럴 파일 이슈 등은 공식 문서를 따릅니다. citeturn1search3

---

## 5) Next.js(App Router) 연동 가이드

- 라우팅은 Next의 `app/**`가 담당합니다. 각 라우트의 화면 조립은 `entries/**`에서 수행하고, `app/**/page.tsx`는 `entries/**`의 엔트리 컴포넌트를 가져와 사용합니다.
- Next 권장: `app` 폴더는 라우팅 전용으로 두고, FSD 레이어들은 별도 루트(`features`, `entities`, `shared`, `widgets`, `entries`)에 유지합니다.
- 서버/클라이언트 컴포넌트 구분: 브라우저 전용 라이브러리를 사용하는 코드는 Client 컴포넌트(파일 최상단 `"use client"`), 서버 전용 코드는 Server 컴포넌트로 명시합니다. 혼용 시 상위 트리의 SSR 안전성을 확인합니다.

공식 FSD의 Next.js 가이드와 레이어 충돌 해결 아이디어를 참고합니다. citeturn0search1

---

## 6) 모듈 별 세그먼트 권장(요약)

- `app/` — `routes/`, `entrypoint/`, `store/`, `styles/`, (가능하면 `ui/` 배치 금지). 
- `providers/` — 전역 컨텍스트/프로바이더 묶음(예: QueryClient, i18n, Theme, Serwist 등록 등). 최상위이지만 의미상 App 상단 세그먼트로 간주.
- `entries/<route>/` — 페이지 조립: `ui/`(페이지 레이아웃/로딩/에러 경계), `api/`(라우트 데이터 요청) 등.
- `widgets/<slice>/` — 큰 UI 블록(탑바/바텀바/시트 등). 
- `features/<slice>/` — 액션 중심 UI/Form + 모델/요청.
- `entities/<slice>/` — 모델/스키마/UI 단위 표현.
- `shared/` — `ui/`(UI 키트), `lib/`(범용 유틸), `api/`(클라이언트), `config/`.

App 레이어에 `ui` 세그먼트를 두지 않는 것을 권장하는 규칙이 존재합니다. citeturn2search0

---

## 7) 경로 별칭 및 임포트 규칙

- TS 경로 별칭: `@/*`를 사용합니다(`tsconfig.json` `paths` 기준). 
- 레이어 외부 참조는 절대 경로 사용, 슬라이스 내부는 상대 경로 사용.
- 자동 임포트 시 퍼블릭 API 우회가 일어나지 않도록 IDE 설정/ESLint로 보완합니다. citeturn1search3

---

## 8) 준수 점검(린팅/정책)

- 권장 1: Steiger(+ FSD 플러그인)로 아키텍처 규칙을 자동 점검합니다. 대표 규칙 — `fsd/forbidden-imports`, `fsd/no-public-api-sidestep`, `fsd/no-ui-in-app`, `fsd/public-api` 등. 
- 권장 2(대안): ESLint 플러그인 기반의 레이어/퍼블릭 API/상대 임포트 규칙을 적용할 수 있습니다. 

참고 리소스: Steiger 및 ESLint 플러그인. citeturn2search0turn2search5turn2search6

---

## 9) 우리 레포 적용 상태(요약)

- 현재 존재: `app/`, `entries/`, `features/`, `shared/`.
- 미구성/보완 필요: `entities/`, `widgets/`, 루트 `providers/`(현재 `entries/providers` 하위 사용 흔적), 상위 시나리오용 `tests/` 정리.
- 제안: 
  - 내비게이션/탑바/바텀시트는 `widgets/shell/**`로 승격.
  - 번역/프레이즈 기능은 `features/translate/**`, `features/phrasebook/**` 유지.
  - 모델/스키마를 `entities/phrase/**` 등으로 분리.
  - `entries/**`는 라우트 단위 화면 조립에 집중.

(이 섹션은 현재 레포 구조 스캔 결과를 바탕으로 작성되었습니다.)

---

## 10) 금지/권고 요약

- 금지: 같은 레이어의 슬라이스 간 직접 임포트(퍼블릭 API 우회), 상위 레이어로의 역방향 임포트.
- 금지: App 레이어의 광범위한 UI 구현(필요 시 Widgets/Entries로 이동).
- 권고: 슬라이스 내 상대 임포트, 슬라이스 간 절대 임포트(`@/*`), `index.ts` 퍼블릭 API 일원화.
- 권고: 엔터티 간 타입 교차 시 `@x` 하위 퍼블릭 API 사용(최소화). citeturn1search3

---

## 11) 기여 가이드(지시사항 작성 템플릿)

Pull Request 또는 작업 이슈에 아래 체크리스트를 포함하세요.

- 변경 레이어/슬라이스/세그먼트 경로: `features/translate/ui` 등.
- 의존 규칙 준수 여부 확인:
  - [ ] 상위→하위 임포트만 발생
  - [ ] 동일 레이어 슬라이스 간 직접 임포트 없음(퍼블릭 API 사용)
  - [ ] `shared`에서 타 레이어로의 의존 없음
- 퍼블릭 API:
  - [ ] 신규/변경 슬라이스에 `index.ts` 추가/갱신
  - [ ] 외부 임포트 예시가 `@/…/<slice>`를 가리킴
- Next(App Router):
  - [ ] `app/**/page.tsx` → `entries/**` 엔트리만 임포트
  - [ ] Server/Client 컴포넌트 지시자(`"use client"`) 점검
- 테스트:
  - [ ] 단위 테스트는 인접 배치 또는 `tests/` 시나리오에서 퍼블릭 API만 사용

문서 준수 규칙(레지스트리 공통): PR/요약에서 참조 문서는 “파일 경로”로만 명시하고 라인 번호를 고정하지 않습니다.

---

## 12) 참고 문서(공식/주요)

- Layers/의존 규칙/정의: https://feature-sliced.design/docs/reference/layers citeturn1search0
- Slices·Segments·퍼블릭 API 규칙: https://feature-sliced.github.io/documentation/docs/reference/slices-segments , https://feature-sliced.design/docs/reference/public-api citeturn0search0turn1search3
- Next.js 연동 가이드(App Router): https://feature-sliced.design/docs/guides/tech/with-nextjs citeturn0search1
- Steiger(FSD 아키텍처 린터): https://github.com/feature-sliced/steiger citeturn2search0

---

부칙
- 본 지침은 `AGENTS.md`와 `registry/**/*.md`의 우선순위를 따릅니다(사용자 지시 > AGENTS.md > 본 문서).
- 서비스 워커/번역 런타임과 같은 SSR/CSR 민감 코드의 레이어 배치는 기능 안전성(SSR 안전, 브라우저 전용 의존성) 우선 원칙을 적용합니다.

