"use client";

/**
 * Translation pipeline/tokenizer loader with in‑module caching.
 * Caller is responsible for calling `configureTransformersEnv` beforehand.
 *
 * Notes
 * - We keep a small wrapper around transformers' `pipeline` to avoid
 *   complex union types during SWC/TS builds, and to centralize device/model
 *   keying + caching.
 */

import type { PreTrainedTokenizer } from "@huggingface/transformers";
import { AutoTokenizer, pipeline } from "@huggingface/transformers";

export type Device = "wasm" | "webgpu";

export type TranslationPipeline = (
  text: string,
  opts: {
    src_lang: string;
    tgt_lang: string;
    num_beams?: number;
    max_new_tokens?: number;
  }
) => Promise<{ translation_text?: string; generated_text?: string; text?: string } | Array<{ translation_text?: string; generated_text?: string; text?: string }>>;

const pipelineCache = new Map<string, Promise<TranslationPipeline>>();
const tokenizerCache = new Map<string, Promise<PreTrainedTokenizer>>();

/**
 * Build a cache key based on model id and device.
 */
function key(modelId: string, device: Device) {
  return `${modelId}::${device}`;
}

/**
 * Get or create a translation pipeline for a given model/device.
 * The function caches the promise to avoid duplicate instantiation.
 */
export function getTranslationPipeline(modelId: string, device: Device): Promise<TranslationPipeline> {
  const k = key(modelId, device);
  let p = pipelineCache.get(k);
  if (!p) {
    // Narrowed adapter type to avoid overload union explosion in TS builds
    type PipelineFactory = (
      task: 'translation',
      modelId: string,
      opts: { device: Device; dtype?: unknown }
    ) => Promise<TranslationPipeline>;
    const pl = pipeline as unknown as PipelineFactory;
    p = pl('translation', modelId, {
      device,
      // NLLB q8 naming convention; harmless for other Marian/Opus models.
      dtype: {
        encoder_model: "q8",
        decoder_model_merged: "q8",
      },
    });
    pipelineCache.set(k, p);
  }
  return p;
}

/**
 * Get or create a tokenizer for the given model id.
 */
export function getTokenizer(modelId: string): Promise<PreTrainedTokenizer> {
  let p = tokenizerCache.get(modelId);
  if (!p) {
    p = AutoTokenizer.from_pretrained(modelId);
    tokenizerCache.set(modelId, p);
  }
  return p;
}

/**
 * Clear internal caches — useful for tests.
 */
export function __resetCaches() {
  pipelineCache.clear();
  tokenizerCache.clear();
}

