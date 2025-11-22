"use client";

import LoadingNLLBTranslator from "@/features/translate/ui/LoadingNLLBTranslator";
import dynamic from "next/dynamic";

// Client-only loader for the translator widget.
// This confines `ssr: false` to a Client Component (FSD: entries layer),
// keeping Server Components free of next/dynamic SSR flags.
const TranslatorPanel = dynamic(
  () =>
    import("@/widgets/translator/ui/TranslatorPanel").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4">
        {/* 상단 진행선 포함한 모바일 친화 로딩 */}
        <LoadingNLLBTranslator
          variant="inline"
          showTopBarProgress
          showDualResult
        />
      </div>
    ),
  }
);

export default function TranslatorLoader() {
  return <TranslatorPanel />;
}
