/**
 * 모델/ORT 아티팩트 URL 유틸리티 (shared 레이어)
 *
 * - BASE 계산: NEXT_PUBLIC_TRANSLATIONS_BASE 우선, 없으면 ORIGIN+BASE 조합
 * - ORT(.wasm/.jsep.mjs) 및 모델 아티팩트(Tokenizer/ONNX) 경로 구성
 * - Service Worker 및 features/offline 쪽에서 동일한 경로 체계를 재사용할 수 있도록
 *   shared 레이어로 승격된 공통 모듈입니다.
 */

export type BuildOrtOptions = {
  /** 기본 simd 세트 외에도 non-simd(폴백) 세트를 포함 */
  includeFallback?: boolean;
  /** threaded 변형까지 포함(현재 numThreads=1이므로 기본 false 권장) */
  includeThreaded?: boolean;
};

export type BuildModelOptions = {
  /** 양자화(q8) 파일명을 우선 포함 */
  quantized?: boolean; // default true
  /** 서버에 q8 부재 시 비양자화 이름도 함께 포함 */
  includeNonQuantizedFallback?: boolean; // default true
};

export type BuildAllOptions = BuildOrtOptions & BuildModelOptions;

/**
 * BASE URL 계산
 * - 우선순위: NEXT_PUBLIC_TRANSLATIONS_BASE > (NEXT_PUBLIC_STORAGE_ORIGIN + NEXT_PUBLIC_STORAGE_BASE)
 * - 반환 예: "http://localhost:5500/v0.0.1"
 */
export function getBaseURL(): string {
  const direct = (process.env.NEXT_PUBLIC_TRANSLATIONS_BASE ?? "").trim();
  if (direct) return stripTrailingSlash(direct);

  const origin = (process.env.NEXT_PUBLIC_STORAGE_ORIGIN ?? "").trim();
  const base = (process.env.NEXT_PUBLIC_STORAGE_BASE ?? "").trim();
  if (origin && base) {
    const o = stripTrailingSlash(origin);
    const p = base.startsWith("/") ? base : `/${base}`;
    return stripTrailingSlash(`${o}${p}`);
  }
  throw new Error(
    "프리페치 BASE를 계산할 수 없습니다. NEXT_PUBLIC_TRANSLATIONS_BASE 또는 NEXT_PUBLIC_STORAGE_ORIGIN/NEXT_PUBLIC_STORAGE_BASE를 설정하세요."
  );
}

/**
 * ORT(JSEP/wasm) 전용 BASE URL 계산
 * - 우선순위: NEXT_PUBLIC_JSEP_URL(절대) > (NEXT_PUBLIC_JSEP_ORIGIN + NEXT_PUBLIC_JSEP_PATHNAME)
 * - 미설정 시 getBaseURL()로 폴백
 */
export function getWasmBaseURL(): string {
  // 1) Absolute URL via NEXT_PUBLIC_JSEP_URL
  const jsepUrl = (process.env.NEXT_PUBLIC_JSEP_URL ?? "").trim();
  if (jsepUrl && /^https?:\/\//i.test(jsepUrl)) {
    return stripTrailingSlash(jsepUrl);
  }

  // 2) ORIGIN + PATHNAME
  const jsepPathname = (process.env.NEXT_PUBLIC_JSEP_PATHNAME ?? "").trim();
  const jsepOrigin =
    (process.env.NEXT_PUBLIC_JSEP_ORIGIN ?? "").trim() ||
    (process.env.NEXT_PUBLIC_STORAGE_ORIGIN ?? "").trim();
  if (jsepPathname && jsepOrigin) {
    const o = stripTrailingSlash(jsepOrigin);
    const p = jsepPathname.startsWith("/") ? jsepPathname : `/${jsepPathname}`;
    return stripTrailingSlash(`${o}${p}`);
  }
  return getBaseURL();
}

