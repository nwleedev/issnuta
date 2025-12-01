---
name: typescript-cohesion
description: TypeScript 결합도/응집도 전문가. 코드 리뷰 및 리팩터링 시 PROACTIVELY 사용하여 결합도를 낮추고 응집도를 높이는 분석 제공.
tools: Read, Grep, Glob
model: inherit
---

# TypeScript 결합도·응집도 지침 — issnuta

본 문서는 issnuta 프로젝트(Next.js App Router, React 19, TypeScript strict)에서 **결합도(coupling)를 낮추고, 응집도(cohesion)를 높이기 위한 실천 규칙**을 정의합니다.  
폴더 구조·레이어 규칙은 `registry/feature-sliced-design.md`, UI·훅 패턴은 `registry/react-good-pattern.md`를 전제로 합니다.

---

## 0) 용어 요약

- **결합도(Coupling)**  
  - 모듈/파일/클래스/컴포넌트 사이가 서로 **얼마나 강하게 의존하는지**의 정도입니다.
  - 이상적인 방향: **Low Coupling — 변경이 주변 코드에 최소한으로 전파**되는 구조.

- **응집도(Cohesion)**  
  - 하나의 모듈 내부 요소들이 **얼마나 하나의 책임/목표에 집중되어 있는지**의 정도입니다.
  - 이상적인 방향: **High Cohesion — “이 파일은 한 문장으로 설명 가능”** 한 상태.

> 기억법:  
> - 모듈끼리는 느슨하게(낮은 결합도)  
> - 모듈 내부는 단단하게(높은 응집도)

---

## 1) 적용 범위 및 기본 원칙

- 적용 대상
  - TypeScript 코드 전반
  - React 컴포넌트, 커스텀 훅, 서비스/리포지토리, 유틸 함수
  - FSD 레이어(`shared/`, `entities/`, `features/`, `widgets/`, `entries/`, `app/`)

- 기본 원칙
  - **레이어/슬라이스 규칙**은 `registry/feature-sliced-design.md`를 따른다.
  - 하나의 파일/모듈은 **한 가지 이유로만 변경**되도록 설계한다(Single Responsibility).
  - 외부 라이브러리·브라우저 API와의 직접 결합은 **가능한 바깥 레이어(services/adapters)** 에서 처리한다.

---

## 2) 결합도 낮추기 — 레이어·모듈 수준

### 2-1. FSD 레이어 의존 규칙 준수

- 레이어 간 의존 방향은 `registry/feature-sliced-design.md`의 그래프(App → entries → widgets → features → entities → shared)를 따른다.
- **같은 레이어 슬라이스끼리 직접 import** 하지 않고, 각 슬라이스의 **퍼블릭 API(`index.ts`)** 를 통해 접근한다.
  - 예: `features/translate` 내부 파일을 다른 feature에서 직접 임포트하지 말고, `features/translate`의 `index.ts`가 노출하는 API만 사용.

### 2-2. 데이터 결합(Data Coupling) 선호

- 모듈 간에는 **정말 필요한 데이터만** 인자/리턴값으로 주고받는다.
  - Bad (Stamp Coupling)
    ```ts
    // UserCard.tsx
    export function UserCard({ user }: { user: User }) {
      return <div>{user.name}</div>;
    }
    ```
  - Better
    ```ts
    export function UserCard(props: { name: string }) {
      return <div>{props.name}</div>;
    }
    ```
  - UI 컴포넌트는 **도메인 전체 객체** 대신, 자신이 사용하는 필드만 받도록 타입을 좁힌다.

### 2-3. 전역 상태/싱글톤 결합 최소화

- 전역 스토어(Context, 전역 싱글톤, `window`/`globalThis`에 붙인 상태)는 **진짜로 전역이 필요한 정보**로만 한정한다.
  - 사용자의 현재 언어, 인증 정보 등 “앱 전체에서 동시에 필요”한 것만 전역.
  - 나머지 상태는 가능하면 **로컬 컴포넌트 상태 또는 feature 한정 Context**로 두고 스코프를 줄인다.

### 2-4. 외부 라이브러리에 대한 직접 의존 캡슐화

- HTTP 클라이언트, 번역 API SDK, 브라우저 스토리지 등 **외부 의존성**은 아래 위치에 캡슐화한다.
  - `shared/api/**` — HTTP 클라이언트/공통 API 클라이언트
  - `entities/**/api/**`, `features/**/api/**` — 도메인 특화 API 래퍼
  - `shared/lib/**` — Web APIs(Clipboard, Storage 등) 어댑터
- React 컴포넌트·훅이 Axios/Fetch·로컬스토리지·온갖 SDK에 직접 의존하지 않도록 하고, **서비스/레포지토리 인터페이스**만 보게 만든다.

### 2-5. 인터페이스/추상화에 의존(DIP)

