"use client";

import { useSaveTranslation } from "@/features/feeds/model/useLocalTranslations";
import { Button } from "@/shared/ui/button";
import * as React from "react";

export type SaveTranslationButtonProps = {
  input: string;
  direction: "koja" | "jako";
  outputs: { ko: string; ja: string; en: string };
  className?: string;
};

export default function SaveTranslationButton({
  input,
  direction,
  outputs,
  className,
}: SaveTranslationButtonProps) {
  const saveMutation = useSaveTranslation();
  const [saved, setSaved] = React.useState(false);

  const handleSave = React.useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const primary = direction === "koja" ? outputs.ja : outputs.ko;
    if (!primary.trim()) return;

    setSaved(true);
    try {
      saveMutation.mutate({
        input: trimmedInput,
        direction,
        outputs,
      });
    } catch {
      // noop
    }
  }, [direction, input, outputs, saveMutation]);

  const disabled =
    !input.trim() ||
    !(
      (direction === "koja" && outputs.ja.trim()) ||
      (direction === "jako" && outputs.ko.trim())
    ) ||
    saved;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={className}
      onClick={handleSave}
    >
      {!saved ? "번역 저장" : "저장됨"}
    </Button>
  );
}
