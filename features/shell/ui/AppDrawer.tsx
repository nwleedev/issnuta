"use client";

import { Clock, Home, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon: ReactNode;
  match?: (path: string) => boolean;
};

/**
 * AppDrawer — 모바일 내비게이션 드로어
 * - design-templates의 Drawer 레이아웃/톤을 참고하여 구성
 * - 좌측에서 슬라이드 인, 메인/History로 이동
 */
export function AppDrawer() {
  const pathname = usePathname() || "/";

  const items: NavItem[] = [
    {
      href: "/",
      label: "번역",
      description: "텍스트 번역 (한국어 ↔ 일본어)",
      icon: <Home className="h-4 w-4" />,
      match: (p) => p === "/",
    },
    {
      href: "/feeds",
      label: "History",
      description: "저장된 번역 보기",
      icon: <Clock className="h-4 w-4" />,
      match: (p) => p.startsWith("/feeds"),
    },
  ];

  return (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5 text-[var(--text-primary)]" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="bg-[#fafaf7]">
        <DrawerHeader className="border-b border-[#e8e8e0] pb-4 pt-6">
          <DrawerTitle className="text-[#2d2d28]">메뉴</DrawerTitle>
        </DrawerHeader>

        <nav
          aria-label="주 내비게이션"
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          <ul className="space-y-1">
            {items.map((item) => {
              const active = (item.match ?? ((p: string) => p === item.href))(
                pathname
              );
              return (
                <li key={item.href}>
                  <DrawerClose asChild>
                    <Link
                      href={item.href}
                      className={[
                        "flex w-full items-center gap-4 rounded-xl px-4 py-3.5 transition-colors",
                        active
                          ? "bg-[#5a4a3a] text-[#fafaf7]"
                          : "text-[#2d2d28] hover:bg-[#f5f5f0]",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          active ? "bg-white/10" : "bg-[#f5f5f0]",
                        ].join(" ")}
                      >
                        <span
                          className={
                            active ? "text-[#fafaf7]" : "text-[#5a4a3a]"
                          }
                        >
                          {item.icon}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{item.label}</div>
                        {item.description && (
                          <div className="mt-0.5 text-xs text-[#6b6b60]">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </DrawerClose>
                </li>
              );
            })}
          </ul>
        </nav>

        <DrawerFooter className="border-t border-[#e8e8e0]">
          <DrawerClose asChild>
            <button
              type="button"
              className="h-10 w-full rounded-xl border border-[#e8e8e0] bg-white text-sm text-[#5a4a3a] hover:bg-[#f5f5f0]"
            >
              닫기
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
