# Mobile Design Baseline (모바일 웹 디자인 베이스라인)

검증일: 2025-11-09

본 문서는 모바일 우선 웹앱의 공통 디자인·UX 기준선을 정의합니다. 우리 프로젝트(오프라인 번역 웹앱 · Next.js 15 · React 19 · TS strict · Tailwind 4)에 즉시 적용 가능한 원칙만 포함합니다.

---

## 0) 목적 · 범위 · 우선순위

- 목적: 모바일에서 일관된 UI·상호작용·접근성을 확보하고, 성능(Core Web Vitals)과 PWA 오프라인 경험을 기본값으로 합니다.
- 범위: 디자인 토큰/레이아웃/뷰포트/모션/컴포넌트/색·타이포/성능/PWA/접근성.
- 우선순위: 사용자 지시 > AGENTS.md > registry/*.md > README/주석.
- 산출물 형태: 규범(checklist) + 참고 코드 스니펫(추가 예정).

---

## 1) 용어 정리(요지)

- INP: Interaction to Next Paint — 2024-03-12부터 Core Web Vitals 지표로 채택.
- LCP/CLS: 최대 콘텐츠 페인트 / 누적 레이아웃 이동.
- dvh/svh/lvh: 동적 뷰포트 단위(iOS/Android 주소창 변동 대응).
- Container Queries: 컴포넌트 크기/스타일 기반 반응형(`@container`).
- View Transitions / Scroll-driven Animations: 전환/스크롤 연동 애니메이션 표준.
- Popover API / Anchor Positioning: 팝오버·툴팁·토스트 표준 레이어링/배치.
- OKLCH: 현대 색값 모델, 다크/라이트 간 일관 대비 유지에 유리.
- WCAG 2.2 / EU EAA: 최신 접근성 기준 및 2025-06-28 적용되는 규제.

---

## 2) 빠른 체크리스트(팀 도입용)

- [ ] 레이아웃: `container-type: inline-size` 선언, 핵심 카드/그리드에 `@container` 적용
- [ ] 뷰포트: `min-h: 100dvh` 또는 `height: 100dvh` 사용, safe‑area 인셋 패딩
- [ ] 모션: View Transitions 기본 활성화, 스크롤 타임라인은 보조 효과로 적정 사용
- [ ] 컴포넌트: 팝오버는 Popover API, 모달은 `<dialog>` + `inert`로 포커스 트랩
- [ ] 색/타이포: `color-scheme: light dark`, 색상 토큰은 `oklch()` 채택, `text-wrap: balance`
- [ ] 성능: INP 최적화(롱태스크 분할/이벤트 핸들러 경량화), LCP 리소스 `fetchpriority="high"`
- [ ] PWA: Service Worker 프리캐시(정적/라우트/모델), 백그라운드 업데이트
- [ ] 접근성: WCAG 2.2 기준 준수(AA), 터치 타깃 ≥ 44×44px, 키보드/스크린리더 확인

---

## 3) 목차(섹션 스켈레톤)

1. [레이아웃](#sec-layout) — 컨테이너 쿼리 / Subgrid / Nesting / :has()
2. [뷰포트·세이프 영역](#sec-viewport) — dvh/svh/lvh, env(safe-area-inset-*), viewport-fit
3. [모션](#sec-motion) — View Transitions / Scroll-driven Animations
4. [컴포넌트·오버레이](#sec-components) — Popover, `<dialog>`, Anchor Positioning
5. [색상·타이포그래피](#sec-color-typography) — OKLCH, color-scheme, text-wrap
6. [성능](#sec-performance) — INP, LCP, fetchpriority, 애니메이션 비용
7. [오프라인·PWA](#sec-pwa) — Service Worker, 캐시 계층, 오프라인 라우팅
8. [접근성·규제](#sec-a11y) — WCAG 2.2, EU EAA
9. [내부 문서 교차링크](#sec-internal-links)
10. [참고 문서(공식)](#sec-refs)
11. [UI 컴포넌트(가시적 패턴)](#sec-ui)

> 각 섹션은 “원칙 2–4개 + 실무 지침 3–6개 + 단문 예시코드(추가)” 구조로 점진 보강합니다.

---

## 4) 레이아웃(컨테이너 쿼리)
<a id="sec-layout"></a>

- 원칙: 뷰포트가 아닌 “컴포넌트의 크기/상태”에 반응하도록 설계합니다.
- 지원: Size/Style/Scroll‑state 컨테이너 쿼리. Size·Scroll 쿼리는 컨테이너에 `container-type` 선언이 필요합니다. Style 쿼리는 커스텀 속성만(현재 시점) 질의 가능합니다.

### 4.1 컨테이너 활성화(기본)

```css
/* 카드 리스트를 감싸는 영역을 ‘크기 컨테이너’로 지정 */
.card-list {
  container-type: inline-size;           /* 가로 길이에 반응 */
  /* container-name: cards;             // 필요 시 이름 부여 */
  /* 축약형: container: cards / inline-size; */
}
```

### 4.2 Size Query(열 수 전환)

```css
.card-list { display: grid; grid-template-columns: 1fr; gap: 12px; }

/* 컨테이너 폭 기준으로 1→2→3열 전환 */
@container (width >= 28rem) {
  .card-list { grid-template-columns: 1fr 1fr; }
}
@container (width >= 48rem) {
  .card-list { grid-template-columns: 1fr 1fr 1fr; }
}
```

Tailwind/DaisyUI 예시(그리드 레이아웃)
```tsx
// features/cards/ui/CardList.tsx
"use client";
export function CardList({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="container-block grid [grid-template-columns:1fr] gap-3 md:[grid-template-columns:repeat(2,1fr)] xl:[grid-template-columns:repeat(3,1fr)]"
    >
      {children}
    </section>
  );
}
```

컨테이너 선언(raw CSS — Tailwind 병행)
```css
.container-block{ container-type: inline-size; }
```

명명된 컨테이너 예시:

```css
.sidebar { container: sidebar / inline-size; }
@container sidebar (width > 40rem) {
  .nav-title { font-size: 1.25rem; }
}
```

### 4.3 Style Query(테마/밀도)

```css
.sheet {
  /* 데이터 속성 → 커스텀 속성으로 매핑 */
  --density: var(--density, normal);
  --theme: var(--theme, light);
}

/* 밀도 조정 */
@container style(--density: compact) {
  .item { padding: 8px 10px; gap: 6px; }
}

/* 다크 테마 */
@container style(--theme: dark) {
  .card { background: oklch(22% 0.02 250); color: oklch(92% 0 0); }
}

/* Size + Style 병행 */
@container (width > 36rem) and style(--density: comfortable) {
  .item-title { font-size: 1.125rem; }
}
```

Tailwind 예시(스타일 토큰 유지)
```tsx
// features/shell/ui/Sheet.tsx
export function Sheet({ density = "normal", theme = "light", children }: { density?: "compact"|"comfortable"|"normal"; theme?: "light"|"dark"; children: React.ReactNode }){
  return (
    <div className="sheet p-3 md:p-4" style={{ ['--density' as any]: density, ['--theme' as any]: theme }}>
      {children}
    </div>
  );
}
```

### 4.4 Scroll‑state Query(스티키 헤더 압축)

```css
.list { container-type: size; overflow: auto; }
.list > header { position: sticky; top: 0; backdrop-filter: blur(8px); }

