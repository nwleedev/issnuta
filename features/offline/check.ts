/**
 * 오프라인 준비 상태 점검 유틸리티
 * - CacheStorage에 필수 URL(ORT/모델)이 존재하는지 확인
 * - 누락 목록을 반환하여 UI/프리페치 트리거에 활용
 *
 * 주의: 브라우저(클라이언트) 컨텍스트 전용입니다.
 */

import { buildAllURLs, getBaseURL } from "./urls";

export type MissingSet = { ort: string[]; model: string[] };

function assertBrowser() {
  if (typeof window === "undefined" || typeof caches === "undefined") {
    throw new Error("CacheStorage를 사용할 수 없습니다. 클라이언트에서만 호출하세요.");
  }
}

/** 단일 URL이 CacheStorage에 존재하는지 검사 */
export async function isCached(url: string): Promise<boolean> {
  assertBrowser();
  try {
    const res = await caches.match(url);
    return !!res;
  } catch {
    return false;
  }
}

/** URL 배열 중 누락된 항목만 반환 */
export async function missing(urls: string[]): Promise<string[]> {
  assertBrowser();
  const out: string[] = [];
  for (const u of urls) {
    // eslint-disable-next-line no-await-in-loop
    const hit = await isCached(u);
    if (!hit) out.push(u);
  }
  return out;
}

/**
 * BASE와 modelId로 오프라인 준비 상태를 계산
 */
export async function isOfflineReady(
  baseURL: string,
  modelId: string
): Promise<{ ready: boolean; missing: MissingSet }> {
  assertBrowser();
  const { ort, model } = buildAllURLs(baseURL, modelId);
  const [mOrt, mModel] = await Promise.all([missing(ort), missing(model)]);
  return { ready: mOrt.length === 0 && mModel.length === 0, missing: { ort: mOrt, model: mModel } };
}

/** 환경변수에서 BASE를 계산하여 간편 확인 */
export async function isOfflineReadyForModel(modelId: string) {
  const base = getBaseURL();
  return isOfflineReady(base, modelId);
}

