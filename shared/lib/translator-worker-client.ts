import type {
  TranslateWorkerArgs,
  WorkerResponse,
} from "@/shared/lib/translator-worker-protocol";

/**
 * Web Worker 기반 번역 클라이언트
 *
 * - shared/workers/translator.worker.ts와 통신하는 얇은 래퍼입니다.
 * - 메인 스레드에서는 이 모듈만 사용해 번역 요청을 보내고, 결과 문자열을 Promise로 받습니다.
 */

export type { TranslateWorkerArgs } from "@/shared/lib/translator-worker-protocol";

type PendingEntry = {
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
};

let worker: Worker | null = null;
const pending = new Map<number, PendingEntry>();
let nextId = 1;

function getTranslatorWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error(
      "translateViaWorker는 브라우저 환경에서만 사용할 수 있습니다."
    );
  }

  if (worker) return worker;

  // Next.js/Webpack에서 지원하는 Web Worker 번들 패턴
  worker = new Worker(
    // shared/lib -> shared/workers 상대 경로
    new URL("../workers/translator.worker.ts", import.meta.url),
    { type: "module" }
  );

  worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
    const data = event.data;
    if (!data || typeof data.id !== "number") return;

    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);

    if (data.ok) {
      entry.resolve(data.resultText);
    } else {
      const error = new Error(data.error || "Translation failed");
      if (data.code) {
        (error as any).code = data.code;
      }
      entry.reject(error);
    }
  });

  worker.addEventListener("error", (event) => {
    // 워커 수준 에러 발생 시, 대기 중인 요청 전부를 실패 처리
    const err = new Error(
      event.message || "Translation worker encountered an error"
    );
    for (const [id, entry] of pending.entries()) {
      pending.delete(id);
      entry.reject(err);
    }
  });

  return worker;
}

export function translateViaWorker(
  args: TranslateWorkerArgs
): Promise<string> {
  const w = getTranslatorWorker();
  const id = nextId++;

  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({
      id,
      type: "translate",
      payload: args,
    });
  });
}
