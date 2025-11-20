// entries/home/HomeEntry — Server Component (FSD: entries layer)
// Responsibilities:
// - Compose page-level layout pieces using feature components
// - Keep it thin: no client-only hooks or browser APIs here

import { RuntimeBadge } from "@/features/status/ui/RuntimeBadge";
import LocalNLLBTranslator from "@/features/translate/ui/LocalNLLBTranslator";
import TopAppBar from "@/features/shell/ui/TopAppBar";
import BottomNav from "@/features/shell/ui/BottomNav";
import { Card, CardContent } from "@/shared/ui/card";

export function HomeEntry() {
  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] items-stretch min-h-[100svh] h-[100dvh] bg-gradient-to-br from-background via-accent/10 to-background/95">
      <TopAppBar title="Issnuta" />
      <main className="flex w-full max-w-screen-sm mx-auto flex-col gap-5 px-5 py-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">텍스트 번역 (로컬 모델)</h1>
          <RuntimeBadge />
        </div>

        <Card className="rounded-xl border shadow-[var(--shadow-warm)]">
          <CardContent>
            <LocalNLLBTranslator />
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-[var(--surface-secondary)] shadow-[var(--shadow-minimal)]">
          <CardContent className="py-4">
            <p className="text-center text-sm text-muted-foreground">
              오프라인 지원: 모델을 기기에 저장하면 네트워크 없이도 번역할 수 있어요.
            </p>
          </CardContent>
        </Card>
      </main>
      <footer className="px-5 pb-2 text-center text-xs text-foreground/60">
        Issnuta · Offline Translator
      </footer>
      <BottomNav />
    </div>
  );
}

export default HomeEntry;