@container scroll-state(stuck: top) {
  .list > header { padding-block: 6px; font-size: 0.95rem; }
}
```

Tailwind 예시(스크롤 영역 + 스티키 헤더)
```tsx
// features/list/ui/StickyList.tsx
export function StickyList({ header, children }: { header: React.ReactNode; children: React.ReactNode }){
  return (
    <section className="[container-type:size] overflow-auto">
      <header className="sticky top-0 backdrop-blur bg-base-100/80 px-3 py-2">{header}</header>
      <div className="divide-y divide-base-300">{children}</div>
    </section>
  );
}
```

### 4.5 Subgrid로 헤더/메타 정렬 고정

```css
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 12px; }
.card  { display: grid; grid-template-rows: subgrid; grid-row: span 4; row-gap: 8px; }
.card > .title { /* 부모 라인에 정렬됨 */ }
```

Tailwind/DaisyUI 예시(카드)
```tsx
// features/cards/ui/Card.tsx
export function Card({ title, meta, children }: { title: string; meta?: string; children?: React.ReactNode }){
  return (
    <article className="card shadow">
      <div className="card-body gap-2">
        <h3 className="card-title text-base font-semibold">{title}</h3>
        {meta && <p className="text-sm text-base-content/70">{meta}</p>}
        {children}
      </div>
    </article>
  );
}
```

### 4.6 가이드

- 컨테이너 경계를 명확히(패딩/보더 포함) 설계하여 위치 이동에도 반응이 유지되게 합니다.
- 컨테이너 이름으로 범위를 좁혀 의도치 않은 상위 컨테이너 매칭을 방지합니다.
- `@media`는 글로벌 브레이크포인트, `@container`는 컴포넌트 반응형에 사용합니다.
- Style Query에는 일반 CSS 속성을 직접 질의하지 않습니다(커스텀 속성만 지원).

참고: [섹션 5 — 뷰포트·세이프 영역](#sec-viewport), [섹션 6 — 모션](#sec-motion), [섹션 9 — 성능](#sec-performance)

---

## 5) 뷰포트 · 세이프 영역
<a id="sec-viewport"></a>

- 원칙: 주소창/시스템 UI 높이 변동(iOS/Android)과 노치·홈 인디케이터를 안정적으로 처리합니다.

### 5.1 동적 뷰포트 단위(dvh/svh/lvh)

```css
/* 전체 화면 레이아웃 컨테이너 */
.app-shell {
  /* 초기 안정성(최소 높이) → 상단/하단 UI 노출 시 레이아웃 점프 방지 */
  min-height: 100svh;    /* small viewport height */
  /* 몰입형 표면에서는 동적으로 채움(주소창 숨김 시 확장) */
  height: 100dvh;        /* dynamic viewport height */
}

/* 미디어(영역)별 선택 — 히어로/프리뷰는 몰입형, 폼은 안정형 권장 */
.hero, .preview { height: 100dvh; }
.settings-panel { min-height: 100svh; }

/* 최대 가용 높이를 강제해야 하는 경우 */
.splash-screen { block-size: 100lvh; }  /* large viewport height */
```

Tailwind/DaisyUI 예시(루트 레이아웃)
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="issnuta">
      <body className="min-h-[100svh] h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-base-100 text-base-content">
        {children}
      </body>
    </html>
  );
}
```

권장
- “안정이 우선” 화면(설정/목록)은 `min-height: 100svh`를 기본으로 하여 초기 레이아웃 점프를 억제합니다.
- “몰입이 우선” 화면(풀스크린 프리뷰/히어로)은 `height: 100dvh`로 동적 채움을 사용합니다.
- 레이아웃 전체에는 `min-height: 100svh` + `height: 100dvh`를 병기해 초기 안정성과 동적 확장을 동시에 확보합니다.

### 5.2 Safe Area Insets(노치/홈 인디케이터)

HTML
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

CSS
```css
.app-shell {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

Tailwind 유틸
```html
<main class="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
  ...
</main>
```

### 5.3 Tailwind v4 유틸(본 프로젝트 적용 예)

```html
<main
  class="min-h-[100svh] h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
>
  <!-- content -->
  <section class="h-[100dvh]">...</section>
</main>
```

### 5.4 추가 지침

- 100vh만 고정 사용은 지양합니다(주소창 변동으로 공백/잘림 발생).
- 풀스크린 스크롤 영역에는 `overscroll-behavior: contain;`으로 네이티브 바운스의 간섭을 줄입니다.
- 키보드 전개 시 입력 영역이 가려지지 않도록 폼 컨테이너에 `scroll-margin-bottom` 또는 추가 여백을 둡니다.

참고: [섹션 4 — 레이아웃](#sec-layout), [섹션 6 — 모션](#sec-motion)

---

## 6) 모션(전환/스크롤)
<a id="sec-motion"></a>

- 원칙: 상태 변화를 명확히 전달하되 인지 부하·전력 소모를 최소화합니다.

### 6.1 View Transitions(페이지/상태 전환)

MPA 기본(CSS 선언만으로 내비게이션 전환 적용)
```css
/* 브라우저 지원 시 문서 전환 활성화 */
@view-transition { navigation: auto; }

/* 특정 요소를 전환의 주인공으로 명명 */
.hero { view-transition-name: hero; }
.thumb { view-transition-name: thumb; }

/* 전환 타이밍/커브(선택) */
::view-transition-group(hero) { animation-duration: 250ms; }
::view-transition-old(root),
::view-transition-new(root) { animation-timing-function: ease-out; }
```

SPA 상태 전환(특정 영역만 부드럽게 교체)
```ts
// 안전하게 폴백 처리
export function smoothUpdate(update: () => void) {
  // @ts-expect-error: startViewTransition는 최신 브라우저 전용
  const start = (document as any).startViewTransition as
    | ((cb: () => void) => void)
    | undefined;
  if (!start) return update();
  return start(() => update());
}

// 사용 예: 탭/필터/정렬 변경 등
smoothUpdate(() => setState(next));
```

Tailwind 보강(상태 전환 시 유틸 결합)
```tsx
// features/common/ui/FadeSwap.tsx
"use client";
import { useState } from "react";
export function FadeSwap(){
  const [on, setOn] = useState(false);
  const swap = () => {
    // View Transition을 지원하면 사용, 아니면 Tailwind 전환만
    // @ts-expect-error
    const start = (document as any).startViewTransition as undefined | ((cb: () => void)=>void);
    if (start) start(() => setOn(v => !v)); else setOn(v => !v);
  };
  return (
    <div className="space-y-2">
      <button className="btn btn-primary" onClick={swap}>스왑</button>
      <div className="transition-opacity duration-200 ease-out">
        {on ? <div className="p-3 rounded-lg bg-base-200">ON</div> : <div className="p-3 rounded-lg bg-base-200">OFF</div>}
      </div>
    </div>
  );
}
```

가이드
- 콘텐츠 이동·확대 축소 등 공간적 관계가 있을 때만 사용합니다.
- 전환 시간은 200–300ms(모바일) 권장, 지연·대기 화면에는 사용을 자제합니다.
- 뷰 전환이 잦은 뷰(스크롤 피드)는 구간별로만 제한 적용합니다.

### 6.2 Scroll‑driven Animations(스크롤 연동)

진행 바(문서 읽기 진행)
```css
.progress { height: 3px; background: color-mix(in oklab, var(--accent), black 20%); }
.progress > i {
  display: block; inline-size: 0%; block-size: 100%; background: var(--accent);
  animation: fill linear both;
  animation-timeline: scroll(root);
}
@keyframes fill { from { inline-size: 0% } to { inline-size: 100% } }
```

헤더 압축/확장(스티키 상단)
```css
header.app { position: sticky; top: 0; backdrop-filter: blur(8px); }
header.app .title { animation: shrink ease-out both; animation-timeline: scroll(root); }
@keyframes shrink { from { font-size: 1.25rem } to { font-size: 1rem } }
```

뷰 타임라인(요소가 뷰포트에 들어올 때 페이드‑업)
```css
.card { animation: reveal 480ms ease-out both; animation-timeline: view(); }
@keyframes reveal { from { opacity: 0; translate: 0 12px } to { opacity: 1; translate: 0 0 } }
```

Tailwind 보강(진행 바/헤더 전환의 유틸 결합)
```tsx
// features/shell/ui/PageProgress.tsx
export function PageProgress(){
  return (
    <div className="h-[3px] bg-base-300">
      <i className="block h-full bg-accent [animation:fill_linear_forwards] [animation-timeline:scroll(root)]"></i>
      <style jsx>{`
        @keyframes fill { from { inline-size: 0% } to { inline-size: 100% } }
        .[animation\:fill_linear_forwards]{ animation-name: fill; animation-timing-function: linear; animation-fill-mode: forwards; }
      `}</style>
    </div>
  );
}

// features/shell/ui/ShrinkHeader.tsx
export function ShrinkHeader({ title }: { title: string }){
  return (
    <header className="sticky top-0 backdrop-blur bg-base-100/80 px-3 py-2 [animation:shrink_ease-out_forwards] [animation-timeline:scroll(root)]">
      <h1 className="text-lg font-semibold">{title}</h1>
      <style jsx>{`
        @keyframes shrink { from { padding-block: 12px } to { padding-block: 6px } }
        .[animation\:shrink_ease-out_forwards]{ animation-name: shrink; animation-timing-function: ease-out; animation-fill-mode: forwards; }
      `}</style>
    </header>
  );
}
```

가이드
- 상호작용 피드백/진행 표시 등 의미 있는 케이스에 한정합니다.
- 스크롤 과부하를 막기 위해 transform/opacity 등 합성 레벨 속성 위주로 구성합니다.
- 긴 리스트에는 구간 단위로 타임라인을 나누어(섹션별) 계산량을 줄입니다.

### 6.3 접근성 · 성능

```css
@media (prefers-reduced-motion: reduce) {
  /* 전환/애니메이션 최소화 */
  ::view-transition-group(*),
  .card { animation-duration: 0.01ms; animation-iteration-count: 1; }
}
```

- INP 관점에서 긴 애니메이션/리플로우 유발 속성(top/left/width/height) 사용을 피합니다.
- 애니메이션이 입력 지연을 유발하면 조건부 비활성화합니다(저성능 기기/배터리 세이빙 모드 등).

참고: [섹션 9 — 성능](#sec-performance), [섹션 11 — 접근성](#sec-a11y), [섹션 4 — 레이아웃](#sec-layout)

---

## 7) 컴포넌트 · 오버레이
<a id="sec-components"></a>

- 원칙: 오버레이는 Popover API를 우선 사용하고, 차단형은 `<dialog>`로 구현합니다. 배경은 `inert`로 비활성화하여 포커스/스크린리더 일관성을 확보합니다.

### 7.1 Popover API(비모달·경량 오버레이)

HTML
```html
<button
  class="btn"
  popovertarget="menu1"
  popovertargetaction="toggle"
