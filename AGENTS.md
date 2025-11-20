# AGENTS.md — 오프라인 대응 번역 웹앱(모바일 우선) 제안서

## 언어

- 내부적으로 작업을 할 때는 **영어**를 사용
- 사용자와 소통이 필요한 경우에는 **한국어**를 사용
  - 터미널(CLI) 상으로 결과를 표시할 때
  - 파일을 작성하고 주석 등으로 코드를 대략적으로 설명해야 할 때 등

## 네트워크

- 작업을 수행하기 전 네트워크 연결을 반드시 확인해주세요.
- 네트워크 연결되어있지 않으면 작업을 종료해주세요.
- 연결 테스트의 대상은 다음과 같습니다.
  - 1.1.1.1
  - 8.8.8.8

## 기술 스택 및 런타임

- Next.js 15(App Router, `app/` 디렉터리 사용).
- React 19 + TypeScript(`strict` 모드, `tsconfig.json` 기반).
- Tailwind CSS 4(유틸리티 우선 스타일링, `app/globals.css` 적용).
- ESLint Flat 구성(`eslint.config.mjs`)으로 품질 관리.
- Node.js 18+ 권장, 20 LTS 우선; 패키지 매니저는 `pnpm` 사용.
- 모듈 경로 별칭 `@/*` 사용 가능(`tsconfig.json`의 `paths` 설정 참조).

## 작업 가이드

- 인터넷 연결이 되어있지 않으면 작업을 즉시 중단해주세요.
- 교차 검증: 답변 또는 작업 그리고 그 근거를 인터넷 자료 조사를 통해 교차 검증해야 함. 블로그 및 양산형 큐레이션 글보다는, 공식 문서와 실제 존재하는 소스 코드를 최우선적으로 참조. 현재 기준 최신순으로 자료 조사할 것.
- 작업하다가 확실하지 않은 부분이 하나라도 있으면 질문 하나를 제공해주시고 대기하세요.
- 브랜치 전략: trunk 기반 또는 feature 브랜치 후 PR 권장. 커밋 메시지는 Conventional Commits 권장(`feat:`, `fix:`, `chore:` 등).
- 코딩 컨벤션: ESLint/Prettier 설정 준수. Server/Client 컴포넌트 혼용 시 SSR 안전성 확인(브라우저 전용 라이브러리는 Client에서만 사용).
- 대규모 변경 시 절차: 페이지/라우트 단위 점진적 변경, 기능 플래그 고려.
- 성능/보안 체크리스트: 불필요한 클라이언트 번들 축소, 이미지 최적화, 민감정보 노출 금지, 외부 API 타임아웃/재시도 정책 확인.
- 작업 분할: Codex가 진행할 수 있는 작업의 단위는 최대 하나의 파일이고, 개발자가 원한다면 하나의 파일에서 더 분할할 수 있습니다. 작업을 진행하기 전에 작업의 단위가 기준에 비해서 크진 않은지 체크해주세요.

## 보안·권한

- 민감정보(.env, 토큰) 편집/출력 금지. 공개 가능한 URL만 문서화.
- 데이터 삭제/급진적 변경 시 사전 승인 필요.
- 제3자 라이선스 준수 및 저작권 표기 유지.

## 레지스트리 문서 자동 참조 규칙

작업 시 관련 지시사항(`registry/**/*.md`)을 자동으로 탐색·적용하기 위한 공통 규칙입니다. 라인 번호 참조는 금지하고, 파일 경로/컴포넌트/함수 같은 안정적인 식별자를 사용합니다.

- 세부 규칙을 적용한 경우 파일 이름을 터미널에서만 언급해주세요.

- 우선순위

  - 사용자 지시 > (경로상) AGENTS.md > `registry/**/*.md` > README/주석/일반 관례
  - 동일 범위 충돌 시 더 깊이 중첩된 문서(더 구체적 범위)가 우선

- 적용/증빙 방식

  - 답변/요약에서 참조한 문서를 "파일 경로"로만 명시(라인 번호 금지)
  - 충돌 시 어떤 문서를 우선했는지 간단히 근거 제시

