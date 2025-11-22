"use client";

import { getAccuratePreset } from "@/shared/config/translation-presets";
import { buildAllURLs, getBaseURL } from "@/shared/offline/model-urls";
import type { PreTrainedTokenizer } from "@huggingface/transformers";

// Translation pipeline/result 타입 정의
type TranslationResult = {
  translation_text?: string;
  generated_text?: string;
  text?: string;
};
type TranslationOutput = TranslationResult | TranslationResult[];
type TranslationPipeline = (
  text: string,
  opts: {
    src_lang: string;
    tgt_lang: string;
    num_beams?: number;
    max_new_tokens?: number;
  }
) => Promise<TranslationOutput>;

let device: "wasm" | "webgpu" | null = null;
let envConfigured = false;

function suggestNumThreads(): number {
  if (typeof window === "undefined") return 1;
  try {
    // WebAssembly Threads requires cross-origin isolation.
    const coi = (globalThis as any)?.crossOriginIsolated === true;
    const hc =
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 1 : 1;
    if (coi && hc && hc > 1) {
      return Math.min(hc, 4); // cap to a small number for mobile
    }
  } catch {}
  return 1;
}

async function ensureTranslatorLoaded() {
  if (!envConfigured) {
    const { configureTransformersEnv, getDefaultDevice } = await import(
      "@/shared/lib/ai/env"
    );
    // 한국어 주석: B안(변형) — 기존 변수 조합도 지원합니다.
    // 우선순위: NEXT_PUBLIC_TRANSLATIONS_BASE > (NEXT_PUBLIC_STORAGE_ORIGIN + NEXT_PUBLIC_STORAGE_BASE)
    const directBase = process.env.NEXT_PUBLIC_TRANSLATIONS_BASE;
    const origin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
    const basePath = process.env.NEXT_PUBLIC_STORAGE_BASE;
    let combinedBase: string | undefined;
    if (origin && basePath) {
      const o = origin.replace(/\/+$/, "");
      const p = basePath.startsWith("/") ? basePath : `/${basePath}`;
      combinedBase = `${o}${p}`;
    }
    const base =
      directBase && directBase.length > 0 ? directBase : combinedBase;

    if (base && base.length > 0) {
      // 한국어 주석: B안 — 원격 버킷 경로를 사용합니다.
      // 예: NEXT_PUBLIC_TRANSLATIONS_BASE=http://localhost:5500/v0.0.1
      configureTransformersEnv({
        remoteBaseURL: base,
        preferRemote: true,
        simd: true,
        numThreads: suggestNumThreads(),
      });
    } else {
      // 한국어 주석: A안 — 로컬(public/translations) 경로를 사용합니다.
      configureTransformersEnv({
        localModelPath: "/translations/models",
        wasmBasePath: "/translations/wasm/",
        allowRemoteModels: false,
        simd: true,
        numThreads: suggestNumThreads(),
      });
    }
    device = getDefaultDevice();
    envConfigured = true;
  }
}

export const NLLB_MODEL_ID = "Xenova/nllb-200-distilled-600M";

// 오프라인 프리페치 유도 에러 타입
export class PrefetchRequiredError extends Error {
  code = "OFFLINE_PREFETCH_REQUIRED" as const;
  missing?: { ort?: string[]; model?: string[] };
  baseURL?: string;
  constructor(
    message: string,
    info?: { missing?: { ort?: string[]; model?: string[] }; baseURL?: string }
  ) {
    super(message);
    this.name = "PrefetchRequiredError";
    this.missing = info?.missing;
    this.baseURL = info?.baseURL;
  }
}

function computeBaseURL(): string | null {
  try {
    const direct = (process.env.NEXT_PUBLIC_TRANSLATIONS_BASE ?? "").trim();
    if (direct) return direct.replace(/\/+$/, "");
    const origin = (process.env.NEXT_PUBLIC_STORAGE_ORIGIN ?? "").trim();
    const base = (process.env.NEXT_PUBLIC_STORAGE_BASE ?? "").trim();
    if (origin && base) {
      const o = origin.replace(/\/+$/, "");
      const p = base.startsWith("/") ? base : `/${base}`;
      return `${o}${p}`.replace(/\/+$/, "");
    }
  } catch {}
  return null;
}

async function ensureOfflineReadyGuard(modelId: string): Promise<void> {
  // 브라우저 + 오프라인 상태에서만 가드
  if (typeof window === "undefined" || typeof caches === "undefined") return;
  try {
    if (typeof navigator !== "undefined" && (navigator as any).onLine === true)
      return;
  } catch {}

  // shared/offline/model-urls의 계산 로직을 재사용하여 프리페치 목록과 완전 동기화
  let base: string;
  try {
    base = getBaseURL();
  } catch {
    // BASE 계산 실패 시 가드 생략(네트워크 시도로 위임)
    return;
  }

  const { ort, model } = buildAllURLs(base, modelId);

  // 누락 항목 수집
  const missOrt: string[] = [];
  const missModel: string[] = [];

  for (const u of ort) {
    // eslint-disable-next-line no-await-in-loop
    const hit = await caches.match(u);
    if (!hit) missOrt.push(u);
  }
  for (const u of model) {
    // eslint-disable-next-line no-await-in-loop
    const hit = await caches.match(u);
    if (!hit) missModel.push(u);
  }

  if (missOrt.length > 0 || missModel.length > 0) {
    throw new PrefetchRequiredError(
      "오프라인 번역을 위해 필요한 파일이 캐시에 없습니다. 프리페치가 필요합니다.",
      { missing: { model: missModel, ort: missOrt }, baseURL: base }
    );
  }
}

