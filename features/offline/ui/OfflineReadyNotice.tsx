"use client";

import * as React from "react";
import { useOfflineModelReady } from "@/features/offline/useOfflineModelReady";
import { cn } from "@/shared/lib/utils";

export type OfflineReadyNoticeProps = {
  className?: string;
};

/**
 * OfflineReadyNotice — 메인 페이지에서 오프라인 준비 안내 텍스트를 표시하는 컴포넌트
 * - ready=false: "로컬 모델을 저장하면 오프라인 번역이 가능합니다."
 * - ready=true:  "이 버전의 모델이 오프라인 준비되었습니다."
 * 기존 OfflinePrefetchButton의 에러/상태 메시지는 그대로 유지합니다.
 */
export default function OfflineReadyNotice({
  className,
}: OfflineReadyNoticeProps) {
  const { ready } = useOfflineModelReady();

  const text = ready
    ? "이 버전의 모델이 오프라인 준비되었습니다."
    : "로컬 모델을 저장하면 오프라인 번역이 가능합니다.";

  return (
    <p
      className={cn(
        "text-xs text-[var(--text-secondary)]",
        className
      )}
    >
      {text}
    </p>
  );
}

