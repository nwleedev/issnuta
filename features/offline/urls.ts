/**
 * 프리페치 대상 URL 생성 유틸리티 (features 레이어용 래퍼)
 *
 * - 실제 구현은 shared/offline/model-urls.ts에 위치하며,
 *   여기서는 해당 함수를 재노출하여 기존 import 경로를 유지합니다.
 */

export {
  getBaseURL,
  getWasmBaseURL,
  buildOrtURLs,
  buildModelURLs,
  buildAllURLs,
  type BuildOrtOptions,
  type BuildModelOptions,
  type BuildAllOptions,
} from "@/shared/offline/model-urls";
