import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Copy, Star, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  translationsKey,
  useDeleteTranslation,
  useLocalTranslations,
  useToggleFavoriteTranslation,
} from "@/features/feeds/model/useLocalTranslations";
import { FeedQrCodeDialog } from "@/features/feeds/ui/FeedQrCodeDialog";
import {
  buildFeedShareUrl,
  MAX_QR_SHARE_COUNT,
  parseFeedShareFromUrl,
} from "@/shared/lib/qrShare";
import {
  getLanguagePair,
  getTranslationOutput,
  getCrossCheck,
} from "@/shared/model/translation";
import { migrateFeedsToIndexedDBOnce } from "@/shared/storage/translation-migration";
import { importTranslationsFromQr } from "@/shared/storage/translation-store";
import { toUiCode } from "@/shared/config/supported-languages";

export interface FeedsEntryProps {
  search: string;
  filter: "all" | "favorites";
  /**
   * 선택 모드 외부 제어용 상태
   * - 제공되지 않으면 내부에서 로컬 상태로 관리합니다.
   */
  selectionMode: boolean;
  onSelectionModeChange: (open: boolean) => void;
}

type ImportResult = {
  imported: number;
  duplicates: number;
  skipped: number;
};

type ImportStatus =
  | { type: "idle" }
  | { type: "processing" }
  | { type: "success"; message: string; result: ImportResult }
  | { type: "error"; message: string };

