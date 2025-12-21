import type {
  SavedTranslation,
  SavedTranslationV2,
} from "@/shared/model/translation";
import { getDB } from "@/shared/storage/issnuta-db";
import { nanoid } from "nanoid";

function createId(): string {
  return nanoid();
}

/**
 * v2 형식으로 번역 저장 (NLLB 코드 기반)
 */
export async function saveTranslationV2ToDB(params: {
  input: string;
  srcLang: string;
  tgtLang: string;
  output: string;
  crossCheck?: string;
}): Promise<SavedTranslationV2> {
  const db = await getDB();
  const record: SavedTranslationV2 = {
    id: createId(),
    createdAt: Date.now(),
    input: params.input,
    srcLang: params.srcLang,
    tgtLang: params.tgtLang,
    output: params.output,
    crossCheck: params.crossCheck,
    version: 2,
  };
  await db.put("translations", record);
  return record;
}

export async function listTranslationsFromDB(): Promise<SavedTranslation[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex("translations", "by-createdAt");
  // 최신순(가장 최근 createdAt이 먼저 오도록) 정렬
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteTranslationFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("translations", id);
}

export async function updateTranslationFavorite(params: {
  id: string;
  isFavorite: boolean;
}): Promise<SavedTranslation | null> {
  const db = await getDB();
  const existing = await db.get("translations", params.id);
  if (!existing) return null;
  const updated: SavedTranslation = {
    ...existing,
    isFavorite: params.isFavorite,
  };
  await db.put("translations", updated);
  return updated;
}

export async function importTranslationsFromQr(
  records: SavedTranslation[]
): Promise<{ imported: number; duplicates: number; skipped: number }> {
  const db = await getDB();
  let imported = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const record of records) {
    if (!record?.id) {
      skipped += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // 이미 동일 id가 있으면 중복으로 간주하고 건너뜁니다.
    const existing = await db.get("translations", record.id);
    if (existing) {
      duplicates += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    await db.put("translations", record);
    imported += 1;
  }

  return { imported, duplicates, skipped };
}
