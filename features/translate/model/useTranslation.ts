"use client";

/**
 * 범용 번역 Mutation Hook
 *
 * - NLLB 코드 기반 범용 번역 지원
 * - TanStack Query useMutation 패턴
 * - translationKeys로 Mutation Key 관리
 */

import { useMutation, useMutationState } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  translate,
  PrefetchRequiredError,
  UnsupportedLanguageError,
  type TranslateArgs,
  type TranslateResult,
} from "@/shared/lib/translator";
import { translationKeys } from "@/shared/lib/query/translation-keys";

/** 번역 Mutation 입력 타입 */
export type TranslationMutationInput = {
  text: string;
  srcLang: string;
  tgtLang: string;
};

/** 번역 Mutation 결과 타입 */
export type TranslationMutationResult = TranslateResult;

/** 번역 에러 타입 */
export type TranslationError = {
  message: string;
  code?: string;
  lang?: string;
};

/** useTranslation 옵션 */
export type UseTranslationOptions = {
  /** 오프라인 리소스 필요 시 콜백 */
  onOfflineRequired?: (retry: () => Promise<void>) => void;
  /** 지원하지 않는 언어 에러 시 콜백 */
  onUnsupportedLanguage?: (lang: string) => void;
};

/** useTranslation 반환 타입 */
export type UseTranslationResult = {
  /** 번역 실행 함수 */
  translateAsync: (input: TranslationMutationInput) => Promise<TranslateResult>;
  /** 번역 실행 함수 (void 반환) */
  translateMutate: (input: TranslationMutationInput) => void;
  /** 번역 결과 */
  result: TranslateResult | undefined;
  /** 에러 정보 */
  error: TranslationError | null;
  /** 번역 진행 중 여부 */
  isTranslating: boolean;
  /** Mutation 상태 리셋 */
  reset: () => void;
};

/**
 * 에러를 사용자 친화적 메시지로 변환
 */
function mapErrorToTranslationError(e: unknown): TranslationError {
  if (e instanceof PrefetchRequiredError) {
    return {
      message:
        "오프라인 리소스가 없습니다. '모델 다운로드'로 준비한 뒤 다시 시도해 주세요.",
      code: e.code,
    };
  }

  if (e instanceof UnsupportedLanguageError) {
    return {
      message: e.message,
      code: e.code,
      lang: e.lang,
    };
  }

  const msg = e instanceof Error ? e.message : String(e);

  if (/Failed to fetch|NetworkError|TypeError/i.test(msg)) {
    if (
      typeof navigator !== "undefined" &&
      navigator.onLine === false
    ) {
      return {
        message: "네트워크 연결이 끊어졌습니다. 연결 후 다시 시도해 주세요.",
        code: "NETWORK_OFFLINE",
      };
    }
    return {
      message: "네트워크 또는 CORS 정책 문제로 요청에 실패했습니다.",
      code: "NETWORK_ERROR",
    };
  }

  if (/invalid data location|Inputs given to model: \{\}/i.test(msg)) {
    return {
      message:
        "런타임 구성 오류: WASM 경로/토크나이저/양자화(q8) 구성을 확인해 주세요.",
      code: "RUNTIME_ERROR",
    };
  }

  return {
    message: msg || "번역 중 오류가 발생했습니다.",
    code: "UNKNOWN_ERROR",
  };
}

/**
 * 범용 번역 Mutation Hook
 *
 * @example
 * ```tsx
 * const { translateAsync, result, isTranslating, error } = useTranslation();
 *
 * const handleTranslate = async () => {
 *   const result = await translateAsync({
 *     text: "안녕하세요",
 *     srcLang: "kor_Hang",
 *     tgtLang: "spa_Latn",
 *   });
 *   console.log(result.text); // "Hola"
 * };
 * ```
 */
