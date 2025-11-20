"use client";

import { isOfflineReadyForModel } from "@/features/offline/check";
import {
  headSizes,
  prefetchAllForModel,
  type Progress,
} from "@/features/offline/prefetch";
import { buildAllURLs, getBaseURL } from "@/features/offline/urls";
import { NLLB_MODEL_ID } from "@/shared/lib/translator";
import { useCallback, useEffect, useRef, useState } from "react";

export type OfflinePrefetchButtonProps = {
  modelId?: string;
  className?: string;
  label?: string; // 기본 라벨 커스터마이즈
};

type ByteInfo = { total?: number; done: number };

function formatBytes(n?: number) {
  if (!n || n <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let u = 0;
  let x = n;
  while (x >= 1024 && u < units.length - 1) {
    x /= 1024;
    u++;
  }
  return `${x.toFixed(1)} ${units[u]}`;
}

/**
 * 오프라인 프리페치 버튼
 * - 클릭 시 모델/ORT 파일을 CacheStorage에 저장하여 오프라인에서도 동작 보장
 * - 진행률/용량 추정 표시, 취소 가능
 */
export default function OfflinePrefetchButton({
  modelId = NLLB_MODEL_ID,
  className,
  label,
}: OfflinePrefetchButtonProps) {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [estimate, setEstimate] = useState<ByteInfo>({ done: 0 });
  const [error, setError] = useState<string | null>(null);
  const [allFailed, setAllFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 초기 준비 상태 확인
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { ready } = await isOfflineReadyForModel(modelId);
        if (mounted) setReady(ready);
      } catch (e) {
        // 환경 미설정 등은 무시(클릭 시 안내)
      }
    })();
    return () => {
      mounted = false;
    };
  }, [modelId]);

  const confirmIfMetered = useCallback(() => {
    try {
      const c: any = (navigator as any).connection;
      const metered =
        c?.saveData === true || (c?.effectiveType && c.effectiveType !== "4g");
      if (metered)
        return window.confirm(
          "현재 네트워크가 느리거나 데이터 절약 모드일 수 있습니다. 계속하시겠습니까?"
        );
    } catch {}
    return true;
  }, []);

  const onStart = useCallback(async () => {
    setError(null);
    setAllFailed(false);
    // 환경 확인
    let base: string;
    try {
      base = getBaseURL();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    if (!confirmIfMetered()) return;

    setRunning(true);
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      // 용량 추산(HEAD)
      try {
        const { all } = buildAllURLs(base, modelId);
        const sizes = await headSizes(all, { signal: ctl.signal });
        const total = Array.from(sizes.values()).reduce((a, b) => a + b, 0);
        setEstimate({ total: total > 0 ? total : undefined, done: 0 });
      } catch {
        // ignore — 추산 실패는 치명 아님
      }

      // 저장소 영속 시도(가능 시)
      try {
        await (navigator as any).storage?.persist?.();
      } catch {}

      const res = await prefetchAllForModel(modelId, {
        signal: ctl.signal,
        concurrency: 4,
        onProgress: (p) => setProgress({ ...p }),
      });
      const failedCompletely =
        res.ok.length === 0 && res.fail.length === res.counts.total;
      if (failedCompletely) {
        setAllFailed(true);
        setReady(false);
        setError(
          "모든 파일 다운로드 실패. 네트워크/버킷 경로를 확인 후 재시도하세요."
        );
      } else if (res.fail.length > 0) {
        setError(
          `일부 파일을 가져오지 못했습니다(${res.fail.length}개). 네트워크/버킷 경로를 확인해 주세요.`
        );
        setAllFailed(false);
      } else {
        setAllFailed(false);
      }
      // 완료 후 준비 상태 갱신
      try {
        const status = await isOfflineReadyForModel(modelId);
        setReady(status.ready);
      } catch {}
    } catch (e) {
      if ((e as any)?.name !== "AbortError") {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [modelId, confirmIfMetered]);

  const onCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    setAllFailed(false);
  }, []);

  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pct = total > 0 ? Math.floor((done / total) * 100) : 0;
  const totalBytes = progress?.totalBytes ?? estimate.total;

  // Design tokens → classes (Warm Minimalist / ActionButton)
  const btnBase =
    "inline-flex items-center gap-3 rounded-2xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
  const btnPrimary =
    "bg-[var(--brand-primary)] text-[var(--text-on-primary)] shadow-[0_2px_8px_rgb(90_74_58/_0.12)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";
  const btnSecondary =
    "bg-white text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--surface-warm)]";
  const btnSize = "h-11 px-5 text-sm";

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={(ready && !allFailed) || running}
          onClick={onStart}
          className={`${btnBase} ${
            ready && !allFailed ? btnSecondary : btnPrimary
          } ${btnSize}`}
          aria-busy={running}
        >
          {allFailed ? (
            <>
              <span>{"재시도"}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="opacity-90"
              >
                <path
                  d="M23 4v6h-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          ) : !ready ? (
            <>
              <span>{label ?? "오프라인 준비 (Wi‑Fi 권장)"}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="opacity-90"
              >
                <path
                  d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-green-700"
              >
                <path
                  d="M20 6 9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>오프라인 준비됨</span>
            </>
          )}
        </button>
        {running && (
          <button
            type="button"
            onClick={onCancel}
            className={`${btnBase} ${btnSecondary} h-9 px-3 text-xs`}
          >
            취소
          </button>
        )}
      </div>

      {running || error || ready || allFailed ? (
        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          {running && (
            <>
              <div className="mb-1 flex items-center justify-between">
                <span>다운로드 중…</span>
                <span>
                  {done}/{total} 파일
                  {totalBytes ? ` · 총 ${formatBytes(totalBytes)}` : ""}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-md bg-[var(--border-primary)]">
                <div
                  className="h-2 bg-[var(--brand-primary)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}
          {error && !running && (
            <div className="mt-1 text-red-600">{error}</div>
          )}
          {allFailed && !running && (
            <div className="mt-1 text-[color:var(--brand-primary)]">
              모든 파일을 다시 다운로드해 주세요.
            </div>
          )}
          {ready && !running && !error && (
            <div className="mt-1 text-[color:var(--brand-primary)]">
              이 버전의 모델이 오프라인 준비되었습니다.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-1 text-[color:var(--brand-primary)]">
          로컬 모델을 저장하면 오프라인 번역이 가능합니다.
        </div>
      )}
    </div>
  );
}
