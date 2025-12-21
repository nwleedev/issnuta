"use client";

import LoadingNLLBTranslator from "@/features/translate/ui/LoadingNLLBTranslator";
import dynamic from "next/dynamic";

/**
 * Client-only loader for the universal translator widget.
 *
 * - 16개 언어 지원
 * - ssr: false로 클라이언트에서만 로드
 */
const UniversalTranslatorPanel = dynamic(
  () =>
    import("@/widgets/translator/ui/UniversalTranslatorPanel").then(
      (m) => m.default
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4">
        <LoadingNLLBTranslator variant="inline" showTopBarProgress />
      </div>
    ),
  }
);

export default function UniversalTranslatorLoader() {
  return <UniversalTranslatorPanel />;
}
