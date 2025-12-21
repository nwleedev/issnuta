"use client";

/**
 * 범용 번역 Hook
 *
 * - 16개 언어 지원 (NLLB 코드 기반)
 * - useLanguagePreference로 언어쌍 영속화
 * - useTranslation으로 번역 실행
 * - v2 형식으로 저장
 */

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useLanguagePreference } from "@/shared/lib/use-language-preference";
import {
  useTranslation,
  useTranslationByPair,
  type TranslationError,
} from "@/features/translate/model/useTranslation";
import { useSaveTranslationV2 } from "@/features/feeds/model/useLocalTranslations";

// ============================================================
// Types
// ============================================================

export type UniversalTranslatorFormValues = {
  input: string;
};

export type UniversalTranslatorState = {
  form: UseFormReturn<UniversalTranslatorFormValues>;
  input: string;
  srcLang: string;
  tgtLang: string;
  output: string;
  error: TranslationError | null;
  isTranslating: boolean;
  slow: boolean;
  /** 영어 교차검증 활성화 여부 */
  showCrossCheck: boolean;
  /** 영어 교차검증 결과 */
  crossCheck: string;
  /** 영어 교차검증 에러 */
  crossCheckError: TranslationError | null;
  /** 영어 교차검증 번역 진행 중 여부 */
  isCrossCheckTranslating: boolean;
};

export type UniversalTranslatorHandlers = {
  handleSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  handleSwap: () => void;
  handleCopy: (text: string) => Promise<void>;
  handleClear: () => void;
  setSrcLang: (nllbCode: string) => void;
  setTgtLang: (nllbCode: string) => void;
  handleSave: () => Promise<void>;
  /** 영어 교차검증 활성화/비활성화 */
  setShowCrossCheck: (show: boolean) => void;
};

export type UseUniversalTranslatorOptions = {
  onOfflineRequired?: (retry: () => Promise<void>) => void;
  autoSave?: boolean;
};

export type UseUniversalTranslatorResult = UniversalTranslatorState &
  UniversalTranslatorHandlers;

// ============================================================
// Hook Implementation
// ============================================================

export function useUniversalTranslator(
  options?: UseUniversalTranslatorOptions
): UseUniversalTranslatorResult {
  // Form schema
  const schema = z.object({
    input: z
      .string()
      .trim()
      .min(1, { message: "1자 이상 입력하세요." })
      .max(300, { message: "최대 300자까지 입력 가능합니다." }),
  });

  // Form state
  const form = useForm<UniversalTranslatorFormValues>({
    defaultValues: { input: "" },
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const input = useWatch({
    control: form.control,
    name: "input",
  });

  // Language preference (persisted)
  const {
    pair,
    setSource: setSrcLang,
    setTarget: setTgtLang,
    swap,
  } = useLanguagePreference();

  const srcLang = pair.source;
  const tgtLang = pair.target;

  // Translation mutation
  const {
    translateAsync,
    result,
    error,
    isTranslating,
    reset: resetTranslation,
  } = useTranslation({
    onOfflineRequired: options?.onOfflineRequired,
  });

  // Save mutation
  const saveTranslation = useSaveTranslationV2();

  // Cross-check mutation (영어 교차검증: srcLang → eng_Latn)
  const [showCrossCheck, setShowCrossCheck] = useState(false);
  const crossCheckMutation = useTranslationByPair(
    srcLang,
    "eng_Latn",
    { onOfflineRequired: options?.onOfflineRequired }
  );

  // UI state
  const [slow, setSlow] = useState(false);
  const slowTimerRef = useRef<number | null>(null);

  // Current output
  const output = result?.text ?? "";

  // Cross-check output (영어 교차검증 결과)
  const crossCheck = crossCheckMutation.result?.text ?? "";
  const crossCheckError = crossCheckMutation.error;
  const isCrossCheckTranslating = crossCheckMutation.isTranslating;

  // ============================================================
  // Handlers
  // ============================================================

  // 교차검증 활성화 조건: 소스/타겟 모두 영어가 아닐 때
  const shouldCrossCheck =
    showCrossCheck && srcLang !== "eng_Latn" && tgtLang !== "eng_Latn";

  const handleTranslate = useCallback(
    async ({ input }: UniversalTranslatorFormValues): Promise<void> => {
      if (!input.trim()) return;

      try {
        setSlow(false);
        slowTimerRef.current = window.setTimeout(() => setSlow(true), 12_000);

        // 교차검증 이전 결과 초기화
        crossCheckMutation.reset();

        if (shouldCrossCheck) {
          // 메인 번역 + 영어 교차검증 병렬 실행
          const [mainRes, crossRes] = await Promise.allSettled([
            translateAsync({ text: input, srcLang, tgtLang }),
            crossCheckMutation.translateAsync(input),
          ]);

          // 메인 번역 실패 시 에러 throw
          if (mainRes.status === "rejected") {
            throw mainRes.reason;
          }

          // Auto-save if enabled (교차검증 결과 포함)
          if (options?.autoSave && mainRes.value) {
            const crossCheckText =
              crossRes.status === "fulfilled" ? crossRes.value.text : undefined;
            await saveTranslation.mutateAsync({
              input,
              srcLang,
              tgtLang,
              output: mainRes.value.text,
              crossCheck: crossCheckText,
            });
          }
        } else {
          // 교차검증 없이 메인 번역만 실행
          const translationResult = await translateAsync({
            text: input,
            srcLang,
            tgtLang,
          });

          // Auto-save if enabled
          if (options?.autoSave && translationResult) {
            await saveTranslation.mutateAsync({
              input,
              srcLang,
              tgtLang,
              output: translationResult.text,
            });
          }
        }
      } finally {
        if (slowTimerRef.current) {
          window.clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }
        setSlow(false);
      }
    },
    [
      shouldCrossCheck,
      srcLang,
      tgtLang,
      translateAsync,
      crossCheckMutation,
      options?.autoSave,
      saveTranslation,
    ]
  );

  const handleSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      if (event) {
        event.preventDefault();
      }
      void form.handleSubmit(handleTranslate)();
    },
    [form, handleTranslate]
  );

  const handleSwap = useCallback(() => {
    swap();
    // Output을 새 input으로 설정
    if (output) {
      form.setValue("input", output);
    }
    resetTranslation();
    crossCheckMutation.reset();
  }, [swap, output, form, resetTranslation, crossCheckMutation]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  }, []);

  const handleClear = useCallback(() => {
    form.reset({ input: "" });
    resetTranslation();
    crossCheckMutation.reset();
    setSlow(false);
  }, [form, resetTranslation, crossCheckMutation]);

  const handleSave = useCallback(async () => {
    if (!input.trim() || !output) return;

    await saveTranslation.mutateAsync({
      input,
      srcLang,
      tgtLang,
      output,
      crossCheck: crossCheck || undefined,
    });
  }, [input, output, srcLang, tgtLang, crossCheck, saveTranslation]);

  // ============================================================
  // Return
  // ============================================================

  return {
    // State
    form,
    input,
    srcLang,
    tgtLang,
    output,
    error,
    isTranslating,
    slow,
    // Cross-check state
    showCrossCheck,
    crossCheck,
    crossCheckError,
    isCrossCheckTranslating,
    // Handlers
    handleSubmit,
    handleSwap,
    handleCopy,
    handleClear,
    setSrcLang,
    setTgtLang,
    handleSave,
    setShowCrossCheck,
  };
}
