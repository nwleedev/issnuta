---
name: e2e-test-pattern
description: Playwright E2E 테스트 전문가. E2E 테스트 작성, 디버깅, 최적화 시 PROACTIVELY 사용. 접근성 우선 셀렉터와 안정적인 테스트 패턴 제공.
tools: Read, Grep, Glob, Bash, Edit
model: inherit
---

# TypeScript + Next.js에서 Playwright E2E 테스트 베스트 패턴

이 문서는 Next.js(App Router, TS) 프로젝트에서 Playwright로 E2E 테스트를 설계·구현·운영할 때의 베스트 프랙티스와 실전 패턴을 정리합니다. 내용은 Playwright 및 Next.js 공식 문서와 실제 사용 패턴을 교차 검증해 구성했습니다.

## 목표와 원칙

- 프로덕션에 가까운 환경에서 신뢰도 높은 사용자 시나리오 검증
- 빠르고 안정적이며 재현 가능한 테스트(플레이키 감소, 디버깅 용이성)
- 접근성 우선(역할 기반 선택자), UI 안정화(애니메이션·폰트·시간 영향 최소화)
- 테스트 격리(인증/상태/데이터), 반복 가능한 CI 파이프라인

---

## 환경 준비(권장 설정)

- 패키지: `@playwright/test`(TS 내장), 브라우저 설치: `npx playwright install`
- 패키지 매니저: pnpm 기준 스크립트 예시
  - `pnpm build` → `next build`
  - `pnpm start` → `next start -p 3000`
  - `pnpm test:e2e` → `playwright test`
- Next.js 빌드 산출물 기준으로 테스트: E2E는 기본적으로 `next start`(프로덕션 서버) 권장
- 환경 변수: `NEXT_TELEMETRY_DISABLED=1`(노이즈 감소), 테스트용 `.env.test` 분리
- 이미지 최적화 등 외부 네트워크 의존을 줄여야 하는 경우: `next.config.js`에서 `images: { unoptimized: true }`(테스트 전용 빌드 프로필에서만)

---

## 추천 디렉터리와 명명 컨벤션

- 테스트 루트: `e2e/` 또는 `tests/e2e/`
- 페이지 오브젝트: `e2e/models/*Page.ts`
- 픽스처: `e2e/fixtures.ts`
- 전역 설정: `e2e/global-setup.ts`(선택, 인증/시드 등)
- 스냅샷/아티팩트: `e2e/__snapshots__/`, `playwright-report/`, `test-results/`

---

## 대표 설정 예시(`playwright.config.ts`)

```ts
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  workers: isCI ? "50%" : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // 접근성/안정성 향상
    locale: "en-US",
    colorScheme: "light",
    timezoneId: "UTC",
    // role 기반 우선. testIdAttribute는 호환성 유지를 위해 설정하되,
    // 제품 코드에는 data-testid를 부착하지 않습니다.
    testIdAttribute: "data-testid",
  },
  webServer: [
    // 프로덕션 빌드를 미리 실행한 CI라면 start만, 로컬은 build → start 흐름 권장
    {
      command: "pnpm start",
      url: "http://localhost:3000",
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 14"] },
    },
  ],
});
```

포인트

- `webServer`는 `next start` 사용을 권장(프로덕션 동작 근사). 로컬 개발 반복 시에는 별도 config/dev 파일에서 `next dev`를 사용할 수 있음.
- `reuseExistingServer`로 로컬 재실행 가속, CI에서는 매번 클린 부팅.
- 기본 선택자는 접근성 역할(`getByRole`) 우선. `data-testid`는 제품 코드에 부착 금지이며,
  불가피할 때 테스트 하네스/페이지 오브젝트 내부에서만 제한적으로 사용합니다.

---

## 셀렉터 베스트 프랙티스

- 역할·이름 기반 우선: `getByRole('button', { name: '저장' })`
- 라벨·플레이스홀더: `getByLabel('이메일')`, `getByPlaceholder('Search…')`

### 지양해야 할 셀렉터

- 테스트 ID(`data-testid`)는 구현 상세에 묶여있게 되어 사용자 동작을 테스트하기 힘들어집니다.
  특히 제품 코드에 data-testid를 추가하는 행위는 금지합니다.
- CSS/XPath는 구조 변경에 취약, 접근성도 저해됩니다.

예시

```ts
await expect(page.getByRole("heading", { name: /업로드/i })).toBeVisible();
await page.getByRole("button", { name: "다운로드" }).click();
```

---

## 인증 패턴(스토리지 상태 재사용)

전역 1회 로그인 후 스토리지 상태를 재사용하면 속도와 안정성을 크게 개선할 수 있습니다.

`e2e/global-setup.ts`

```ts
import { request, FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use?.baseURL as string;
  // API 로그인(권장) 또는 UI 로그인 중 택1
  const context = await request.newContext({ baseURL });
  // 예시: 쿠키/토큰 발급 API 호출(프로젝트에 맞게 수정)
  await context.post("/api/test-login", { data: { user: "e2e", pass: "e2e" } });
  await context.storageState({ path: "e2e/.auth/state.json" });
  await context.dispose();
}
```

