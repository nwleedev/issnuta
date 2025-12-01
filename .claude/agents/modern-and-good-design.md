---
name: modern-design
description: 2025 모바일 웹 디자인 전문가. UI/UX 구현, 디자인 시스템 적용, Tailwind/DaisyUI 스타일링 시 PROACTIVELY 사용.
tools: Read, Grep, Glob, Edit
model: inherit
---

# Project Design (Mobile Web · 2025 H2 · Tailwind + DaisyUI)

본 문서는 2025년 하반기 기준 모바일 웹 애플리케이션의 이상적인 디자인 원칙을 요약하고, 본 프로젝트(오프라인 번역 웹앱 · PWA)에 최적화된 UI/UX 설계를 제안합니다. 구현은 Tailwind CSS + DaisyUI를 기준으로 합니다.

## 1) 2025 H2 모바일 웹 디자인 권고안
- 접근성 기본값: WCAG 2.2 AA 대비/포커스/키보드 조작. 터치 타겟 44×44px 이상, 명확한 포커스 링.
- 다크/라이트 동등 우선: 시스템 설정 연동(`prefers-color-scheme`) + 앱 내 전환 토글 제공.
- 안전 영역·뷰포트: `env(safe-area-inset-*)` 패딩, `dvh/svh/lvh` 뷰포트 단위, 스크롤·주소창 변화 대응.
- 제스처/터치 최적화: 포인터 이벤트 통합(pointer/touch/mouse), `touch-action`, `overscroll-behavior`로 충돌 최소화.
- 성능 우선: 이미지/폰트 지연 로딩, 스켈레톤/프로그레스 UI, 모션은 가벼운 수준(`prefers-reduced-motion` 존중).
- 레이아웃 패턴: 하단 고정 액션(또는 바텀 시트), 콘텐츠는 엣지-투-엣지, 스티키 헤더는 간결하게.
- 토큰 기반 테마: CSS 변수·디자인 토큰으로 일관성(색·간격·라운드·음영). 다중 테마 즉시 전환.
- 현대 CSS: 컨테이너 쿼리, `:has()`, View Transitions API(가능 시), `color-mix()`, `@media (dynamic-range: high)`.
- 피드백 체계: 인라인 유효성/헬프텍스트, 비차단형 토스트, 확정 동작만 모달.

## 2) 프로젝트 맞춤 디자인 목표
- 작업 흐름 최소 단계화: 업로드 → 조절(미리보기/세로 드래그) → 배경 선택 → 다운로드.
- 프리뷰 몰입: 조절 시 컨트롤을 접거나 바텀 시트로 숨겨 프리뷰 공간 극대화.
- 단일 주요 CTA: 현재 상황에 맞는 1차 액션을 하단에 고정(예: "다운로드").
- 명료한 상태: 이미지 미선택/로딩/오류/편집 중/완료를 명확히 구분.

## 3) 정보 구조(IA) · 내비게이션
- 헤더: 좌측 로고/타이틀, 우측 설정(테마 전환, 도움말).
- 메인: 번역 입력/출력 영역 + 접이식 컨트롤 패널.
- 하단 액션 바: 업로드 버튼(이미지없음 시), 다운로드 버튼(이미지있음 시), 보조 메뉴 드롭다운.
- 바텀 시트: 배경(단색/블러), 색상/강도, 포맷/품질 등 상세 옵션.

## 4) 색상/타이포/스페이싱 토큰 제안(DaisyUI 테마)
- 테마: `issnuta` (라이트/다크 동시 제공)
  - primary: 약간 청록 기조로 이미지 툴에 어울리는 중성 하이라이트
  - secondary: 중립 회색 톤(보조 컨트롤)
  - accent: 주의·강조 액션(다운로드)
  - neutral/base: 고명도 라이트, 저명도 다크 기반으로 대비 확보
- DaisyUI 예시 스케치(설치 후 `tailwind.config`에 추가):

```ts
// tailwind.config.mjs (예시)
export default {
  content: ["./app/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}", "./entities/**/*.{ts,tsx}", "./shared/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        issnuta: {
          primary: "#22d3ee",      // cyan-400
          secondary: "#a3a3a3",    // neutral-400
          accent: "#f59e0b",       // amber-500
          neutral: "#1f2937",      // gray-800
          "base-100": "#0b0f14",  // 어두운 베이스(다크)
          info: "#38bdf8",
          success: "#10b981",
          warning: "#fbbf24",
          error: "#ef4444",
        },
      },
      "light",
      "dark",
    ],
  },
};
```

- 테마 전환: html/body에 `data-theme="issnuta" | "light" | "dark"` 적용, 시스템 우선 후 사용자 토글.

