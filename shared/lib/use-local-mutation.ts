"use client";

// 한국어 주석: TanStack Query의 useMutation에서
// - 전역 QueryClient/MutationCache,
// - Devtools, GC 등
// 을 제외한 "비동기 상태 머신" 부분만 로컬 훅으로 구현한 버전입니다.
// 여러 기능에서 재사용 가능한 형태를 목표로 합니다.

import * as React from "react";

export type LocalMutationStatus = "idle" | "pending" | "success" | "error";

export interface LocalMutationState<TData, TError, TVariables> {
  status: LocalMutationStatus;
  data: TData | null;
  error: TError | null;
  variables: TVariables | null;
  failureCount: number;
}

export interface UseLocalMutationOptions<TData, TError, TVariables> {
  // 필수: 실제 비동기 작업(예: 번역 API 호출, 설정 저장 등)
  mutationFn: (variables: TVariables) => Promise<TData>;
  // 선택: 전역/공통 성공 콜백
  onSuccess?: (data: TData, variables: TVariables) => void;
  // 선택: 전역/공통 실패 콜백
  onError?: (error: TError, variables: TVariables) => void;
  // 선택: 성공/실패 공통 후처리
  onSettled?: (
    data: TData | null,
    error: TError | null,
    variables: TVariables | null
  ) => void;
}

type LocalMutationAction<TData, TError, TVariables> =
  | { type: "start"; variables: TVariables }
  | { type: "success"; data: TData }
  | { type: "error"; error: TError }
  | { type: "reset" };

function localMutationReducer<TData, TError, TVariables>(
  state: LocalMutationState<TData, TError, TVariables>,
  action: LocalMutationAction<TData, TError, TVariables>
): LocalMutationState<TData, TError, TVariables> {
  switch (action.type) {
    case "start":
      return {
        ...state,
        status: "pending",
        variables: action.variables,
        failureCount: 0,
        error: null,
      };
    case "success":
      return {
        ...state,
        status: "success",
        data: action.data,
        error: null,
      };
    case "error":
      return {
        ...state,
        status: "error",
        error: action.error,
        failureCount: state.failureCount + 1,
      };
    case "reset":
      return {
        status: "idle",
        data: null,
        error: null,
        variables: null,
        failureCount: 0,
      };
    default:
      return state;
  }
}

export function useLocalMutation<
  TData,
  TError = unknown,
  TVariables = void
>(options: UseLocalMutationOptions<TData, TError, TVariables>) {
  const [state, dispatch] = React.useReducer(
    localMutationReducer as (
      state: LocalMutationState<TData, TError, TVariables>,
      action: LocalMutationAction<TData, TError, TVariables>
    ) => LocalMutationState<TData, TError, TVariables>,
    {
      status: "idle",
      data: null,
      error: null,
      variables: null,
      failureCount: 0,
    } as LocalMutationState<TData, TError, TVariables>
  );

  const { mutationFn, onSuccess, onError, onSettled } = options;

  // 한국어 주석: 여러 번 mutate를 호출했을 때
  // - 가장 마지막 호출만 유효하게 만들기 위한 id입니다.
  const currentIdRef = React.useRef(0);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutateAsync = React.useCallback(
    async (variables: TVariables) => {
      const id = ++currentIdRef.current;
      dispatch({ type: "start", variables });

      try {
        const data = await mutationFn(variables);

        // 언마운트 또는 더 최신 호출이 있다면 상태 업데이트를 건너뜁니다.
        if (!isMountedRef.current || id !== currentIdRef.current) {
          return data;
        }

        dispatch({ type: "success", data });
        onSuccess?.(data, variables);
        onSettled?.(data, null, variables);
        return data;
      } catch (err) {
        const error = err as TError;

        if (!isMountedRef.current || id !== currentIdRef.current) {
          throw error;
        }

        dispatch({ type: "error", error });
        onError?.(error, variables);
        onSettled?.(null, error, variables);
        throw error;
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  const mutate = React.useCallback(
    (
      variables: TVariables,
      callbacks?: {
        onSuccess?: (data: TData, variables: TVariables) => void;
        onError?: (error: TError, variables: TVariables) => void;
        onSettled?: (
          data: TData | null,
          error: TError | null,
          variables: TVariables | null
        ) => void;
      }
    ) => {
      void mutateAsync(variables)
        .then((data) => {
          callbacks?.onSuccess?.(data, variables);
          callbacks?.onSettled?.(data, null, variables);
        })
        .catch((error: TError) => {
          callbacks?.onError?.(error, variables);
          callbacks?.onSettled?.(null, error, variables);
        });
    },
    [mutateAsync]
  );

  const reset = React.useCallback(() => {
    // 한국어 주석: reset 시 이전 요청들이 나중에 resolve되더라도
    // 상태를 덮어쓰지 않도록 id를 증가시킵니다.
    currentIdRef.current++;
    dispatch({ type: "reset" });
  }, []);

  const { status, data, error, variables, failureCount } = state;

  return {
    status,
    data,
    error,
    variables,
    failureCount,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
    mutate,
    mutateAsync,
    reset,
  };
}