`playwright.config.ts`

```ts
// ...
use: {
  // ...
  storageState: 'e2e/.auth/state.json',
},
// ...
globalSetup: require.resolve('./e2e/global-setup'),
```

팁

- 가능하면 API 기반 로그인(빠르고 안정적). UI 로그인은 변경에 취약
- 사용자/권한별로 state 파일 분리 가능(`storageState` 프로젝트 오버라이드)
- NextAuth 등 외부 인증은 콜백/세션 쿠키만 주입하는 전용 테스트 엔드포인트를 마련하면 편리

---

## 픽스처와 페이지 오브젝트 모델(POM)

도메인 행위를 캡슐화해 테스트 본문을 간결하게 유지합니다.

`e2e/models/TranslatorPage.ts`

```ts
import { Page, expect } from "@playwright/test";

export class TranslatorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/");
    await expect(
      this.page.getByRole("heading", { name: /텍스트 번역/i })
    ).toBeVisible();
  }

  async enterText(text: string) {
    await this.page.getByPlaceholder("번역할 텍스트").fill(text);
  }

  async swapLanguages() {
    await this.page.getByRole("button", { name: /swap languages/i }).click();
  }

  async translate() {
    await this.page.getByRole("button", { name: "번역" }).click();
  }
}
```

`e2e/fixtures.ts`

```ts
import { test as base } from "@playwright/test";
import { TranslatorPage } from "./models/TranslatorPage";

export const test = base.extend<{ translator: TranslatorPage }>({
  translator: async ({ page }, use) => {
    const translator = new TranslatorPage(page);
    await use(translator);
  },
});

export const expect = test.expect;
```

사용 예시

```ts
import { test, expect } from "./fixtures";

test("텍스트 입력→스왑→번역 결과 표시", async ({ translator, page }) => {
  await translator.goto();
  await translator.enterText("안녕하세요");
  await translator.swapLanguages();
  await translator.translate();
  await expect(page.getByRole('status')).toContainText(/\S/);
});
```

---

## 네트워크 모킹과 외부 의존성 제거

- API 스텁: `page.route('**/api/*', route => route.fulfill(...))`
- HAR 재생: 외부 3rd-party를 `routeFromHAR`로 녹화/재생하여 결정론적 테스트
- 오프라인/에러 케이스: `context.setOffline(true)`, `route.abort()`

예시(HAR)

```ts
import { test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.routeFromHAR("e2e/har/external.har", { notFound: "fallback" });
});
```

---

## 시각/스냅샷 테스트 안정화

- 애니메이션 비활성화: CSS 주입이나 `use: { launchOptions: { args: ['--disable-renderer-backgrounding'] } }`보다 CSS가 효과적
- 폰트·시간 고정: `timezoneId: 'UTC'`, 변동 날짜를 고정 데이터로 렌더, 원격 폰트는 로컬 번들
- 뷰포트 고정: 장치 프리셋 사용 또는 `viewport: { width, height }`
- 권장 어서션: `await expect(locator).toHaveScreenshot()`(작은 허용 오차 지정)

예시(애니메이션 제거)

```ts
await page.addStyleTag({
  content:
    "*{transition:none!important;animation:none!important;caret-color:transparent!important}",
});
```

---

## 시간·동기화와 플레이키(Flakiness) 감소

- 강제 대기 `waitForTimeout` 지양, `locator.waitFor`, `expect(...).toBeVisible()` 사용
- 타임아웃은 합리적으로(전역 `timeout`, 어서션 `expect.timeout`)
- 재시도(`retries`)는 CI에서만, 실패 시 Trace/Video/Screenshot로 원인 파악
- 병렬성 관리: 전역 상태 공유 지양, 포트/리소스 충돌 없게 설계

---

## Next.js(App Router) 특화 포인트

- 서버 실행: E2E는 `next start`(프로덕션) 기준, 로컬 개발 속도 용도로만 `next dev`
- 라우트 핸들러/API 검증: E2E 외에 `test.request`(Playwright의 APIRequestContext)로 API를 빠르게 검증 가능
- 미들웨어/리다이렉트: 기대 URL/헤더를 명시적으로 어서트
- 이미지/정적 자산: 외부 네트워크 의존성 최소화(`images.unoptimized: true` 등 테스트 전용 설정)

---

## CI 통합(예: GitHub Actions, pnpm)

```yaml
name: e2e
on: [push, pull_request]

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm build # next build
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report }
```

팁

- 브라우저 캐시: CI에서 Playwright 브라우저 캐시는 기본적으로 아티팩트 업로드에 의존하지 않음. 설치 시간 최적화가 필요하면 런너 캐싱 전략 검토
- `.next/cache`는 빌드 이전 단계 캐시 전략과 병행 가능

---

## 금지사항(안티패턴)과 대안

다음 패턴은 장기적으로 테스트 신뢰도·보안·유지보수성을 해치므로 금지합니다. 필요한 경우 아래 대안을 사용하세요.

