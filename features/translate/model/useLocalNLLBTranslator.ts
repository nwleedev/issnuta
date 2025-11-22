"use client";

import {
  PrefetchRequiredError,
  translateJaToKo,
  translateKoToEn,
  translateKoToJa,
} from "@/shared/lib/translator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { useCallback, useRef, useState, type FormEvent } from "react";
import {
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { z } from "zod";

export type LocalTranslatorDirection = "koja" | "jako";

export type LocalTranslatorFormValues = {
  input: string;
  direction: LocalTranslatorDirection;
  showCrosscheck: boolean;
};

export type LocalTranslatorOutputs = {
  ko: string;
  ja: string;
  en: string;
};

export type LocalTranslatorFieldErrors = {
  ja: string | null;
  en: string | null;
};

type TranslationData = {
  outputs: LocalTranslatorOutputs;
  fieldErrors: LocalTranslatorFieldErrors;
  globalError: string | null;
};

export type LocalTranslationState = {
  form: UseFormReturn<LocalTranslatorFormValues>;
  input: string;
  direction: LocalTranslatorDirection;
  outputs: LocalTranslatorOutputs;
  fieldErrors: LocalTranslatorFieldErrors;
  globalError: string | null;
  isTranslating: boolean;
  slow: boolean;
};

export type LocalTranslationHandlers = {
  handleSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  handleSwap: () => void;
  handleCopy: (text: string, which: "in" | "out") => Promise<void>;
  handleClear: () => void;
};

export type UseLocalNLLBTranslatorOptions = {
  onOfflineRequired?: (retry: () => Promise<void>) => void;
};

export type UseLocalNLLBTranslatorResult = LocalTranslationState &
  LocalTranslationHandlers;

const EMPTY_OUTPUTS: LocalTranslatorOutputs = { ko: "", ja: "", en: "" };
const EMPTY_FIELD_ERRORS: LocalTranslatorFieldErrors = {
  ja: null,
  en: null,
};

const translationMutationKey = ["translation", "local-nllb"] as const;

function mapErrorToMessage(e: unknown): string {
  if (
    e instanceof PrefetchRequiredError ||
    (typeof e === "object" &&
      e &&
      (e as any)?.code === "OFFLINE_PREFETCH_REQUIRED")
  ) {
    return "오프라인 리소스가 없습니다. ‘모델 다운로드’로 준비한 뒤 다시 시도해 주세요.";
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError|TypeError/i.test(msg)) {
    if (
      typeof navigator !== "undefined" &&
      (navigator as any)?.onLine === false
    ) {
      return "네트워크 연결이 끊어졌습니다. 연결 후 다시 시도해 주세요.";
    }
    return "네트워크 또는 CORS 정책 문제로 요청에 실패했습니다.";
  }
  if (/invalid data location|Inputs given to model: \{\}/i.test(msg)) {
    return "런타임 구성 오류: WASM 경로/토크나이저/양자화(q8) 구성을 확인해 주세요.";
  }
  return msg || "번역 중 오류가 발생했습니다.";
}

export function useLocalNLLBTranslator(
  options?: UseLocalNLLBTranslatorOptions
): UseLocalNLLBTranslatorResult {
  const schema = z.object({
    input: z
      .string()
      .trim()
      .min(1, { message: "1자 이상 입력하세요." })
      .max(300, { message: "최대 300자까지 입력 가능합니다." }),
    direction: z.enum(["koja", "jako"]),
    showCrosscheck: z.boolean(),
  });

  const form = useForm<LocalTranslatorFormValues>({
    defaultValues: { input: "", direction: "koja", showCrosscheck: true },
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const direction = useWatch({
    control: form.control,
    name: "direction",
  });
  const input = useWatch({
    control: form.control,
    name: "input",
  });

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const slowTimerRef = useRef<number | null>(null);

  const translateMutation = useMutation<
    TranslationData,
    unknown,
    LocalTranslatorFormValues
  >({
    mutationKey: translationMutationKey,
    mutationFn: async ({ input, direction, showCrosscheck }) => {
      const baseOutputs: LocalTranslatorOutputs = { ...EMPTY_OUTPUTS };
      const baseErrors: LocalTranslatorFieldErrors = {
        ...EMPTY_FIELD_ERRORS,
      };

      if (!input.trim()) {
        return {
          outputs: baseOutputs,
          fieldErrors: baseErrors,
          globalError: null,
        };
      }

      if (direction === "koja") {
        if (showCrosscheck) {
          const [jaRes, enRes] = await Promise.allSettled([
            translateKoToJa(input),
            translateKoToEn(input),
          ]);

          const outputs: LocalTranslatorOutputs = { ...baseOutputs };
          const fieldErrors: LocalTranslatorFieldErrors = {
            ...baseErrors,
          };
          let globalError: string | null = null;

          if (jaRes.status === "fulfilled") {
            outputs.ja = jaRes.value;
          } else {
            const msg =
              jaRes.reason instanceof Error
                ? jaRes.reason.message
                : String(jaRes.reason);
            fieldErrors.ja = msg || "일본어 번역에 실패했습니다.";
          }

          if (enRes.status === "fulfilled") {
            outputs.en = enRes.value;
          } else {
            const msg =
              enRes.reason instanceof Error
                ? enRes.reason.message
                : String(enRes.reason);
            fieldErrors.en = msg || "영어 번역에 실패했습니다.";
          }

          if (jaRes.status === "rejected" && enRes.status === "rejected") {
            globalError =
              "두 번역 모두 실패했습니다. 네트워크 또는 모델 상태를 확인하세요.";
          }

          return { outputs, fieldErrors, globalError };
        }

        try {
          const ja = await translateKoToJa(input);
          const outputs: LocalTranslatorOutputs = {
            ...baseOutputs,
            ja,
          };
          return {
            outputs,
            fieldErrors: baseErrors,
            globalError: null,
          };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          const fieldErrors: LocalTranslatorFieldErrors = {
            ...baseErrors,
            ja: msg || "일본어 번역에 실패했습니다.",
          };
          return {
            outputs: baseOutputs,
            fieldErrors,
            globalError: null,
          };
        }
      }

      const text = await translateJaToKo(input);
      const outputs: LocalTranslatorOutputs = { ...baseOutputs, ko: text };
      return {
        outputs,
        fieldErrors: baseErrors,
        globalError: null,
      };
    },
    retry: 0,
  });

  const mutationStateList = useMutationState({
    filters: { mutationKey: translationMutationKey, status: "pending" },
  });
  const isTranslating = mutationStateList.length > 0;

  const outputs: LocalTranslatorOutputs =
    translateMutation.data?.outputs ?? EMPTY_OUTPUTS;
  const fieldErrors: LocalTranslatorFieldErrors =
    translateMutation.data?.fieldErrors ?? EMPTY_FIELD_ERRORS;

  const derivedGlobalErrorFromData =
    translateMutation.data?.globalError ?? null;

  const handleTranslate = useCallback(
    async ({
      input,
      direction,
      showCrosscheck,
    }: LocalTranslatorFormValues): Promise<void> => {
      setGlobalError(null);
      if (!input.trim()) return;

      const attempt = async () => {
        try {
          setSlow(false);
          try {
            slowTimerRef.current = window.setTimeout(
              () => setSlow(true),
              12_000
            );
          } catch {}

          await translateMutation.mutateAsync({
            input,
            direction,
            showCrosscheck,
          });
        } catch (e: unknown) {
          if (
            e instanceof PrefetchRequiredError ||
            (typeof e === "object" &&
              e &&
              (e as any)?.code === "OFFLINE_PREFETCH_REQUIRED")
          ) {
            if (options?.onOfflineRequired) {
              const retry = async () => {
                await form.handleSubmit(handleTranslate)();
              };
              options.onOfflineRequired(retry);
            } else {
              const message = mapErrorToMessage(e);
              setGlobalError(message);
            }
            return;
          }
          const message = mapErrorToMessage(e);
          setGlobalError(message);
        } finally {
          if (slowTimerRef.current) {
            try {
              window.clearTimeout(slowTimerRef.current);
            } catch {}
            slowTimerRef.current = null;
          }
          setSlow(false);
        }
      };

      await attempt();
    },
    [form, options, translateMutation]
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
    const nextDirection: LocalTranslatorDirection =
      direction === "koja" ? "jako" : "koja";
    form.setValue("direction", nextDirection);
    if (direction === "koja" && outputs.ja) {
      form.setValue("input", outputs.ja);
    } else if (direction === "jako" && outputs.ko) {
      form.setValue("input", outputs.ko);
    }
    translateMutation.reset();
  }, [direction, form, outputs.ja, outputs.ko, translateMutation]);

  const handleCopy = useCallback(
    async (text: string, which: "in" | "out") => {
      void which;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // noop
      }
    },
    []
  );

  const handleClear = useCallback(() => {
    const currentShowCrosscheck = form.getValues("showCrosscheck");
    form.reset({
      input: "",
      direction,
      showCrosscheck: currentShowCrosscheck,
    });
    translateMutation.reset();
    setGlobalError(null);
    setSlow(false);
  }, [direction, form, translateMutation]);

  const effectiveGlobalError =
    derivedGlobalErrorFromData ?? globalError;

  return {
    form,
    input,
    direction,
    outputs,
    fieldErrors,
    globalError: effectiveGlobalError,
    isTranslating,
    slow,
    handleSubmit,
    handleSwap,
    handleCopy,
    handleClear,
  };
}