- 구체 타입 대신 **역할 기반 인터페이스**에 의존한다.

```ts
// entities/user/model/user-repository.ts
export interface UserRepository {
  getById(id: string): Promise<User>;
}

// features/user/model/use-user.ts
export function useUser(repo: UserRepository, id: string) {
  // ...
}
```

- 구현체는 레이어 경계에서만 생성한다.
  - 예: `entries/**` 또는 `widgets/**`에서 `new HttpUserRepository()`를 만들어 `useUser`에 주입.
  - 테스트에서는 **메모리 기반 구현/Mock** 을 주입하여 React/네트워크에 대한 결합 없이 검증 가능.

### 2-6. 제어 결합(Control Coupling) 줄이기

- “모듈 내부 분기 모드”를 외부에서 문자열/enum 파라미터로 제어하는 패턴을 줄인다.
  - Bad
    ```ts
    translate(text, "FAST"); // 내부에서 "FAST" | "ACCURATE"에 따라 분기
    ```
  - Better
    ```ts
    fastTranslate(text);
    accurateTranslate(text);
    ```
- 불가피하게 모드를 받아야 하는 경우에도, **별도 타입**으로 의미를 명확히 한다.

```ts
type TranslateMode = "fast" | "accurate";
```

---

## 3) 응집도 높이기 — 컴포넌트·훅·서비스 수준

### 3-1. “한 문장 설명” 테스트

- 어떤 파일/컴포넌트도 **한 문장으로 설명 가능**해야 한다.
  - 예:  
    - Good: “`TranslatorWidget`은 번역 입력·결과를 보여주는 UI 컨테이너다.”  
    - Bad: “번역 입력·결과도 보여주고, 프레이즈를 저장하고, 언어 설정을 관리하고, 라우팅도 한다…”
- “그리고, 그리고…”가 계속 붙는 순간 해당 파일은 **여러 책임**을 가지고 있는 것 → 분리 대상.

### 3-2. Presentational vs Container 분리

- UI 렌더링(뷰)와 데이터 준비/상태 관리는 분리한다.
  - Presentational Component: 스타일·마크업·이벤트 핸들러 시그니처만 정의.
  - Container/Hook: 데이터 패칭, 도메인 로직, 상태 관리.
- 예시 구조:

```ts
// features/translate/ui/TranslateForm.tsx
// 순수 UI (props 기반)

// features/translate/model/useTranslateForm.ts
// 상태/도메인 로직
```

자세한 UI/훅 패턴은 `registry/react-good-pattern.md`를 따른다.

### 3-3. 커스텀 훅으로 관심사 분리

- 개별 훅은 **하나의 관심사**만 다루게 한다.
  - `useTranslateQuery` — 번역 요청/캐싱(TanStack Query 등)
  - `useTranslateForm` — 폼 상태·검증(React Hook Form 등)
  - `useLanguagePreference` — 언어 설정 로딩/저장
- 훅 이름만 보고 무엇을 책임지는지 추론 가능해야 한다.

### 3-4. 도메인 별 슬라이스 응집 유지

- 한 슬라이스(`entities/phrase`, `features/translate` 등)는 **단일 도메인 개념**을 중심으로 구성한다.
  - 다른 도메인 기능이 섞이기 시작하면 슬라이스 분리 또는 cross-entity 의존 구조 점검.
- 예:
  - `entities/phrase` — 프레이즈 모델, 스키마, 기본 UI
  - `features/phrasebook` — 프레이즈 CRUD, 즐겨찾기 기능
  - `widgets/phrasebook-panel` — 프레이즈북 UI 묶음

---

## 4) 상태·데이터 흐름 패턴 (React/TS 관점)

- **데이터 패칭**  
  - 서버 데이터는 `registry/tanstack-query-pattern.md`에서 정의한 쿼리 훅 패턴을 따른다.
  - 컴포넌트에서 직접 `fetch`/Axios를 호출하지 말고, **쿼리 훅/서비스**에 캡슐화한다.

- **폼 상태/검증**  
  - 폼 로직은 `registry/react-hook-form-pattern.md`, `registry/use-form-with-query-client-pattern.md`에 맞춰 훅으로 구성한다.
  - 컴포넌트는 폼 훅이 노출하는 최소한의 인터페이스에만 의존한다.

- **전역 vs 로컬 상태 판단 기준**
  - “둘 이상 페이지/슬라이스에서 동시에 필요?” — 전역 또는 상위 레이어.
  - 그렇지 않으면 가능하면 훅/컴포넌트 로컬 상태.

---

## 5) 타입 설계로 결합도 줄이기

### 5-1. 최소 필요 Prop/파라미터만 노출

- 컴포넌트/함수의 타입 정의는 “진짜로 필요한 데이터”만 포함한다.

