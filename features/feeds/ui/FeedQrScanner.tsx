"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { translationsKey } from "@/features/feeds/model/useLocalTranslations";
import { parseFeedSharePayload } from "@/shared/lib/qrShare";
import type { SavedTranslation } from "@/shared/model/translation";
import { importTranslationsFromQr } from "@/shared/storage/translation-store";

type ImportResult = {
  imported: number;
  duplicates: number;
  skipped: number;
};

type FeedQrScannerProps = {
  onClose: () => void;
  onImported?: (result: ImportResult) => void;
};

type Html5QrcodeInstance = {
  start(
    cameraConfig: { facingMode: "environment" } | string,
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decodedText: string) => void,
    onError: (errorMessage: string) => void
  ): Promise<void>;
  stop(): Promise<void>;
  clear(): Promise<void>;
};

type ScanStatus =
  | { type: "idle" }
  | { type: "success"; message: string; result: ImportResult }
  | { type: "error"; message: string; result?: ImportResult };

type BottomCardProps = {
  cameraError: string | null;
  status: ScanStatus;
  onClose: () => void;
};

function FeedQrScannerBottomCard({
  cameraError,
  status,
  onClose,
}: BottomCardProps) {
  if (cameraError) {
    return (
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mx-auto max-w-screen-sm rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl">
          <div className="mb-4 flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 text-[#c87941]" />
            <div>
              <h3 className="mb-1 text-[#2d2d28]">카메라 접근이 필요합니다</h3>
              <p className="text-sm text-[#6b6b60]">{cameraError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-white text-sm text-[#5a4a3a] border border-[#e8e8e0] hover:bg-[#f5f5f0]"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  if (status.type === "success" || status.type === "error") {
    const isSuccess = status.type === "success";
    const result = status.result;

    return (
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mx-auto max-w-screen-sm rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl">
          <div className="mb-4 flex items-start gap-3">
            {isSuccess ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-[#4a7c59]" />
            ) : (
              <AlertCircle className="mt-0.5 h-6 w-6 text-[#c87941]" />
            )}
            <div>
              <h3 className="mb-1 text-[#2d2d28]">
                {isSuccess ? "가져오기 완료" : "가져오기 실패"}
              </h3>
              <p className="text-sm text-[#6b6b60]">{status.message}</p>
              {result && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {result.imported > 0 && (
                    <span className="rounded-lg bg-[#4a7c59]/10 px-2 py-1 text-[#4a7c59]">
                      {result.imported}개 가져옴
                    </span>
                  )}
                  {result.duplicates > 0 && (
                    <span className="rounded-lg bg-[#6b6b60]/10 px-2 py-1 text-[#6b6b60]">
                      {result.duplicates}개 중복
                    </span>
                  )}
                  {result.skipped > 0 && (
                    <span className="rounded-lg bg-[#6b6b60]/10 px-2 py-1 text-[#6b6b60]">
                      {result.skipped}개 건너뜀
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`h-11 w-full rounded-xl text-sm ${
              isSuccess
                ? "bg-[#5a4a3a] text-[#fafaf7] hover:bg-[#4a3a2a]"
                : "bg-white text-[#5a4a3a] border border-[#e8e8e0] hover:bg-[#f5f5f0]"
            }`}
          >
            {isSuccess ? "히스토리로 돌아가기" : "닫기"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function FeedQrScanner({ onClose, onImported }: FeedQrScannerProps) {
  const queryClient = useQueryClient();
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const hasScannedRef = useRef(false);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>({ type: "idle" });

  const stopScanner = useCallback(async () => {
    const instance = scannerRef.current;
    if (!instance) return;
    try {
      await instance.stop();
      await instance.clear();
    } catch {
      // noop
    }
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;

      try {
        const payload = parseFeedSharePayload(decodedText);
        if (!payload) {
          setStatus({
            type: "error",
            message: "이 QR 코드는 Issnuta 히스토리 코드 형식이 아닙니다.",
          });
          await stopScanner();
          return;
        }

        const records: SavedTranslation[] = payload.data;
        if (!records.length) {
          setStatus({
            type: "error",
            message: "QR 코드에 가져올 번역이 없습니다.",
          });
          await stopScanner();
          return;
        }

        const result = await importTranslationsFromQr(records);
        await queryClient.invalidateQueries({ queryKey: translationsKey });

        if (result.imported === 0) {
          setStatus({
            type: "error",
            message: "새 번역이 없습니다. 이미 모든 항목을 가지고 있습니다.",
            result,
          });
        } else {
          setStatus({
            type: "success",
            message: `새 번역 ${result.imported}개를 가져왔어요.`,
            result,
          });
        }

        if (onImported) {
          onImported(result);
        }

        await stopScanner();
      } catch {
        setStatus({
          type: "error",
          message:
            "QR 코드를 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
        });
        await stopScanner();
      }
    },
    [onImported, queryClient, stopScanner]
  );

  useEffect(() => {
    let active = true;

    const startScanner = async () => {
      try {
        const html5qrcodeModule = await import("html5-qrcode");
        if (!active) return;

        const Html5Qrcode = html5qrcodeModule.Html5Qrcode as unknown as {
          new (elementId: string): Html5QrcodeInstance;
        };

        const instance = new Html5Qrcode("qr-reader");
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            void handleScanSuccess(decodedText);
          },
          () => {
            // ignore per-frame decode errors
          }
        );

        if (!active) {
          await stopScanner();
          return;
        }
        setIsScanning(true);
        setCameraError(null);
      } catch (error) {
        setIsScanning(false);
        setCameraError(
          error instanceof Error
            ? error.message
            : "카메라를 시작할 수 없습니다. 브라우저 설정을 확인해 주세요."
        );
      }
    };

    void startScanner();

    return () => {
      active = false;
      void stopScanner();
    };
  }, [handleScanSuccess, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  if (isScanning && status.type === "idle" && !cameraError) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
        <p className="text-center text-sm text-[#fafaf7]/80">
          Issnuta QR 코드가 프레임 안에 오도록 맞춰 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#2d2d28]">
      {/* Header */}
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#fafaf7]">
              QR 코드 스캔
            </h2>
            <p className="mt-1 text-xs text-[#fafaf7]/80">
              다른 기기에서 생성한 Issnuta 히스토리 QR 코드를 스캔합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#fafaf7] hover:bg-white/20 focus:outline-none"
            aria-label="스캐너 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scanner area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div id="qr-reader" className="h-full w-full" />

        {/* Scan frame overlay */}
        {isScanning && status.type === "idle" && !cameraError && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative h-64 w-64">
                <div className="absolute inset-0 rounded-2xl border-2 border-white/40" />
                <div className="absolute top-0 left-0 h-12 w-12 rounded-tl-2xl border-t-4 border-l-4 border-[#fafaf7]" />
                <div className="absolute top-0 right-0 h-12 w-12 rounded-tr-2xl border-t-4 border-r-4 border-[#fafaf7]" />
                <div className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-[#fafaf7]" />
                <div className="absolute bottom-0 right-0 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-[#fafaf7]" />
                <div className="absolute left-0 right-0 h-0.5 animate-pulse bg-linear-to-r from-transparent via-[#fafaf7] to-transparent" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info / result */}
      <FeedQrScannerBottomCard
        cameraError={cameraError}
        status={status}
        onClose={handleClose}
      />
      {isScanning && status.type === "idle" && !cameraError && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
          <p className="text-center text-sm text-[#fafaf7]/80">
            Issnuta QR 코드가 프레임 안에 오도록 맞춰 주세요.
          </p>
        </div>
      )}
    </div>
  );
}