- 앱 컴포넌트에 테스트 헬퍼 주입 금지
  - 금지: `window.__e2e*` 전역 함수/플래그를 React 컴포넌트(useEffect 등)에서 등록·사용
  - 문제: 보안 노출(XSS 악용 지점), 프로덕션 번들 크기 증가, 마운트 타이밍과의 레이스, 실제 사용자 플로우 왜곡
  - 대안: Playwright 1급 API 및 픽스처 사용
    - 파일 업로드: `locator.setInputFiles()` 또는 `page.setInputFiles()`
    - 테스트용 함수 주입: `page.exposeFunction()`
    - 초기 스크립트: `browserContext.addInitScript()`로 테스트 컨텍스트에만 주입

- 임의 대기(`waitForTimeout`) 남용 금지 → 조건 기반 동기화 사용(`expect(...).toBeVisible()` 등)
- 구현 세부(CSS/XPath/클래스명)에 결합된 셀렉터 금지 → 역할/라벨 우선, 필요 시 제한적 `data-testid`
- Dev 전용 오버레이/툴 요소를 대상으로 한 어서션 금지 → 프로덕션 UI 기준 검증
- 외부 네트워크 직접 의존 금지 → `page.route(...)` 모킹 또는 HAR 재생으로 결정론화
- 전역 상태 공유로 테스트 간 오염 금지 → 픽스처로 격리, `storageState` 분리
- 스냅샷에서 뷰포트/시간/폰트 비고정 금지 → 기기/시간대 고정, 애니메이션 제거
- 다운로드 검증에서 파일명만 확인 금지 → 파일 바이트를 읽어 핵심 속성 검증(예: PNG IHDR의 width/height)
- 하드코딩된 포트/서버 수명 주기 결합 금지 → `webServer` 또는 외부 서버 재사용 옵션 활용

권장 예시(파일 업로드와 옵션 변경)

```ts
// 업로드: 실제 사용자 경로를 따름
const filePath = testInfo.outputPath('tmp/sample.png');
await page.setInputFiles('input[type="file"]', filePath);

// 옵션 변경: 라벨/롤 기반으로 조작
await page.getByRole('button', { name: '옵션', exact: true }).click();
await page.getByLabel('배경 모드').selectOption('solid');
const color = page.getByLabel('배경 색상');
await color.evaluate((el, v) => {
  (el as HTMLInputElement).value = v as string;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, '#00ff00');
```

---

## 디버깅과 리포트

- 대화형: `PWDEBUG=1 pnpm test:e2e` 또는 `npx playwright codegen`
- 트레이스: 실패 시 자동 수집(`trace: 'on-first-retry'`), `npx playwright show-trace trace.zip`
- 리포트: HTML 리포트, GitHub Actions 아티팩트 업로드

---

## 체크리스트(요약)

- 서버: 프로덕션 빌드 + `next start` 기준 테스트
- 셀렉터: 역할/라벨 우선, 필요 시 `data-testid`
- 인증: 스토리지 상태 재사용(전역 한 번 로그인)
- 상태: 테스트 간 격리(세션/DB/파일)
- 모킹: 외부 네트워크는 HAR/route로 스텁
- 시각: 애니메이션·폰트·시간 고정, 스냅샷 허용오차 설정
- CI: 재시도·트레이스·병렬·샤딩 구성
- 보안/품질: 앱 컴포넌트에 E2E 헬퍼 주입 금지(`window.__e2e*` 등), Playwright 표준 API 활용

---

## 참고 문서(공식)

- Playwright
  - Authentication: https://playwright.dev/docs/auth
  - Network mocking & HAR: https://playwright.dev/docs/mock
  - Fixtures: https://playwright.dev/docs/test-fixtures
  - Locators: https://playwright.dev/docs/locators
  - Test configuration(webServer, retries 등): https://playwright.dev/docs/test-configuration
  - Assertions: https://playwright.dev/docs/test-assertions
  - Snapshots & screenshots: https://playwright.dev/docs/test-snapshots
  - Trace viewer: https://playwright.dev/docs/trace-viewer
  - CI: https://playwright.dev/docs/ci
  - Parallel & sharding: https://playwright.dev/docs/test-parallel, https://playwright.dev/docs/test-sharding
  - Timeouts & retries: https://playwright.dev/docs/test-timeouts, https://playwright.dev/docs/test-retries
  - Reporters: https://playwright.dev/docs/test-reporters
- Next.js(App Router)
  - Playwright 가이드: https://nextjs.org/docs/app/guides/testing/playwright

---

## 부록: 로컬 빠른 반복용(dev 서버) 설정 예시

프로덕션과 별도로, 로컬에서 빠르게 반복하려면 `next dev`를 쓰는 별도 설정 파일을 둘 수 있습니다.

`playwright.dev.config.ts`

```ts
import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...base,
  webServer: [
    {
      command: "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
```

사용: `playwright test -c playwright.dev.config.ts`

---

본 문서는 프로젝트 특성(예: 인증 방식, 외부 API, 이미지 처리)에 따라 커스터마이즈가 필요합니다. 위 패턴을 기준으로 도메인 요구에 맞게 픽스처/모킹/데이터 시딩 전략을 보강하세요.