>
  메뉴
  <span class="kbd">⌄</span>
  <!-- 버튼은 암시적 앵커가 됩니다 -->
</button>

<div id="menu1" popover class="menu my-popover">
  <button class="menu-item">프로필</button>
  <button class="menu-item">설정</button>
  <button class="menu-item">로그아웃</button>
  <!-- 필요 시 role/aria-* 보강 -->
  <!-- role="menu" aria-labelledby="…" -->
</div>
```

CSS(앵커 포지셔닝으로 버튼 하단 정렬)
```css
.my-popover {
  /* Popover 기본 margin/inset이 배치를 방해하므로 초기화 권장 */
  margin: 0;
  inset: auto;
  /* 버튼(Invoker)에 암시적으로 앵커 연결 → 그리드 하단 중앙에 배치 */
  position-area: bottom;
  /* 또는 세밀 제어: bottom: calc(anchor(top) + 8px); justify-self: anchor-center; */
}

.my-popover::backdrop { background: color-mix(in oklab, black, transparent 70%); }
```

JS(선택 — 기능 감지/프로그래매틱 제어)
```js
function supportsPopover() {
  return Object.hasOwn(HTMLElement.prototype, "popover");
}
if (supportsPopover()) {
  // 버튼과 팝오버 연결에 대한 접근성 관계(aria-expanded 등)가 자동으로 관리됩니다.
  // 필요 시 document.getElementById('menu1').togglePopover(); 사용
}
```

가이드
- 토글/힌트/수동 상태는 `popover` 속성 값(`auto`/`hint`/`manual`)으로 구분합니다.
- 위치는 `position-area` 또는 `anchor()` + 정렬(`anchor-center`)로 제어합니다.
- 메뉴 항목은 키보드 탐색(Tab/Arrow)·역할(role) 속성을 적절히 부여합니다.

### 7.2 `<dialog>` + `inert`(모달)

HTML
```html
<main id="app">…</main>

<button id="openDialog" class="btn btn-primary">열기</button>

<dialog id="modal1" class="modal">
  <form method="dialog" class="modal-box">
    <h3>타이틀</h3>
    <p>내용 본문…</p>
    <menu class="modal-action">
      <button value="cancel" class="btn">취소</button>
      <button value="ok" class="btn btn-accent">확인</button>
    </menu>
  </form>
  <div class="modal-backdrop" />
  <!-- dialog는 자체 포커스 트랩/Top Layer를 사용 -->
  <!-- 닫기는 Esc 또는 form[method=dialog] 버튼으로 가능 -->
  <!-- 필요 시 <button formmethod="dialog">로 제어 -->
  
</dialog>
```

CSS
```css
dialog::backdrop { background: color-mix(in oklab, black, transparent 70%); }
```

JS(배경 `inert` 토글)
```js
const dialog = document.getElementById("modal1");
const app = document.getElementById("app");
document.getElementById("openDialog").addEventListener("click", () => {
  if (dialog?.showModal) {
    dialog.showModal();
    app?.setAttribute("inert", "");
  }
});
dialog?.addEventListener("close", () => app?.removeAttribute("inert"));
```

가이드
- `<dialog>.showModal()`은 포커스를 모달 내부로 제한하고, 배경 상호작용을 차단합니다.
- 배경 영역의 키보드 포커스 제거를 보장하려면 컨테이너에 `inert`를 병행합니다.
- 모달 내 첫 포커스 요소를 명시하고(예: 닫기 버튼), `Esc` 취소 동작을 유지합니다.

### 7.3 Anchor Positioning으로 툴팁/토스트 배치

툴팁
```html
<button id="tipBtn" popovertarget="tip1" popovertargetaction="toggle">도움말</button>
<div id="tip1" popover class="tooltip">텍스트 설명…</div>
```

```css
.tooltip { margin: 0; inset: auto; position-area: top; }
```

토스트(오른쪽 아래 고정)
```html
<button id="toastBtn">토스트</button>
<output id="toast" popover class="toast">저장되었습니다.</output>
```

```css
#toast { margin: 0; inset: auto; position-area: bottom right; }
```

참고: [섹션 11 — 접근성](#sec-a11y)
```

---

## 8) 색상 · 타이포그래피
<a id="sec-color-typography"></a>

- 원칙: 시스템/사용자 테마를 존중하고, 명도 대비·가독성을 우선합니다. 색상은 OKLCH 기반 토큰을 사용하고, 텍스트 래핑 품질을 개선합니다.

### 8.1 테마와 기본 설정

```css
html { color-scheme: light dark; }
/* 시스템 선호를 기본으로 하고, 앱 내 토글로 data-theme 등을 전환 */
```

### 8.2 OKLCH 색상 토큰(예시)

```css
:root {
  /* Brand palette (라이트 기본) */
  --brand-50:  oklch(96% 0.03 210);
  --brand-400: oklch(70% 0.16 210);
  --brand-500: oklch(62% 0.18 210); /* primary */
  --accent-500: oklch(75% 0.20 80);
  --surface:   oklch(98% 0 0);
  --text:      oklch(22% 0.02 250);
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface: oklch(18% 0.02 250);
    --text:    oklch(92% 0 0);
  }
}

/* 컴포넌트 예시 */
.btn-primary { background: var(--brand-500); color: var(--surface); }
.link { color: color-mix(in oklab, var(--brand-500), white 20%); }
```

가이드
- OKLCH로 라이트/다크에서 유사 체감 명도를 유지합니다.
- `color-mix(in oklab, …)`로 상태(Color hover/active)를 유도하고 대비를 점검합니다.

### 8.3 타이포그래피 지침

```css
/* 본문 설정 */
body {
  font: 400 1rem/1.6 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  text-wrap: pretty;           /* 미세 줄바꿈 품질 */
}

/* 제목: 균형 잡힌 줄바꿈 */
h1, h2, h3 { text-wrap: balance; line-height: 1.2; }

/* 숫자 정렬(시간/금액) */
.tabular { font-variant-numeric: tabular-nums; }

/* 긴 단어/URL 대응 */
.breakable { overflow-wrap: anywhere; hyphens: auto; }
```

가이드
- 제목에는 `balance`, 본문에는 `pretty`를 기본 적용합니다.
- 숫자 표시는 `font-variant-numeric: tabular-nums`로 단위 자리 정렬을 맞춥니다.
- 긴 URL/토큰은 `overflow-wrap: anywhere`로 레이아웃 깨짐을 방지합니다.

### 8.4 Tailwind v4 예시(본 프로젝트)

```html
<h2 class="text-balance text-2xl leading-tight">제목</h2>
<p class="text-pretty leading-relaxed">본문 단락…</p>
<p class="tabular-nums">02:37 · 1,234원</p>
```

