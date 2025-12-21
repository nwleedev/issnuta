"use client";

import { useState, useCallback } from "react";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { LanguageSelectionDialog } from "./LanguageSelectionDialog";
import { getLanguageByNllbCode } from "@/shared/config/supported-languages";

export type LanguagePairSelectorProps = {
  srcLang: string;
  tgtLang: string;
  onSrcLangChange: (nllbCode: string) => void;
  onTgtLangChange: (nllbCode: string) => void;
  onSwap?: () => void;
};

/**
 * LanguagePairSelector
 *
 * - 소스/타겟 언어를 선택하는 컴포넌트
 * - 각 버튼 클릭 시 언어 선택 다이얼로그 열림
 * - 중앙 스왑 버튼으로 언어 교환
 */
export function LanguagePairSelector({
  srcLang,
  tgtLang,
  onSrcLangChange,
  onTgtLangChange,
  onSwap,
}: LanguagePairSelectorProps) {
  const [dialogMode, setDialogMode] = useState<"source" | "target" | null>(
    null
  );

  const srcLangInfo = getLanguageByNllbCode(srcLang);
  const tgtLangInfo = getLanguageByNllbCode(tgtLang);

  const handleSwap = useCallback(() => {
    if (onSwap) {
      onSwap();
    } else {
      onSrcLangChange(tgtLang);
      onTgtLangChange(srcLang);
    }
  }, [srcLang, tgtLang, onSrcLangChange, onTgtLangChange, onSwap]);

  const handleDialogSelect = (nllbCode: string) => {
    if (dialogMode === "source") {
      onSrcLangChange(nllbCode);
    } else if (dialogMode === "target") {
      onTgtLangChange(nllbCode);
    }
  };

  return (
    <>
      <div className="relative flex items-center gap-2">
        {/* Source Language */}
        <button
          type="button"
          onClick={() => setDialogMode("source")}
          className="flex flex-1 items-center justify-between rounded-xl border border-[#e8e8e0] bg-white px-4 py-3 transition-all hover:border-[#c17a4f] active:scale-[0.98]"
        >
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wide text-[#9a9a8f]">
              FROM
            </div>
            <div className="text-sm font-medium text-[#2d2d28]">
              {srcLangInfo?.native ?? srcLang}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-[#9a9a8f]" />
        </button>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwap}
          className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e8e8e0] bg-white shadow-sm transition-all hover:border-[#5a4a3a] active:scale-95"
          aria-label="언어 교환"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-[#5a4a3a]" strokeWidth={2} />
        </button>

        {/* Target Language */}
        <button
          type="button"
          onClick={() => setDialogMode("target")}
          className="flex flex-1 items-center justify-between rounded-xl border border-[#e8e8e0] bg-white px-4 py-3 transition-all hover:border-[#c17a4f] active:scale-[0.98]"
        >
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wide text-[#9a9a8f]">
              TO
            </div>
            <div className="text-sm font-medium text-[#2d2d28]">
              {tgtLangInfo?.native ?? tgtLang}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-[#9a9a8f]" />
        </button>
      </div>

      {/* Language Selection Dialog */}
      <LanguageSelectionDialog
        isOpen={dialogMode !== null}
        onClose={() => setDialogMode(null)}
        onSelect={handleDialogSelect}
        selectedNllbCode={dialogMode === "source" ? srcLang : tgtLang}
        title={dialogMode === "source" ? "원본 언어 선택" : "번역 언어 선택"}
        excludeNllbCode={dialogMode === "source" ? tgtLang : srcLang}
      />
    </>
  );
}
