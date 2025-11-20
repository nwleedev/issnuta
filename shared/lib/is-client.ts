import { useSyncExternalStore } from "react";

// No-op subscribe since the value only changes once on mount
const subscribe = () => () => {};

// Client snapshot: true when window exists
const getSnapshot = () => typeof window !== "undefined";

// Server snapshot: always false during SSR
const getServerSnapshot = () => false;

/** Returns true when rendering on the client (browser). */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Convenience helper that returns "client" | "server". */
export function useEnvironment(): "client" | "server" {
  return useIsClient() ? "client" : "server";
}

