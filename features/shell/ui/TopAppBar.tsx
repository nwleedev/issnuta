"use client";
import { AppDrawer } from "@/features/shell/ui/AppDrawer";
import type { ReactNode } from "react";

export type TopAppBarProps = {
  title?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

/**
 * TopAppBar — 모바일 상단 앱바(DaisyUI)
 * - sticky + safe‑area 상단 패딩
 * - 기본 액션: 메뉴/검색/설정(교체 가능)
 * - 상호작용 로직은 상위에서 주입(드로어/검색 시트 등)
 */
export default function TopAppBar({
  title = "Issnuta",
  leading,
  trailing,
  className,
}: TopAppBarProps) {
  return (
    <header
      className={(
        "sticky top-0 z-10 backdrop-blur bg-[var(--surface-primary)]/90 border-b border-[var(--border-primary)] px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 gap-2 flex items-center justify-between " +
        (className ?? "")
      ).trim()}
      role="navigation"
    >
      <div className="flex-none">{leading ?? <AppDrawer />}</div>
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
      </div>
      <div className="flex-none flex gap-1"></div>
    </header>
  );
}