## 5) 컴포넌트 설계(Tailwind + DaisyUI 매핑)
- UploadButton: `btn btn-primary`, 드롭존은 `card border-dashed` 스타일과 `aria-label` 제공.
- PreviewContainer: 엣지-투-엣지, `bg-base-200`/커스텀 배경, 중앙 정렬·contain, 세로 `dvh` 단위 높이.
- LangSwap/TranslateBar: 언어 스왑 버튼(`aria-label="swap languages"`), 번역 실행 버튼, 상태 배지.
- BackgroundControls: `tabs` 또는 `segmented` 토글 + 색 선택(`input type=color`) + 블러 강도 `range`.
- DownloadMenu: `dropdown` + 포맷 `select` + 품질 `range` + `btn btn-accent` CTA.
- Feedback: `toast`(성공/실패/경고), 로딩 `skeleton`.
- AppBar/BottomBar: `navbar` 최소화, 하단은 `btm-nav` 또는 `sticky` 컨테이너.

## 6) 레이아웃/반응형/안전영역
- 컨테이너: `min-h-[100svh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`.
- 프리뷰 우선: 컨트롤은 바텀 시트로 접고, 드래그 시 `overflow-hidden`, `touch-action: none`, `overscroll-behavior: contain`.
- 그리드: 상단 앱바, 중앙 프리뷰, 하단 액션 바의 3영역 구성이 기본.

## 7) 모션/제스처
- 드래그: rAF/쓰로틀, 12–16ms 갱신 목표. 포인터 캡처 사용.
- 전환: 프리뷰/시트 오픈 시 120–180ms 이징, `prefers-reduced-motion`시 애니메이션 비활성화.
- 햅틱: 웹 기본은 제한적이므로 진동 API는 선택적(사용자 설정으로 관리).

## 8) 접근성 체크리스트
- 포커스: 키보드로 업로드/핸들/다운로드 조작 가능, 포커스 스타일 커스텀 금지보다는 보강.
- 명도 대비: 텍스트/아이콘 4.5:1 이상, 큰 텍스트 3:1 이상.
- 라이브 영역: 토스트 `role="status"`, 오류는 `aria-live="assertive"`.
- 키보드 대안: 핸들 키보드 증감(←/→ 또는 ↑/↓), 페이지키로 빠른 증감.

## 9) 예시 마크업 스케치
```tsx
// Preview 중심 모바일 레이아웃(개념 스케치)
export default function Home() {
  const hasImage = true; // 상태에 따라 토글
  return (
    <div className="min-h-[100svh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-base-100">
      <header className="navbar bg-base-100/80 backdrop-blur sticky top-0">
        <div className="flex-1 font-semibold">Offline Translator</div>
        <div className="flex-none">
          <button className="btn btn-ghost btn-sm">Theme</button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <section className="h-full flex flex-col">
          <div className="relative flex-1 grid place-items-center bg-base-200 select-none">
            {/* 업로드 전 빈 상태/업로드 후 프리뷰 */}
            {hasImage ? (
              <div className="w-full h-full max-w-screen-sm mx-auto bg-center bg-cover" />
            ) : (
              <div className="card w-full max-w-sm shadow-none bg-base-100">
                <div className="card-body items-center text-center">
                  <h2 className="card-title">텍스트 번역</h2>
                  <p>번역할 텍스트를 입력해보세요</p>
                  <button className="btn btn-primary">입력하기</button>
                </div>
              </div>
            )}
            {/* 하단 번역바 */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-base-100/80 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="badge" aria-label="source">ko</span>
                <button className="btn btn-ghost btn-sm" aria-label="swap languages">↔︎</button>
                <span className="badge" aria-label="target">en</span>
                <button className="btn btn-primary ml-auto">번역</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="sticky bottom-0 bg-base-100/80 backdrop-blur">
        <div className="p-3 flex gap-2">
          {!hasImage && <button className="btn btn-primary flex-1">업로드</button>}
          {hasImage && (
            <>
              <div className="dropdown dropdown-top flex-1">
                <button className="btn btn-outline w-full">옵션</button>
                <ul className="dropdown-content menu bg-base-100 rounded-box w-64 p-2 shadow">
                  <li><a>배경: 단색</a></li>
                  <li><a>배경: 블러</a></li>
                  <li><a>포맷: PNG/JPEG/WebP</a></li>
                </ul>
              </div>
              <button className="btn btn-accent flex-1">다운로드</button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
```

## 10) 구현 메모(Tailwind + DaisyUI)
- DaisyUI 설치·설정 후 `data-theme`로 앱 전역 테마 제어. 사용자 선택은 `localStorage` 보관.
- 안전 영역/뷰포트: 루트 래퍼에 `svh`와 `env(safe-area-inset-*)` 적용.
- 드래그 중 문서 스크롤 방지: 프리뷰 래퍼에 `touch-action: none`, 상위 `overscroll-behavior: contain`.
- 토스트/모달은 DaisyUI 컴포넌트로 통일. 메시지 레벨(info/success/warn/error) 표준화.
- 아이콘: 별도 패키지 추가 대신 `public/icons`의 인라인 SVG 사용 권장(용량/의존성 최소화).

