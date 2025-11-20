"use client";

import { Skeleton } from "@/shared/ui/skeleton";

type Props = {
  variant?: "inline" | "full";
  showTopBarProgress?: boolean;
  showDualResult?: boolean;
  className?: string;
};

export default function LoadingNLLBTranslator({
  variant = "inline",
  showTopBarProgress = false,
  showDualResult = false,
  className,
}: Props) {
  // 로딩 중 UI(스피너/문구)는 제거하고 Skeleton만 표시합니다.

  const rootCls = ["flex flex-col gap-5", className ?? ""].join(" ").trim();

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={rootCls}
    >
      <span className="sr-only">번역 UI 준비 중…</span>
      {showTopBarProgress && (
        <Skeleton className="h-0.5 w-full rounded border border-[var(--border-primary)]" />
      )}
      {/* Language cards (2 columns) */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl border border-[var(--border-primary)]" />
        <Skeleton className="h-20 rounded-xl border border-[var(--border-primary)]" />
      </div>

      {/* Input area */}
      <Skeleton className="min-h-40 rounded-xl border border-[var(--border-primary)]" />
    </section>
  );
}