- 문서 부재 시 대응

  - 이미 존재하는 지시사항 마크다운 문서를 준수하면서, 반복 작업이 예상되면 추가 문서 작성을 제한할 수 있음.

## 금지

- 레지스트리 문서에 라인 번호 고정 참조 추가 금지(구조 변경 시 취약)
- 근거 없는 블로그 링크 우선 참조 금지(공식 문서/실제 소스 최우선)

## 0) 한줄 요약

모바일 브라우저에서 **오프라인으로도 동작**하는 번역 기능을 제공하기 위해, **Transformers.js + ONNX Runtime Web(WASM/WebGPU)** 기반의 **경량 번역 모델(MarianMT/Opus-MT 계열)** 을 PWA로 캐싱·실행하는 방안을 채택합니다. 필요 시 온라인 환경에서 서버측 고성능 모델로 **하이브리드 업스케일**을 제공합니다. ([Hugging Face][1])

---

## 1) 목표/범위

- **언어쌍**: 한국어↔영어, 한국어↔일본어（각 양방향）
- **품질**: 전문번역이 아닌 **여행/일상 의사소통 수준**
- **디바이스/플랫폼**: **모바일 브라우저 우선**, 오프라인 가능(PWA 설치 지원)

---

## 2) 핵심 결정사항（Why this approach）

1. **브라우저 내 추론**

   - **Transformers.js**: 허깅페이스 모델을 **서버 없이 브라우저에서 실행**하는 공식 JS 라이브러리, 고수준 `pipeline()` API 제공. ([Hugging Face][2])
   - **ONNX Runtime Web**: 브라우저에서의 추론 엔진. 기본 **WASM** 경로 + 지원 시 **WebGPU 가속**으로 지연을 낮춤. ([ONNX Runtime][3])

2. **오프라인 UX**

   - **Service Worker + Cache Storage**로 **앱/모델/토크나이저**를 프리캐시 → **네트워크 불가** 상태에서도 번역 지속. PWA 가이드/MDN 권장 패턴 따름. ([MDN Web Docs][4])

3. **경량 번역 전용 모델**

   - **Helsinki-NLP/Opus-MT(MarianMT)**: KO↔EN/JA 공개 모델과 라이선스 명시(다수 Apache-2.0). 모바일에서 **가벼운 용량으로 실용적 번역 품질** 확보 용이. ([Hugging Face][5])

4. **호환성/성능 리스크 완화**

   - WebGPU 미지원 브라우저는 **자동 WASM 폴백**, 지원 시 WebGPU로 가속. WebGPU API·호환정보는 MDN 최신 문서를 기준으로 검증. ([MDN Web Docs][6])

---

## 3) 시스템 개요(아키텍처)

### 3.1 클라이언트(Next.js/React/TS)

- **모델 로더**: 언어 방향별(예: `ko→en`, `en→ko`, `ko→ja`, `ja→ko`)로 **필요한 모델만** 지연 로드(Lazy).
- **추론 백엔드**: 기본 ONNX Runtime Web **WASM**, `navigator.gpu` 감지 시 **WebGPU EP**로 스위칭. ([ONNX Runtime][7])
- **PWA/오프라인**: 서비스워커가 앱 번들+모델/토크나이저 파일을 **Cache Storage**에 저장. IndexedDB는 메타데이터/프레이즈북 저장에 활용. ([MDN Web Docs][4])
- **UX**:

  - 오프라인 배지(“로컬 번역 중”), **모델 다운로드 안내(용량/네트워크 경고)**
  - **문장 길이 제한**(예: 200–300자) + “빠른/정확” 모드(beam width, max length)
  - **여행 프레이즈북**(인사/길찾기/음식/쇼핑/긴급)

### 3.2 선택적 서버(온라인 가속/업스케일)

- 온라인 시 장문·문맥 유지가 필요한 요청만 **서버측 대형 다국어 NMT/LLM**으로 업스케일(하이브리드).
- 개인정보 보호를 위해 **기본은 로컬 추론**, 서버 전송은 **명시적 opt-in**.

---

## 4) 모델 전략

