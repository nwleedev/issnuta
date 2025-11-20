"use client";
import OfflineSetup from "@/features/offline/ui/OfflineSetup";
import {
  NLLB_MODEL_ID,
  PrefetchRequiredError,
  translateJaToKo,
  translateKoToEn,
  translateKoToJa,
} from "@/shared/lib/translator";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { ArrowLeftRight, Copy, RotateCcw, X } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

type FormValues = {
  input: string;
  direction: "koja" | "jako";
  showCrosscheck: boolean;
};

type OutputState = {
  ko: string;
  ja: string;
  en: string;
};

type FieldErrorState = {
  ja: string | null;
  en: string | null;
};

type TranslationData = {
  outputs: OutputState;
  fieldErrors: FieldErrorState;
  globalError: string | null;
};

const EMPTY_OUTPUTS: OutputState = { ko: "", ja: "", en: "" };
const EMPTY_FIELD_ERRORS: FieldErrorState = { ja: null, en: null };

const translationMutationKey = ["translation", "local-nllb"] as const;

const SaveTranslationButton = dynamic(
  () =>
    import("@/features/feeds/ui/SaveTranslationButton").then((m) => m.default),
  {
    ssr: false,
    loading: () => <React.Fragment />,
  }
);

export function LocalNLLBTranslator() {
  const schema = z.object({
    input: z
      .string()
      .trim()
      .min(1, { message: "1자 이상 입력하세요." })
      .max(300, { message: "최대 300자까지 입력 가능합니다." }),
    direction: z.enum(["koja", "jako"]),
    showCrosscheck: z.boolean(),
  });

  const form = useForm<FormValues>({
    defaultValues: { input: "", direction: "koja", showCrosscheck: true },
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const { register, handleSubmit, setValue, formState } = form;
  const direction = useWatch({ control: form.control, name: "direction" });
  const input = useWatch({ control: form.control, name: "input" });
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [copied, setCopied] = React.useState<"in" | "out" | null>(null);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [slow, setSlow] = React.useState(false); // 장기 지연 안내 플래그
  const [offlineOpen, setOfflineOpen] = React.useState(false);
  const retryRef = React.useRef<(() => Promise<void>) | null>(null);
  const slowTimerRef = React.useRef<number | null>(null);

  const { ref: inputFieldRef, ...inputFieldProps } = register("input", {
    setValueAs: (v) => (typeof v === "string" ? v : ""),
  });

  const translateMutation = useMutation<TranslationData, unknown, FormValues>({
    mutationKey: translationMutationKey,
    mutationFn: async ({ input, direction, showCrosscheck }) => {
      const baseOutputs: OutputState = { ...EMPTY_OUTPUTS };
      const baseErrors: FieldErrorState = { ...EMPTY_FIELD_ERRORS };

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
            translateKoToJa(input, { num_beams: 3, max_new_tokens: 128 }),
            translateKoToEn(input, { num_beams: 3, max_new_tokens: 128 }),
          ]);

          const outputs: OutputState = { ...baseOutputs };
          const fieldErrors: FieldErrorState = { ...baseErrors };
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
          const ja = await translateKoToJa(input, {
            num_beams: 3,
            max_new_tokens: 128,
          });
          const outputs: OutputState = { ...baseOutputs, ja };
          return {
            outputs,
            fieldErrors: baseErrors,
            globalError: null,
          };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          const fieldErrors: FieldErrorState = {
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

      const text = await translateJaToKo(input, {
        num_beams: 3,
        max_new_tokens: 128,
      });
      const outputs: OutputState = { ...baseOutputs, ko: text };
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

  const outputs: OutputState =
    translateMutation.data?.outputs ?? EMPTY_OUTPUTS;
  const fieldErrors: FieldErrorState =
    translateMutation.data?.fieldErrors ?? EMPTY_FIELD_ERRORS;

  // 사용자 안내용 에러 메시지 맵핑(요약)
  function mapErrorToMessage(e: unknown): string {
    // 오프라인 프리페치 요구
    if (
      e instanceof PrefetchRequiredError ||
      (typeof e === "object" &&
        e &&
        (e as any)?.code === "OFFLINE_PREFETCH_REQUIRED")
    ) {
      return "오프라인 리소스가 없습니다. ‘모델 다운로드’로 준비한 뒤 다시 시도해 주세요.";
    }
    const msg = e instanceof Error ? e.message : String(e);
    // 네트워크/CORS 계열
    if (/Failed to fetch|NetworkError|TypeError/i.test(msg)) {
      if (
        typeof navigator !== "undefined" &&
        (navigator as any)?.onLine === false
      ) {
        return "네트워크 연결이 끊어졌습니다. 연결 후 다시 시도해 주세요.";
      }
      return "네트워크 또는 CORS 정책 문제로 요청에 실패했습니다.";
    }
    // 런타임 바인딩/경로 문제
    if (/invalid data location|Inputs given to model: \{\}/i.test(msg)) {
      return "런타임 구성 오류: WASM 경로/토크나이저/양자화(q8) 구성을 확인해 주세요.";
    }
    return msg || "번역 중 오류가 발생했습니다.";
  }

  const derivedGlobalErrorFromData =
    translateMutation.data?.globalError ?? null;

  async function handleTranslate({
    input,
    direction,
    showCrosscheck,
  }: FormValues): Promise<void> {
    // 모바일: 번역 시작 시 입력 포커스를 제거하여 키보드를 닫습니다.
    try {
      inputRef.current?.blur();
    } catch {}
    setGlobalError(null);
    if (!input.trim()) return;
    const attempt = async () => {
      try {
        setSlow(false);
        // 12초 경과 시 장기 지연 안내 플래그 on
        try {
          slowTimerRef.current = window.setTimeout(() => setSlow(true), 12_000);
        } catch {}
        await translateMutation.mutateAsync({
          input,
          direction,
          showCrosscheck,
        });
      } catch (e: unknown) {
        if (
          e instanceof PrefetchRequiredError ||
          (e as any)?.code === "OFFLINE_PREFETCH_REQUIRED"
        ) {
          // 오프라인에서 필수 리소스가 캐시에 없음 → 프리페치 유도
          // 완료 후 최신 폼값으로 재시도
          retryRef.current = onSubmit;
          setOfflineOpen(true);
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
  }

  const onSubmit = handleSubmit(handleTranslate);

  const swap = () => {
    const nextDirection = direction === "koja" ? "jako" : "koja";
    setValue("direction", nextDirection);
    if (direction === "koja" && outputs.ja) {
      setValue("input", outputs.ja);
    } else if (direction === "jako" && outputs.ko) {
      setValue("input", outputs.ko);
    }
    translateMutation.reset();
  };

  const copy = async (text: string, which: "in" | "out") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  // Note: Microphone and speaker features removed for minimal deployment.

  return (
    <section className="flex flex-col gap-5">
      {/* Language selector (Warm minimalist) */}
      <div className="relative grid grid-cols-2 gap-3">
        {["ko", "ja"].map((code) => {
          const active =
            (direction === "koja" && code === "ko") ||
            (direction === "jako" && code === "ja");
          const native = code === "ko" ? "한국어" : "日本語";
          return (
            <button
              key={code}
              type="button"
              onClick={() =>
                setValue("direction", code === "ko" ? "koja" : "jako")
              }
              className={[
                "rounded-xl border p-5 transition-colors",
                active
                  ? "border-[var(--border-focus)] bg-[var(--surface-warm)]"
                  : "border-[var(--border-primary)] bg-white hover:border-[var(--border-secondary)]",
              ].join(" ")}
            >
              <div className="text-center">
                <div
                  className={[
                    "uppercase text-xs tracking-wider mb-1",
                    active
                      ? "text-[var(--brand-primary)]"
                      : "text-[var(--text-tertiary)]",
                  ].join(" ")}
                >
                  {code}
                </div>
                <div
                  className={
                    active
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }
                >
                  {native}
                </div>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={swap}
          aria-label="언어 전환"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-white border border-[var(--border-primary)] hover:border-[var(--border-focus)] shadow-sm grid place-items-center"
        >
          <ArrowLeftRight className="w-4 h-4 text-[var(--brand-primary)]" />
        </button>
      </div>

      {/* Input card */}
      <form onSubmit={onSubmit} className="relative">
        <div className="mb-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
          입력
        </div>
        <div className="relative">
          <Textarea
            className="min-h-40 rounded-xl border border-[var(--border-primary)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:bg-[var(--surface-warm)]"
            placeholder={
              direction === "koja"
                ? "번역할 텍스트 입력..."
                : "翻訳するテキストを入力..."
            }
            aria-invalid={!!formState.errors.input || undefined}
            maxLength={300}
            {...inputFieldProps}
            ref={(el) => {
              inputFieldRef(el);
              inputRef.current = el;
            }}
            rows={5}
          />
          {!!input && (
            <div className="pointer-events-none">
              <div className="absolute bottom-3 right-3 pointer-events-auto z-10 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="복사"
                  onClick={() => copy(input, "in")}
                >
                  <Copy
                    className={`w-4 h-4 ${
                      copied === "in"
                        ? "text-[var(--brand-accent)]"
                        : "text-[var(--brand-primary)]"
                    }`}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="지우기"
                  onClick={() => {
                    setValue("input", "");
                    translateMutation.reset();
                  }}
                >
                  <X className="w-4 h-4 text-[var(--brand-primary)]" />
                </Button>
              </div>
            </div>
          )}
        </div>
        {formState.errors.input && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {formState.errors.input.message as string}
          </p>
        )}
        {/* Action */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={isTranslating || !input.trim()}
            className="h-11 px-6 rounded-xl"
          >
            {isTranslating ? "모델 로딩/번역 중…" : "번역"}
          </Button>
          <SaveTranslationButton
            key={input}
            input={input}
            direction={direction}
            outputs={outputs}
            className="h-11 px-4 rounded-xl"
          />
          <span
            className={`text-xs ${
              slow && isTranslating
                ? "text-amber-700"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {slow && isTranslating
              ? "예상보다 오래 걸립니다. 네트워크/서버 지연일 수 있습니다."
              : "첫 실행은 모델 초기화로 수 초 소요될 수 있습니다."}
          </span>
          {slow && isTranslating && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border border-[#e8e8e0] text-[#5a4a3a] hover:bg-[#fef9f3]"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="w-4 h-4" /> 새로고침
            </Button>
          )}
        </div>
      </form>
      {/* 교차검증 토글 */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          {...register("showCrosscheck")}
        />
        <span className="text-[var(--text-secondary)]">
          영어 결과도 함께 보기(교차검증)
        </span>
      </label>

      {derivedGlobalErrorFromData || globalError ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive" role="alert">
            {derivedGlobalErrorFromData ?? globalError}
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border border-[#e8e8e0] text-[#5a4a3a] hover:bg-[#fef9f3]"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="w-4 h-4" /> 새로고침
          </Button>
        </div>
      ) : null}
      {/* Output (direction별 표시) */}
      {direction === "jako" && outputs.ko && (
        <div className="relative">
          <div className="mb-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
            결과
          </div>
          <Textarea
            readOnly
            className="rounded-xl border border-[var(--border-warm)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
            value={outputs.ko}
            rows={3}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="복사"
              onClick={() => copy(outputs.ko, "out")}
            >
              <Copy
                className={`w-4 h-4 ${
                  copied === "out"
                    ? "text-[var(--brand-accent)]"
                    : "text-[var(--brand-primary)]"
                }`}
              />
            </Button>
          </div>
        </div>
      )}

      {direction === "koja" &&
        (outputs.ja || outputs.en || fieldErrors.ja || fieldErrors.en) && (
          <div className="grid gap-4">
            {/* 일본어 결과 */}
            {(outputs.ja || fieldErrors.ja) && (
              <div className="relative">
                <div className="mb-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                  일본어 번역
                </div>
                {outputs.ja && (
                  <>
                    <Textarea
                      readOnly
                      className="rounded-xl border border-[var(--border-warm)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                      value={outputs.ja}
                      rows={3}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="복사"
                        onClick={() => copy(outputs.ja, "out")}
                      >
                        <Copy
                          className={`w-4 h-4 ${
                            copied === "out"
                              ? "text-[var(--brand-accent)]"
                              : "text-[var(--brand-primary)]"
                          }`}
                        />
                      </Button>
                    </div>
                  </>
                )}
                {fieldErrors.ja && (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    일본어 번역 실패: {fieldErrors.ja}
                  </p>
                )}
              </div>
            )}

            {/* 영어 결과(교차검증) */}
            {(outputs.en || fieldErrors.en) && (
              <div className="relative">
                <div className="mb-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                  영어 번역(교차검증)
                </div>
                {outputs.en && (
                  <>
                    <Textarea
                      readOnly
                      className="rounded-xl border border-[var(--border-warm)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                      value={outputs.en}
                      rows={3}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="복사"
                        onClick={() => copy(outputs.en, "out")}
                      >
                        <Copy
                          className={`w-4 h-4 ${
                            copied === "out"
                              ? "text-[var(--brand-accent)]"
                              : "text-[var(--brand-primary)]"
                          }`}
                        />
                      </Button>
                    </div>
                  </>
                )}
                {fieldErrors.en && (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    영어 번역 실패: {fieldErrors.en}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

      {/* 오프라인 준비 팝업 */}
      <OfflineSetup
        modelId={NLLB_MODEL_ID}
        open={offlineOpen}
        onClose={() => setOfflineOpen(false)}
        onDone={async () => {
          setOfflineOpen(false);
          const f = retryRef.current;
          retryRef.current = null;
          if (f) {
            // 프리페치 완료 후 자동 재시도
            await f();
          }
        }}
      />
    </section>
  );
}

export default LocalNLLBTranslator;
