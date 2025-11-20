// 한국어 주석: 번역 피드를 위한 공용 타입/키 정의입니다.
// - FeedItem: 사용자가 저장한 번역 항목(원문/번역/교차검증/언어쌍/생성 시각 등)
// - FEEDS_KEY: useLocalStorage/useBrowserStorage에서 사용할 로컬 스토리지 키

export type FeedLang = "ko" | "ja";

export interface FeedItem {
  id: string;
  input: string;
  primary: string;
  crossCheck?: string;
  fromLang: FeedLang;
  toLang: FeedLang;
  createdAt: number;
  isFavorite?: boolean;
}

export const FEEDS_KEY = "issnuta_feeds";
