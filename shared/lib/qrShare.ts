import pako from "pako";

import type { SavedTranslation } from "@/shared/model/translation";

/** Maximum number of translations that can be shared via QR URL */
export const MAX_QR_SHARE_COUNT = 10;

/** App domain for QR code URLs (from environment variable) */
function getAppDomain(): string {
  const origin = window.location.origin;
  const domains = process.env.NEXT_PUBLIC_APP_DOMAINS?.split(",") ?? [];
  if (domains.length === 0) {
    throw new Error("NEXT_PUBLIC_APP_DOMAINS environment variable is not set");
  }
  const domain = domains.find(
    (domain) => new URL(domain).origin === new URL(origin).origin
  );
  if (typeof domain === "undefined") {
    return domains[0] as string;
  }
  return domain;
}

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

export function parseFeedSharePayload(raw: string): FeedSharePayloadV1 | null {
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

/**
 * v1 레코드 검증
 */
function isV1Record(record: Record<string, unknown>): boolean {
  if (record.direction !== "koja" && record.direction !== "jako") {
    return false;
  }
  if (typeof record.outputs !== "object" || record.outputs === null) {
    return false;
  }
  const outputs = record.outputs as Record<string, unknown>;
  if (
    typeof outputs.ko !== "string" ||
    typeof outputs.ja !== "string" ||
    typeof outputs.en !== "string"
  ) {
    return false;
  }
  return record.version === 1;
}

/**
 * v2 레코드 검증
 */
function isV2Record(record: Record<string, unknown>): boolean {
  if (typeof record.srcLang !== "string") return false;
  if (typeof record.tgtLang !== "string") return false;
  if (typeof record.output !== "string") return false;
  return record.version === 2;
}

function isSavedTranslationArray(value: unknown): value is SavedTranslation[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const record = item as Record<string, unknown>;

    // 공통 필드 검증
    if (typeof record.id !== "string") return false;
    if (typeof record.createdAt !== "number") return false;
    if (typeof record.input !== "string") return false;
    if (typeof record.version !== "number") return false;

    // v1 또는 v2 레코드 검증
    return isV1Record(record) || isV2Record(record);
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

// ============================================================
// URL-based QR code sharing (for native camera app scanning)
// ============================================================

/**
 * Encode binary data to URL-safe base64
 */
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode URL-safe base64 to binary data
 */
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Build a shareable URL containing compressed translation data.
 * The URL can be encoded into a QR code for native camera scanning.
 *
 * @param translations - Array of translations to share (max 10)
 * @returns Full URL string for QR code
 * @throws Error if translations exceed MAX_QR_SHARE_COUNT
 */
export function buildFeedShareUrl(translations: SavedTranslation[]): string {
  if (translations.length > MAX_QR_SHARE_COUNT) {
    throw new Error(
      `Cannot share more than ${MAX_QR_SHARE_COUNT} translations at once`
    );
  }

  const payload = buildFeedSharePayload(translations);
  const json = JSON.stringify(payload);
  const compressed = pako.deflate(json);
  const encoded = base64UrlEncode(compressed);

  const domain = getAppDomain();
  return `${domain}/feeds?import=${encoded}`;
}

/**
 * Parse and decompress translation data from URL parameter.
 *
 * @param encodedData - The 'd' query parameter value from the import URL
 * @returns Parsed payload or null if invalid
 */
export function parseFeedShareFromUrl(
  encodedData: string
): FeedSharePayloadV1 | null {
  try {
    const compressed = base64UrlDecode(encodedData);
    const json = pako.inflate(compressed, { to: "string" });
    return parseFeedSharePayload(json);
  } catch {
    return null;
  }
}
