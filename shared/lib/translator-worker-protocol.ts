/**
 * 번역 Web Worker 프로토콜 타입 정의
 *
 * - 메인 스레드와 shared/workers/translator.worker.ts 사이에서 주고받는
 *   메시지 구조를 단일 소스에서 관리합니다.
 */

export type TranslateRequestPayload = {
  text: string;
  src_lang: string;
  tgt_lang: string;
  num_beams?: number;
  max_new_tokens?: number;
};

export type TranslateWorkerArgs = TranslateRequestPayload;

export type WorkerRequest = {
  id: number;
  type: "translate";
  payload: TranslateRequestPayload;
};

export type WorkerResponse =
  | {
      id: number;
      ok: true;
      resultText: string;
    }
  | {
      id: number;
      ok: false;
      error: string;
      code?: string | null;
    };

