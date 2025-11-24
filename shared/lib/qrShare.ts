import type { SavedTranslation } from "@/shared/model/translation";

/**
 * QR 코드에 담길 피드 공유 페이로드 v1
 *
 * - app: 우리 앱 식별자("Issnuta")
 * - version: 페이로드 포맷 버전("1.0")
 * - type: 공유 데이터 종류("feeds")
 * - data: SavedTranslation 배열
 * - exportedAt: 내보내기 시각(epoch ms)
 */
export type FeedSharePayloadV1 = {
  app: "Issnuta";
  version: "1.0";
  type: "feeds";
  data: SavedTranslation[];
  exportedAt: number;
};

export function buildFeedSharePayload(
  translations: SavedTranslation[]
): FeedSharePayloadV1 {
  return {
    app: "Issnuta",
    version: "1.0",
    type: "feeds",
    data: translations,
    exportedAt: Date.now(),
  };
}

export function stringifyFeedSharePayload(payload: FeedSharePayloadV1): string {
  return JSON.stringify(payload);
}

export function parseFeedSharePayload(
  raw: string
): FeedSharePayloadV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isFeedSharePayloadV1(parsed)) {
    return null;
  }

  return parsed;
}

function isSavedTranslationArray(value: unknown): value is SavedTranslation[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const record = item as Partial<SavedTranslation>;
    if (typeof record.id !== "string") return false;
    if (typeof record.createdAt !== "number") return false;
    if (record.direction !== "koja" && record.direction !== "jako") {
      return false;
    }
    if (typeof record.input !== "string") return false;
    if (typeof record.outputs !== "object" || record.outputs === null) {
      return false;
    }
    const outputs = record.outputs as SavedTranslation["outputs"];
    if (
      typeof outputs.ko !== "string" ||
      typeof outputs.ja !== "string" ||
      typeof outputs.en !== "string"
    ) {
      return false;
    }
    if (typeof record.version !== "number") return false;

    return true;
  });
}

function isFeedSharePayloadV1(value: unknown): value is FeedSharePayloadV1 {
  if (typeof value !== "object" || value === null) return false;

  const payload = value as Partial<FeedSharePayloadV1>;

  if (payload.app !== "Issnuta") return false;
  if (payload.version !== "1.0") return false;
  if (payload.type !== "feeds") return false;
  if (typeof payload.exportedAt !== "number") return false;

  if (!isSavedTranslationArray(payload.data)) {
    return false;
  }

  return true;
}

