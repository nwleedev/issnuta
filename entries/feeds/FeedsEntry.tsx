import {
  useLocalTranslations,
  useDeleteTranslation,
  useToggleFavoriteTranslation,
} from "@/features/feeds/model/useLocalTranslations";
import { migrateFeedsToIndexedDBOnce } from "@/shared/storage/translation-migration";
import { Copy, Star, Trash2 } from "lucide-react";
import * as React from "react";

export interface FeedsEntryProps {
  search: string;
  filter: "all" | "favorites";
}

const FeedsEntry = (props: FeedsEntryProps) => {
  const { search, filter } = props;
  React.useEffect(() => {
    void migrateFeedsToIndexedDBOnce();
  }, []);
  const { data: translations = [], isLoading } = useLocalTranslations();
  const deleteMutation = useDeleteTranslation();
  const toggleFavoriteMutation = useToggleFavoriteTranslation();

  const feeds = React.useMemo(
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

  const filteredFeeds = React.useMemo(() => {
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
  return (
    <section className="flex-1 px-5 pb-6">
      {isLoading ? (
        <p className="mt-8 text-center text-sm text-[#6b6b60]">
          불러오는 중…
        </p>
      ) : filteredFeeds.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[#6b6b60]">
          아직 저장된 번역이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredFeeds.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[#e8e8e0] bg-white p-4 text-sm text-[#2d2d28] shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wide text-[#9a9a8f]">
                  {item.fromLang.toUpperCase()} → {item.toLang.toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(item.id)}
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
                    onClick={() => handleDelete(item.id)}
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
              <p className="mb-2 whitespace-pre-wrap text-sm">{item.primary}</p>
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
                  onClick={() => handleCopy(item.primary)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e0] px-2 py-1 text-xs text-[#5a4a3a] hover:bg-[#f5f5f0] transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  번역 복사
                </button>
                {item.crossCheck && (
                  <button
                    type="button"
                    onClick={() => handleCopy(item.crossCheck!)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e0] px-2 py-1 text-xs text-[#5a4a3a] hover:bg-[#f5f5f0] transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    교차검증 복사
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default FeedsEntry;
