"use client";

import * as React from "react";
import { NLLB_MODEL_ID } from "@/shared/lib/translator";
import { isOfflineReadyForModel } from "@/features/offline/check";

export type OfflineModelReadyState = {
  ready: boolean;
  checked: boolean;
};

/**
 * useOfflineModelReady — NLLB 모델의 오프라인 준비 상태를 CacheStorage 기준으로 확인하는 훅
 * - ready: 모든 필수 ORT/모델 파일이 캐시에 있으면 true
 * - checked: 비동기 점검이 한 번 이상 완료되었는지 여부
 */
export function useOfflineModelReady(): OfflineModelReadyState {
  const [state, setState] = React.useState<OfflineModelReadyState>({
    ready: false,
    checked: false,
  });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { ready } = await isOfflineReadyForModel(NLLB_MODEL_ID);
        if (!cancelled) {
          setState({ ready, checked: true });
        }
      } catch {
        if (!cancelled) {
          setState({ ready: false, checked: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

