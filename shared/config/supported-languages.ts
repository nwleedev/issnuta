/**
 * Tier 1, Tier 2 지원 언어 정의
 *
 * - NLLB-200 모델에서 사용하는 FLORES-200 언어 코드와 매핑
 * - Tier 1: 전세계 주요 언어 (8개)
 * - Tier 2: 여행/비즈니스 주요 언어 (8개)
 */

export interface SupportedLanguage {
  /** UI 표시용 짧은 코드 (예: 'ko', 'en') */
  code: string;
  /** NLLB-200 모델 언어 코드 (예: 'kor_Hang', 'eng_Latn') */
  nllbCode: string;
  /** 영어 이름 */
  name: string;
  /** 모국어 이름 */
  native: string;
  /** 언어 티어 (1: 필수, 2: 권장) */
  tier: 1 | 2;
}

/**
 * 지원 언어 목록 (Tier 1 + Tier 2, 총 16개)
 *
 * Tier 1: 전세계 인구 약 70% 커버
 * Tier 2: 유럽/동남아 여행자 대상
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  // Tier 1 (8개) - 전세계 주요 언어
  {
    code: "en",
    nllbCode: "eng_Latn",
    name: "English",
    native: "English",
    tier: 1,
  },
  {
    code: "zh",
    nllbCode: "zho_Hans",
    name: "Chinese (Simplified)",
    native: "中文",
    tier: 1,
  },
  {
    code: "es",
    nllbCode: "spa_Latn",
    name: "Spanish",
    native: "Español",
    tier: 1,
  },
  {
    code: "hi",
    nllbCode: "hin_Deva",
    name: "Hindi",
    native: "हिन्दी",
    tier: 1,
  },
  {
    code: "ar",
    nllbCode: "arb_Arab",
    name: "Arabic",
    native: "العربية",
    tier: 1,
  },
  {
    code: "pt",
    nllbCode: "por_Latn",
    name: "Portuguese",
    native: "Português",
    tier: 1,
  },
  {
    code: "ja",
    nllbCode: "jpn_Jpan",
    name: "Japanese",
    native: "日本語",
    tier: 1,
  },
  {
    code: "ko",
    nllbCode: "kor_Hang",
    name: "Korean",
    native: "한국어",
    tier: 1,
  },

  // Tier 2 (8개) - 여행/비즈니스 주요 언어
  {
    code: "fr",
    nllbCode: "fra_Latn",
    name: "French",
    native: "Français",
    tier: 2,
  },
  {
    code: "de",
    nllbCode: "deu_Latn",
    name: "German",
    native: "Deutsch",
    tier: 2,
  },
  {
    code: "it",
    nllbCode: "ita_Latn",
    name: "Italian",
    native: "Italiano",
    tier: 2,
  },
  {
    code: "ru",
    nllbCode: "rus_Cyrl",
    name: "Russian",
    native: "Русский",
    tier: 2,
  },
  {
    code: "vi",
    nllbCode: "vie_Latn",
    name: "Vietnamese",
    native: "Tiếng Việt",
    tier: 2,
  },
  {
    code: "th",
    nllbCode: "tha_Thai",
    name: "Thai",
    native: "ไทย",
    tier: 2,
  },
  {
    code: "id",
    nllbCode: "ind_Latn",
    name: "Indonesian",
    native: "Bahasa Indonesia",
    tier: 2,
  },
  {
    code: "tr",
    nllbCode: "tur_Latn",
    name: "Turkish",
    native: "Türkçe",
    tier: 2,
  },
] as const;

/** 지원 언어 코드 유니온 타입 */
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** NLLB 언어 코드 유니온 타입 */
export type NllbLanguageCode =
  (typeof SUPPORTED_LANGUAGES)[number]["nllbCode"];

/** 기본 언어쌍 (한국어 → 일본어) */
export const DEFAULT_LANGUAGE_PAIR = {
  source: "kor_Hang",
  target: "jpn_Jpan",
} as const;

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * UI 코드로 언어 정보 조회
 * @param code UI 코드 (예: 'ko', 'en')
 * @returns 언어 정보 또는 undefined
 */
export function getLanguageByCode(
  code: string
): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * NLLB 코드로 언어 정보 조회
 * @param nllbCode NLLB 코드 (예: 'kor_Hang', 'eng_Latn')
 * @returns 언어 정보 또는 undefined
 */
export function getLanguageByNllbCode(
  nllbCode: string
): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.nllbCode === nllbCode);
}

/**
 * UI 코드 → NLLB 코드 변환
 * @param code UI 코드 (예: 'ko')
 * @returns NLLB 코드 (예: 'kor_Hang') 또는 null
 */
export function toNllbCode(code: string): string | null {
  const lang = getLanguageByCode(code);
  return lang?.nllbCode ?? null;
}

/**
 * NLLB 코드 → UI 코드 변환
 * @param nllbCode NLLB 코드 (예: 'kor_Hang')
 * @returns UI 코드 (예: 'ko') 또는 null
 */
export function toUiCode(nllbCode: string): string | null {
  const lang = getLanguageByNllbCode(nllbCode);
  return lang?.code ?? null;
}

/**
 * 언어 검색 (이름, 모국어 이름, 코드로 검색)
 * @param query 검색어
 * @returns 매칭된 언어 목록
 */
export function searchLanguages(query: string): SupportedLanguage[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) {
    return [...SUPPORTED_LANGUAGES];
  }

  return SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(lowerQuery) ||
      lang.native.toLowerCase().includes(lowerQuery) ||
      lang.code.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Tier별 언어 목록 조회
 * @param tier 1 또는 2
 * @returns 해당 티어 언어 목록
 */
export function getLanguagesByTier(tier: 1 | 2): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.tier === tier);
}

/**
 * 지원 언어 코드인지 확인
 * @param code UI 코드
 * @returns 지원 여부
 */
export function isSupportedCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * 지원 NLLB 코드인지 확인
 * @param nllbCode NLLB 코드
 * @returns 지원 여부
 */
export function isSupportedNllbCode(nllbCode: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.nllbCode === nllbCode);
}