/**
 * ORT 런타임(.wasm/.jsep.mjs) 대상 URL 목록
 * - 기본: simd 변형 2종( .wasm / .jsep.mjs )
 * - 옵션: non-simd, threaded 변형 포함 가능
 */
export function buildOrtURLs(
  baseURL: string,
  opts: BuildOrtOptions = {}
): string[] {
  const base = stripTrailingSlash(baseURL || getWasmBaseURL());
  const files: string[] = [];

  // Cache ORT wasm artifacts needed for both JSEP and classic paths.
  // - JSEP (ESM worker loader + paired wasm)
  files.push(
    `${base}/wasm/ort-wasm-simd-threaded.jsep.wasm`,
    `${base}/wasm/ort-wasm-simd-threaded.jsep.mjs`
  );
  // - Classic ESM loader + wasm (used when not using JSEP or when threads are unavailable)
  files.push(
    `${base}/wasm/ort-wasm-simd-threaded.wasm`,
    `${base}/wasm/ort-wasm-simd-threaded.mjs`
  );

  // 기본 simd 세트
  // files.push(
  //   `${base}/wasm/ort-wasm-simd.wasm`,
  //   `${base}/wasm/ort-wasm-simd.jsep.mjs`
  // );

  // if (opts.includeFallback) {
  //   files.push(
  //     `${base}/wasm/ort-wasm.wasm`,
  //     `${base}/wasm/ort-wasm.jsep.mjs`
  //   );
  // }
  // if (opts.includeThreaded) {
  //   files.push(
  //     `${base}/wasm/ort-wasm-simd-threaded.wasm`,
  //     `${base}/wasm/ort-wasm-simd-threaded.jsep.mjs`
  //   );
  //   if (opts.includeFallback) {
  //     files.push(
  //       `${base}/wasm/ort-wasm-threaded.wasm`,
  //       `${base}/wasm/ort-wasm-threaded.jsep.mjs`
  //     );
  //   }
  // }
  return unique(files);
}

/**
 * 모델/토크나이저 ONNX 대상 URL 목록
 * - modelId 예: "Xenova/nllb-200-distilled-600M"
 * - 기본은 q8(quantized) 파일명. 서버에 비양자화만 있는 경우를 대비해 폴백 이름도 함께 포함할 수 있음.
 */
export function buildModelURLs(
  baseURL: string,
  modelId: string,
  opts: BuildModelOptions = {}
): string[] {
  const base = stripTrailingSlash(baseURL);
  const id = stripTrailingSlash(modelId);
  const q8 = opts.quantized !== false; // default true
  const includePlain = opts.includeNonQuantizedFallback !== false; // default true

  const root = `${base}/models/${id}`;
  const urls: string[] = [
    `${root}/tokenizer.json`,
    `${root}/tokenizer_config.json`,
    `${root}/config.json`,
    `${root}/generation_config.json`,
  ];

  // ONNX 파일(encoder / decoder_merged)
  const onnxDir = `${root}/onnx`;
  if (q8) {
    urls.push(
      `${onnxDir}/encoder_model_quantized.onnx`,
      `${onnxDir}/decoder_model_merged_quantized.onnx`
    );
  }
  // if (includePlain) {
  //   urls.push(
  //     `${onnxDir}/encoder_model.onnx`,
  //     `${onnxDir}/decoder_model_merged.onnx`
  //   );
  // }
  return unique(urls);
}

/**
 * ORT + 모델 전체 URL 묶음 반환
 */
export function buildAllURLs(
  baseURL: string,
  modelId: string,
  opts: BuildAllOptions = {}
): { ort: string[]; model: string[]; all: string[] } {
  const ort = buildOrtURLs(getWasmBaseURL(), opts);
  const model = buildModelURLs(baseURL, modelId, opts);
  const all = unique([...ort, ...model]);
  return { ort, model, all };
}

// 내부 유틸 — 경로/중복 정리
function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