---
이 설계를 바탕으로 컴포넌트(`features/*/ui`)를 우선 구현하고, 옵션 편집은 바텀 시트/드롭다운으로 점진 도입합니다. 디자인 토큰은 DaisyUI 테마로 일원화하여 유지보수성을 확보합니다.

## 11) CSS Flex/Grid 베스트 프랙티스
- 선택 기준: 1차원 정렬·분배는 Flex, 2차원(행·열 동시) 레이아웃은 Grid를 우선 사용.
- `gap` 우선: 형제 간 간격은 `gap`을 사용하고, 마진 상쇄/음수 마진 패턴은 지양.
- 오버플로 제어(Flex): 자식에 `min-w-0`/`min-h-0`을 명시해 줄바꿈/스크롤이 차단되지 않도록 함.
- 오버플로 제어(Grid): 트랙에 `minmax(0, 1fr)`를 사용해 내용이 트랙을 밀어내지 않도록 함.
- 정렬 의미론: 주축 분배는 `justify-*`, 교차축 정렬은 `items-*`/`content-*`; 단일 자식 중앙정렬은 `place-self-center`.
- 고정 높이 지양: 컨텐츠 높이는 유동적으로. 필요 시 `max-h-* + overflow-auto` 조합 사용.
- 현대 단위: 모바일에서는 `svh/dvh/lvh`를 사용해 주소창 변화를 흡수. 안전영역은 `env(safe-area-inset-*)`.
- 내재적 크기: `fit-content()`, `min-content`/`max-content`를 적재적소에 사용해 라벨·버튼 수축 처리.
- 반응형 토큰: `clamp()`로 크기/간격 스케일링, 컨테이너 쿼리로 부모 폭에 적응.
- 서브그리드: 반복 폼/리스트 헤더 정렬에는 `subgrid`(지원 환경에서)로 열 정렬 일관성 확보.
- 접근성/탭 순서: 레이아웃만으로 DOM 순서를 왜곡하지 말고, 시맨틱 순서를 유지(시각/키보드 정합성).

## 12) 레이아웃 패턴 모음(Tailwind 예시)
- 앱 셸(헤더-콘텐츠-푸터): Grid로 3행 구성, 푸터 고정 효과

```html
<div class="min-h-[100svh] grid grid-rows-[auto_1fr_auto]">
  <header class="sticky top-0 z-10">...</header>
  <main class="min-h-0 overflow-hidden">...</main>
  <footer class="sticky bottom-0 z-10">...</footer>
</div>
```

- 스크롤 영역 분리(중앙만 스크롤)

```html
<main class="min-h-0 overflow-auto overscroll-contain">...</main>
```

- 중앙 프리뷰 영역(컨테이너 중앙 정렬 + contain)

```html
<section class="relative flex-1 grid place-items-center bg-base-200 select-none">
  <div class="w-full h-full max-w-screen-sm mx-auto min-w-0 min-h-0 grid place-items-center">
    <img class="max-w-full max-h-full object-contain" />
  </div>
  <!-- 드래그 핸들은 absolute 오버레이 -->
</section>
```

- 하단 액션 바(아이템 수 증가 시 자동 줄바꿈)

```html
<div class="flex flex-wrap items-center gap-2">
  <button class="btn btn-outline">옵션</button>
  <button class="btn btn-accent flex-1 sm:flex-none">다운로드</button>
</div>
```

- 자동 맞춤 카드 그리드(옵션 목록 등)

```html
<div class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
  <!-- cards -->
</div>
```

- 균등 분할/남는 공간 채우기(Flex 기반 툴바)

```html
<div class="flex items-center gap-2">
  <div class="flex items-center gap-2 min-w-0">
    <button class="btn btn-sm">A</button>
    <button class="btn btn-sm">B</button>
  </div>
  <div class="grow min-w-0" />
  <button class="btn btn-primary btn-sm">주요 액션</button>
  <button class="btn btn-ghost btn-sm">설정</button>
  <!-- grow + min-w-0 로 중간 공간 유연 분배 -->
  </div>
```

- 바텀 시트(옵션 패널)

```html
<aside class="fixed inset-x-0 bottom-0 translate-y-0 sm:translate-y-0 bg-base-100 rounded-t-2xl shadow-2xl">
  <div class="p-4 grid gap-3">...</div>
</aside>
```

## 13) 체크리스트(Flex/Grid 적용 시)
- Flex 자식에 `min-w-0`/`min-h-0`을 잊지 말 것(텍스트/이미지 잘림 방지).
- Grid의 유동 트랙은 `minmax(0,1fr)`로 정의해 내용 오버플로 방지.
- 간격은 `gap`으로, 레이아웃은 Grid, 정렬/한 줄 배치는 Flex로 단순화.
- 모바일 뷰포트는 `svh` 사용, 안전영역 패딩을 기본 적용.
- 스크롤 영역은 명시적으로 `overflow-auto`와 `min-h-0`로 한정.
- DOM 순서는 시맨틱을 우선, 시각 순서만 바꾸는 CSS 트릭은 지양.
