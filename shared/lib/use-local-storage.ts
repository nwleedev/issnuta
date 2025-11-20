import type { UseBrowserStorageOptions } from "./use-browser-storage";
import { useBrowserStorage } from "./use-browser-storage";

export type UseLocalStorageOptions<T> = Omit<
  UseBrowserStorageOptions<T>,
  "storage"
>;

export function useLocalStorage<T>(
  options: UseLocalStorageOptions<T>
): [T, (value: T) => void, () => void] {
  const isBrowser = typeof window !== "undefined";

  return useBrowserStorage<T>({
    ...options,
    storage: isBrowser ? window.localStorage : null,
  });
}
