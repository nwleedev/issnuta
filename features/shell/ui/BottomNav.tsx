"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

type Item = { href: string; label: string; icon?: React.ReactNode; match?: (path: string) => boolean };

export type BottomNavProps = {
  items?: Item[];
  className?: string;
};

/**
 * BottomNav — 모바일 하단 내비게이션(DaisyUI)
 * - 3–5개 목적지 권장(홈/프레이즈북/보관함/설정)
 * - Safe‑area 대응, sticky bottom, backdrop blur
 * - 활성 탭 표시: aria-current="page"
 */
export default function BottomNav({ items, className }: BottomNavProps) {
  const pathname = usePathname() || "/";
  const nav: Item[] =
    items ?? (
      [
        { href: "/", label: "홈", icon: "🏠", match: (p) => p === "/" },
        { href: "/phrasebook", label: "프레이즈", icon: "🗒️", match: (p) => p.startsWith("/phrasebook") },
        { href: "/library", label: "보관함", icon: "📁", match: (p) => p.startsWith("/library") },
        { href: "/settings", label: "설정", icon: "⚙️", match: (p) => p.startsWith("/settings") },
      ] as Item[]
    );

  return (
    <nav
      aria-label="Primary"
      className={
        (
          "sticky bottom-0 inset-x-0 z-10 border-t border-[var(--border-primary)] bg-[var(--surface-primary)]/90 backdrop-blur px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] " +
          (className ?? "")
        ).trim()
      }
    >
      <ul className="mx-auto flex max-w-screen-sm items-center justify-around gap-2">
        {nav.map((it) => {
          const active = (it.match ?? ((p) => p === it.href))(pathname);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={
                  (
                    "flex flex-col items-center gap-0.5 px-2 py-1 text-xs " +
                    (active ? "text-[var(--brand-primary)] font-medium" : "text-[var(--text-secondary)]")
                  ).trim()
                }
              >
                <span aria-hidden className="text-base leading-none">
                  {it.icon ?? "•"}
                </span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