function getTranslatorInternal(): Promise<TranslationPipeline> {
  return (async () => {
    await ensureTranslatorLoaded();
    const { getTranslationPipeline } = await import(
      "@/shared/lib/translator/pipeline"
    );
    return getTranslationPipeline(NLLB_MODEL_ID, device!);
  })();
}

async function getTokenizerInternal(): Promise<PreTrainedTokenizer> {
  await ensureTranslatorLoaded();
  const { getTokenizer } = await import("@/shared/lib/translator/pipeline");
  return getTokenizer(NLLB_MODEL_ID);
}

async function ensureTokensPresent(
  text: string,
  srcLang: string
): Promise<number> {
  const tokenizer = await getTokenizerInternal();
  const encoded = await tokenizer(text, { src_lang: srcLang });
  const len = Array.isArray(encoded?.input_ids)
    ? encoded.input_ids.length
    : encoded?.input_ids?.size ?? 0;
  try {
    console.debug("[translator] token_count=", len, "src=", srcLang);
  } catch {}
  if (!len || len <= 0) {
    throw new Error(
      "입력이 토크나이즈되지 않았습니다. tokenizer 파일 누락 또는 언어 코드(kor_Hang/jpn_Jpan) 설정을 확인하세요."
    );
  }
  return len;
}

function pickText(output: TranslationOutput): string {
  const r = Array.isArray(output) ? output[0] : output;
  return r?.translation_text ?? r?.generated_text ?? r?.text ?? "";
}

export type TranslateOptions = {
  num_beams?: number;
  max_new_tokens?: number;
};

export async function translateKoToJa(
  text: string,
  opts: TranslateOptions = {}
): Promise<string> {
  await ensureOfflineReadyGuard(NLLB_MODEL_ID);
  const src = "kor_Hang";
  const tgt = "jpn_Jpan";
  await ensureTokensPresent(text, src);
  const preset = getAccuratePreset("ko-ja");
  const numBeams = opts.num_beams ?? preset.numBeams;
  const maxNewTokens = opts.max_new_tokens ?? preset.maxNewTokens;
  try {
    const tr = await getTranslatorInternal();
    const out = await tr(text, {
      src_lang: src,
      tgt_lang: tgt,
      num_beams: numBeams,
      max_new_tokens: maxNewTokens,
    });
    return pickText(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("invalid data location") ||
      msg.includes("Inputs given to model: {}")
    ) {
      throw new Error(
        "번역 실행 중 런타임 입력 바인딩 문제가 발생했습니다. 개발 모드에서는 WASM 경로와 tokenizer 파일 존재 여부, dtype(q8) 설정을 확인하세요."
      );
    }
    throw e;
  }
}

export async function translateJaToKo(
  text: string,
  opts: TranslateOptions = {}
): Promise<string> {
  await ensureOfflineReadyGuard(NLLB_MODEL_ID);
  const src = "jpn_Jpan";
  const tgt = "kor_Hang";
  await ensureTokensPresent(text, src);
  const preset = getAccuratePreset("ja-ko");
  const numBeams = opts.num_beams ?? preset.numBeams;
  const maxNewTokens = opts.max_new_tokens ?? preset.maxNewTokens;
  try {
    const tr = await getTranslatorInternal();
    const out = await tr(text, {
      src_lang: src,
      tgt_lang: tgt,
      num_beams: numBeams,
      max_new_tokens: maxNewTokens,
    });
    return pickText(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("invalid data location") ||
      msg.includes("Inputs given to model: {}")
    ) {
      throw new Error(
        "번역 실행 중 런타임 입력 바인딩 문제가 발생했습니다. 개발 모드에서는 WASM 경로와 tokenizer 파일 존재 여부, dtype(q8) 설정을 확인하세요."
      );
    }
    throw e;
  }
}

export async function translateKoToEn(
  text: string,
  opts: TranslateOptions = {}
): Promise<string> {
  await ensureOfflineReadyGuard(NLLB_MODEL_ID);
  const src = "kor_Hang";
  const tgt = "eng_Latn";
  await ensureTokensPresent(text, src);
  const preset = getAccuratePreset("ko-en");
  const numBeams = opts.num_beams ?? preset.numBeams;
  const maxNewTokens = opts.max_new_tokens ?? preset.maxNewTokens;
  try {
    const tr = await getTranslatorInternal();
    const out = await tr(text, {
      src_lang: src,
      tgt_lang: tgt,
      num_beams: numBeams,
      max_new_tokens: maxNewTokens,
    });
    return pickText(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("invalid data location") ||
      msg.includes("Inputs given to model: {}")
    ) {
      throw new Error(
        "번역 실행 중 런타임 입력 바인딩 문제가 발생했습니다. 개발 모드에서는 WASM 경로와 tokenizer 파일 존재 여부, dtype(q8) 설정을 확인하세요."
      );
    }
    throw e;
  }
}