참고: [섹션 11 — 접근성](#sec-a11y), [섹션 9 — 성능](#sec-performance)

---

## 9) 성능
<a id="sec-performance"></a>

- 원칙: INP/LCP·CLS 목표를 달성하도록 상호작용 경로와 초기 로딩을 우선 최적화합니다.

### 9.1 INP(Interaction to Next Paint) 최적화

이벤트 처리 비용을 줄이고, 긴 작업을 분할해 입력에 신속히 응답합니다.

```ts
// 1) 스크롤/포인터 리스너는 기본 passive
window.addEventListener("touchstart", onTouch, { passive: true });
window.addEventListener("wheel", onWheel, { passive: true });

// 2) rAF로 프레임당 1회만 작업(coalescing)
let rafId = 0;
function onPointerMove(e: PointerEvent) {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    updatePointerUI(e.clientX, e.clientY); // 스타일 변경은 transform/opacity 위주
  });
}

// 3) 긴 루프 분할(메인스레드 점유 최소화)
async function chunkedWork<T>(items: T[], chunk = 200) {
  for (let i = 0; i < items.length; i += chunk) {
    doHeavy(items.slice(i, i + chunk));
    // 다음 페인트로 양보
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  }
}
```

지침
- 리플로우 유발(top/left/width/height) 대신 `transform/opacity`를 사용합니다.
- 스크롤/드래그 등 고빈도 입력은 rAF로 프레임당 1회만 갱신합니다.
- 큰 계산/파싱은 청크 처리하거나 Web Worker로 오프로딩합니다.

### 9.2 LCP(최대 콘텐츠 페인트) 단축: 우선순위 힌트

히어로 이미지/폰트/핵심 CSS·JS에 명시적 우선순위를 부여합니다.

```html
<!-- 1) 히어로 이미지: fetchpriority=high + preload(선택) -->
<link
  rel="preload"
  as="image"
  href="/hero@2x.avif"
  imagesrcset="/hero.avif 1x, /hero@2x.avif 2x"
  imagesizes="(max-width: 640px) 100vw, 640px"
/>
<img src="/hero.avif" alt="Hero" width="640" height="360" fetchpriority="high" />

<!-- 2) 웹 폰트: preload + font-display: swap -->
<link rel="preload" href="/fonts/Inter-var.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face {
  font-family: Inter;
  src: url(/fonts/Inter-var.woff2) format("woff2");
  font-display: swap;
}
</style>

<!-- 3) 외부 원본: preconnect(필요 시만) -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
```

지침
- 실제로 LCP에 기여하는 소스에만 `fetchpriority="high"`를 사용합니다(과다 사용 금지).
- `preconnect`는 TTFB가 의미 있게 줄어드는 외부 도메인에 한정합니다.
- CSS/JS 번들은 코드 스플리팅으로 경로별 최소화하고, 초기 경로에 필요한 덩어리만 로드합니다.

### 9.3 이미지/폰트/레이아웃

```html
<!-- 폴드 아래 이미지는 지연 로딩 -->
<img src="/gallery/1.avif" loading="lazy" decoding="async" alt>
```

```css
/* 뷰 외 영역은 렌더 건너뛰기(지원 브라우저) */
.defer { content-visibility: auto; contain-intrinsic-size: 800px 600px; }
```

지침
- 이미지에는 `width/height`를 명시해 CLS를 방지합니다.
- 아래-폴드 콘텐츠에는 `content-visibility: auto`를 검토합니다.
- 폰트는 `font-display: swap` 또는 `optional`을 사용해 텍스트 표시 지연을 피합니다.

### 9.4 애니메이션 비용 관리

- 합성 레벨 속성(transform/opacity) 위주로 구성하고, 박스 레이아웃 변경을 피합니다.
- 긴 전환/대기 애니메이션은 INP 악화 요인이므로 조건부 축소 또는 비활성화합니다.

### 9.5 측정·모니터링

- 개발: Performance panel(메인스레드 롱태스크>50ms), Web Vitals 라이브러리로 INP/LCP/CLS 측정.
- 운영: RUM을 통해 실제 사용자 지표를 수집하고, 임계값 이탈 시 경고를 설정합니다.

참고: [섹션 6 — 모션](#sec-motion)

---

## 10) 오프라인 · PWA
<a id="sec-pwa"></a>

- 원칙: 네트워크 품질과 무관하게 핵심 사용자 흐름을 지속합니다. 정적 자산과 모델 파일은 버전 네임스페이스로 분리 캐싱하고, 오프라인 라우팅·백그라운드 업데이트·저장소 관리를 포함합니다.

### 10.1 캐시 계층(권장 구조)

- `app@v{build}`: 앱 셸·핵심 라우트(`/`, `/app.css`, 폰트 등)
- `static@v{build}`: 이미지/아이콘/서브 리소스(변경 적음)
- `models@{lang-dir}@v{model}`: 번역 모델/토크나이저(`models/ko-en/*`, `models/ja-ko/*`)
- `runtime`(선택): 런타임 캐시(라우트/이미지 등 SW에서 동적 저장)

### 10.2 설치/활성화(프리캐시 + 이전 버전 정리)

```js
// sw.js (개념 예시)
const APP_VERSION = "2025.11.09"; // 빌드 타임 대체 권장
const C_APP = `app@v${APP_VERSION}`;
const C_STATIC = `static@v${APP_VERSION}`;
const C_MODELS = (name) => `models@${name}`; // 예: models@ko-en@v12

self.addEventListener("install", (event) => {
  // 핵심 자산 프리캐시
  event.waitUntil((async () => {
    const app = await caches.open(C_APP);
    await app.addAll([
      "/",
      "/app.css",
      "/app.js",
      "/offline.html",
    ]);
    const stat = await caches.open(C_STATIC);
    await stat.addAll([
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/fonts/Inter-var.woff2",
    ]);
  })());
  self.skipWaiting(); // 즉시 대기 상태로
});

self.addEventListener("activate", (event) => {
  // 이전 버전 캐시 정리
  event.waitUntil((async () => {
    const keep = new Set([C_APP, C_STATIC]);
    for (const key of await caches.keys()) {
      if (!keep.has(key) && !key.startsWith("models@")) {
        await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});
```

### 10.3 요청 처리 전략(fetch)

```js
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 앱 내 내비게이션: 네트워크 우선, 실패 시 오프라인 페이지
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        return res;
      } catch {
        const cache = await caches.open(C_APP);
        return (await cache.match("/offline.html")) || Response.error();
      }
    })());
    return;
  }

  // 모델/토크나이저: 캐시 우선(오프라인 성능), 백그라운드 갱신
  if (url.pathname.startsWith("/models/")) {
    event.respondWith((async () => {
      const key = url.pathname.split("/").slice(2, 4).join("-"); // ko-en 등
      const cache = await caches.open(C_MODELS(key));
      const cached = await cache.match(request);
      const network = fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => undefined);
      return cached || (await network) || Response.error();
    })());
    return;
  }

  // 정적 리소스: Stale-While-Revalidate
  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(C_STATIC);
      const cached = await cache.match(request);
      const network = fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => undefined);
      return cached || (await network) || Response.error();
    })());
  }
});
```

### 10.4 백그라운드 업데이트(사용자 통보)

```js
// 클라이언트 → SW로 업데이트 적용 지시
navigator.serviceWorker.addEventListener("controllerchange", () => {
  // 토스트: "업데이트가 적용되었습니다"
});

async function applyUpdate() {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg?.update();
  const sw = reg?.waiting;
  sw?.postMessage({ type: "SKIP_WAITING" });
}

// SW 측 메시지 처리
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
```

가이드
- 업데이트는 비차단으로 다운로드하고, 사용자 동의 시 즉시 적용(`skipWaiting` + `clients.claim`).
- 모델 캐시는 언어 방향별 네임스페이스로 분리해 불필요한 교체를 방지합니다.

### 10.5 저장소 관리(StorageManager)

```ts
// 여유 공간 점검 후 대용량(모델) 다운로드 안내
if ("storage" in navigator && navigator.storage.estimate) {
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const free = quota - usage;
  if (free < 150 * 1024 * 1024) {
    // 150MB 미만이면 Wi‑Fi 권장/공간 확보 안내
  }
}

// 영구 저장 요청(지원 브라우저)
await navigator.storage.persist?.();
```

### 10.6 오프라인 라우팅

- 내비게이션 실패 시 `/offline.html`을 응답합니다.
- 필수 안내: 연결 없음 배지, 캐시된 모델/프레이즈북로 동작 중 메시지.

### 10.7 설치 UX

- Manifest에 이름/아이콘/테마색/범위를 정의하고, 설치 가능 시 사용자 트리거 버튼을 노출합니다.
- iOS/Android PWA 설치 플로우에 맞춘 안내를 제공합니다.

참고: [섹션 9 — 성능](#sec-performance), [섹션 5 — 뷰포트](#sec-viewport)

---

## 11) 접근성 · 규제
<a id="sec-a11y"></a>

- 원칙: WCAG 2.2 AA를 기본 목표로 하고, EU EAA(2019/882) 일정에 부합하도록 설계/운영합니다.

### 11.1 WCAG 2.2 핵심 추가 기준(실무 요약)

- Focus Appearance (2.4.11, AA)
  - 포커스 링이 주변과 최소 3:1 대비를 가지도록 색/두께를 설정합니다.
  - 예시
    ```css
    :focus-visible {
      outline: 2px solid #000; /* 어두움 */
      outline-offset: 2px;
      /* 다크 테마에선 노란 halo로 보조 */
      box-shadow: 0 0 0 3px var(--focus-halo);
    }
    ```
- Focus Not Obscured (Minimum) (2.4.12, AA)
  - 스티키 헤더/시트가 포커스된 요소를 가리지 않도록 `scroll-margin-top` 등을 지정합니다.
    ```css
    [tabindex], a, button, input, select, textarea { scroll-margin-top: 72px; }
    ```
- Dragging Movements (2.5.7, AA)
  - 드래그 대신 클릭/탭으로도 동일 작업을 수행할 수 있어야 합니다(예: +/− 버튼 제공).
- Target Size (Minimum) (2.5.8, AA)
  - 핵심 터치 타깃은 44×44px 이상(시각상 작아도 padding으로 터치 영역 확대).
    ```css
    .tap-target { min-width: 44px; min-height: 44px; padding: 10px; }
    ```
- Redundant Entry (3.3.9, A)
  - 이전에 제공한 정보는 자동 채움/기억으로 재입력을 강요하지 않습니다.
    ```html
    <input name="email" autocomplete="email" />
    <input name="address" autocomplete="street-address" />
    ```
- Accessible Authentication (Minimum) (3.3.7, AA)
  - 퍼즐/시각 기억 등 인지 테스트 없이 로그인 가능해야 합니다(비밀번호 표시/복붙 허용, 패스키, magic link 등).
- Consistent Help (3.2.6, A)
  - 도움말/연락처 경로를 화면 간 일관된 위치/명칭으로 제공합니다.

추가 권장
- 랜드마크 구조를 명시합니다(`<header><nav><main><aside><footer>`; 또는 `role="navigation"` 등).
- 모달은 `<dialog>` + 배경 `inert`로 포커스 트랩을 보장합니다(섹션 7 참조).

### 11.2 모바일 폼 가이드(키보드/입력)

- 키보드 유형 지정: `inputmode`, `type`(email/tel/number), `enterkeyhint`.
  ```html
  <input type="tel" inputmode="numeric" enterkeyhint="next" />
  ```
- 자동완성: `autocomplete` 토큰으로 재입력 방지(위 Redundant Entry 연계).
- 에러 메시지: 구체적·근접 위치에 제공하고, ARIA로 결합(`aria-describedby`).

### 11.3 규제(EU EAA) 일정 메모

- 적용 시작: 2025-06-28. 디지털 제품/서비스(전자상거래 등) 접근성 요구에 부합해야 함.
- 과도기: 일부 기존 제품·계약은 최대 2030-06-28까지 유통/유지 가능(국가별 세부 규정 확인 필요).
- 대응: 공공/상업 대상 서비스는 WCAG 2.2 AA 기준을 우선 충족하고, 접근성 진술서·연락처·피드백 경로를 마련합니다.

참고: [섹션 7 — 컴포넌트](#sec-components), [섹션 8 — 색상·타이포](#sec-color-typography)

---

## 12) 내부 문서 교차링크
<a id="sec-internal-links"></a>

- registry/modern-and-good-design.md
- registry/tanstack-query-pattern.md
- registry/use-form-with-query-client-pattern.md
- registry/react-hook-form-pattern.md

---

## 13) 참고 문서(공식)
<a id="sec-refs"></a>

- Core Web Vitals(INP): https://web.dev/blog/inp-cwv-march-12
- Container Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries
- @container 규칙: https://developer.mozilla.org/en-US/docs/Web/CSS/@container
- CSS Subgrid: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout/Subgrid
 - CSS Masonry Layout: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout/Masonry_Layout
 - break-inside: https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside
- View Transitions API: https://developer.mozilla.org/docs/Web/API/View_Transition_API
- Scroll-driven Animations: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations
- Popover API: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
- CSS Anchor Positioning: https://developer.mozilla.org/docs/Web/CSS/CSS_anchor_positioning
- HTML dialog: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
- Dynamic viewport units(dvh/svh/lvh): https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Values_and_units/Numeric_data_types
- Safe Area Insets(env): https://developer.mozilla.org/en-US/docs/Web/CSS/env
- `color-scheme`: https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
- OKLCH color: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch
- `text-wrap`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap
- Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Cache Storage: https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
- Clients API(Claim): https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
- skipWaiting: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
- StorageManager: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager
- WCAG 2.2 요약: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
 - Material Design 3 — Bottom sheets: https://m3.material.io/components/bottom-sheets/overview
 - Material Design 3 — Bottom navigation: https://m3.material.io/components/bottom-navigation/overview
 - Material Design 3 — Tabs: https://m3.material.io/components/tabs/overview
 - Material Design 3 — Navigation drawer: https://m3.material.io/components/navigation-drawer/overview
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
 - HTML inputmode: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode
 - HTML enterkeyhint: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/enterkeyhint
 - HTML autocomplete attribute: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
 - WAI-ARIA APG — Radio Group: https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 - WAI-ARIA APG — Switch/Checkbox: https://www.w3.org/WAI/ARIA/apg/patterns/switch/
 - Material Design 3 — Top app bar: https://m3.material.io/components/top-app-bar/overview
 - Material Design 3 — Bottom app bar: https://m3.material.io/components/bottom-app-bar/overview
 - CSS position: sticky: https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky

---

## Tailwind + DaisyUI 매핑 키
<a id="sec-tw"></a>

본 문서의 CSS 예시를 우리 프로젝트의 Tailwind v4 + DaisyUI에 맞춰 사용할 수 있도록 치트시트를 제공합니다. 일부 최신 표준(컨테이너 쿼리, 앵커 포지셔닝 등)은 Tailwind 유틸만으로 완전 대체가 어려워 최소한의 raw CSS를 병행합니다. 프로젝트의 색/토큰은 `shared/design/tokens.css`를 기준으로 합니다.

핵심 유틸 맵(예)
- 포지션/고정: `position: sticky; top:0` → `sticky top-0`; `bottom:0` → `sticky bottom-0` 또는 `fixed bottom-0`.
- 블러 배경: `backdrop-filter: blur(8px)` → `backdrop-blur`; 강도 조정은 `backdrop-blur-sm/md/lg`.
- 투명 배경: `bg-base-100/90`처럼 불투명도 슬래시 표기 사용.
- 그림자: `var(--shadow-2)` → DaisyUI `shadow` 계열(`shadow`, `shadow-lg`).
- 간격: `gap: 12px` → `gap-3`; `p: 10–12px` → `p-2.5` 또는 `px-3 py-2`.
- 그리드 자동 필: `grid-template-columns: repeat(auto-fill, minmax(14rem,1fr))` → `grid [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]`(임의 값 대괄호 문법).
- 세이프 영역: `padding-bottom: env(safe-area-inset-bottom)` → `pb-[env(safe-area-inset-bottom)]` 혹은 `pb-[calc(env(safe-area-inset-bottom)+0.5rem)]`.
- 동적 뷰포트: `min-h-[100svh] h-[100dvh]` 그대로 사용.
- 전환: `transition: … 200ms ease-out` → `transition duration-200 ease-out`.

컨테이너 쿼리(@container)
- Tailwind v4는 `@container` 지시와 함께 사용할 수 있습니다. 컨테이너 선언은 raw CSS로 `.container-block{container-type:inline-size}`를 두고, 내부 유틸에 `@container (width>=36rem){ … }`를 병행합니다. 레이아웃 섹션의 예시를 참고하세요.

앵커 포지셔닝(CSS Anchor Positioning)
- 위치는 raw CSS(`position-area`, `anchor()`)로 지정하고, 시각 스타일/간격은 Tailwind 유틸로 보강합니다. Popover/툴팁 예시를 참고하세요.

DaisyUI 컴포넌트 맵(프로젝트에서 권장)
- 내비게이션: 하단바 `btm-nav`, 상단바 `navbar`.
- 탭: `tabs` + `tab` + `tab-active`(ARIA 병행).
- 메뉴/드롭다운: `menu`, `dropdown`, `dropdown-content`.
- 카드: `card`, `card-body`, `card-actions`.
- 버튼: `btn`, 강조 `btn-accent`, 기본 `btn-primary/secondary`.
- 입력: `input input-bordered`, `select select-bordered`, `textarea textarea-bordered`.
- 모달/시트: `modal`, 내부 박스 `modal-box`(표준 `<dialog>`와 결합 권장).
- 토스트/알림: `toast`, 배지/상태: `badge`.

FSD(JSX) 표기 가이드(문서 내 코드 블록 전용)
- entries(App Router): `app/layout.tsx`, `app/(entries)/**/page.tsx` 등 라우트 조립부.
- features: `features/shell/ui/TopAppBar.tsx`, `features/translate/ui/SectionsTabs.tsx` 등 사용자 상호작용 단위.
- entities/shared: 순수 로직/유틸/디자인 토큰 등은 `entities/**`, `shared/**`.

원본 CSS → Tailwind/DaisyUI 변환 예(상단 앱바)
```tsx
// features/shell/ui/TopAppBar.tsx
"use client";
export function TopAppBar(){
  return (
    <header className="navbar sticky top-0 z-10 backdrop-blur bg-base-100/90 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 gap-2">
      <button className="btn btn-ghost btn-square" aria-label="뒤로">←</button>
      <h1 className="text-lg font-semibold flex-1">번역</h1>
      <div className="flex gap-1">
        <button className="btn btn-ghost btn-square" aria-label="검색">🔍</button>
        <button className="btn btn-ghost btn-square" aria-label="설정">⚙️</button>
      </div>
    </header>
  );
}
```

추가 참고: `shared/design/tokens.css`.

---

## UI 컴포넌트(가시적 패턴)
<a id="sec-ui"></a>

본 섹션은 UI(눈에 보이는 레이아웃/컴포넌트) 중심 가이드를 모아 제공합니다. 각 항목은 규격/언제 쓰나/금지사항/간단 예시/공식 링크로 구성됩니다. 상세 내용은 이후 단계(UI2–UI8)에서 채웁니다.

### UI-Navigation 패턴(하단 바/탭/드로어)

목표: 상위 목적지 간 전환(탐색)과 현재 위치 표시를 일관되게 제공합니다.

하단 내비게이션 바(Bottom navigation)
- 언제: 최상위 목적지 3–5개일 때 적합. 더 많으면 드로어 병행.
- 동작: 스크롤 다운 시 자동 숨김, 스크롤 업/탭 시 재노출로 콘텐츠 공간 확보.
- 표시: 활성 항목에 `aria-current="page"`(링크) 또는 `aria-selected="true"`(탭 역할) 부여.
- 레이아웃: Safe Area 하단 여백 확보. 참고: [섹션 5 — 뷰포트·세이프 영역](#sec-viewport)

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/shell/ui/BottomNav.tsx
"use client";
import Link from "next/link";

export function BottomNav(){
  return (
    <nav
      aria-label="Primary"
      className="btm-nav sticky bottom-0 z-10 bg-base-100/95 backdrop-blur gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
    >
      <Link href="/home" aria-current="page" className="[&[aria-current]]:text-primary">
        <span className="icon">🏠</span>
        <span className="btm-nav-label">홈</span>
      </Link>
      <Link href="/translate">
        <span className="icon">🔤</span>
        <span className="btm-nav-label">번역</span>
      </Link>
      <Link href="/library">
        <span className="icon">📁</span>
        <span className="btm-nav-label">보관함</span>
      </Link>
    </nav>
  );
}
```

탭(Tabs)
- 언제: 동일 위상의 콘텐츠 그룹 전환. 탭은 콘텐츠 바로 위 1행에 배치.
- 접근성: `role="tablist"` → `role="tab"`/`aria-selected`/`aria-controls` 또는 `aria-labelledby`로 패널 연결.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/translate/ui/SectionsTabs.tsx
"use client";
import { useState } from "react";

const tabs = [
  { id: "overview", label: "개요" },
  { id: "favorites", label: "즐겨찾기" },
  { id: "recent", label: "최근" },
];

export function SectionsTabs(){
  const [current, setCurrent] = useState("overview");
  return (
    <>
      <div role="tablist" aria-label="Sections" className="tabs tabs-bordered">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={current === t.id}
            className={"tab " + (current === t.id ? "tab-active" : "")}
            id={`t-${t.id}`}
            onClick={() => setCurrent(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section role="tabpanel" aria-labelledby="t-overview" className="py-3">
        {current === "overview" && <div>…개요…</div>}
        {current === "favorites" && <div>…즐겨찾기…</div>}
        {current === "recent" && <div>…최근…</div>}
      </section>
    </>
  );
}
```

Cheat Sheet(Tailwind/DaisyUI)
- 하단바: `btm-nav sticky bottom-0 bg-base-100/95 backdrop-blur gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]`
- 탭: `tabs tabs-bordered` + `tab tab-active`(ARIA: `role="tablist"/"tab"/"tabpanel"`)
- 드로어: `<dialog class="modal">` + `.modal-box` + 배경 `inert` 토글

내비게이션 드로어(Navigation drawer)
- 언제: 목적지가 많거나 정보 구조가 깊은 경우. 모바일은 모달 드로어 기본.
- 접근성: 오픈 시 본문 컨테이너에 `inert` 적용, 포커스는 드로어 내부로 제한. 닫기 버튼 제공.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/shell/ui/AppDrawer.tsx
"use client";
import { useRef } from "react";

export function AppDrawer(){
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => { ref.current?.showModal(); document.querySelector("main")?.setAttribute("inert", ""); };
  const onClose = () => document.querySelector("main")?.removeAttribute("inert");
  return (
    <>
      <button onClick={open} aria-haspopup="dialog" aria-controls="drawer" className="btn btn-ghost">메뉴</button>
      <dialog id="drawer" ref={ref} className="modal" onClose={onClose}>
        <div className="modal-box p-0">
          <nav aria-label="전체 메뉴" className="menu p-3">
            <a className="menu-item" href="/home">홈</a>
            <a className="menu-item" href="/translate">번역</a>
            <a className="menu-item" href="/library">보관함</a>
          </nav>
          <form method="dialog" className="p-3 border-t border-base-300"><button className="btn w-full">닫기</button></form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  );
}
```

참고: Material Design 3(하단 내비/탭/드로어), Apple HIG(iOS 탭바 기대치). 공식 링크는 [참고 문서](#sec-refs)에 수록.

### UI-시트·오버레이(Popover · Dialog · Bottom sheet)
- 목표: 경량 오버레이(메뉴/툴팁)와 차단형 모달/시트를 표준 API로 일관되게 구현합니다.

Popover(비모달·경량)
- 언제: 메뉴/툴팁/드롭다운처럼 배경 상호작용이 허용되는 경우.
- 패턴: 트리거 버튼 ↔ 팝오버 요소를 `popovertarget`/`popover`로 연결. 배치는 Anchor Positioning 사용.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/shell/ui/MoreMenu.tsx
"use client";
export function MoreMenu(){
  return (
    <>
      <button className="btn btn-ghost" popovertarget="m1" popovertargetaction="toggle">옵션 ▾</button>
      <div id="m1" popover className="menu shadow bg-base-100 rounded-box p-2 [margin:0] [inset:auto] [position-area:bottom]">
        <button className="menu-item">복사</button>
        <button className="menu-item">공유</button>
      </div>
    </>
  );
}
```

가이드
- 닫힘 조건(외부 탭·Esc)을 기본 허용하려면 `popover`(auto) 그대로 사용, 프로그래매틱 제어가 필요하면 `popover="manual"`을 사용합니다.
- 위치가 제한될 때는 `position-area` 또는 `position-anchor` + `anchor()`로 대체 위치를 정의합니다. 참고: [섹션 7 — 컴포넌트](#sec-components).

Dialog(모달)
- 언제: 확인/경고/설정 등 배경 차단이 필요한 경우.
- 패턴: `<dialog>.showModal()` + 배경 컨테이너에 `inert`로 포커스/상호작용 차단.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/settings/ui/SettingsDialog.tsx
"use client";
import { useRef } from "react";

export function SettingsDialog(){
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => { ref.current?.showModal(); document.querySelector("main")?.setAttribute("inert"," "); };
  const onClose = () => document.querySelector("main")?.removeAttribute("inert");
  return (
    <>
      <button className="btn" onClick={open}>설정</button>
      <dialog ref={ref} className="modal" onClose={onClose}>
        <form method="dialog" className="modal-box">
          <h3 className="font-bold text-lg mb-2">설정</h3>
          <p className="mb-4">…</p>
          <div className="modal-action">
            <button value="cancel" className="btn">취소</button>
            <button value="ok" className="btn btn-accent">확인</button>
          </div>
        </form>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  );
}
```

가이드
- 첫 포커스 요소를 명시하고, Esc로 닫기 가능하게 유지합니다.
- 모달 내 스크롤은 `overscroll-behavior: contain;`으로 바운스 간섭을 줄입니다.

Bottom sheet(바텀 시트)
- 언제: 보조 작업/선택지 노출. 화면 일부를 덮으며 제스처로 닫기 용이해야 함.
- 패턴: `<dialog>` 기반 하단 고정 + 라운드 탑 + 진입/퇴장 트랜지션.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/sheet/ui/BottomSheet.tsx
"use client";
import { useRef } from "react";

export function BottomSheet(){
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="btn btn-primary" onClick={() => ref.current?.showModal()}>옵션</button>
      <dialog ref={ref} className="modal">
        <div className="modal-box p-0 rounded-t-2xl shadow-2xl translate-y-full open:translate-y-0 transition-transform duration-200 ease-out fixed inset-x-0 bottom-0">
          <div className="w-9 h-1.5 bg-base-300 rounded-full mx-auto my-2" aria-hidden />
          <div className="p-4 max-h-[80dvh] overflow-auto">…옵션…</div>
          <form method="dialog" className="p-3 border-t border-base-300"><button className="btn w-full">닫기</button></form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  );
}
```

Cheat Sheet(Tailwind/DaisyUI)
- Popover: 트리거 `btn btn-ghost` + 오버레이 `menu rounded-box shadow p-2 [position-area:bottom]`
- Dialog: `<dialog class="modal">` + `.modal-box` + `modal-backdrop`
- Bottom sheet: `.modal-box fixed inset-x-0 bottom-0 rounded-t-2xl translate-y-full open:translate-y-0 transition-transform`

가이드
- 닫기 제스처: 스와이프다운은 선택(접근성 고려 시 버튼/탭 우선). 포커스 이동 경로를 명확히 유지합니다.
- 높이: 콘텐츠 길이에 따라 `max-height: 80dvh` 등으로 뷰포트 안전 영역을 고려합니다. 참고: [섹션 5 — 뷰포트](#sec-viewport).

참고: [Popover API](#sec-refs), [CSS Anchor Positioning](#sec-refs), [HTML `<dialog>`](#sec-refs), [Material Bottom sheets](#sec-refs). 또한 [섹션 11 — 접근성](#sec-a11y), [섹션 6 — 모션](#sec-motion) 기준을 함께 적용하세요.

### UI-카드·리스트·그리드(Masonry 폴백)
목표: 콘텐츠 성격에 맞는 목록 표현을 선택하고, 불균일 카드도 안정적으로 정렬합니다.

언제 무엇을 쓰나
- 카드(Card): 이질적 정보 묶음(이미지+메타+액션). 최대 1–2차 액션, 나머지는 오버플로 메뉴.
- 타일/그리드(Tile/Grid): 동질적 항목(갤러리/아이콘). 규칙적인 썸네일과 간단 라벨.
- 리스트(List): 정보 밀도가 필요할 때. 행 높이는 56–72px 권장(서브텍스트 포함 시 72).

카드 그리드(컨테이너 쿼리 + Subgrid)
```css
.cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
.cards { container-type: inline-size; }
@container (width >= 36rem) { .cards { gap: 16px; } }

.card { display: grid; grid-template-rows: subgrid; grid-row: span 4; row-gap: 8px; }
.card .media { aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; }
.card .title { font-weight: 600; }
.card .meta { color: oklch(45% 0.03 250); }
```

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/cards/ui/CardGrid.tsx
"use client";
export function CardGrid({ children }: { children: React.ReactNode }){
  return (
    <section className="cards grid [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))] gap-3 md:gap-4">
      {children}
    </section>
  );
}

// 개별 카드(이미 섹션 4에서도 예시 제공)
export function Card({ title, meta, children }: { title: string; meta?: string; children?: React.ReactNode }){
  return (
    <article className="card shadow">
      <figure className="aspect-[4/3] overflow-hidden rounded-lg">{/** 이미지 */}</figure>
      <div className="card-body gap-2">
        <h3 className="card-title text-base font-semibold">{title}</h3>
        {meta && <p className="text-sm text-base-content/70">{meta}</p>}
        {children}
      </div>
    </article>
  );
}
```

실험적 Masonry — 지원 시 활성화, 미지원 시 폴백
```css
/* 지원 여부 감지(@supports) → Masonry 사용 */
@supports (grid-template-rows: masonry) {
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); grid-template-rows: masonry; gap: 12px; }
}

/* 폴백 1: CSS 컬럼 — 순서 흐름에 주의(열 단위로 아래→위) */
@supports not (grid-template-rows: masonry) {
  .cards { column-count: 2; column-gap: 12px; }
  @container (width >= 48rem) { .cards { column-count: 3; } }
  .card { break-inside: avoid; display: block; margin-bottom: 12px; }
}
```

Tailwind JSX(Masonry 컬럼 폴백)
```tsx
// features/cards/ui/Masonry.tsx
export function Masonry({ children }: { children: React.ReactNode }){
  return (
    <section className="columns-2 md:columns-3 gap-3 [column-gap:12px]">
      {/* 각 카드 요소는 break-inside 방지 */}
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div key={i} className="mb-3 break-inside-avoid">{child}</div>
          ))
        : <div className="mb-3 break-inside-avoid">{children}</div>}
    </section>
  );
}
```

리스트(밀도/아이콘/스와이프)
```css
.list { display: grid; row-gap: 8px; }
.item { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; min-block-size: 56px; padding: 8px 12px; border-radius: 8px; }
.item:focus-visible { outline: 2px solid var(--brand-500); outline-offset: 2px; }
.item .affordance { color: oklch(55% 0.03 250); }
```

Tailwind/DaisyUI JSX(리스트)
```tsx
// features/list/ui/List.tsx
export function List({ items }: { items: { icon?: React.ReactNode; title: string; meta?: string; affordance?: React.ReactNode }[] }){
  return (
    <ul className="grid gap-2">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[40px_1fr_auto] items-center min-h-14 px-3 py-2 rounded-lg bg-base-100 shadow-sm">
          <div className="flex items-center justify-center text-base-content/70">{it.icon ?? '🗂️'}</div>
          <div>
            <p className="font-medium">{it.title}</p>
            {it.meta && <p className="text-sm text-base-content/60">{it.meta}</p>}
          </div>
          <div className="text-base-content/50">{it.affordance ?? '›'}</div>
        </li>
      ))}
    </ul>
  );
}
```

Cheat Sheet(Tailwind/DaisyUI)
- 카드: `card shadow` + `card-body gap-2` + 이미지 `aspect-[4/3]`
- 그리드: `grid [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))] gap-3 md:gap-4`
- Masonry 폴백: 컨테이너 `columns-2 md:columns-3 [column-gap:12px]`, 항목 래퍼 `break-inside-avoid mb-3`
- 리스트: `grid gap-2` + 아이템 `grid grid-cols-[40px_1fr_auto] min-h-14 px-3 py-2 rounded-lg`

가이드
- Masonry는 실험적입니다. 지원 표를 확인하고 폴백을 반드시 제공합니다.
- 컬럼 폴백은 시각 순서가 열 단위로 흐르므로 접근성/탭 순서와의 차이를 안내합니다.
- 카드 내부 레이아웃에는 Subgrid로 제목/메타 정렬을 고정합니다(섹션 4 참조).
- 리스트 스와이프 제스처는 보조 수단으로만 제공하고, 동일 기능의 버튼을 유지합니다.

참고: [섹션 4 — 레이아웃](#sec-layout), [섹션 9 — 성능](#sec-performance)

### UI-앱바/툴바(상·하단)
목표: 상단은 현재 화면 맥락(제목/검색/필터)을 제공하고, 하단은 상황별 주요 액션을 표시합니다. 플랫폼 기대치에 맞춰 안전영역과 스크롤 동작을 설계합니다.

상단 앱바(Top app bar)
- 구성: 제목(가운데/왼쪽 정렬), 주요 액션(검색/필터/설정), 보조 오버플로.
- 동작: 스크롤 다운 시 높이 축소/콘텐츠 강조, 스크롤 업 또는 상단 근접 시 원복.
- 배경: 투명→불투명 전환 또는 `backdrop-filter: blur()`로 가독성 확보.
- 접근성: 내비게이션 영역에 `role="navigation"` 또는 시맨틱 `<nav>` 사용.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/shell/ui/TopAppBar.tsx
"use client";
export function TopAppBar(){
  return (
    <header className="navbar sticky top-0 z-10 backdrop-blur bg-base-100/90 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 gap-2" role="navigation">
      <button className="btn btn-ghost btn-square" aria-label="뒤로">←</button>
      <h1 className="text-lg font-semibold flex-1">번역</h1>
      <div className="flex gap-1">
        <button className="btn btn-ghost btn-square" aria-label="검색">🔍</button>
        <button className="btn btn-ghost btn-square" aria-label="설정">⚙️</button>
      </div>
    </header>
  );
}
```

