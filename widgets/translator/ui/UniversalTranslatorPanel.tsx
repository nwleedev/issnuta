"use client";

import UniversalTranslator, {
  type UniversalTranslatorActionsParams,
} from "@/features/translate/ui/UniversalTranslator";
import SaveTranslationV2Button from "@/features/feeds/ui/SaveTranslationV2Button";
import OfflineSetup from "@/features/offline/ui/OfflineSetup";
import { NLLB_MODEL_ID } from "@/shared/lib/translator";
import { Button } from "@/shared/ui/button";
import { RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/**
 * UniversalTranslatorPanel
 *
 * - UniversalTranslator 위젯 + 오프라인 설정 팝업
 * - 16개 언어 지원
 */
export default function UniversalTranslatorPanel() {
  const [offlineOpen, setOfflineOpen] = useState(false);
  const offlineRetryRef = useRef<null | (() => Promise<void>)>(null);

  const handleOfflineRequired = useCallback((retry: () => Promise<void>) => {
    offlineRetryRef.current = retry;
    setOfflineOpen(true);
  }, []);

  const handleOfflineDone = useCallback(async () => {
    setOfflineOpen(false);
    const retry = offlineRetryRef.current;
    offlineRetryRef.current = null;
    if (retry) {
      try {
        await retry();
      } catch {
        // 번역 재시도 실패는 내부 UniversalTranslator가 처리합니다.
      }
    }
  }, []);

  const handleOfflineClose = useCallback(() => {
    setOfflineOpen(false);
    offlineRetryRef.current = null;
  }, []);

  const renderActions = useCallback(
    ({
      input,
      srcLang,
      tgtLang,
      output,
      crossCheck,
      slow,
      isTranslating,
    }: UniversalTranslatorActionsParams) => (
      <>
        <SaveTranslationV2Button
          key={`${input}-${output}`}
          input={input}
          srcLang={srcLang}
          tgtLang={tgtLang}
          output={output}
          crossCheck={crossCheck}
          className="h-11 px-4 rounded-xl"
        />
        <span
          className={`text-xs ${
            slow && isTranslating
              ? "text-amber-700"
              : "text-[var(--text-secondary)]"
          }`}
        >
          {slow && isTranslating
            ? "예상보다 오래 걸립니다. 네트워크/서버 지연일 수 있습니다."
            : "첫 실행은 모델 초기화로 수 초 소요될 수 있습니다."}
        </span>
        {slow && isTranslating && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border border-[#e8e8e0] text-[#5a4a3a] hover:bg-[#fef9f3]"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="w-4 h-4" /> 새로고침
          </Button>
        )}
      </>
    ),
    []
  );

  return (
    <>
      <UniversalTranslator
        renderActions={renderActions}
        onOfflineRequired={handleOfflineRequired}
      />
      <OfflineSetup
        modelId={NLLB_MODEL_ID}
        open={offlineOpen}
        onClose={handleOfflineClose}
        onDone={() => {
          void handleOfflineDone();
        }}
      />
    </>
  );
}