| 방향          | 초기 권장 모델(예)                                                    | 근거                                                                            |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| ko→en / en→ko | `Helsinki-NLP/opus-mt-ko-en`, `Helsinki-NLP/opus-mt-tc-big-en-ko`     | 공개 모델, 번역 전용 MarianMT, Apache-2.0 다수. ([Hugging Face][5])             |
| ko→ja / ja→ko | `Helsinki-NLP/opus-mt-ko-ja`, `Helsinki-NLP/opus-mt-ja-ko` _(동계열)_ | 동일 계열로 언어쌍 커버(일본어 모델 카드/동계열 문서 참조). ([Hugging Face][8]) |

> **비고**: 품질은 “의사소통 수준” 목표에 적합. 대형 LLM(WebGPU 必) 대비 **용량/지연** 유리. 필요 시 ONNX 변환·정밀 양자화(예: int8/uint8)로 추가 경량화를 고려. ([ONNX Runtime][9])

---

## 5) 오프라인 동작 설계

1. **최초 실행**

   - 앱 UI 번들 로드 → 언어쌍 선택 → 해당 방향 모델/토크나이저 **프리패치**
   - 진행률/용량 표시, Wi-Fi 권장

2. **평시(오프라인/온라인 무관)**

   - 서비스워커가 **요청 가로채기** → 캐시에 있으면 오프라인 응답

3. **모델 업데이트**

   - 백그라운드에서 새 버전 다운로드 → 사용자에게 “업데이트 적용” 토스트 제공

4. **저장소 관리**

   - Cache Storage + IndexedDB 사용, Storage Manager API로 저장공간 쿼리/관리(지원 플랫폼). ([web.dev][10])

---

## 6) 성능/호환 전략

- **기능 감지**: `navigator.gpu` → WebGPU EP 활성화, 불가 시 WASM. ([MDN Web Docs][11])
- **지연 최소화**:

  - 모바일에서 **짧은 문장 권장** UI
  - 디코딩 파라미터(beam size, max new tokens) 프로파일링 프리셋

- **모델 단위 분리**: 언어 방향별로 **개별 다운로드**(불필요한 용량 최소화)
- **네트워크 상태 인식**: 오프라인/저속 연결 시 경고 및 제한 모드 자동 전환

---

## 7) 보안/프라이버시

- **기본 로컬 추론**: 텍스트가 외부 서버로 전송되지 않음(오프라인 동작 전제).
- **온라인 업스케일**: 사용자가 명시 동의한 요청에 한해 서버 호출(암호화 전송/로그 최소화).
- PWA/서비스워커 스코프 제한, 무결성(SRI)·정적 자원 해시 적용. ([MDN Web Docs][12])

---

## 8) 개발 로드맵(요약)

### Phase 1 — PoC (브라우저 추론 파이프라인)

- Transformers.js `pipeline('translation', 'Helsinki-NLP/opus-mt-ko-en')`로 ko→en 기본 동작
- 동일 방식으로 en→ko, ko↔ja 추가
- 단말 2종(WebGPU 지원/미지원)에서 지연·메모리 측정 벤치마크 ([Hugging Face][13])

### Phase 2 — PWA/오프라인

- Service Worker 프리캐시, 오프라인 라우팅, 설치 가능(Manifest)
- 모델 캐시 정책(버전/만료/백그라운드 업데이트) ([MDN Web Docs][4])

### Phase 3 — UX & 품질

- “여행 프레이즈북” 템플릿 + 빠른/정확 모드 토글
- 품질 평가(100문장 셋: 정확성/유창성/반응시간)

### Phase 4 — 하이브리드(옵션)

- 온라인 시 서버측 대형 모델 엔드포인트 연계(장문/문맥 유지 전용)

---

## 9) 코드 스케치(핵심 포인트)

이 코드는 기능을 구현할 수 있다는 것을 보여주기 위한 예시입니다. 여기에 있는 코드 컨벤션을 그대로 반영하지 말아주세요.

```ts
// 1) 기능 감지: WebGPU 가능 여부
const hasWebGPU = !!navigator.gpu; // MDN: Navigator.gpu 참조, any 타입보다는 더 정확한 타입 사용
// 런타임 구성은 onnxruntime-web의 EP 설정으로 분기.  :contentReference[oaicite:16]{index=16}
```

