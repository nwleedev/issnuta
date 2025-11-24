/** 공통 상단 헤더 — design-templates AppHeader 톤 반영 */
"use client";
import type { ReactNode } from "react";
import { AppDrawer } from "@/features/shell/ui/AppDrawer";

export type TopAppBarProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  /**
   * 왼쪽에 들어갈 메뉴/뒤로가기 버튼 슬롯
   * 기본값은 AppDrawer
   */
  leading?: ReactNode;
  /**
   * 오른쪽 액션 버튼 영역
   */
  trailing?: ReactNode;
  /**
   * 타이틀 왼쪽에 표시할 강조 아이콘 슬롯
   * - 예: History 아이콘, 번역 아이콘 등
   * - 제공되지 않으면 텍스트만 렌더링
   */
  headlineIcon?: ReactNode;
  className?: string;
};

export default function TopAppBar({
  title = "Issnuta",
  subtitle,
  leading,
  trailing,
  headlineIcon,
  className,
}: TopAppBarProps) {
  return (
    <header
      className={(
        "shrink-0 bg-[var(--surface-primary)] px-6 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] " +
        (className ?? "")
      ).trim()}
      role="banner"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0">
            {leading ?? <AppDrawer />}
          </div>
          {headlineIcon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]">
              <span className="text-[var(--text-on-primary)]">
                {headlineIcon}
              </span>
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {trailing ? (
          <div className="flex flex-none items-center gap-2">
            {trailing}
          </div>
        ) : null}
      </div>
    </header>
  );
}
