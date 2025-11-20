# Better Mobile Design — 디자인 템플릿 기반 UI 가이드

본 문서는 `design-templates/`의 컴포넌트와 레이아웃 소스를 기준으로, 우리 프로젝트에서 일관된 “모바일 앱 같은” UI를 구현하기 위한 규칙·패턴·체크리스트를 정리합니다. 외부 링크 대신 레포 경로만 인용합니다.

## 0) 목적/범위

- 목적: 모바일 우선 UI 토큰, 레이아웃, 컴포넌트 조합법을 표준화하여, 기능 개발 시 디자인 일관성과 접근성을 확보합니다.
- 범위: 전역 토큰/레이아웃, 핵심 프리미티브, 네비게이션/오버레이, 피드백, 모션, 모바일 특화 규칙, 적용 체크리스트.

참조 소스(주요):
- 전역/테마: `design-templates/styles/globals.css`, `design-templates/components/theme-provider.tsx`, `design-templates/app/layout.tsx`
- 샘플 화면: `design-templates/components/translation-app.tsx`
- 프리미티브: `design-templates/components/ui/button.tsx`, `design-templates/components/ui/input.tsx`, `design-templates/components/ui/textarea.tsx`, `design-templates/components/ui/select.tsx`, `design-templates/components/ui/card.tsx`, `design-templates/components/ui/separator.tsx`, `design-templates/components/ui/badge.tsx`
- 오버레이/피드백: `design-templates/components/ui/drawer.tsx`, `design-templates/components/ui/sheet.tsx`, `design-templates/components/ui/dialog.tsx`, `design-templates/components/ui/toast.tsx`, `design-templates/components/ui/toaster.tsx`, `design-templates/components/ui/tooltip.tsx`, `design-templates/components/ui/hover-card.tsx`, `design-templates/components/ui/popover.tsx`, `design-templates/components/ui/skeleton.tsx`, `design-templates/components/ui/spinner.tsx`, `design-templates/hooks/use-toast.ts`
- 내비/컨테이너: `design-templates/components/ui/sidebar.tsx`, `design-templates/components/ui/navigation-menu.tsx`
- 유틸: `design-templates/lib/utils.ts`

---

## 1) 디자인 토큰과 전역 규칙

- 컬러/반경 토큰
  - 토큰 정의는 `design-templates/styles/globals.css`에서 `:root`와 `.dark`로 분기합니다.
  - Tailwind 4 토큰 매핑은 `@theme inline` 블록으로 노출합니다. (예: `--color-primary`, `--radius-*`).
  - UI 일관성: 보더/포커스 링은 전역 `@layer base`에서 `border-border`, `outline-ring/50`를 모든 요소에 적용합니다.

- 다크 모드/테마
  - `.dark` 클래스 스위치 기반. 런타임 제공자는 `design-templates/components/theme-provider.tsx`를 참조합니다.
  - 기본 컨트롤 톤은 토큰에 종속되며, 개별 컴포넌트에서 추가 색 선언을 지양합니다.

- 폰트/전역 레이아웃
  - 폰트: `design-templates/app/layout.tsx`에서 Geist 계열을 로드합니다.
  - 전역 스타일 진입점: `design-templates/app/globals.css` → 실제 토큰은 `styles/globals.css`에서 관리합니다.

권장 원칙
- “투명 표면 + 보더 + 은은한 섀도우”를 기본 표면으로 채택합니다.
- 포커스 가시성 보장: `focus-visible:ring-[3px] ring-ring/50` 패턴 유지.

---

## 2) 레이아웃(앱 셸) 규칙

- 뷰포트/세이프 영역
  - 루트 컨테이너는 `min-h-screen` 또는 `min-h-dvh`를 사용하고, 상·하단 고정 바에는 `pt-[env(safe-area-inset-top)]`, `pb-[env(safe-area-inset-bottom)]`를 적용합니다.
  - 샘플: `design-templates/components/translation-app.tsx`의 바텀 패딩/큰 라운드 표면 조합.

- 헤더/풋터
  - 헤더는 얕은 그림자와 얇은 보더(또는 반투명 배경)로 구분합니다.
  - 풋터/바텀 액션은 고정 배치 시 세이프 영역 패딩을 반드시 포함합니다.

- 배경/톤
  - 배경은 단색 또는 그라디언트 층(`bg-gradient-to-br from-background via-accent/10 to-background/95`)을 사용합니다. 참조: `design-templates/components/translation-app.tsx`.

---

## 3) 프리미티브 컴포넌트(디자인 시스템 코어)

- 유틸/합성
  - 클래스 합성: `design-templates/lib/utils.ts`의 `cn()` 사용.
  - 변형 시스템: `class-variance-authority(cva)`로 `variant`/`size` 패턴 통일. 참조: `design-templates/components/ui/button.tsx`.
  - 슬롯/후킹: 각 컴포넌트 루트에 `data-slot`을 부여하여 테스트/스타일 후킹을 단순화합니다.

