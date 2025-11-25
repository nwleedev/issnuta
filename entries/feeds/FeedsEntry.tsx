import {
  useDeleteTranslation,
  useLocalTranslations,
  useToggleFavoriteTranslation,
} from "@/features/feeds/model/useLocalTranslations";
import { FeedQrCodeDialog } from "@/features/feeds/ui/FeedQrCodeDialog";
import {
  buildFeedSharePayload,
  stringifyFeedSharePayload,
} from "@/shared/lib/qrShare";
import { migrateFeedsToIndexedDBOnce } from "@/shared/storage/translation-migration";
import { Copy, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface FeedsEntryProps {
  search: string;
  filter: "all" | "favorites";
  /**
   * QR 옵션 시트 외부 제어용 상태
   * - 제공되지 않으면 내부에서 로컬 상태로 관리합니다.
   */
  isQrMenuOpen?: boolean;
  onQrMenuOpenChange?: (open: boolean) => void;
  /**
   * 선택 모드 외부 제어용 상태
   * - 제공되지 않으면 내부에서 로컬 상태로 관리합니다.
   */
  selectionMode: boolean;
  onSelectionModeChange: (open: boolean) => void;
}

const FeedsEntry = (props: FeedsEntryProps) => {
  const {
    search,
    filter,
    isQrMenuOpen,
    onQrMenuOpenChange,
    selectionMode,
    onSelectionModeChange,
  } = props;
  useEffect(() => {
    void migrateFeedsToIndexedDBOnce();
  }, []);
  const { data: translations = [], isLoading } = useLocalTranslations();
  const deleteMutation = useDeleteTranslation();
  const toggleFavoriteMutation = useToggleFavoriteTranslation();
  const [internalQrMenuOpen, setInternalQrMenuOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set<string>()
  );

  const qrMenuOpen = isQrMenuOpen ?? internalQrMenuOpen;

  const setQrMenuOpen = (open: boolean) => {
    if (onQrMenuOpenChange) {
      onQrMenuOpenChange(open);
      return;
    }
    setInternalQrMenuOpen(open);
  };

  const setSelectionMode = (open: boolean) => {
    if (onSelectionModeChange) {
      onSelectionModeChange(open);
      return;
    }
  };

  const feeds = useMemo(
    () =>
      translations.map((t) => ({
        id: t.id,
        input: t.input,
        primary: t.direction === "koja" ? t.outputs.ja : t.outputs.ko,
        crossCheck: t.direction === "koja" ? t.outputs.en : undefined,
        fromLang: t.direction === "koja" ? "ko" : "ja",
        toLang: t.direction === "koja" ? "ja" : "ko",
        createdAt: t.createdAt,
        isFavorite: t.isFavorite ?? false,
      })),
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

  const handleOpenQrMenu = () => {
    if (isLoading || translations.length === 0) return;
    setQrMenuOpen(true);
  };

  const handleCloseQrMenu = () => {
    setQrMenuOpen(false);
  };

  const handleOpenQrForAll = () => {
    if (!translations.length) return;
    const payload = buildFeedSharePayload(translations);
    const value = stringifyFeedSharePayload(payload);
    setQrValue(value);
    setIsQrOpen(true);
  };

  const handleCloseQr = () => {
    setIsQrOpen(false);
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
    if (!filteredFeeds.length) {
      setSelectedIds(new Set<string>());
    }
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
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds(() => new Set<string>(filteredFeeds.map((item) => item.id)));
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
    const payload = buildFeedSharePayload(selectedTranslations);
    const value = stringifyFeedSharePayload(payload);
    setQrValue(value);
    setIsQrOpen(true);
  };

  return (
    <section className="flex-1 px-5 pb-6">
      <div className="mb-3 flex items-center justify-between text-xs">
        <div className="text-[#6b6b60]">
          {selectionMode ? (
            <div className="space-y-0.5">
              <div>선택 모드 · {selectedIds.size}개 선택됨</div>
              <div className="text-[11px] text-[#9a9a8f]">
                카드를 탭해서 항목을 선택하거나 해제할 수 있어요.
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          {selectionMode && (
            <>
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="rounded-xl border border-[#e8e8e0] bg-white px-2 py-1 text-[#5a4a3a] hover:bg-[#f5f5f0]"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="rounded-xl border border-[#e8e8e0] bg-white px-2 py-1 text-[#5a4a3a] hover:bg-[#f5f5f0]"
              >
                선택 해제
              </button>
              <button
                type="button"
                onClick={handleShareSelected}
                disabled={selectedIds.size === 0}
                className="rounded-xl border border-[#5a4a3a] bg-[#5a4a3a] px-2 py-1 text-[#fafaf7] hover:bg-[#4a3a2a] disabled:border-[#e8e8e0] disabled:bg-white disabled:text-[#9a9a8f]"
              >
                선택 공유
              </button>
              <button
                type="button"
                onClick={handleExitSelectionMode}
                className="rounded-xl border border-[#e8e8e0] bg-white px-2 py-1 text-[#5a4a3a] hover:bg-[#f5f5f0]"
              >
                완료
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleOpenQrMenu}
            disabled={isLoading || translations.length === 0}
            className="inline-flex items-center gap-1 rounded-xl border border-[#e8e8e0] bg-white px-3 py-1.5 text-[11px] text-[#5a4a3a] shadow-sm hover:bg-[#f5f5f0] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <span aria-hidden>📤</span>
            <span>QR 코드 옵션</span>
          </button>
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
      {qrMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={handleCloseQrMenu}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-6">
            <div className="mx-auto max-w-screen-sm overflow-hidden rounded-2xl border border-[#e8e8e0] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#2d2d28]">
                    QR 코드 옵션
                  </h2>
                  <p className="mt-0.5 text-xs text-[#6b6b60]">
                    히스토리를 공유하거나 다른 기기에서 가져옵니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseQrMenu}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f5f5f0] text-[#6b6b60] focus:outline-none"
                  aria-label="QR 옵션 닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCloseQrMenu();
                    handleEnterSelectionMode();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-[#6b6b60] hover:bg-[#f5f5f0]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fef9f3] text-[#c17a4f] text-xs">
                    선택
                  </div>
                  <div className="flex-1">
                    <div className="text-[#2d2d28]">선택해서 공유</div>
                    <div className="mt-0.5 text-xs text-[#9a9a8f]">
                      여러 항목을 골라 QR로 공유
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-[#6b6b60] hover:bg-[#f5f5f0] disabled:text-[#9a9a8f]"
                  disabled
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fef9f3] text-[#c17a4f] text-xs">
                    스캔
                  </div>
                  <div className="flex-1">
                    <div className="text-[#2d2d28]">QR 코드 스캔</div>
                    <div className="mt-0.5 text-xs text-[#9a9a8f]">
                      다른 기기에서 생성한 QR을 스캔 (준비 중)
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseQrMenu();
                    handleOpenQrForAll();
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl bg-[#5a4a3a] px-4 py-3 text-left text-sm text-[#fafaf7] hover:bg-[#4a3a2a] transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fafaf7]/10 text-xs">
                    전체
                  </div>
                  <div className="flex-1">
                    <div>전체 히스토리 공유</div>
                    <div className="mt-0.5 text-xs text-[#f5f5f0]/80">
                      현재 기기의 모든 히스토리를 하나의 QR로 공유
                    </div>
                  </div>
                </button>
              </div>
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
