"use client";

/**
 * Transformers.js / ONNX Runtime Web 환경 설정 유틸
 * - 기존 전역(env) 설정을 한 곳으로 모아 결합도를 낮춥니다.
 * - 이후 번역 모듈은 이 유틸만 호출하여 환경을 구성하도록 전환합니다.
 */

import { env } from "@huggingface/transformers";
import * as ort from "onnxruntime-web";

export type ConfigureOptions = {
  // 로컬 자원 기본 경로(기존 동작 유지)
  localModelPath?: string; // 기본 '/translations/models'
  wasmBasePath?: string; // 기본 '/translations/wasm/'

  // 원격 버킷(B안) 설정
  /**
   * 원격 버킷의 베이스 URL.
   * - 모델:   `${BASE}/models/{model}/...`
   * - ORT WASM: `${BASE}/wasm/ort-wasm*.wasm` 및 `*.jsep.mjs`
   */
  remoteBaseURL?: string;
  /**
   * true이면 원격 우선(B안)으로 전환합니다.
   * - env.allowLocalModels=false, env.allowRemoteModels=true
   * - env.remoteHost / env.remotePathTemplate 구성
   * - onnxruntime-web wasm 경로를 원격으로 지정
   */
  preferRemote?: boolean;

  // 기타 런타임 플래그
  allowRemoteModels?: boolean; // (A안) 로컬 경로를 절대 URL로 쓸 때만 사용
  simd?: boolean; // onnx wasm simd (기본 true)
  numThreads?: number; // crossOriginIsolated 아닐 수 있어 기본 1
};

function computeJsepBase(): string | null {
  try {
    // NEXT_PUBLIC_JSEP_ORIGIN + NEXT_PUBLIC_JSEP_PATHNAME 조합
    const jsepPathname = (process.env.NEXT_PUBLIC_JSEP_PATHNAME ?? "").trim();
    const jsepOrigin = (process.env.NEXT_PUBLIC_JSEP_ORIGIN ?? "").trim();
    if (jsepPathname && jsepOrigin) {
      const o = jsepOrigin.replace(/\/+$/, "");
      const p = jsepPathname.startsWith("/")
        ? jsepPathname
        : `/${jsepPathname}`;
      return `${o}${p}`.replace(/\/+$/, "");
    }
  } catch {}
  return null;
}

/**
 * 멱등한 환경 설정(여러 번 호출해도 동일 상태 유지)
 */
export function configureTransformersEnv(opts: ConfigureOptions = {}): void {
  // Hard guard to prevent accidental SSR import/execution.
  // - Browser main thread: window !== undefined
  // - Web Worker: window === undefined, but self.importScripts exists
  // - Node/SSR: window === undefined && self/importScripts 모두 없음
  const isBrowserWindow =
    typeof window !== "undefined" && typeof document !== "undefined";
  const isWebWorker =
    typeof self !== "undefined" && typeof self.importScripts === "function";
  // importScripts는 Dedicated/Shared Worker에서만 제공되는 전역 함수입니다.

  if (!isBrowserWindow && !isWebWorker) {
    throw new Error(
      "onnxruntime-web/transformers 환경 구성은 브라우저(윈도우/웹 워커)에서만 허용됩니다. SSR 경계에서 이 모듈을 import하지 마세요."
    );
  }
  try {
    ort.env.logLevel = "warning";
  } catch {}

  try {
    ort.env.wasm.proxy = true;
  } catch {}

  const localModelPath = opts.localModelPath ?? "/translations/models";
  const wasmBasePath = opts.wasmBasePath ?? "/translations/wasm/";
  const allowRemote = opts.allowRemoteModels ?? false;
  const preferRemote = opts.preferRemote ?? false;
  const remoteBaseURL = opts.remoteBaseURL;
  const simd = opts.simd ?? true;
  const numThreads = opts.numThreads ?? 1;

  // B안: 원격 우선 구성
  if (preferRemote && remoteBaseURL) {
    let base: URL | null = null;
    try {
      base = new URL(remoteBaseURL);
    } catch {
      throw new Error(
        `remoteBaseURL이 올바른 URL이 아닙니다: ${remoteBaseURL}`
      );
    }

    // Transformers.js — 원격 모델 소스 설정
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    const prefix = base.pathname.endsWith("/")
      ? base.pathname.slice(0, -1)
      : base.pathname;
    // 모델 경로 템플릿: {model} 자리표시자 필요
    // 예) '/v0.0.1/models/{model}/'
    const remoteModelTemplate = `${prefix}/models/{model}/`;
    env.remoteHost = base.origin;
    env.remotePathTemplate = remoteModelTemplate;

    // onnxruntime-web — 원격 WASM/워크러너(jsep.mjs) 경로
    const remoteWasmPath = `${prefix}/wasm/`;
    try {
      // @ts-expect-error runtime flag is provided by transformers.js
      env.backends.onnx.wasm.wasmPaths = `${base.origin}${remoteWasmPath}`;
      // @ts-expect-error runtime flag
      env.backends.onnx.wasm.simd = simd;
      // @ts-expect-error runtime flag
      env.backends.onnx.wasm.numThreads = numThreads;
    } catch {
      // noop: onnx wasm backend 초기화 타이밍 이슈는 무시
    }
  } else {
    // A안(기존): 로컬 경로(절대 URL 포함 가능)를 사용
    env.allowLocalModels = true;
    env.allowRemoteModels = allowRemote;
    env.localModelPath = localModelPath;

    try {
      // @ts-expect-error runtime flag is provided by transformers.js
      env.backends.onnx.wasm.wasmPaths = wasmBasePath;
      // @ts-expect-error runtime flag
      env.backends.onnx.wasm.simd = simd;
      // @ts-expect-error runtime flag
      env.backends.onnx.wasm.numThreads = numThreads;
    } catch {
      // noop
    }
  }

  // JSEP 전용 BASE가 설정되어 있으면 최종적으로 wasmPaths를 오버라이드합니다.
  try {
    const jsepBase = computeJsepBase();
    if (jsepBase) {
      const jsepPaths = /^https?:\/\//i.test(jsepBase)
        ? (() => {
            const u = new URL(jsepBase);
            return `${u.origin}${u.pathname.replace(/\/+$/, "")}/wasm/`;
          })()
        : `${jsepBase.replace(/\/+$/, "")}/wasm/`;
      // @ts-expect-error runtime flag override
      env.backends.onnx.wasm.wasmPaths = jsepPaths;
    }
  } catch {
    // ignore
  }
}

/**
 * 현재 장치 선택(간단 버전). 필요 시 WebGPU 지원 감지로 확장 가능합니다.
 */
export function getDefaultDevice(): "wasm" | "webgpu" {
  // 안전을 위해 기본 wasm. WebGPU 가속은 후속 단계에서 개별 제어 권장.
  return "wasm";
}