const FeedsEntry = (props: FeedsEntryProps) => {
  const { search, filter, selectionMode, onSelectionModeChange } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const importProcessedRef = useRef(false);

  useEffect(() => {
    void migrateFeedsToIndexedDBOnce();
  }, []);
  const { data: translations = [], isLoading } = useLocalTranslations();
  const deleteMutation = useDeleteTranslation();
  const toggleFavoriteMutation = useToggleFavoriteTranslation();
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    type: "idle",
  });

  // Handle import from URL query parameter
  const handleImportFromUrl = useCallback(
    async (encodedData: string) => {
      if (importProcessedRef.current) return;
      importProcessedRef.current = true;

      setImportStatus({ type: "processing" });

      try {
        const payload = parseFeedShareFromUrl(encodedData);
        if (!payload) {
          setImportStatus({
            type: "error",
            message:
              "QR 코드 데이터를 읽을 수 없습니다. 올바른 Issnuta QR 코드인지 확인해주세요.",
          });
          return;
        }

        const records = payload.data;
        if (!records.length) {
          setImportStatus({
            type: "error",
            message: "가져올 번역이 없습니다.",
          });
          return;
        }

        const result = await importTranslationsFromQr(records);
        await queryClient.invalidateQueries({ queryKey: translationsKey });

        if (result.imported === 0) {
          setImportStatus({
            type: "error",
            message: "새 번역이 없습니다. 이미 모든 항목을 가지고 있습니다.",
          });
        } else {
          setImportStatus({
            type: "success",
            message: `새 번역 ${result.imported}개를 가져왔어요.`,
            result,
          });
        }
      } catch {
        setImportStatus({
          type: "error",
          message: "데이터를 처리하는 중 오류가 발생했습니다.",
        });
      }

      // Remove import param from URL without reload
      router.replace("/feeds", { scroll: false });
    },
    [queryClient, router]
  );

  useEffect(() => {
    const importData = searchParams.get("import");
    if (importData && !importProcessedRef.current) {
      void handleImportFromUrl(importData);
    }
  }, [searchParams, handleImportFromUrl]);

  const handleCloseImportStatus = () => {
    setImportStatus({ type: "idle" });
    importProcessedRef.current = false;
  };

  const setSelectionMode = (open: boolean) => {
    onSelectionModeChange(open);
  };

  const feeds = useMemo(
    () =>
      translations.map((t) => {
        const { srcLang, tgtLang } = getLanguagePair(t);
        const fromLang = toUiCode(srcLang) ?? "ko";
        const toLang = toUiCode(tgtLang) ?? "ja";
        return {
          id: t.id,
          input: t.input,
          primary: getTranslationOutput(t),
          crossCheck: getCrossCheck(t),
          fromLang,
          toLang,
          createdAt: t.createdAt,
          isFavorite: t.isFavorite ?? false,
        };
      }),
    [translations]
  );

  const filteredFeeds = useMemo(() => {
    if (isLoading) return [];

    let items =
      filter === "favorites" ? feeds.filter((item) => item.isFavorite) : feeds;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.input.toLowerCase().includes(q) ||
          item.primary.toLowerCase().includes(q) ||
          (item.crossCheck ?? "").toLowerCase().includes(q)
      );
    }

    return items;
  }, [feeds, filter, search]);

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleToggleFavorite = (id: string) => {
    const current = feeds.find((item) => item.id === id);
    const next = !(current?.isFavorite ?? false);
    toggleFavoriteMutation.mutate({ id, isFavorite: next });
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    try {
      void navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  };

  const handleCloseQr = () => {
    setIsQrOpen(false);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set<string>());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Limit to MAX_QR_SHARE_COUNT
        if (next.size >= MAX_QR_SHARE_COUNT) {
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    // Select up to MAX_QR_SHARE_COUNT items
    const idsToSelect = filteredFeeds
      .slice(0, MAX_QR_SHARE_COUNT)
      .map((item) => item.id);
    setSelectedIds(new Set<string>(idsToSelect));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set<string>());
  };

  const handleShareSelected = () => {
    if (selectedIds.size === 0) return;
    const selectedTranslations = translations.filter((t) =>
      selectedIds.has(t.id)
    );
    if (selectedTranslations.length === 0) return;
    try {
      const url = buildFeedShareUrl(selectedTranslations);
      setQrValue(url);
      setIsQrOpen(true);
    } catch (err) {
      // Handle error if URL generation fails
    }
  };

  return (
    <section className="flex-1 px-5 pb-6">
      <div className="mb-3 flex flex-col gap-y-1.5 text-xs px-0.5">
        <div className="text-[#6b6b60]">
          {selectionMode ? (
            <div className="space-y-0.5 px-0.5">
              <p className="text-[13px] font-semibold">
                {selectedIds.size}/{MAX_QR_SHARE_COUNT}개 선택됨
              </p>
              {selectedIds.size >= MAX_QR_SHARE_COUNT && (
                <p className="text-[11px] text-[#c87941]">
                  최대 {MAX_QR_SHARE_COUNT}개까지 선택할 수 있습니다
                </p>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2.5 justify-between">
          {selectionMode && (
            <>
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="flex-1 rounded-xl border border-[#e8e8e0] bg-white px-2 py-1 text-[#5a4a3a] hover:bg-[#f5f5f0]"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex-1 rounded-xl border border-[#e8e8e0] bg-white px-2 py-1 text-[#5a4a3a] hover:bg-[#f5f5f0]"
              >
                선택 해제
              </button>
              <button
                type="button"
                onClick={handleShareSelected}
                disabled={selectedIds.size === 0}
                className="flex-1 rounded-xl border border-[#5a4a3a] bg-[#5a4a3a] px-2 py-1 text-[#fafaf7] hover:bg-[#4a3a2a] disabled:border-[#e8e8e0] disabled:bg-white disabled:text-[#9a9a8f]"
              >
                선택 공유
              </button>
              <button
                type="button"
                onClick={handleExitSelectionMode}
                className="flex-1 rounded-xl border border-[#e8e8e0] bg-white px-2 py-1 text-[#5a4a3a] hover:bg-[#f5f5f0]"
              >
                완료
              </button>
            </>
          )}
        </div>
      </div>
      {isLoading ? (
        <p className="mt-8 text-center text-sm text-[#6b6b60]">불러오는 중…</p>
      ) : filteredFeeds.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[#6b6b60]">
          아직 저장된 번역이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredFeeds.map((item) => (
            <li key={item.id}>
              <div
                className={`rounded-2xl border bg-white p-4 text-sm text-[#2d2d28] shadow-sm transition-colors ${
                  selectionMode && selectedIds.has(item.id)
                    ? "border-[#5a4a3a] bg-[#fef9f3]"
                    : "border-[#e8e8e0]"
                }`}
                onClick={(event) => {
                  if (!selectionMode) return;
                  const target = event.target as HTMLElement;
                  if (target.closest("[data-card-action='true']")) {
                    return;
                  }
                  handleToggleSelect(item.id);
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide text-[#9a9a8f]">
                    {item.fromLang.toUpperCase()} → {item.toLang.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectionMode && (
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(item.id)}
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                          selectedIds.has(item.id)
                            ? "border-[#5a4a3a] bg-[#5a4a3a] text-[#fafaf7]"
                            : "border-[#e8e8e0] bg-white text-[#9a9a8f]"
                        }`}
                        aria-label={
                          selectedIds.has(item.id)
                            ? "항목 선택 해제"
                            : "항목 선택"
                        }
                      >
                        ✓
                      </button>
                    )}
                    <button
                      type="button"
                      data-card-action="true"
                      onClick={() => {
                        handleToggleFavorite(item.id);
                      }}
                      aria-label="즐겨찾기 전환"
                      className="text-[#9a9a8f] hover:text-[#e0b74f] transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          item.isFavorite ? "fill-[#e0b74f] text-[#e0b74f]" : ""
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      data-card-action="true"
                      onClick={() => {
                        handleDelete(item.id);
                      }}
                      aria-label="삭제"
                      className="text-[#9a9a8f] hover:text-[#b94c4c] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mb-2 text-xs text-[#6b6b60]">입력</div>
                <p className="mb-2 whitespace-pre-wrap text-sm">{item.input}</p>
                <div className="mb-2 text-xs text-[#6b6b60]">번역</div>
                <p className="mb-2 whitespace-pre-wrap text-sm">
                  {item.primary}
                </p>
                {item.crossCheck && (
                  <>
                    <div className="mb-2 text-xs text-[#6b6b60]">교차검증</div>
                    <p className="whitespace-pre-wrap text-sm">
                      {item.crossCheck}
                    </p>
                  </>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    data-card-action="true"
                    onClick={() => {
                      handleCopy(item.primary);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e0] px-2 py-1 text-xs text-[#5a4a3a] hover:bg-[#f5f5f0] transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    번역 복사
                  </button>
                  {item.crossCheck && (
                    <button
                      type="button"
                      data-card-action="true"
                      onClick={() => {
                        handleCopy(item.crossCheck!);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e0] px-2 py-1 text-xs text-[#5a4a3a] hover:bg-[#f5f5f0] transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      교차검증 복사
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Import Result Modal */}
      {importStatus.type !== "idle" && importStatus.type !== "processing" && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={handleCloseImportStatus}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="relative w-full max-w-sm rounded-2xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={handleCloseImportStatus}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e8e0] bg-white/70 text-[#5a4a3a] hover:bg-[#f5f5f0] focus:outline-none"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 flex items-start gap-3 pr-10">
                {importStatus.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#4a7c59]" />
                ) : (
                  <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#c87941]" />
                )}
                <div>
                  <h3 className="mb-1 text-base font-semibold text-[#2d2d28]">
                    {importStatus.type === "success"
                      ? "가져오기 완료"
                      : "가져오기 실패"}
                  </h3>
                  <p className="text-sm text-[#6b6b60]">
                    {importStatus.message}
                  </p>
                  {importStatus.type === "success" && importStatus.result && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {importStatus.result.imported > 0 && (
                        <span className="rounded-lg bg-[#4a7c59]/10 px-2 py-1 text-[#4a7c59]">
                          {importStatus.result.imported}개 가져옴
                        </span>
                      )}
                      {importStatus.result.duplicates > 0 && (
                        <span className="rounded-lg bg-[#6b6b60]/10 px-2 py-1 text-[#6b6b60]">
                          {importStatus.result.duplicates}개 중복
                        </span>
                      )}
                      {importStatus.result.skipped > 0 && (
                        <span className="rounded-lg bg-[#6b6b60]/10 px-2 py-1 text-[#6b6b60]">
                          {importStatus.result.skipped}개 건너뜀
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseImportStatus}
                className="w-full h-11 rounded-xl bg-[#5a4a3a] text-sm text-[#fafaf7] hover:bg-[#4a3a2a] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </>
      )}

      <FeedQrCodeDialog
        isOpen={isQrOpen && !!qrValue}
        onClose={handleCloseQr}
        data={qrValue ?? ""}
      />
    </section>
  );
};

export default FeedsEntry;
