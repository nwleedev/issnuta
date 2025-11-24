"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import QRCode from "qrcode";

export type FeedQrCodeDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * QR 코드에 담길 직렬화된 문자열
   * - 보통 stringifyFeedSharePayload 결과
   */
  data: string;
  title?: string;
  description?: string;
};

/**
 * FeedQrCodeDialog — 피드 공유용 QR 코드 팝업
 *
 * - design-templates QrCodePopup 레이아웃을 참고한 글라스/카드 스타일
 * - data: QR 코드에 인코딩할 문자열(JSON 등)
 */
export function FeedQrCodeDialog({
  isOpen,
  onClose,
  data,
  title = "Share history",
  description = "Scan this QR code to import history on another device.",
}: FeedQrCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!canvasRef.current) return;
    if (!data) return;

    void QRCode.toCanvas(canvasRef.current, data, {
      width: 280,
      margin: 2,
      color: {
        dark: "#2d2d28",
        light: "#fafaf7",
      },
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Failed to render QR code", error);
    });
  }, [isOpen, data]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="relative w-full max-w-sm rounded-2xl border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e8e0] bg-white/70 text-[#5a4a3a] hover:bg-[#f5f5f0] focus:outline-none"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-4 pr-10">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>

          <div className="mb-4 flex items-center justify-center rounded-xl border border-white/60 bg-white p-6 shadow-sm">
            <canvas
              ref={canvasRef}
              className="h-auto w-[220px] max-w-full rounded-lg"
            />
          </div>

          <div className="rounded-xl border border-[#f5e5d8] bg-[#fef9f3] px-3 py-2">
            <p className="text-[11px] leading-relaxed text-[#5a4a3a]">
              This QR code contains your translation history data. Anyone who
              scans it can import these translations on their device.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