```ts
// Bad: UI가 도메인 전체 모델에 결합
type TranslateResultProps = {
  request: TranslateRequest;
  response: TranslateResponse;
};

// Good: UI가 보여줄 정보만 추려서 의존
type TranslateResultProps = {
  sourceText: string;
  translatedText: string;
  detectedSourceLang?: string;
};
```

### 5-2. 역할별 인터페이스 분리(ISP)

- 거대한 하나의 인터페이스 대신, **역할별 작은 인터페이스**로 나누어 필요한 역할만 의존하게 한다.

```ts
interface ReadonlyPhraseStore {
  list(): Promise<Phrase[]>;
}

interface MutablePhraseStore {
  add(input: NewPhrase): Promise<void>;
  remove(id: string): Promise<void>;
}
```

컴포넌트가 읽기만 필요하다면 `ReadonlyPhraseStore`에만 의존하게 하여 불필요한 결합을 줄인다.

### 5-3. 외부 스키마와 내부 모델 분리

- API 응답/스토리지 구조는 `*Dto`/`*Schema` 타입, 앱 내부 도메인 모델은 별도 타입으로 두고, **매핑 함수**를 통해 변환한다.
  - 변경 가능성이 큰 외부 계약과 내부 도메인 모델을 분리하여 결합도를 낮춘다.

---

## 6) 메트릭/리뷰 체크리스트(정성 기준)

정량 메트릭(LCOM, CBO 등)을 도입할 수도 있지만, 우선은 아래 정성 기준으로 리뷰한다.

- 결합도 관련 체크
  - [ ] 이 파일/모듈이 import 하는 **로컬 모듈 수**가 과도하지 않은가?
  - [ ] 전역 상태/싱글톤/컨텍스트에 직접 접근하는 부분은 최소한인가?
  - [ ] 외부 라이브러리(Axios, SDK 등)에 대한 의존을 어댑터로 감쌌는가?
  - [ ] 다른 슬라이스 내부 경로를 직접 참조하지 않고 퍼블릭 API만 사용하고 있는가?

- 응집도 관련 체크
  - [ ] “이 파일은 무엇을 하나요?” 질문에 **한 문장으로 답할 수 있는가?**
  - [ ] 변경 이유가 여러 개인 코드가 섞여 있지 않은가? (예: 번역 로직 변경과 라우팅 로직 변경이 항상 같이 일어나는 구조)
  - [ ] 유틸 함수/훅 이름만으로 책임이 명확한가?

- React 특화 체크
  - [ ] 하나의 컴포넌트에서 “데이터 패칭 + 복잡한 폼 + 라우팅 + 모달 관리”를 동시에 하지 않는가?
  - [ ] 재사용 가능한 로직은 커스텀 훅 또는 `shared/lib`로 분리되어 있는가?
  - [ ] 과도한 prop drilling 대신 적절한 위치에서 Context를 사용하고, Context 남용은 피하고 있는가?

---

## 7) 예시: 결합도/응집도 개선 리팩터링

### 7-1. 결합도가 높은 컴포넌트

```ts
// entries/translate/TranslatePage.tsx (예시)
// - 번역 API 직접 호출(fetch)
// - 로컬스토리지 접근
// - 폼 상태 관리
// - 프레이즈 저장까지 처리
// → 여러 책임 + 외부 요소에 강하게 결합
```

### 7-2. 개선 방향

- 번역 로직: `features/translate/model/use-translate.ts`
- 프레이즈 저장: `features/phrasebook/model/use-phrasebook.ts`
- 스토리지 접근: `shared/lib/storage.ts`
- 페이지: 위 훅과 UI 컴포넌트를 조립만 담당

이렇게 나누면:

- 각 훅/모듈은 **하나의 기능**에만 집중(응집도↑)
- 페이지는 훅과 컴포넌트를 조합하는 “조립자” 역할만 담당(결합도↓)
- 테스트는 개별 훅/서비스를 **React/UI 없이** 독립적으로 검증 가능

---

## 8) 문서 간 관계

- 아키텍처/폴더 구조: `registry/feature-sliced-design.md`
- React 컴포넌트/훅 패턴: `registry/react-good-pattern.md`
- 폼/React Hook Form 패턴: `registry/react-hook-form-pattern.md`, `registry/use-form-with-query-client-pattern.md`
- 데이터 패칭/TanStack Query: `registry/tanstack-query-pattern.md`
- 테스트 전략: `registry/test-driven-development-guide.md`, `registry/e2e-test-pattern.md`

본 문서는 위 문서들의 상위 개념(결합도/응집도)을 타입스크립트 관점에서 정리한 레지스트리입니다. 추후 패턴 문서를 확장할 때, 이 지침을 기준으로 새로운 훅/컴포넌트/서비스의 책임과 의존성을 설계해주세요.

