/**
 * Translation Query/Mutation Key Factory
 *
 * - TanStack Query v5 키 팩토리 패턴 (registry/tanstack-query-pattern.md §5)
 * - 번역 Mutation 키 정의
 *
 * NOTE:
 * - 모델 로딩은 useMutation 사용 (명시적 트리거 필요)
 * - 번역 기록은 IndexedDB + useLocalTranslations 패턴으로 관리
 * - 이 파일은 주로 Mutation Key와 invalidation용 Query Key 정의
 */

/**
 * 번역 관련 Query/Mutation Key 팩토리
 *
 * @example
 * ```ts
 * // 번역 Mutation 상태 조회
 * useMutationState({
 *   filters: { mutationKey: translationKeys.mutation() }
 * });
 *
 * // 특정 언어쌍 번역 Mutation
 * useMutation({
 *   mutationKey: translationKeys.mutationByPair('kor_Hang', 'jpn_Jpan'),
 *   mutationFn: ...
 * });
 *
 * // 저장된 번역 목록 무효화
 * queryClient.invalidateQueries({ queryKey: translationKeys.saved() });
 * ```
 */
export const translationKeys = {
  /** 모든 번역 관련 키의 기본 접두사 */
  all: () => ["translation"] as const,

  /** 저장된 번역 목록 (IndexedDB 기반 useLocalTranslations용) */
  saved: () => [...translationKeys.all(), "saved"] as const,

  /** 번역 Mutation 키 (전체) */
  mutation: () => [...translationKeys.all(), "mutation"] as const,

  /** 특정 언어쌍 번역 Mutation 키 */
  mutationByPair: (src: string, tgt: string) =>
    [...translationKeys.mutation(), { src, tgt }] as const,
} as const;

/** Query Key 타입 유틸리티 */
export type TranslationKeyAll = ReturnType<typeof translationKeys.all>;
export type TranslationKeySaved = ReturnType<typeof translationKeys.saved>;
export type TranslationKeyMutation = ReturnType<typeof translationKeys.mutation>;
export type TranslationKeyMutationPair = ReturnType<
  typeof translationKeys.mutationByPair
>;
