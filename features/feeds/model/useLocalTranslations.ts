"use client";

import type { SavedTranslation } from "@/shared/model/translation";
import {
  deleteTranslationFromDB,
  listTranslationsFromDB,
  saveTranslationV2ToDB,
  updateTranslationFavorite,
} from "@/shared/storage/translation-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const translationsKey = ["local-translations"] as const;

export function useLocalTranslations() {
  return useQuery<SavedTranslation[]>({
    queryKey: translationsKey,
    queryFn: listTranslationsFromDB,
    enabled: typeof window !== "undefined",
    refetchOnMount: "always",
  });
}

/**
 * v2 형식으로 번역 저장 (NLLB 코드 기반)
 */
export function useSaveTranslationV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveTranslationV2ToDB,
    onSuccess(saved) {
      queryClient.invalidateQueries({ queryKey: translationsKey });
    },
  });
}

export function useDeleteTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTranslationFromDB,
    onSuccess(_data, id) {
      queryClient.invalidateQueries({ queryKey: translationsKey });
    },
  });
}

export function useToggleFavoriteTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTranslationFavorite,
    onSuccess(updated) {
      queryClient.invalidateQueries({ queryKey: translationsKey });
    },
  });
}
