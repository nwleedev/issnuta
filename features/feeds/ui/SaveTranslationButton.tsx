"use client";

import {
  FEEDS_KEY,
  type FeedItem,
  type FeedLang,
} from "@/shared/lib/feeds-storage";
import { Button } from "@/shared/ui/button";
import { useLocalStorage } from "@uidotdev/usehooks";
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
  const [feeds, setFeeds] = useLocalStorage<FeedItem[]>(FEEDS_KEY, []);
  const [saved, setSaved] = React.useState(false);

  const handleSave = React.useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const primary = direction === "koja" ? outputs.ja : outputs.ko;
    if (!primary.trim()) return;

    const crossCheck =
      direction === "koja" ? outputs.en || undefined : undefined;

    const fromLang: FeedLang = direction === "koja" ? "ko" : "ja";
    const toLang: FeedLang = direction === "koja" ? "ja" : "ko";

    const newItem: FeedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      input: trimmedInput,
      primary,
      crossCheck,
      fromLang,
      toLang,
      createdAt: Date.now(),
      isFavorite: false,
    };

    setSaved(true);
    setFeeds([...feeds, newItem]);
  }, [input, direction, outputs, feeds, setFeeds]);

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
