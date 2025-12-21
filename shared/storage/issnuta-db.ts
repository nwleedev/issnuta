import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from "idb";
import type {
  SavedTranslation,
  TranslationDirection,
} from "@/shared/model/translation";
import {
  isV1Translation,
  convertV1ToV2,
} from "@/shared/model/translation";

/**
 * Issnuta IndexedDB schema (v2).
 *
 * - translations: 번역 기록을 저장하는 오브젝트 스토어
 *   - key: SavedTranslation["id"]
 *   - indexes:
 *     - by-createdAt: 최신순 정렬/페이지네이션용
 *     - by-direction: (v1 레거시) 언어 방향별 필터링용
 *     - by-srcLang: (v2) 소스 언어별 필터링용
 *     - by-tgtLang: (v2) 타겟 언어별 필터링용
 */
export interface IssnutaDB extends DBSchema {
  translations: {
    key: string;
    value: SavedTranslation;
    indexes: {
      "by-createdAt": number;
      /** @deprecated v2에서는 by-srcLang/by-tgtLang 사용 */
      "by-direction": TranslationDirection;
      "by-srcLang": string;
      "by-tgtLang": string;
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
    dbPromise = openDB<IssnutaDB>("issnuta-db", 2, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          // v1: 초기 스키마 생성
          const store = db.createObjectStore("translations", {
            keyPath: "id",
          });
          store.createIndex("by-createdAt", "createdAt");
          store.createIndex("by-direction", "direction");
        }

        if (oldVersion < 2) {
          // v2: NLLB 코드 기반 인덱스 추가
          // 기존 스토어에 새 인덱스를 추가 (v1 레코드는 srcLang/tgtLang이 없으므로 인덱스에 포함 안 됨)
          const store = transaction.objectStore("translations");
          store.createIndex("by-srcLang", "srcLang");
          store.createIndex("by-tgtLang", "tgtLang");
        }
      },
    });
  }

  return dbPromise;
}

// ============================================================
// v1 → v2 데이터 마이그레이션
// ============================================================

const MIGRATION_KEY = "issnuta-v2-migration-done";

/**
 * v1 레코드를 v2로 마이그레이션합니다.
 *
 * - 모든 v1 레코드를 조회하여 v2로 변환
 * - 변환된 레코드를 IndexedDB에 업데이트
 * - localStorage 플래그로 마이그레이션 완료 여부 추적
 * - 이미 마이그레이션 완료된 경우 스킵
 *
 * @returns 마이그레이션된 레코드 수
 */
export async function migrateV1ToV2(): Promise<number> {
  // 이미 마이그레이션 완료된 경우 스킵
  if (typeof window !== "undefined") {
    const done = localStorage.getItem(MIGRATION_KEY);
    if (done === "true") {
      return 0;
    }
  }

  const db = await getDB();
  const allRecords = await db.getAll("translations");

  // v1 레코드 필터링
  const v1Records = allRecords.filter(isV1Translation);
  if (v1Records.length === 0) {
    // v1 레코드가 없으면 마이그레이션 완료 처리
    if (typeof window !== "undefined") {
      localStorage.setItem(MIGRATION_KEY, "true");
    }
    return 0;
  }

  // 트랜잭션으로 일괄 업데이트
  const tx = db.transaction("translations", "readwrite");
  const store = tx.objectStore("translations");

  for (const v1Record of v1Records) {
    const v2Record = convertV1ToV2(v1Record);
    await store.put(v2Record);
  }

  await tx.done;

  // 마이그레이션 완료 플래그 설정
  if (typeof window !== "undefined") {
    localStorage.setItem(MIGRATION_KEY, "true");
  }

  return v1Records.length;
}

/**
 * 마이그레이션 상태를 초기화합니다 (테스트/디버깅용).
 */
export function resetMigrationFlag(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(MIGRATION_KEY);
  }
}