- Button
  - 변형: `default | destructive | outline | secondary | ghost | link`.
  - 사이즈: `sm | default | lg | icon | icon-sm | icon-lg`.
  - 접근성/상태: `focus-visible:border-ring`/`focus-visible:ring-[3px]`, `disabled:*`, `aria-invalid:*`.
  - 소스: `design-templates/components/ui/button.tsx`.

- Input/Textarea/Select
  - 공통: “투명 배경 + 보더 + 포커스 링 + 부드러운 전환” 패턴.
  - Select는 Radix 기반으로 `SelectTrigger`, `SelectContent`, `SelectItem` 조합. 소스: `design-templates/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`.

- Card/Badge/Separator
  - 카드: 완만한 반경(`rounded-xl~3xl`), 얕은 그림자(`shadow-sm`), 표면 토큰 `bg-card`/`bg-primary/8` 사용. 소스: `design-templates/components/ui/card.tsx`, `badge.tsx`, `separator.tsx`.

---

## 4) 네비게이션/컨테이너

- Sidebar (데스크톱 우선, 모바일 시 시트 폴백)
  - 변형: `variant = sidebar | floating | inset`, `collapsible = offcanvas | icon | none`.
  - 상태 데이터: `data-state`, `data-collapsible`, `data-variant`, `data-side`로 스타일링 제어.
  - 모바일: Sheet 기반 오프캔버스(`openMobile`)로 자동 전환. 키보드 토글 `⌘/Ctrl + b` 제공.
  - 소스: `design-templates/components/ui/sidebar.tsx`.

- Drawer/Sheet
  - 바텀 시트: `design-templates/components/ui/drawer.tsx`는 오버레이, 핸들(pill), 방향별 크기/라운드/보더 변형을 제공합니다.
  - 시트: `design-templates/components/ui/sheet.tsx`는 Radix Dialog 래핑으로 모달/패널을 일관 스타일로 제공합니다.

- 상단 앱바/바텀 액션
  - 샘플은 `translation-app.tsx` 헤더(타이틀/오프라인 배지/아이콘 버튼)와 입력 모드 토글(텍스트/보이스/이미지)에서 확인할 수 있습니다.

---

## 5) 오버레이/피드백

- Dialog/Popover/Tooltip/HoverCard
  - 공통적으로 Radix 상태 속성(`data-state`)과 토큰을 이용해 진입/퇴장/포커스를 일관 제어합니다.
  - 소스: `design-templates/components/ui/dialog.tsx`, `popover.tsx`, `tooltip.tsx`, `hover-card.tsx`.

- Toast
  - 변형: `default | destructive`.
  - 뷰포트: 모바일 상단 전체폭, 데스크톱 하단 우측. 소스: `design-templates/components/ui/toast.tsx`, `entries/ui/Toaster.tsx`, `shared/lib/use-toast.ts`.

- Progress/Skeleton/Spinner
  - 비동기/지연 구간은 Skeleton 우선, 진행률이 있을 때 Progress 사용. 소스: `design-templates/components/ui/progress.tsx`, `skeleton.tsx`, `spinner.tsx`.

---

## 6) 모션/상태 스타일 패턴

- 상태 클래스: `data-[state=open|closed]`, `aria-*`를 Tailwind 유틸과 결합해 애니메이션을 제어합니다.
- 애니메이션: `tw-animate-css` 유틸을 사용해 `slide-in-from-bottom`, `fade-in` 등 표준화된 모션을 적용합니다. 참조: `design-templates/styles/globals.css`, 오버레이 컴포넌트들.
- 포커스/에러: `focus-visible:*`와 `aria-invalid:*` 패턴을 모든 입력/버튼에 공통 적용.

---

## 7) 모바일 특화 규칙(샘플 UI 근거)

- 터치 타깃/여백
  - 버튼/탭 높이: `h-12 ~ h-14` 권장, 아이콘 버튼은 `rounded-full`.
  - 인접 타깃 간 여백: 8px(= `gap-2`) 이상.

- 형태감/톤
  - 큰 라운드(`rounded-2xl/3xl`)와 얕은 그림자(`shadow-sm`), 중성 톤의 상태 배지(`bg-primary/15 text-primary`).
  - 입력 표면: `bg-secondary/60` 같은 반투명/톤다운 표면 사용.

- 안전 영역/키보드
  - 고정 바/플로팅 액션: `pb-[env(safe-area-inset-bottom)]` 포함.
  - 키보드/주소창 변동에 강한 레이아웃: `min-h-dvh` 우선.

- 예시 참고: `design-templates/components/translation-app.tsx`의 언어 선택 Select, Swap 버튼, 입력 모드 토글, 결과 카드.

---

## 8) 접근성(A11y) 기본

- 포커스 표시를 사용자화하지 말고 토큰 기반 링을 유지합니다.
- ARIA/상태: 입력류는 `aria-invalid`를 정확히 표기, 오버레이는 루트 엘리먼트에 Radix 프롭을 그대로 전달.
- 인터랙션 밀집도: 터치 타깃 최소 44px 이상, 키보드 포커스 흐름이 끊기지 않도록 탭 순서 유지.

