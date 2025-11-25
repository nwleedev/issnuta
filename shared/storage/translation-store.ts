import type {
  SavedTranslation,
  TranslationDirection,
  TranslationOutputs,
} from "@/shared/model/translation";
import { getDB } from "@/shared/storage/issnuta-db";
import { nanoid } from "nanoid";

function createId(): string {
  return nanoid();
}

export async function saveTranslationToDB(params: {
  input: string;
  direction: TranslationDirection;
  outputs: TranslationOutputs;
}): Promise<SavedTranslation> {
  const db = await getDB();
  const record: SavedTranslation = {
    id: createId(),
    createdAt: Date.now(),
    direction: params.direction,
    input: params.input,
    outputs: params.outputs,
    version: 1,
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
