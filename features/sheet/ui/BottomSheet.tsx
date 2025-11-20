"use client";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/shared/ui/sheet";

export type BottomSheetProps = {
  title?: ReactNode;
  trigger?: ReactNode;
  children?: ReactNode;
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
  closeLabel?: string;
};

/**
 * BottomSheet — Radix Sheet 기반 하단 시트(모바일 우선)
 * - side="bottom"으로 DaisyUI modal-bottom 동작을 대체
 * - Safe-area 하단 여백 + 최대 높이(80dvh)
 * - 외부 트리거 주입 가능(없으면 기본 버튼 렌더)
 */
export default function BottomSheet({
  title = "옵션",
  trigger,
  children,
  className,
  onOpen,
  onClose,
  closeLabel = "닫기",
}: BottomSheetProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onOpen?.();
      else onClose?.();
    },
    [onOpen, onClose],
  );

  return (
    <Sheet onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger ? (
          <span role="button" tabIndex={0}>
            {trigger}
          </span>
        ) : (
          <Button type="button">{typeof title === "string" ? title : "열기"}</Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className={
          ("p-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] rounded-t-2xl " +
            (className ?? "")).trim()
        }
      >
        <div className="mx-auto my-2 h-1.5 w-9 rounded-full bg-muted" aria-hidden />
        {(title || typeof title === "string") && (
          <SheetHeader className="px-4 pt-2 pb-1">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="max-h-[80dvh] overflow-auto p-4">{children}</div>
        <SheetFooter className="border-t px-4 pt-2 pb-3">
          <SheetClose asChild>
            <Button className="w-full">{closeLabel}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
