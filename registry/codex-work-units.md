# Codex Work Units — issnuta 전용 작업 분할 가이드

본 문서는 이 레포지터리에서 **Codex(LLM 기반 코딩 어시스턴트)를 사용할 때의 작업 단위(work unit) 규칙**을 정의합니다.  
목표는 다음과 같습니다.

- 토큰/맥락 제한과 `AGENTS.md`의 **“한 번에 한 파일”** 제약을 지키면서도
- 변경을 **작고 명확한 단위**로 쪼개어 품질·리뷰 난이도·롤백 용이성을 높이고
- `registry/**/*.md`에서 정의된 FSD·모바일 디자인·테스트·서비스워커 가이드와 **충돌 없이** 협업하는 것

---

## 1. 공통 원칙

### 1-1. 한 작업 = 하나의 책임 + 하나의 파일

- 하나의 Codex 작업은 **정확히 한 파일**만을 대상으로 합니다.
- 그 파일 안에서도 가능한 한 **하나의 책임(변경 이유)** 에 집중합니다.
  - 예: “`features/offline/prefetch.ts`에서 언어쌍별 프리패치 전략 개선”처럼 변경 목적이 한 줄로 설명되어야 합니다.
- 여러 책임이 섞인 “빅 리팩터링”은 **여러 차례의 Codex 작업으로 나누어** 순차적으로 진행합니다.

이 원칙은 **단일 책임 원칙(SRP)** 과 **작은 변경 단위(atomic change)** 에 기반합니다.  
일반적으로 작은 변경 단위는 코드 리뷰·버그 추적·롤백이 쉬워 품질에 유리합니다.

### 1-2. 변경 유형을 섞지 않는다

한 작업에서 **기능 추가 / 리팩터링 / 버그 수정 / 테스트 추가** 를 섞지 않도록 합니다.

- O: “`features/settings/ui/OptionsForm.tsx`에 새 옵션 섹션 하나 추가 (기능 추가 전용)”
- O: “`shared/lib/translator.ts` 내부 구조 리팩터링 (기능은 그대로 유지)”
- O: “`features/status/ui/RuntimeBadge.spec.tsx`에 새로운 케이스만 추가 (테스트 전용)”
- X: “기능 추가 + 리팩터링 + 테스트 구조까지 전부 변경”

여러 유형이 동시에 필요하다면, **파일 단위와 변경 유형을 조합해 작업을 나눈 후 Codex에 순차적으로 요청**합니다.

### 1-3. 공개 API와 호환성 고려

- FSD 규칙(`registry/feature-sliced-design.md`)에 따라, Codex 작업 단위도 **퍼블릭 API(모듈 경로)** 를 기준으로 나눕니다.
- 특정 파일이 다른 모듈의 퍼블릭 API 역할을 한다면:
  - 해당 파일의 **외부 인터페이스는 가능하면 보존**하고
  - 내부 구현 세부사항만 하나의 작업으로 변경하는 것을 우선합니다.

---

## 2. 작업 유형별 권장 단위

아래는 이 레포 구조(`app/`, `entries/`, `widgets/`, `features/`, `shared/`, `tests/`, `e2e/`, `registry/` 등)를 기준으로 Codex에 맡기기 좋은 **대표 작업 유형별 “한 파일 단위” 예시**입니다.

### 2-1. 구현·리팩터링 (UI/비즈니스 로직)

- **앱 셸 / PWA**
  - 예: `app/layout.tsx`, `app/providers.tsx`, `app/sw.ts`, `app/manifest.ts`
  - 작업 예시
    - `app/sw.ts`: 번역 모델/토크나이저 프리캐시 정책 개선 (`registry/nextjs-service-worker.md` 참고)
    - `app/layout.tsx`: 모바일 세이프 영역/배경/폰트 설정을 디자인 템플릿에 맞게 정리

- **도메인/스토리지/번역 파이프라인 (`shared/`)**
  - 예: `shared/model/translation.ts`, `shared/storage/translation-store.ts`, `shared/storage/issnuta-db.ts`, `shared/lib/translator.ts`, `shared/lib/feeds-storage.ts`
  - 작업 예시
    - `shared/lib/translator.ts`: 로컬 번역(Transformers.js/ONNX)과 원격 번역을 추상화하는 인터페이스 정리
    - `shared/storage/translation-store.ts`: IndexedDB/로컬스토리지 구조를 오프라인 전략에 맞게 리팩터링

- **오프라인 모델/프리패치 기능 (`features/offline/`, `shared/offline/`)**
  - 예: `shared/offline/model-urls.ts`, `features/offline/urls.ts`, `features/offline/prefetch.ts`, `features/offline/check.ts`, `features/offline/useOfflineModelReady.ts`
  - 작업 예시
    - `features/offline/prefetch.ts`: 언어 방향별 프리패치 전략/에러 처리 개선
    - `features/offline/useOfflineModelReady.ts`: 오프라인 준비 상태 판별 로직 정리

