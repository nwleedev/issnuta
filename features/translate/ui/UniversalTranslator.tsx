"use client";

import { useRef, useState, type ReactNode } from "react";
import { Copy, RotateCcw, X, Bookmark } from "lucide-react";

import { useUniversalTranslator } from "@/features/translate/model/useUniversalTranslator";
import { LanguagePairSelector } from "@/features/translate/ui/LanguagePairSelector";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

// ============================================================
// Types
// ============================================================

export type UniversalTranslatorActionsParams = {
  input: string;
  srcLang: string;
  tgtLang: string;
  output: string;
  /** 영어 교차검증 결과 (선택) */
  crossCheck?: string;
  slow: boolean;
  isTranslating: boolean;
  onSave: () => Promise<void>;
};

export type UniversalTranslatorProps = {
  renderActions?: (params: UniversalTranslatorActionsParams) => ReactNode;
  onOfflineRequired?: (retry: () => Promise<void>) => void;
};

// ============================================================
// Component
// ============================================================

export function UniversalTranslator({
  renderActions,
  onOfflineRequired,
}: UniversalTranslatorProps) {
  const {
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
  } = useUniversalTranslator({ onOfflineRequired });

  const { register, formState } = form;
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [copied, setCopied] = useState<"in" | "out" | "crossCheck" | null>(null);
  const [saved, setSaved] = useState(false);

  const { ref: inputFieldRef, ...inputFieldProps } = register("input", {
    setValueAs: (v) => (typeof v === "string" ? v : ""),
  });

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    try {
      inputRef.current?.blur();
    } catch {}
    handleSubmit(event);
  };

  const copy = async (text: string, which: "in" | "out" | "crossCheck") => {
    await handleCopy(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const save = async () => {
    await handleSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="flex flex-col gap-5">
      {/* Language Selector */}
      <LanguagePairSelector
        srcLang={srcLang}
        tgtLang={tgtLang}
        onSrcLangChange={setSrcLang}
        onTgtLangChange={setTgtLang}
        onSwap={handleSwap}
      />

      {/* Input Card */}
      <form onSubmit={onSubmit} className="relative">
        <div className="mb-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
          입력
        </div>
        <div className="relative">
          <Textarea
            className="min-h-40 rounded-xl border border-[var(--border-primary)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:bg-[var(--surface-warm)]"
            placeholder="번역할 텍스트 입력..."
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
              srcLang,
              tgtLang,
              output,
              crossCheck,
              slow,
              isTranslating,
              onSave: save,
            })}
        </div>
        {/* 교차검증 토글 (소스/타겟이 영어가 아닐 때만 표시) */}
        {srcLang !== "eng_Latn" && tgtLang !== "eng_Latn" && (
          <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--brand-primary)] focus:ring-[var(--border-focus)]"
              checked={showCrossCheck}
              onChange={(e) => setShowCrossCheck(e.target.checked)}
            />
            <span className="text-[var(--text-secondary)]">
              영어 결과도 함께 보기(교차검증)
            </span>
          </label>
        )}
      </form>

      {/* Error Display */}
      {error ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive" role="alert">
            {error.message}
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

      {/* Output */}
      {output && (
        <div className="relative">
          <div className="mb-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
            결과
          </div>
          <Textarea
            readOnly
            className="rounded-xl border border-[var(--border-warm)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
            value={output}
            rows={3}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="저장"
              onClick={save}
              disabled={!input.trim() || !output}
            >
              <Bookmark
                className={`w-4 h-4 ${
                  saved
                    ? "text-[var(--brand-accent)] fill-current"
                    : "text-[var(--brand-primary)]"
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="복사"
              onClick={() => copy(output, "out")}
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

      {/* Cross-check Output (영어 교차검증 결과) */}
      {crossCheck && (
        <div className="relative">
          <div className="mb-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
            영어 번역(교차검증)
          </div>
          <Textarea
            readOnly
            className="rounded-xl border border-[var(--border-warm)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
            value={crossCheck}
            rows={3}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="교차검증 복사"
              onClick={() => copy(crossCheck, "crossCheck")}
            >
              <Copy
                className={`w-4 h-4 ${
                  copied === "crossCheck"
                    ? "text-[var(--brand-accent)]"
                    : "text-[var(--brand-primary)]"
                }`}
              />
            </Button>
          </div>
        </div>
      )}

      {/* Cross-check Error */}
      {crossCheckError && !isCrossCheckTranslating && (
        <p className="text-xs text-amber-600" role="alert">
          교차검증 실패: {crossCheckError.message}
        </p>
      )}

      {/* Slow Warning */}
      {slow && isTranslating && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-700">
            예상보다 오래 걸립니다. 네트워크/서버 지연일 수 있습니다.
          </span>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border border-[#e8e8e0] text-[#5a4a3a] hover:bg-[#fef9f3]"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="w-4 h-4" /> 새로고침
          </Button>
        </div>
      )}
    </section>
  );
}

export default UniversalTranslator;
