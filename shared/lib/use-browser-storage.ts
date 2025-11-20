import { useCallback, useSyncExternalStore } from "react";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface UseBrowserStorageOptions<T> {
  storage: StorageLike | null;
  key: string;
  initialValue: T;
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

// 한국어 주석: 외부 스토어 패턴을 위해, 키별 리스너 집합을 유지합니다.
const storageListeners = new Map<string, Set<() => void>>();

function getListenersForKey(key: string): Set<() => void> {
  let set = storageListeners.get(key);
  if (!set) {
    set = new Set();
    storageListeners.set(key, set);
  }
  return set;
}

export function useBrowserStorage<T>(
  options: UseBrowserStorageOptions<T>
): [T, (value: T) => void, () => void] {
  const { storage, key, initialValue } = options;
  const serialize = options.serialize ?? JSON.stringify;
  const deserialize =
    options.deserialize ?? ((raw: string) => JSON.parse(raw) as T);

  const isBrowser = typeof window !== "undefined" && !!storage;

  const getSnapshot = useCallback((): T => {
    if (!isBrowser || !storage) return initialValue;
    try {
      const raw = storage.getItem(key);
      if (raw == null) return initialValue;
      return deserialize(raw);
    } catch {
      // 파싱 실패 시 초기값으로 되돌립니다.
      return initialValue;
    }
  }, [deserialize, initialValue, isBrowser, key, storage]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const listeners = getListenersForKey(key);
      listeners.add(callback);

      if (isBrowser) {
        const handler = (e: StorageEvent) => {
          if (e.storageArea === storage && e.key === key) {
            listeners.forEach((listener) => listener());
          }
        };
        window.addEventListener("storage", handler);
        return () => {
          listeners.delete(callback);
          window.removeEventListener("storage", handler);
        };
      }

      return () => {
        listeners.delete(callback);
      };
    },
    [isBrowser, key, storage]
  );

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialValue
  );

  const setValue = useCallback(
    (next: T) => {
      if (!isBrowser || !storage) return;
      try {
        const raw = serialize(next);
        storage.setItem(key, raw);
        const listeners = getListenersForKey(key);
        listeners.forEach((listener) => listener());
      } catch (error) {
        console.error("useBrowserStorage: write error", error);
      }
    },
    [isBrowser, key, serialize, storage]
  );

  const clearValue = useCallback(() => {
    if (!isBrowser || !storage) return;
    try {
      storage.removeItem(key);
      const listeners = getListenersForKey(key);
      listeners.forEach((listener) => listener());
    } catch (error) {
      console.error("useBrowserStorage: remove error", error);
    }
  }, [isBrowser, key, storage]);

  return [value, setValue, clearValue];
}
