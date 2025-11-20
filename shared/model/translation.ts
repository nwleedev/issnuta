"use client";

/**
 * Translation domain types
 *
 * - TranslationDirection: UI에서 사용하는 번역 방향(한국어↔일본어)
 * - TranslationOutputs: 번역 결과(ko/ja/en) 묶음
 * - SavedTranslation: IndexedDB 등에 저장되는 단일 번역 레코드
 *
 * NOTE:
 * - direction 값은 LocalNLLBTranslator 및 SaveTranslationButton과 동일하게
 *   "koja" | "jako" 형식을 사용합니다.
 */

export type TranslationDirection = "koja" | "jako";

export type TranslationOutputs = {
  ko: string;
  ja: string;
  en: string;
};

export type SavedTranslation = {
  id: string;
  createdAt: number;
  direction: TranslationDirection;
  input: string;
  outputs: TranslationOutputs;
  /**
   * 즐겨찾기 여부
   * - 기본값은 false로 간주합니다.
   */
  isFavorite?: boolean;
  /**
   * 데이터 스키마 버전
   * - IndexedDB 스키마/레코드 구조 변경 시 마이그레이션 판단에 사용합니다.
   */
  version: number;
};
