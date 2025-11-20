"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAllURLs, getBaseURL } from "../urls";
import { headSizes, prefetchAllForModel, type Progress } from "../prefetch";

export type OfflineSetupProps = {
  modelId: string; // 예: "Xenova/nllb-200-distilled-600M"
  open: boolean;
  onClose?: (reason: "done" | "later" | "cancel") => void;
  onDone?: () => void; // 프리페치 완료 시 호출
};

type ByteInfo = { total?: number; done: number };

function fmtBytes(n?: number) {
  if (!n || n <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"]; 
  let u = 0;
  let x = n;
  while (x >= 1024 && u < units.length - 1) { x /= 1024; u++; }
  return `${x.toFixed(1)} ${units[u]}`;
}

/**
 * 오프라인 준비 팝업(프리페치 실행)
 * - Wi‑Fi 권고/데이터 절약 감지 메시지(힌트)
 * - 지금 받기 / 나중에 / 취소
 * - 진행률/바이트 추산(HEAD 성공 시)
 */
export default function OfflineSetup({ modelId, open, onClose, onDone }: OfflineSetupProps) {
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<ByteInfo>({ done: 0 });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allFailed, setAllFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const networkHints = useMemo(() => {
    const conn: any = (typeof navigator !== "undefined" && (navigator as any).connection) || null;
    const hint: string[] = [];
    try {
      if (conn?.effectiveType && conn.effectiveType !== "4g") {
        hint.push(`현재 네트워크: ${String(conn.effectiveType)}`);
      }
      if (conn?.saveData === true) {
        hint.push("데이터 절약 모드가 감지되었습니다");
      }
    } catch {}
    return hint;
  }, []);

  // 열릴 때 예상 총 바이트 추산(HEAD)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open) return;
      setError(null);
      setEstimating(true);
      try {
        const base = getBaseURL();
        const { all } = buildAllURLs(base, modelId);
        const sizes = await headSizes(all);
        if (!cancelled) {
          const total = Array.from(sizes.values()).reduce((a, b) => a + b, 0);
          setEstimate({ total: total > 0 ? total : undefined, done: 0 });
        }
      } catch (e) {
        // 추정 실패는 치명적이지 않음
      } finally {
        if (!cancelled) setEstimating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, modelId]);

  const onStart = useCallback(async () => {
    setRunning(true);
    setError(null);
    setAllFailed(false);
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      // 저장소 영속 권유(지원 시)
      try { await (navigator as any).storage?.persist?.(); } catch {}
      const res = await prefetchAllForModel(modelId, {
        signal: ctl.signal,
        concurrency: 4,
        onProgress: (p) => setProgress({ ...p }),
      });
      const failedCompletely = res.ok.length === 0 && res.fail.length === res.counts.total;
      if (failedCompletely) {
        setAllFailed(true);
        setError("모든 파일 다운로드 실패. 네트워크/버킷 경로를 확인 후 재시도하세요.");
        // 모달을 닫지 않고 재시도 가능 상태로 유지
      } else {
        if (res.fail.length > 0) {
          setError(`일부 파일을 가져오지 못했습니다(${res.fail.length}개). 네트워크 상태와 버킷 경로를 확인하세요.`);
        }
        onDone?.();
        onClose?.("done");
      }
    } catch (e) {
      if ((e as any)?.name === "AbortError") {
        onClose?.("cancel");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [modelId, onClose, onDone]);

  const onCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (!running) onClose?.("cancel");
    setAllFailed(false);
  }, [running, onClose]);

  const onLater = useCallback(() => onClose?.("later"), [onClose]);

  if (!open) return null;

  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pct = total > 0 ? Math.floor((done / total) * 100) : 0;
  const byteTotal = progress?.totalBytes ?? estimate.total;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 className="text-lg font-semibold">오프라인 준비(번역 모델 다운로드)</h2>
        <p className="mt-2 text-sm text-gray-700">
          첫 사용 시 번역 모델과 런타임 파일을 내려받아 캐시에 저장합니다.
          Wi‑Fi 환경을 권장합니다.
        </p>
        {networkHints.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">{networkHints.join(" · ")}</p>
        )}

        <div className="mt-3 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span>진행률</span>
            <span>{done}/{total} 파일{byteTotal ? ` · 총 ${fmtBytes(byteTotal)}` : ""}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
            <div className="h-2 bg-blue-600" style={{ width: `${pct}%` }} />
          </div>
          {estimating && <p className="mt-2 text-xs text-gray-600">용량 추정 중…</p>}
          {error && !running && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {allFailed && !running && (
            <p className="mt-2 text-xs text-blue-700">모든 파일을 다시 다운로드해 주세요.</p>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          {!running && (
            <button onClick={onLater} className="rounded border px-3 py-2 text-sm">나중에</button>
          )}
          {!running ? (
            <button onClick={onStart} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">{allFailed ? "재시도" : "지금 받기"}</button>
          ) : (
            <button onClick={onCancel} className="rounded bg-gray-600 px-3 py-2 text-sm text-white">취소</button>
          )}
        </div>
      </div>
    </div>
  );
}