하단 앱바(Bottom app bar)
- 언제: 페이지 수준 주액션이 2–5개일 때. 하단 내비게이션 바와 동시 사용은 지양합니다.
- FAB 결합: 콘텐츠 작성/업로드 등 핵심 1개 액션은 FAB로 노출.
- 안전영역: `env(safe-area-inset-bottom)`만큼 여백 확보.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/shell/ui/BottomAppBar.tsx
"use client";
export function BottomAppBar(){
  return (
    <div className="sticky bottom-0 inset-x-0 z-10 bg-base-100/95 backdrop-blur px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow" role="toolbar">
      <div className="flex items-center gap-2">
        <button className="btn">복사</button>
        <button className="btn">공유</button>
        <button className="btn btn-accent">다운로드</button>
      </div>
      <button className="btn btn-circle btn-accent fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)]" aria-label="새 번역">＋</button>
    </div>
  );
}
```

Cheat Sheet(Tailwind/DaisyUI)
- 상단 앱바: `navbar sticky top-0 backdrop-blur bg-base-100/90 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2`
- 하단 앱바: `sticky bottom-0 bg-base-100/95 backdrop-blur px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]` + FAB `btn btn-circle btn-accent fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)]`

가이드
- 상단/하단 바는 동시에 과밀해지지 않도록 액션을 재배치합니다(중복 제거).
- 하단 내비게이션 바와 하단 앱바(툴바)는 동시 노출을 피하고, 필요한 경우 탭/시트로 분리합니다.
- 장치 회전/키보드 전개 시 레이아웃이 겹치지 않도록 `100dvh`·세이프 인셋을 병기합니다. 참고: [섹션 5 — 뷰포트](#sec-viewport).

### UI-폼/세그먼트 · 터치 타깃
목표: 모바일 키보드·터치 환경에서 빠르고 오류 없는 입력을 유도합니다. 한 손 조작·가독성·오류 복구를 우선합니다.

세그먼트 컨트롤(단일/복수 선택)
- 단일 선택: 시맨틱 라디오 그룹 권장(`fieldset` + `legend` + `input[type=radio]`). “버튼처럼 보이는 라디오”를 DaisyUI `join` + `btn`으로 구성합니다.
- 복수 선택: 체크박스 그룹 사용. 토글 버튼(`aria-pressed`)은 즉시 적용되는 액션에만 사용.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/settings/ui/ModeSegment.tsx
"use client";
import { useId, useState } from "react";

export function ModeSegment(){
  const name = useId();
  const [value, setValue] = useState<"fast"|"accurate">("fast");
  return (
    <fieldset role="radiogroup" aria-labelledby={`${name}-legend`} className="form-control">
      <legend id={`${name}-legend`} className="label">
        <span className="label-text">번역 모드</span>
      </legend>
      <div className="join">
        <label className="btn btn-outline join-item min-w-[44px] min-h-[44px]">
          <input className="sr-only" type="radio" name={name} value="fast" checked={value==="fast"} onChange={()=>setValue("fast")} />
          빠른
        </label>
        <label className="btn btn-outline join-item min-w-[44px] min-h-[44px]">
          <input className="sr-only" type="radio" name={name} value="accurate" checked={value==="accurate"} onChange={()=>setValue("accurate")} />
          정확
        </label>
      </div>
    </fieldset>
  );
}
```

