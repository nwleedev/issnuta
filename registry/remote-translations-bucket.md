# Remote Translations Bucket — 환경 설정 가이드

본 문서는 번역 모델/토크나이저/ORT WASM을 외부 버킷에서 로드하기 위한 설정과 점검 방법을 정의합니다. 적용 범위는 레포 루트 기준 코드입니다.

## 목표

- `NEXT_PUBLIC_STORAGE_ORIGIN` + `NEXT_PUBLIC_STORAGE_BASE` 환경변수 조합으로 원격 버킷 베이스 URL을 구성하면, 클라이언트 런타임에서 Transformers.js/onnxruntime-web이 해당 버킷에서 모든 아티팩트를 로드합니다.
- 환경변수를 비우면 기존 로컬 경로(`public/translations/**`)를 사용합니다.

## 버킷 레이아웃(예시)

- BASE: `${ORIGIN}${BASE_PATH}`
- 모델: `${BASE}/models/{model}/...`
- ORT: `${BASE}/wasm/ort-wasm*.wasm`, `${BASE}/wasm/ort-wasm*.jsep.mjs`

> 주의: `.wasm`와 `.jsep.mjs`는 같은 디렉터리/버전으로 배치해야 합니다.

## 환경변수

- 파일: `.env.local`(개발) 또는 배포 환경 변수
- 예시:

```
NEXT_PUBLIC_STORAGE_ORIGIN=
NEXT_PUBLIC_STORAGE_BASE=
```

## 코드 연동(구현 위치)

- 클라이언트 환경 설정 유틸: `shared/lib/ai/env.ts`
  - `remoteBaseURL` + `preferRemote` 옵션을 해석하여 아래를 설정합니다.
    - Transformers.js: `allowLocalModels=false`, `allowRemoteModels=true`, `remoteHost`, `remotePathTemplate`
    - onnxruntime-web: `env.backends.onnx.wasm.wasmPaths='${BASE}/wasm/'`
- 호출부: `shared/lib/translator.ts`
  - `NEXT_PUBLIC_STORAGE_ORIGIN` + `NEXT_PUBLIC_STORAGE_BASE` 조합이 존재하면 원격 구성을 활성화합니다.
  - 없으면 로컬 경로(`/translations/models`, `/translations/wasm/`)를 사용합니다.

## 동작 확인 체크리스트

1. 앱 실행 후 번역 1회 수행.
2. 브라우저 네트워크 패널에서 다음 요청을 확인(200 + CORS 허용):
   - `${BASE}/wasm/ort-wasm*.wasm`, `${BASE}/wasm/ort-wasm*.jsep.mjs`
   - `${BASE}/*/models/**` (tokenizer.json, config.json, onnx 등)
3. 최초 로딩 성공 후 DevTools에서 Offline 전환 → 동일 문장 재번역 시 캐시 적중되는지 확인.

## 트러블슈팅

- 404(Not Found): 버킷 디렉터리 구조가 상단 레이아웃과 일치하는지 확인.
- CORS 에러: 버킷 서버에서 앱 오리진에 대한 GET 허용을 설정.
- ORT 초기화 오류(경로/버전): `.wasm`/`.jsep.mjs`가 동일 폴더·버전인지 확인.
- 토크나이저 오류: `kor_Hang`/`jpn_Jpan`/`eng_Latn` 등 언어 코드 설정 확인.

## 오프라인 캐시(참고)

- 서비스워커 도입 시 Serwist/Workbox로 `${BASE}/v0.0.1/**`에 런타임 캐시 전략을 부여합니다.
  - WASM: Cache First
  - 모델/토크나이저: Stale While Revalidate
- 서비스워커 소스 경로는 프로젝트 정책에 따라 `app/sw.ts`를 권장합니다.
