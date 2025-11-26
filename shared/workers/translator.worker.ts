/// <reference lib="webworker" />

/**
 * 번역 전용 Web Worker
 *
 * - Transformers.js + ONNX Runtime Web 기반 NLLB 번역을 메인 스레드에서 분리합니다.
 * - 환경 구성은 shared/lib/ai/env.ts를 재사용하며, 모델 ID는 shared/lib/translator.ts의 상수를 사용합니다.
 * - 메인 스레드는 postMessage를 통해 텍스트/옵션을 전달하고, 결과 문자열만 응답으로 받습니다.
 */

import { configureTransformersEnv, getDefaultDevice } from "@/shared/lib/ai/env";
import {
  getTranslationPipeline,
  type Device,
  type TranslationPipeline,
} from "@/shared/lib/translator/pipeline";
import { NLLB_MODEL_ID } from "@/shared/lib/translator";
import type {
  TranslateRequestPayload,
  WorkerRequest,
  WorkerResponse,
} from "@/shared/lib/translator-worker-protocol";

type TranslationResult = {
  translation_text?: string;
  generated_text?: string;
  text?: string;
};

type TranslationOutput = TranslationResult | TranslationResult[];

// Worker 전용 컨텍스트 헬퍼
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let initialized = false;
let device: Device = "wasm";
let pipelinePromise: Promise<TranslationPipeline> | null = null;

function pickText(output: TranslationOutput): string {
  const r = Array.isArray(output) ? output[0] : output;
  return r?.translation_text ?? r?.generated_text ?? r?.text ?? "";
}

// Worker 환경에서의 numThreads 선택 — 초기 버전은 단일 스레드에 가깝게 제한
function suggestNumThreadsForWorker(): number {
  try {
    const hc =
      typeof navigator !== "undefined"
        ? navigator.hardwareConcurrency ?? 1
        : 1;
    if (hc && hc > 1) {
      return Math.min(hc, 4);
    }
  } catch {
    // ignore
  }
  return 1;
}

async function ensureInitialized(): Promise<void> {
  if (initialized && pipelinePromise) return;

  // 번역 버킷 BASE 구성은 shared/lib/translator.ts의 ensureTranslatorLoaded 로직과 동일한 env 조합을 사용합니다.
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
    // 원격 버킷(B안)
    configureTransformersEnv({
      remoteBaseURL: base,
      preferRemote: true,
      simd: true,
      numThreads: suggestNumThreadsForWorker(),
    });
  } else {
    // 로컬 번들(A안)
    configureTransformersEnv({
      localModelPath: "/translations/models",
      wasmBasePath: "/translations/wasm/",
      allowRemoteModels: false,
      simd: true,
      numThreads: suggestNumThreadsForWorker(),
    });
  }

  device = getDefaultDevice();
  pipelinePromise = getTranslationPipeline(NLLB_MODEL_ID, device);
  initialized = true;
}

async function handleTranslate(
  payload: TranslateRequestPayload
): Promise<string> {
  await ensureInitialized();
  const pipeline = await pipelinePromise!;
  const out = await pipeline(payload.text, {
    src_lang: payload.src_lang,
    tgt_lang: payload.tgt_lang,
    num_beams: payload.num_beams,
    max_new_tokens: payload.max_new_tokens,
  });
  return pickText(out as TranslationOutput);
}

async function onMessage(event: MessageEvent<WorkerRequest>): Promise<void> {
  const data = event.data;
  if (!data || typeof data.id !== "number") return;

  if (data.type !== "translate") {
    // 현재는 translate만 지원 — 추후 확장 가능
    return;
  }

  const { id, payload } = data;

  try {
    const resultText = await handleTranslate(payload);
    const response: WorkerResponse = { id, ok: true, resultText };
    ctx.postMessage(response);
  } catch (e: unknown) {
    let error = "Translation failed";
    let code: string | null = null;

    if (e instanceof Error) {
      error = e.message || error;
      // PrefetchRequiredError 등 커스텀 에러의 code 속성을 유지
      if (typeof (e as any).code === "string") {
        code = (e as any).code as string;
      }
    } else if (typeof e === "string") {
      error = e;
    }

    const response: WorkerResponse = {
      id,
      ok: false,
      error,
      code,
    };
    ctx.postMessage(response);
  }
}

ctx.addEventListener("message", (event) => {
  void onMessage(event as MessageEvent<WorkerRequest>);
});
