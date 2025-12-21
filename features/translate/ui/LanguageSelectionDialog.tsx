"use client";

import { useMemo, useState } from "react";
import { Check, Search, X, Globe } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  searchLanguages,
  type SupportedLanguage,
} from "@/shared/config/supported-languages";

export type LanguageSelectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nllbCode: string) => void;
  selectedNllbCode: string;
  title?: string;
  excludeNllbCode?: string;
};

/**
 * LanguageSelectionDialog
 *
 * - 16개 지원 언어에서 하나를 선택하는 다이얼로그
 * - Tier 1/Tier 2 구분 표시
 * - 검색 기능 지원
 */
export function LanguageSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  selectedNllbCode,
  title = "언어 선택",
  excludeNllbCode,
}: LanguageSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLanguages = useMemo(() => {
    let results = searchLanguages(searchQuery);
    if (excludeNllbCode) {
      results = results.filter((lang) => lang.nllbCode !== excludeNllbCode);
    }
    return results;
  }, [searchQuery, excludeNllbCode]);

  const tier1Languages = filteredLanguages.filter((lang) => lang.tier === 1);
  const tier2Languages = filteredLanguages.filter((lang) => lang.tier === 2);

  const handleSelect = (lang: SupportedLanguage) => {
    onSelect(lang.nllbCode);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="relative flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="flex-shrink-0 p-5 pb-3">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8e0] bg-white/70 text-[#5a4a3a] hover:bg-[#f5f5f0] focus:outline-none"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c17a4f] to-[#b86a3f]">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-base font-semibold text-[#2d2d28]">
                {title}
              </h2>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a8f]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="언어 검색..."
                className="h-10 w-full rounded-xl border border-[#e8e8e0] bg-white/70 pl-10 pr-4 text-sm text-[#2d2d28] placeholder:text-[#9a9a8f] focus:border-[#c17a4f] focus:outline-none"
              />
            </div>
          </div>

          {/* Language List */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {filteredLanguages.length > 0 ? (
              <div className="space-y-4">
                {/* Tier 1 */}
                {tier1Languages.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[#9a9a8f]">
                      Tier 1 - 주요 언어
                    </div>
                    <div className="space-y-1.5">
                      {tier1Languages.map((lang) => (
                        <LanguageOption
                          key={lang.nllbCode}
                          lang={lang}
                          isSelected={selectedNllbCode === lang.nllbCode}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 2 */}
                {tier2Languages.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[#9a9a8f]">
                      Tier 2 - 여행/비즈니스
                    </div>
                    <div className="space-y-1.5">
                      {tier2Languages.map((lang) => (
                        <LanguageOption
                          key={lang.nllbCode}
                          lang={lang}
                          isSelected={selectedNllbCode === lang.nllbCode}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-[#9a9a8f]">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type LanguageOptionProps = {
  lang: SupportedLanguage;
  isSelected: boolean;
  onSelect: (lang: SupportedLanguage) => void;
};

function LanguageOption({ lang, isSelected, onSelect }: LanguageOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lang)}
      className={`flex w-full items-center justify-between rounded-xl border-2 p-3 transition-all ${
        isSelected
          ? "border-[#5a4a3a] bg-gradient-to-r from-[#fef9f3] to-[#f5f5f0]"
          : "border-transparent bg-white/50 hover:border-[#c17a4f]/40 hover:bg-white/70"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isSelected
              ? "bg-gradient-to-br from-[#5a4a3a] to-[#4a3a2a]"
              : "bg-gradient-to-br from-[#e8e8e0] to-[#d4d4c8]"
          }`}
        >
          <span
            className={`text-[10px] font-medium uppercase ${
              isSelected ? "text-white" : "text-[#6b6b60]"
            }`}
          >
            {lang.code}
          </span>
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-[#2d2d28]">{lang.native}</div>
          <div className="text-xs text-[#9a9a8f]">{lang.name}</div>
        </div>
      </div>

      {isSelected && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5a4a3a] to-[#4a3a2a]">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  );
}