터치 타깃(최소 44×44px)
- 시각적으로 더 작아도 실 터치 영역은 44×44px 이상이 되도록 패딩/히트 영역을 확장합니다(Apple HIG 권장).

Tailwind/DaisyUI 예시
```html
<button class="btn btn-ghost min-w-[44px] min-h-[44px] p-2.5">🔍</button>
<button class="btn btn-circle btn-accent min-w-[44px] min-h-[44px]">＋</button>
```

모바일 키보드 힌트(입력 가속)
- `type` + `inputmode`로 키패드를 맞춤: 금액/수량 → `inputmode="decimal"`, 전화번호 → `type="tel"`, 숫자 ID → `inputmode="numeric"`.
- `enterkeyhint`로 키보드 액션 레이블을 맥락화: `go`/`next`/`search`/`send`/`done`.

Tailwind/DaisyUI JSX(FSD)
```tsx
// features/settings/ui/OptionsForm.tsx
"use client";
import { useState } from "react";

export function OptionsForm(){
  const [errors, setErrors] = useState<{ username?: string }>({});
  return (
    <form className="form-control gap-3 max-w-sm">
      <label className="label" htmlFor="amount"><span className="label-text">금액</span></label>
      <input id="amount" name="amount" className="input input-bordered" inputMode="decimal" enterKeyHint="next" placeholder="금액" />

      <label className="label" htmlFor="phone"><span className="label-text">전화번호</span></label>
      <input id="phone" name="phone" className="input input-bordered" type="tel" inputMode="tel" enterKeyHint="done" placeholder="전화번호" autoComplete="tel" />

      <label className="label" htmlFor="query"><span className="label-text">검색</span></label>
      <input id="query" name="query" className="input input-bordered" type="search" enterKeyHint="search" placeholder="검색" />

      <label className="label" htmlFor="email"><span className="label-text">이메일</span></label>
      <input id="email" name="email" className="input input-bordered" type="email" autoComplete="email" />

      <label className="label" htmlFor="otp"><span className="label-text">인증 코드</span></label>
      <input id="otp" name="otp" className="input input-bordered" inputMode="numeric" autoComplete="one-time-code" />

      <label className="label" htmlFor="username"><span className="label-text">사용자명</span></label>
      <input id="username" name="username" className="input input-bordered" aria-describedby="uHelp uErr" aria-invalid={!!errors.username} />
      <small id="uHelp" className="text-sm opacity-70">영문 4자 이상</small>
      {errors.username && <p id="uErr" role="alert" className="text-error">{errors.username}</p>}

      <button className="btn btn-primary mt-2" type="submit">저장</button>
    </form>
  );
}
```