- **핵심 번역 UI / 위젯 (`widgets/`, `features/translate/`)**
  - 예: `widgets/translator/ui/UniversalTranslatorPanel.tsx`, `features/translate/ui/UniversalTranslator.tsx`, `features/translate/model/useUniversalTranslator.ts`, `features/translate/ui/LanguagePairSelector.tsx`
  - 작업 예시
    - `widgets/translator/ui/UniversalTranslatorPanel.tsx`: 16개 언어 지원 번역 패널 레이아웃/상호작용 정리
    - `features/translate/ui/UniversalTranslator.tsx`: 번역 UI 컴포넌트 구조/접근성 개선

- **셸/내비게이션/상태 표시 (`features/shell/`, `features/status/`, `features/sheet/`)**
  - 예: `features/shell/ui/TopAppBar.tsx`, `features/shell/ui/BottomNav.tsx`, `features/status/ui/RuntimeBadge.tsx`, `features/sheet/ui/BottomSheet.tsx`
  - 작업 예시
    - `features/status/ui/RuntimeBadge.tsx`: 런타임(브라우저/오프라인/원격) 상태 배지 표시 개선
    - `features/shell/ui/BottomNav.tsx`: 모바일 내비게이션 패턴에 맞는 구조/접근성 반영

- **폼/설정/프레이즈북 (`features/settings/`, `features/phrasebook/`)**
  - 예: `features/settings/ui/OptionsForm.tsx`, `features/phrasebook/ui/PhraseForm.tsx`
  - 작업 예시
    - `features/settings/ui/OptionsForm.tsx`: 오프라인 번역 품질/속도/캐시 정책을 제어하는 옵션 섹션 추가
    - `features/phrasebook/ui/PhraseForm.tsx`: RHF + Query 패턴에 맞게 폼 구조 정리 (`registry/react-hook-form-pattern.md`, `registry/use-form-with-query-client-pattern.md` 참고)

### 2-2. 공용 UI 프리미티브 / 디자인 시스템 (`shared/ui/`, `shared/lib/`)

- 예: `shared/ui/button.tsx`, `shared/ui/input.tsx`, `shared/ui/textarea.tsx`, `shared/ui/select.tsx`, `shared/ui/card.tsx`, `shared/ui/sheet.tsx`, `shared/ui/drawer.tsx`, `shared/ui/toast.tsx`, `shared/ui/skeleton.tsx`, `shared/ui/spinner.tsx`, `shared/lib/utils.ts`, `shared/lib/use-toast.ts`
- 작업 예시
  - `shared/ui/button.tsx`: variant/size/상태/포커스 스타일을 통일하고, 접근성 규칙을 반영
  - `shared/ui/sheet.tsx`: 모바일 바텀시트 모션/제스처/세이프 영역 반영 (`registry/mobile-design-baseline.md`, `registry/better-mobile-design.md` 참고)

### 2-3. 테스트/QA (`*.spec.tsx`, `e2e/`)

- 단위/통합 테스트
  - 예: `features/status/ui/RuntimeBadge.spec.tsx`
  - 작업 예시
    - 해당 파일 안에서만 케이스를 추가/정리 (구현 파일 수정은 별 작업)

- e2e 테스트
  - 예: `e2e` 폴더의 개별 스펙 파일들 (`registry/e2e-test-pattern.md` 참고)
  - 작업 예시
    - 하나의 e2e 스펙 파일에 “오프라인 번역 Happy Path” 시나리오 추가

테스트 파일 하나에서 **여러 시나리오를 추가하는 것은 허용**되지만, 되도록 “하나의 사용자 여정” 단위로 묶어 작성합니다.

### 2-4. 설계/리뷰/분석 전용 작업

코드를 수정하지 않고 **설계/리뷰/분석만 하는 경우에도 “한 번에 한 파일” 규칙을 그대로 적용**합니다.

- 예: `shared/lib/translator.ts`의 설계 리뷰만 요청
  - 이 파일 안에서: 책임 분리, 의존 관계, 퍼블릭 API, 예외 처리, 오프라인/온라인 경로 설계 등을 분석
  - 관련된 다른 파일(`features/translate/*`, `shared/storage/*` 등)을 인용하더라도, **실제 분석 결과·리팩터링 제안은 지정된 한 파일 범위 안에서만** 작성

- 예: `widgets/translator/ui/TranslatorPanel.tsx`의 UX/구조 분석만 요청
  - 이 파일 내부에서: 레이아웃/상태/하위 컴포넌트 조합/접근성을 검토
  - 개선 제안은 “해당 파일 안에서의 구조 변경”을 기준으로 제안

여러 파일이 얽힌 아키텍처 이슈는 **여러 번의 Codex 작업으로 순차적으로 리뷰**합니다.  
예를 들어, 번역 파이프라인 전체를 보고 싶다면 다음과 같이 나눕니다.

1. `shared/lib/translator.ts` 설계 리뷰
2. `features/translate/ui/UniversalTranslator.tsx` 설계/UX 리뷰
3. `widgets/translator/ui/UniversalTranslatorPanel.tsx` 설계/UX 리뷰

