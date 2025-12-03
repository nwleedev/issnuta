"use client";

import { getAccuratePreset } from "@/shared/config/translation-presets";
import { buildAllURLs, getBaseURL } from "@/shared/offline/model-urls";
import { translateViaWorker } from "@/shared/lib/translator-worker-client";

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
  const preset = getAccuratePreset("ko-ja");
  const numBeams = opts.num_beams ?? preset.numBeams;
  const maxNewTokens = opts.max_new_tokens ?? preset.maxNewTokens;
  try {
    const output = await translateViaWorker({
      text,
      src_lang: src,
      tgt_lang: tgt,
      num_beams: numBeams,
      max_new_tokens: maxNewTokens,
    });
    return output;
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
  const preset = getAccuratePreset("ja-ko");
  const numBeams = opts.num_beams ?? preset.numBeams;
  const maxNewTokens = opts.max_new_tokens ?? preset.maxNewTokens;
  try {
    const output = await translateViaWorker({
      text,
      src_lang: src,
      tgt_lang: tgt,
      num_beams: numBeams,
      max_new_tokens: maxNewTokens,
    });
    return output;
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
  const preset = getAccuratePreset("ko-en");
  const numBeams = opts.num_beams ?? preset.numBeams;
  const maxNewTokens = opts.max_new_tokens ?? preset.maxNewTokens;
  try {
    const output = await translateViaWorker({
      text,
      src_lang: src,
      tgt_lang: tgt,
      num_beams: numBeams,
      max_new_tokens: maxNewTokens,
    });
    return output;
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
