"use client";

import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface UpdatePromptProps {
  open: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  isUpdating?: boolean;
  title?: string;
  message?: string;
}

export function UpdatePrompt({
  open,
  onUpdate,
  onDismiss,
  isUpdating = false,
  title = "업데이트 안내",
  message = "새로운 버전이 준비되었습니다. 업데이트하여 개선된 기능을 사용해 보세요.",
}: UpdatePromptProps) {
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        {/* Glassmorphism Backdrop */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#f5f5f0]/40 via-[#fafaf7]/30 to-[#e8e8e0]/40" />
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-white/20" />
        </DialogPrimitive.Overlay>

        {/* Modal Content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-3rem)] max-w-sm",
            "-translate-x-1/2 -translate-y-1/2",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-200"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Glassmorphism container */}
          <div className="relative backdrop-blur-2xl bg-white/80 border border-white/40 rounded-2xl shadow-2xl overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 p-6">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c17a4f] to-[#b86a3f] flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>

              {/* Title */}
              <DialogPrimitive.Title className="text-center text-[#2d2d28] text-lg font-semibold mb-3">
                {title}
              </DialogPrimitive.Title>

              {/* Message */}
              <DialogPrimitive.Description className="text-sm text-[#5a4a3a]/90 text-center leading-relaxed mb-6">
                {message}
              </DialogPrimitive.Description>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {/* Update Button (Primary) */}
                <Button
                  onClick={onUpdate}
                  disabled={isUpdating}
                  className={cn(
                    "h-12 rounded-xl",
                    "bg-gradient-to-r from-[#5a4a3a] to-[#4a3a2a]",
                    "text-[#fafaf7]",
                    "hover:from-[#4a3a2a] hover:to-[#3a2a1a]",
                    "shadow-lg relative overflow-hidden",
                    "disabled:opacity-70"
                  )}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  <span className="relative">
                    {isUpdating ? "업데이트 중..." : "업데이트"}
                  </span>
                </Button>

                {/* Dismiss Button (Secondary) */}
                <Button
                  variant="ghost"
                  onClick={onDismiss}
                  disabled={isUpdating}
                  className={cn(
                    "h-12 rounded-xl",
                    "bg-white/70 backdrop-blur-sm",
                    "border border-white/60",
                    "text-[#5a4a3a]",
                    "hover:bg-white/90",
                    "shadow-sm"
                  )}
                >
                  나중에
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
