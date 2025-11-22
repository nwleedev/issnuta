"use client";

import { Button } from "@/shared/ui/button";
import { RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { Fragment } from "react";

const SaveTranslationButton = dynamic(
  () =>
    import("@/features/feeds/ui/SaveTranslationButton").then((m) => m.default),
  {
    ssr: false,
    loading: () => <Fragment />,
  }
);

export type LocalTranslatorActionRowProps = {
  input: string;
  direction: "koja" | "jako";
  outputs: { ko: string; ja: string; en: string };
  slow: boolean;
  isTranslating: boolean;
};

export default function LocalTranslatorActionRow({
  input,
  direction,
  outputs,
  slow,
  isTranslating,
}: LocalTranslatorActionRowProps) {
  return (
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
  );
}