각 단계는 독립된 Codex 작업(하나의 파일)으로 요청합니다.

### 2-5. 문서/레지스트리 작업 (`registry/*.md`)

- 새 가이드/규칙을 문서화할 때도 **한 번에 한 파일**만 생성·수정합니다.
- 예: 지금 보고 있는 `registry/codex-work-units.md`처럼,
  - “하나의 주제(예: Codex 작업 단위 가이드)”를
  - 한 문서 안에서 완결되게 다룹니다.

기존 레지스트리 문서의 내용이 부족하거나 확장 필요 시:

- 새 항목을 추가하기보다는 **새 문서를 만들고 서로 보완 관계**를 명시하는 것을 우선합니다.
- 예: `registry/remote-translations-bucket.md`가 이미 있을 때,
  - “로컬 NMT 모델 캐싱 전략”은 별도의 문서에서 다루고,
  - 두 문서 간 참조 관계만 명시.

---

## 3. 큰 기능을 Codex 작업 단위로 쪼개는 방법

아래는 실제로 자주 나올 법한 요구사항을, Codex 관점에서 **여러 작업 단위(한 번에 한 파일)** 로 나누는 예시입니다.

### 3-1. 예시: “오프라인 번역 UX 전반을 개선하고 싶다”

가능한 분할 전략:

1. `features/offline/ui/OfflineSetup.tsx`
   - 오프라인 모델 다운로드 UI, 진행률, 경고 문구 개선
2. `features/offline/prefetch.ts`
   - 프리패치 로직, 에러/재시도 정책 개선
3. `features/offline/useOfflineModelReady.ts`
   - “준비 완료” 상태 판별 로직 정교화
4. `app/sw.ts`
   - 서비스워커 캐시 전략과 라우팅 정책 개선

각 단계마다 Codex에 **“파일 경로 + 작업 유형 + 목표”** 를 명시해 별도 작업으로 요청합니다.

### 3-2. 예시: “새 번역 옵션(속도/품질 프리셋)을 추가하고 싶다”

가능한 분할 전략:

1. `features/settings/ui/OptionsForm.tsx`
   - 새 필드 추가, 유효성 검증, UI/UX 반영
2. `shared/model/translation.ts`
   - 번역 옵션 도메인 모델 확장
3. `shared/lib/translator.ts`
   - 번역 파이프라인이 새 옵션을 해석하고 사용하는 방식 반영
4. 관련 테스트 파일 (예: `features/status/ui/RuntimeBadge.spec.tsx` 또는 별도 테스트 파일)
   - 옵션 변화에 따른 기대 동작 검증 추가

각 단계는 **다른 턴의 Codex 작업**으로 진행하며, 매번 딱 하나의 파일만 수정합니다.

---

## 4. Codex에게 작업을 요청할 때의 체크리스트

Codex가 이 문서의 원칙을 최대한 잘 활용하도록, 작업을 요청할 때는 아래 정보를 함께 제공하는 것을 권장합니다.

1. **목표(Goal)**  
   - 예: “오프라인 번역 준비 UI를 명확하게 하고, 진행 상황을 보여주고 싶다”

2. **대상 파일(Path)** — 반드시 **하나의 파일만 지정**  
   - 예: ``features/offline/ui/OfflineSetup.tsx``

3. **작업 유형(Type)**  
   - 기능 추가 / 리팩터링 / 버그 수정 / 테스트 추가 / 설계 리뷰 / 문서 작성 등

4. **제약 사항(Constraints)**  
   - 예: “퍼블릭 API 변경 금지”, “SSR-safe 유지”, “모바일 디자인 가이드/서비스워커 가이드 준수”

5. **성공 기준(Acceptance Criteria)**  
   - 예: “오프라인 상태에서도 번역 버튼이 비활성화되지 않고, 준비 여부에 따라 명확한 상태 배지를 보여줄 것”

이 정보를 명시하면, Codex는 **한 번에 한 파일**이라는 제약 안에서도, 이 레포의 FSD/디자인/테스트/오프라인 전략을 최대한 활용해 안정적인 변경을 수행할 수 있습니다.

---

## 5. 유지·보수 규칙

- 이 문서(`registry/codex-work-units.md`) 자체를 수정할 때도 **한 번에 한 명령(목적)** 으로 변경합니다.
  - 예: “테스트 작업 단위 섹션 보강”, “설계 리뷰 섹션 추가”처럼 목적을 분리
- 레포 구조가 변하거나 새로운 레이어/폴더가 생기면:
  - 해당 변경이 특정 폴더에만 영향을 주는 경우, **그 폴더에 대한 Codex 작업 단위 예시를 이 문서에 추가**합니다.

이 규칙들을 따르면, Codex는 토큰 제약과 파일 단위 제약 속에서도 **작고 예측 가능한 변경**을 반복적으로 제공할 수 있고, 사람 개발자는 이를 안전하게 조합해 큰 기능을 완성할 수 있습니다.

