"use client";

/**
 * Translation domain types
 *
 * - SavedTranslationV1: 레거시 형식 (direction, outputs)
 * - SavedTranslationV2: 새 형식 (srcLang, tgtLang, output)
 * - SavedTranslation: 통합 타입 (v1 또는 v2)
 *
 * NOTE:
 * - v1: direction("koja"|"jako"), outputs({ ko, ja, en }) 사용
 * - v2: srcLang, tgtLang (NLLB 코드), output (단일 결과) 사용
 * - 마이그레이션 후에는 v2만 사용
 */

// ============================================================
// v1 타입 (레거시, 마이그레이션 대상)
// ============================================================

/** @deprecated v2에서는 srcLang/tgtLang 사용 */
export type TranslationDirection = "koja" | "jako";

/** @deprecated v2에서는 output 사용 */
export type TranslationOutputs = {
  ko: string;
  ja: string;
  en: string;
};

/** v1 저장 형식 (레거시) */
export type SavedTranslationV1 = {
  id: string;
  createdAt: number;
  direction: TranslationDirection;
  input: string;
  outputs: TranslationOutputs;
  isFavorite?: boolean;
  version: 1;
};

// ============================================================
// v2 타입 (새 형식)
// ============================================================

/** v2 저장 형식 */
export type SavedTranslationV2 = {
  id: string;
  createdAt: number;
  /** 원본 텍스트 */
  input: string;
  /** 소스 언어 (NLLB 코드, 예: "kor_Hang") */
  srcLang: string;
  /** 타겟 언어 (NLLB 코드, 예: "jpn_Jpan") */
  tgtLang: string;
  /** 번역 결과 */
  output: string;
  /** 교차검증 결과 (영어, 선택) */
  crossCheck?: string;
  /** 즐겨찾기 여부 */
  isFavorite?: boolean;
  /** 스키마 버전 */
  version: 2;
};

// ============================================================
// 통합 타입
// ============================================================

/** 저장된 번역 레코드 (v1 또는 v2) */
export type SavedTranslation = SavedTranslationV1 | SavedTranslationV2;

// ============================================================
// 타입 가드
// ============================================================

/** v1 레코드인지 확인 */
export function isV1Translation(
  record: SavedTranslation
): record is SavedTranslationV1 {
  return record.version === 1;
}

/** v2 레코드인지 확인 */
export function isV2Translation(
  record: SavedTranslation
): record is SavedTranslationV2 {
  return record.version === 2;
}

// ============================================================
// 변환 유틸리티
// ============================================================

/** direction → srcLang/tgtLang 변환 */
export function directionToLangPair(
  direction: TranslationDirection
): { srcLang: string; tgtLang: string } {
  if (direction === "koja") {
    return { srcLang: "kor_Hang", tgtLang: "jpn_Jpan" };
  }
  return { srcLang: "jpn_Jpan", tgtLang: "kor_Hang" };
}

/** srcLang/tgtLang → direction 변환 (가능한 경우) */
export function langPairToDirection(
  srcLang: string,
  tgtLang: string
): TranslationDirection | null {
  if (srcLang === "kor_Hang" && tgtLang === "jpn_Jpan") {
    return "koja";
  }
  if (srcLang === "jpn_Jpan" && tgtLang === "kor_Hang") {
    return "jako";
  }
  return null;
}

/** v1 → v2 변환 */
export function convertV1ToV2(v1: SavedTranslationV1): SavedTranslationV2 {
  const { srcLang, tgtLang } = directionToLangPair(v1.direction);

  // direction에 따라 output 결정
  const outputText = v1.direction === "koja" ? v1.outputs.ja : v1.outputs.ko;
  const crossCheck =
    v1.direction === "koja" && v1.outputs.en ? v1.outputs.en : undefined;

  return {
    id: v1.id,
    createdAt: v1.createdAt,
    input: v1.input,
    srcLang,
    tgtLang,
    output: outputText,
    crossCheck,
    isFavorite: v1.isFavorite,
    version: 2,
  };
}

/** 통합 접근자: 언어쌍 가져오기 */
export function getLanguagePair(
  record: SavedTranslation
): { srcLang: string; tgtLang: string } {
  if (isV2Translation(record)) {
    return { srcLang: record.srcLang, tgtLang: record.tgtLang };
  }
  return directionToLangPair(record.direction);
}

/** 통합 접근자: 번역 결과 가져오기 */
export function getTranslationOutput(record: SavedTranslation): string {
  if (isV2Translation(record)) {
    return record.output;
  }
  return record.direction === "koja" ? record.outputs.ja : record.outputs.ko;
}

/** 통합 접근자: 교차검증 결과 가져오기 */
export function getCrossCheck(record: SavedTranslation): string | undefined {
  if (isV2Translation(record)) {
    return record.crossCheck;
  }
  return record.direction === "koja" ? record.outputs.en : undefined;
}
