"use client";

import TopAppBar from "@/features/shell/ui/TopAppBar";
import Link from "next/link";

/**
 * 오프라인 폴백 페이지
 * - 서버 에러(5xx) 발생 시 캐시가 없을 때 표시
 * - 네트워크 연결 불가 시 캐시가 없을 때 표시
 */
export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <main className="flex flex-col flex-[1_1_0] px-4 items-center bg-[#fafaf7]">
      <div className="w-full shrink-0 sticky top-0 z-10 flex max-w-screen-sm flex-col font-sans">
        <TopAppBar title="Issnuta" subtitle="오프라인" />
      </div>
      <div className="w-full flex flex-[1_1_0] max-w-screen-sm flex-col font-sans">
        <section className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--text-secondary)]"
              aria-hidden="true"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              연결할 수 없습니다
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              서버에 일시적인 문제가 발생했거나
              <br />
              인터넷 연결이 불안정합니다.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-medium text-[var(--text-on-primary)] transition-colors hover:opacity-90 active:opacity-80"
          >
            메인 페이지
          </Link>

          <p className="text-xs text-[var(--text-tertiary)]">
            이전에 방문한 페이지는 오프라인에서도 사용할 수 있습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
