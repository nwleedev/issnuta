"use client";

import { useSaveTranslationV2 } from "@/features/feeds/model/useLocalTranslations";
import { Button } from "@/shared/ui/button";
import { useCallback, useState } from "react";

export type SaveTranslationV2ButtonProps = {
  input: string;
  srcLang: string;
  tgtLang: string;
  output: string;
  crossCheck?: string;
  className?: string;
};

/**
 * v2 형식 번역 저장 버튼
 *
 * - NLLB 코드 기반 (srcLang/tgtLang)
 * - IndexedDB에 SavedTranslationV2 형식으로 저장
 */
export default function SaveTranslationV2Button({
  input,
  srcLang,
  tgtLang,
  output,
  crossCheck,
  className,
}: SaveTranslationV2ButtonProps) {
  const saveMutation = useSaveTranslationV2();
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    const trimmedInput = input.trim();
    const trimmedOutput = output.trim();

    if (!trimmedInput || !trimmedOutput) return;

    setSaved(true);
    saveMutation.mutate({
      input: trimmedInput,
      srcLang,
      tgtLang,
      output: trimmedOutput,
      crossCheck: crossCheck?.trim() || undefined,
    });
  }, [input, srcLang, tgtLang, output, crossCheck, saveMutation]);

  const disabled = !input.trim() || !output.trim() || saved;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={className}
      onClick={handleSave}
    >
      {saved ? "저장됨" : "번역 저장"}
    </Button>
  );
}