Cheat Sheet(Tailwind/DaisyUI)
- 세그먼트: `fieldset.form-control` + 라디오 `sr-only` + `join`/`btn btn-outline join-item`
- 입력: `input input-bordered`/`select select-bordered`/`textarea textarea-bordered`
- 터치 타깃: `min-w-[44px] min-h-[44px] p-2.5`(아이콘 버튼은 `btn-circle`과 병행)

가이드
- 숫자 입력은 stepper/세그먼트를 우선 고려하고, 자유 입력에는 `inputmode`를 지정합니다.
- 스와이프 제스처만으로 핵심 작업을 완료시키지 말고, 동일 기능의 버튼/링크를 제공합니다.
- 입력 중 화면 전환(탭 이동/시트 오픈)은 가급적 방지하고, 전환이 필요하다면 값 보존을 보장합니다.

### UI-플랫폼 기대치(Apple HIG · Material 3)
목표: 플랫폼별 기대치에 부합하는 기본 동작·규격을 반영해 이질감을 줄입니다.

iOS(HIG) 핵심 기대치
- 탭 바(Tab Bar): 하단 고정, 목적지 3–5개, 아이콘+라벨(라벨 생략 지양), 활성 탭은 명확한 강조.
- 내비게이션: 좌측 가장자리 스와이프 뒤로 제스처(백 제스처)와 상단 네비게이션 바 타이틀/뒤로 버튼 패턴.
- 터치 타깃: 최소 44pt(웹에서도 44px 이상 권장). 폰트 본문 최소 11pt 수준.
- 모달/시트: 시맨틱 시트(바텀 시트) 사용, 닫기 제스처 제공하되 명시적 닫기 버튼 유지.