export function useTranslation(
  options?: UseTranslationOptions
): UseTranslationResult {
  const mutation = useMutation<
    TranslateResult,
    unknown,
    TranslationMutationInput
  >({
    mutationKey: translationKeys.mutation(),
    mutationFn: async (input: TranslationMutationInput) => {
      const args: TranslateArgs = {
        text: input.text,
        srcLang: input.srcLang,
        tgtLang: input.tgtLang,
      };
      return translate(args);
    },
    retry: 0,
  });

  // 전역 Mutation 상태 추적 (같은 mutationKey를 가진 모든 Mutation)
  const mutationStateList = useMutationState({
    filters: { mutationKey: translationKeys.mutation(), status: "pending" },
  });
  const isTranslating = mutationStateList.length > 0;

  // 에러 변환
  const error: TranslationError | null = mutation.error
    ? mapErrorToTranslationError(mutation.error)
    : null;

  // translateAsync with error handling
  const translateAsync = useCallback(
    async (input: TranslationMutationInput): Promise<TranslateResult> => {
      try {
        return await mutation.mutateAsync(input);
      } catch (e: unknown) {
        // 오프라인 리소스 필요 시 콜백
        if (e instanceof PrefetchRequiredError && options?.onOfflineRequired) {
          const retry = async () => {
            await mutation.mutateAsync(input);
          };
          options.onOfflineRequired(retry);
        }

        // 지원하지 않는 언어 시 콜백
        if (
          e instanceof UnsupportedLanguageError &&
          options?.onUnsupportedLanguage
        ) {
          options.onUnsupportedLanguage(e.lang);
        }

        throw e;
      }
    },
    [mutation, options]
  );

  // translateMutate (fire and forget)
  const translateMutate = useCallback(
    (input: TranslationMutationInput) => {
      mutation.mutate(input, {
        onError: (e: unknown) => {
          if (
            e instanceof PrefetchRequiredError &&
            options?.onOfflineRequired
          ) {
            const retry = async () => {
              await mutation.mutateAsync(input);
            };
            options.onOfflineRequired(retry);
          }

          if (
            e instanceof UnsupportedLanguageError &&
            options?.onUnsupportedLanguage
          ) {
            options.onUnsupportedLanguage(e.lang);
          }
        },
      });
    },
    [mutation, options]
  );

  return {
    translateAsync,
    translateMutate,
    result: mutation.data,
    error,
    isTranslating,
    reset: mutation.reset,
  };
}

/**
 * 특정 언어쌍 전용 번역 Mutation Hook
 *
 * @example
 * ```tsx
 * const { translateAsync, isTranslating } = useTranslationByPair(
 *   "kor_Hang",
 *   "jpn_Jpan"
 * );
 *
 * const result = await translateAsync("안녕하세요");
 * ```
 */
export function useTranslationByPair(
  srcLang: string,
  tgtLang: string,
  options?: UseTranslationOptions
) {
  const mutation = useMutation<TranslateResult, unknown, string>({
    mutationKey: translationKeys.mutationByPair(srcLang, tgtLang),
    mutationFn: async (text: string) => {
      return translate({ text, srcLang, tgtLang });
    },
    retry: 0,
  });

  const mutationStateList = useMutationState({
    filters: {
      mutationKey: translationKeys.mutationByPair(srcLang, tgtLang),
      status: "pending",
    },
  });
  const isTranslating = mutationStateList.length > 0;

  const error: TranslationError | null = mutation.error
    ? mapErrorToTranslationError(mutation.error)
    : null;

  const translateAsync = useCallback(
    async (text: string): Promise<TranslateResult> => {
      try {
        return await mutation.mutateAsync(text);
      } catch (e: unknown) {
        if (e instanceof PrefetchRequiredError && options?.onOfflineRequired) {
          const retry = async () => {
            await mutation.mutateAsync(text);
          };
          options.onOfflineRequired(retry);
        }

        if (
          e instanceof UnsupportedLanguageError &&
          options?.onUnsupportedLanguage
        ) {
          options.onUnsupportedLanguage(e.lang);
        }

        throw e;
      }
    },
    [mutation, options]
  );

  const translateMutate = useCallback(
    (text: string) => {
      mutation.mutate(text, {
        onError: (e: unknown) => {
          if (
            e instanceof PrefetchRequiredError &&
            options?.onOfflineRequired
          ) {
            const retry = async () => {
              await mutation.mutateAsync(text);
            };
            options.onOfflineRequired(retry);
          }

          if (
            e instanceof UnsupportedLanguageError &&
            options?.onUnsupportedLanguage
          ) {
            options.onUnsupportedLanguage(e.lang);
          }
        },
      });
    },
    [mutation, options]
  );

  return {
    translateAsync,
    translateMutate,
    result: mutation.data,
    error,
    isTranslating,
    reset: mutation.reset,
  };
}
