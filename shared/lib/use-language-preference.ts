"use client";

/**
 * 언어 선택 상태 Hook
 *
 * - useReducer 기반 로컬 상태 관리
 * - 영속화 없이 세션 동안만 유지
 */

import { useReducer, useCallback } from "react";
import {
  DEFAULT_LANGUAGE_PAIR,
  isSupportedNllbCode,
} from "@/shared/config/supported-languages";

/** 언어쌍 타입 (NLLB 코드 사용) */
export interface LanguagePair {
  source: string;
  target: string;
}

// ============================================================
// Reducer
// ============================================================

type LanguagePairAction =
  | { type: "SET_PAIR"; payload: LanguagePair }
  | { type: "SET_SOURCE"; payload: string }
  | { type: "SET_TARGET"; payload: string }
  | { type: "SWAP" }
  | { type: "RESET" };

function languagePairReducer(
  state: LanguagePair,
  action: LanguagePairAction
): LanguagePair {
  switch (action.type) {
    case "SET_PAIR":
      if (
        isSupportedNllbCode(action.payload.source) &&
        isSupportedNllbCode(action.payload.target)
      ) {
        return action.payload;
      }
      return state;

    case "SET_SOURCE":
      if (isSupportedNllbCode(action.payload)) {
        return { ...state, source: action.payload };
      }
      return state;

    case "SET_TARGET":
      if (isSupportedNllbCode(action.payload)) {
        return { ...state, target: action.payload };
      }
      return state;

    case "SWAP":
      return { source: state.target, target: state.source };

    case "RESET":
      return { ...DEFAULT_LANGUAGE_PAIR };

    default:
      return state;
  }
}

// ============================================================
// Hook
// ============================================================

export interface UseLanguagePreferenceResult {
  /** 현재 언어쌍 */
  pair: LanguagePair;
  /** 언어쌍 설정 */
  setPair: (pair: LanguagePair) => void;
  /** 소스 언어만 변경 */
  setSource: (source: string) => void;
  /** 타겟 언어만 변경 */
  setTarget: (target: string) => void;
  /** 소스/타겟 교환 */
  swap: () => void;
  /** 기본값으로 초기화 */
  reset: () => void;
}

/**
 * 언어 선택 상태 Hook
 *
 * @example
 * ```tsx
 * const { pair, setSource, setTarget, swap } = useLanguagePreference();
 *
 * // 소스 언어 변경
 * setSource('eng_Latn');
 *
 * // 언어 교환
 * swap();
 * ```
 */
export function useLanguagePreference(): UseLanguagePreferenceResult {
  const [pair, dispatch] = useReducer(languagePairReducer, {
    ...DEFAULT_LANGUAGE_PAIR,
  });

  const setPair = useCallback((newPair: LanguagePair) => {
    dispatch({ type: "SET_PAIR", payload: newPair });
  }, []);

  const setSource = useCallback((source: string) => {
    dispatch({ type: "SET_SOURCE", payload: source });
  }, []);

  const setTarget = useCallback((target: string) => {
    dispatch({ type: "SET_TARGET", payload: target });
  }, []);

  const swap = useCallback(() => {
    dispatch({ type: "SWAP" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    pair,
    setPair,
    setSource,
    setTarget,
    swap,
    reset,
  };
}