Android/Material 3 핵심 기대치
- Bottom navigation: 3–5 목적지, 선택 상태에 라벨·아이콘 동시 표기, 선택적 레이블 숨김 패턴은 신중 사용.
- Top/Bottom app bar: 상단 앱바에 검색/필터 배치, 하단 앱바는 주액션(2–5)·FAB 결합에 사용.
- Navigation drawer: 정보 구조가 깊거나 목적지 다수일 때 모달 드로어로 제공.
- Typography/톤: MD3 타입스케일·톤 시스템에 따른 대비/간격 준수.

용어 매핑(요지)
- iOS Tab Bar ≈ Material Bottom Navigation Bar(목적지 전환)
- iOS Navigation Bar ≈ Material Top App Bar(상단 컨텍스트/액션)
- iOS Sheet ≈ Material Bottom Sheet(보조 작업/선택)

가이드
- 공통 분모를 우선 구현하고, 플랫폼 특화 동작(예: iOS 백 스와이프)은 점진적 향상으로 제공합니다.
- 아이콘만 있는 탭/버튼은 라벨을 동반하고, 툴팁/설명으로 의미를 보강합니다.
- 앱바/내비/툴바가 과밀해지면 시트·오버플로 메뉴로 분산합니다.

참고: [Apple HIG](#sec-refs), [Material 3 Navigation/Top App Bar/Bottom Navigation](#sec-refs). 관련 패턴은 [UI-Navigation](#sec-ui)·[UI-앱바/툴바](#sec-ui) 섹션을 참조하세요.
