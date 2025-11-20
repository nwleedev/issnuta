"use client";

import dynamic from "next/dynamic";
import LoadingNLLBTranslator from "@/features/translate/ui/LoadingNLLBTranslator";

// Client-only loader for the translator widget.
// This confines `ssr: false` to a Client Component (FSD: entries layer),
// keeping Server Components free of next/dynamic SSR flags.
const LocalNLLBTranslator = dynamic(
  () => import("@/features/translate/ui/LocalNLLBTranslator").then((m) => m.default ?? m.LocalNLLBTranslator),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4">
        {/* 상단 진행선 포함한 모바일 친화 로딩 */}
        <LoadingNLLBTranslator variant="inline" showTopBarProgress showDualResult />
      </div>
    ),
  }
);

export default function TranslatorLoader() {
  return <LocalNLLBTranslator />;
}