```ts
// 2) Transformers.js 번역 파이프라인 로딩(지연 로드)
import { pipeline } from "@huggingface/transformers";

const loadTranslator = async (modelId: string) => {
  return await pipeline("translation", modelId); // pipeline API  :contentReference[oaicite:17]{index=17}
};

const ko2en = await loadTranslator("Helsinki-NLP/opus-mt-ko-en"); // :contentReference[oaicite:18]{index=18}
const result = await ko2en("안녕하세요, 어디로 가면 되나요?");
```

```js
// 3) Service Worker: 프리캐시(개념 예)
// install 이벤트에서 모델/토크나이저/앱 번들을 Cache Storage에 추가  :contentReference[oaicite:19]{index=19}
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("v1").then((cache) =>
      cache.addAll([
        "/",
        "/index.html",
        "/app.js",
        "/models/ko-en/model.onnx",
        "/models/ko-en/tokenizer.json",
        // …
      ])
    )
  );
});
```

---

## 10) 리스크 & 대응

- **초기 다운로드 용량**: 언어쌍별 **개별 다운로드** + Wi-Fi 권장 안내, 모델 양자화/분할 로딩.
- **저사양 단말 지연**: “빠른 모드” 기본값(작은 beam/짧은 max length), 프레이즈북 단축 UI.
- **WebGPU 미지원**: 자동 WASM 폴백으로 기능 유지, 지원 단말에서만 가속. ([MDN Web Docs][6])
- **번역 품질 한계**: 일상 회화엔 충분하되 전문 영역은 제한 → 온라인 업스케일 옵션 안내.

---

## 11) 성공 측정(모바일, 4G·Wi-Fi)

- **지연 시간**: 첫 토큰 < 500–900ms(가속 시), 문장 완성 < 2–4s 목표(단문 기준)
- **캐시 적중률**: 모델/토크나이저 95%+
- **CRP**: PWA 설치율, 오프라인 세션 비율, 프레이즈북 사용률

---

## 12) 참고 문서(주요 근거)

- **Transformers.js** 개요/`pipeline()` API/허브 통합: ([Hugging Face][2])
- **ONNX Runtime Web** 개요/웹 통합/웹GPU EP: ([ONNX Runtime][9])
- **PWA 오프라인/Service Worker/Cache Storage**: ([MDN Web Docs][4])
- **WebGPU API/호환/사용 감지**: ([MDN Web Docs][6])
- **Opus-MT/MarianMT 모델(ko-en 등)**: ([Hugging Face][5])

---

### 출처

[1]: https://huggingface.co/docs/hub/en/transformers-js?utm_source=chatgpt.com "Using Transformers.js at Hugging Face"
[2]: https://huggingface.co/docs/transformers.js/en/index?utm_source=chatgpt.com "Transformers.js"
[3]: https://onnxruntime.ai/docs/get-started/with-javascript/web.html?utm_source=chatgpt.com "Web | onnxruntime"
[4]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching?utm_source=chatgpt.com "Caching - Progressive web apps | MDN"
[5]: https://huggingface.co/Helsinki-NLP/opus-mt-ko-en?utm_source=chatgpt.com "Helsinki-NLP/opus-mt-ko-en"
[6]: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API?utm_source=chatgpt.com "WebGPU API - MDN Web Docs - Mozilla"
[7]: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html?utm_source=chatgpt.com "Using WebGPU"
[8]: https://huggingface.co/Helsinki-NLP/opus-mt-en-jap?utm_source=chatgpt.com "Helsinki-NLP/opus-mt-en-jap"
[9]: https://onnxruntime.ai/docs/tutorials/web/?utm_source=chatgpt.com "Web | onnxruntime"
[10]: https://web.dev/learn/pwa/offline-data?utm_source=chatgpt.com "Offline data - PWA"
[11]: https://developer.mozilla.org/en-US/docs/Web/API/GPU?utm_source=chatgpt.com "GPU - Web APIs - MDN Web Docs"
[12]: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API?utm_source=chatgpt.com "Service Worker API - MDN Web Docs"
[13]: https://huggingface.co/docs/transformers.js/en/pipelines?utm_source=chatgpt.com "The pipeline API"
