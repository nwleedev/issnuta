"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { SavedTranslation } from "@/shared/model/translation";
import {
  deleteTranslationFromDB,
  saveTranslationToDB,
  listTranslationsFromDB,
  updateTranslationFavorite,
} from "@/shared/storage/translation-store";

const translationsKey = ["local-translations"] as const;

export function useLocalTranslations() {
  return useQuery<SavedTranslation[]>({
    queryKey: translationsKey,
    queryFn: listTranslationsFromDB,
    enabled: typeof window !== "undefined",
  });
}

export function useSaveTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveTranslationToDB,
    onSuccess(saved) {
      queryClient.setQueryData<SavedTranslation[] | undefined>(
        translationsKey,
        (prev) => {
          if (!prev || prev.length === 0) {
            return [saved];
          }
          // 최신 항목을 앞에 추가합니다.
          return [saved, ...prev];
        }
      );
    },
  });
}

export function useDeleteTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTranslationFromDB,
    onSuccess(_data, id) {
      queryClient.setQueryData<SavedTranslation[] | undefined>(
        translationsKey,
        (prev) => {
          if (!prev) return prev;
          return prev.filter((item) => item.id !== id);
        }
      );
    },
  });
}

export function useToggleFavoriteTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTranslationFavorite,
    onSuccess(updated) {
      if (!updated) return;
      queryClient.setQueryData<SavedTranslation[] | undefined>(
        translationsKey,
        (prev) => {
          if (!prev) return prev;
          return prev.map((item) =>
            item.id === updated.id ? updated : item
          );
        }
      );
    },
  });
}

