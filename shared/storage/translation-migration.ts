"use client";

import type {
  SavedTranslation,
  TranslationDirection,
  TranslationOutputs,
} from "@/shared/model/translation";
import type { FeedItem } from "@/shared/lib/feeds-storage";
import { FEEDS_KEY } from "@/shared/lib/feeds-storage";
import { getDB } from "@/shared/storage/issnuta-db";

const MIGRATION_FLAG_KEY = "issnuta_feeds_migrated_v1";

/**
 * 기존 로컬 스토리지 기반 번역 피드를 IndexedDB(SavedTranslation)로
 * 한 번만 마이그레이션합니다.
 *
 * - 브라우저 환경에서만 동작합니다.
 * - 마이그레이션 성공/실패 여부와 관계없이 플래그를 기록해
 *   중복 실행을 방지합니다(실패 시에도 앱 동작에는 영향이 없도록 함).
 */
export async function migrateFeedsToIndexedDBOnce(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const flag = window.localStorage.getItem(MIGRATION_FLAG_KEY);
    if (flag === "done") return;

    const raw = window.localStorage.getItem(FEEDS_KEY);
    if (!raw) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "done");
      return;
    }

    let items: FeedItem[];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        window.localStorage.setItem(MIGRATION_FLAG_KEY, "done");
        return;
      }
      items = parsed as FeedItem[];
    } catch {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "done");
      return;
    }

    if (items.length === 0) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "done");
      return;
    }

    const db = await getDB();
    const tx = db.transaction("translations", "readwrite");
    const store = tx.store;

    for (const item of items) {
      const direction: TranslationDirection =
        item.fromLang === "ko" && item.toLang === "ja"
          ? "koja"
          : item.fromLang === "ja" && item.toLang === "ko"
          ? "jako"
          : "koja";

      const outputs: TranslationOutputs =
        direction === "koja"
          ? {
              ko: "",
              ja: item.primary,
              en: item.crossCheck ?? "",
            }
          : {
              ko: item.primary,
              ja: "",
              en: "",
            };

      const record: SavedTranslation = {
        id: item.id,
        createdAt: item.createdAt ?? Date.now(),
        direction,
        input: item.input,
        outputs,
        isFavorite: item.isFavorite,
        version: 1,
      };

      // 동일 id가 이미 존재하는 경우 덮어씁니다(최신 상태 유지).
      // 마이그레이션은 한 번만 실행되므로, 중복 저장 문제는 없습니다.
      // eslint-disable-next-line no-await-in-loop
      await store.put(record);
    }

    // 트랜잭션 완료 후 마이그레이션 완료 플래그 기록
    await tx.done;
    window.localStorage.setItem(MIGRATION_FLAG_KEY, "done");
  } catch {
    // 마이그레이션 실패는 앱 핵심 동작에 영향을 주지 않아야 합니다.
    try {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "done");
    } catch {
      // noop
    }
  }
}