---

## 9) 컴포넌트 조합 레시피

아래는 템플릿 스타일을 따르는 “앱스러운” 기본 화면 예시 조합입니다. 실제 구현은 각 페이지에서 프리미티브를 조합합니다.

```tsx
// App Shell 예시(요약)
// - 헤더: 타이틀 + 유틸 액션
// - 본문: 카드형 입력/결과
// - 바텀: 고정 액션(세이프 영역 고려)

import { Button } from "@/shared/ui/button"
import { Card } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"

export function MobileScreen() {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-background via-accent/10 to-background/95">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-lg font-semibold">Title</h1>
        <Button variant="ghost" size="icon" className="rounded-full" />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pb-24">
        <Card className="rounded-3xl border-0 p-4 shadow-sm">
          <Input placeholder="Type here" className="h-12" />
        </Card>
        <Card className="rounded-3xl border-0 p-5 shadow-sm" />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-screen-sm items-center gap-3 p-4">
          <Button className="h-12 flex-1 rounded-2xl">Primary</Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 10) API/구현 컨벤션

- 파일/폴더
  - 프리미티브는 `shared/ui/*`에 배치하고, 제품 컴포넌트는 기능 폴더(`features/*/ui`)에서 조합합니다. 전역 엔트리/프로바이더는 `entries/*`에 둡니다. 공유 훅/유틸은 `shared/lib/**`에 둡니다. 예: `shared/lib/use-toast.ts`.

- 속성/패턴
  - `asChild`(Slot) 지원은 가능하면 유지하여 링크/버튼/아이템 컴포저빌리티를 확보합니다.
  - `data-slot` 속성으로 의미를 부여하고, 테스트/스타일은 `data-slot` 기반을 우선합니다.
  - 상태는 `data-[state]`, 사이즈는 `data-size` 등 데이터 속성을 통해 Tailwind 조건부 클래스로 제어합니다.

---

## 11) 적용 체크리스트(우선순위)

1) 전역 토큰 이식
- `styles/globals.css` 토큰/베이스 레이어를 우리 `app/globals.css`에 반영(중복/충돌 확인).

2) 프리미티브 채택(파일 단위)
- `shared/ui/button.tsx` → 버튼 변형/사이즈 표준화.
- `shared/ui/input.tsx` `textarea.tsx` `select.tsx` → 입력 일관화.
- `shared/ui/card.tsx` → 표면 규격 통일.

3) 모바일 컨테이너
- 첫 화면에 Drawer/Sheet 중 하나를 연결해 모달/시트 UX 토대를 구축.

4) 네비게이션(데스크톱 대응 포함)
- `shared/ui/sidebar.tsx` 기반으로 데스크톱 사이드바 + 모바일 시트 폴백을 구성.

5) 피드백/모션
- `entries/ui/Toaster.tsx` 세팅, 토스트 훅 연결.
- 오버레이 계열에서 `data-[state]` 애니메이션 정상 동작 확인.

검증 포인트
- 포커스/에러 링 노출, 다크 모드, 세이프 영역 패딩, 터치 타깃 크기.

---

## 12) 결정/우선순위(충돌 시)

- 사용자 지시 > `AGENTS.md` > 본 문서(`registry/better-mobile-design.md`) > `design-templates/*` 예시 > 일반 관례.
- 템플릿과 우리 규칙이 충돌할 경우, 전역 토큰/접근성/안전 영역 규칙을 우선합니다.

---

## 13) 부록 — 구성 요소별 소스 맵

- 전역/테마: `design-templates/styles/globals.css`, `design-templates/components/theme-provider.tsx`, `design-templates/app/layout.tsx`
- 화면 샘플: `design-templates/components/translation-app.tsx`
- 프리미티브: `design-templates/components/ui/button.tsx`, `design-templates/components/ui/input.tsx`, `design-templates/components/ui/textarea.tsx`, `design-templates/components/ui/select.tsx`, `design-templates/components/ui/card.tsx`, `design-templates/components/ui/separator.tsx`, `design-templates/components/ui/badge.tsx`
- 오버레이: `design-templates/components/ui/drawer.tsx`, `design-templates/components/ui/sheet.tsx`, `design-templates/components/ui/dialog.tsx`, `design-templates/components/ui/popover.tsx`, `design-templates/components/ui/tooltip.tsx`, `design-templates/components/ui/hover-card.tsx`
- 피드백: `design-templates/components/ui/toast.tsx`, `design-templates/components/ui/toaster.tsx`, `design-templates/components/ui/skeleton.tsx`, `design-templates/components/ui/spinner.tsx`, `design-templates/components/ui/progress.tsx`
- 내비/컨테이너: `design-templates/components/ui/sidebar.tsx`, `design-templates/components/ui/navigation-menu.tsx`
- 유틸: `design-templates/lib/utils.ts`, `design-templates/hooks/use-toast.ts`
