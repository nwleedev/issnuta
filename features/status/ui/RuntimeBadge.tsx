"use client";
import { useEffect, useState } from "react";

type Backend = "webgpu" | "wasm";

export type RuntimeBadgeProps = {
  force?: Backend; // 테스트/강제 표기를 위한 오버라이드
  className?: string;
};

function detectBackend(): Backend {
  if (
    typeof navigator !== "undefined" &&
    'gpu' in navigator &&
    (navigator as Navigator & { gpu?: unknown }).gpu
  ) {
    return "webgpu";
  }
  return "wasm";
}

export function RuntimeBadge({ force, className }: RuntimeBadgeProps) {
  const [backend, setBackend] = useState<Backend>(force ?? "wasm");

  useEffect(() => {
    if (force) return; // 외부 강제값 우선
    setBackend(detectBackend());
  }, [force]);

  const label = backend === "webgpu" ? "Local · WebGPU" : "Local · WASM";

  return (
    <span
      aria-label="runtime-backend"
      data-backend={backend}
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border " +
        (backend === "webgpu"
          ? "border-cyan-500 text-cyan-600 dark:text-cyan-300"
          : "border-zinc-500 text-zinc-600 dark:text-zinc-300") +
        (className ? ` ${className}` : "")
      }
    >
      {label}
    </span>
  );
}

export default RuntimeBadge;
