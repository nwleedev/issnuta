import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from "idb";
import type {
  SavedTranslation,
  TranslationDirection,
} from "@/shared/model/translation";

/**
 * Issnuta IndexedDB schema.
 *
 * - translations: 번역 기록을 저장하는 오브젝트 스토어
 *   - key: SavedTranslation["id"]
 *   - indexes:
 *     - by-createdAt: 최신순 정렬/페이지네이션용
 *     - by-direction: 언어 방향별 필터링용
 */
export interface IssnutaDB extends DBSchema {
  translations: {
    key: string;
    value: SavedTranslation;
    indexes: {
      "by-createdAt": number;
      "by-direction": TranslationDirection;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<IssnutaDB>> | null = null;

/**
 * 브라우저 환경에서만 사용하는 IndexedDB 핸들입니다.
 * - SSR에서는 호출하지 말아야 하며, 호출 시 명시적인 에러를 던집니다.
 * - 모듈 스코프의 dbPromise를 통해 단일 연결을 재사용합니다.
 */
export async function getDB(): Promise<IDBPDatabase<IssnutaDB>> {
  if (typeof window === "undefined") {
    throw new Error(
      "IndexedDB는 브라우저 환경에서만 사용할 수 있습니다. getDB()는 클라이언트에서만 호출하세요."
    );
  }

  if (!dbPromise) {
    dbPromise = openDB<IssnutaDB>("issnuta-db", 1, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore("translations", {
            keyPath: "id",
          });
          store.createIndex("by-createdAt", "createdAt");
          store.createIndex("by-direction", "direction");
        }
      },
    });
  }

  return dbPromise;
}

