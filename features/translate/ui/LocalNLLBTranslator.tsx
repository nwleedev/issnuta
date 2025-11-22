"use client";
import {
  useLocalNLLBTranslator,
  type LocalTranslatorDirection,
  type LocalTranslatorOutputs,
} from "@/features/translate/model/useLocalNLLBTranslator";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { ArrowLeftRight, Copy, RotateCcw, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

export type LocalTranslatorActionsParams = {
  input: string;
  direction: LocalTranslatorDirection;
  outputs: LocalTranslatorOutputs;
  slow: boolean;
  isTranslating: boolean;
};

export type LocalNLLBTranslatorProps = {
  renderActions?: (params: LocalTranslatorActionsParams) => ReactNode;
  onOfflineRequired?: (retry: () => Promise<void>) => void;
};

export function LocalNLLBTranslator({
  renderActions,
  onOfflineRequired,
}: LocalNLLBTranslatorProps) {
  const {
    form,
    input,
    direction,
    outputs,
    fieldErrors,
    globalError,
    isTranslating,
    slow,
    handleSubmit,
    handleSwap,
    handleCopy,
    handleClear,
  } = useLocalNLLBTranslator({ onOfflineRequired });

  const { register, setValue, formState } = form;
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [copied, setCopied] = useState<"in" | "out" | null>(null);

  const { ref: inputFieldRef, ...inputFieldProps } = register("input", {
    setValueAs: (v) => (typeof v === "string" ? v : ""),
  });

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    try {
      inputRef.current?.blur();
    } catch {}
    handleSubmit(event);
  };

  const copy = async (text: string, which: "in" | "out") => {
    await handleCopy(text, which);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
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
          onClick={handleSwap}
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
                  onClick={handleClear}
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={isTranslating || !input.trim()}
            className="h-11 px-6 rounded-xl"
          >
            {isTranslating ? "모델 로딩/번역 중…" : "번역"}
          </Button>
          {renderActions &&
            renderActions({
              input,
              direction,
              outputs,
              slow,
              isTranslating,
            })}
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

      {globalError ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive" role="alert">
            {globalError}
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
    </section>
  );
}

export default LocalNLLBTranslator;
