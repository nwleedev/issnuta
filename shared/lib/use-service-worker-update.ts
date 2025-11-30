"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * @see https://developer.chrome.com/docs/workbox/handling-service-worker-updates
 * @see https://felixgerschau.com/create-a-pwa-update-notification-with-create-react-app/
 *
 * @example
 * ```tsx
 * const { hasUpdate, isUpdating, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();
 *
 * if (hasUpdate) {
 *   return <button onClick={applyUpdate}>업데이트</button>;
 * }
 * ```
 */
export function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let ignore = false;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;
    let stateChangeHandler: (() => void) | null = null;

    const handleControllerChange = () => {
      window.location.reload();
    };

    const handleUpdateFound = () => {
      // 이전 installingWorker의 리스너 정리
      if (installingWorker && stateChangeHandler) {
        installingWorker.removeEventListener("statechange", stateChangeHandler);
      }

      const newWorker = registration?.installing;
      if (!newWorker) return;

      installingWorker = newWorker;

      stateChangeHandler = () => {
        if (ignore) return;
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          setWaitingWorker(newWorker);
          setIsDismissed(false);
        }
      };

      newWorker.addEventListener("statechange", stateChangeHandler);
    };

    async function setup() {
      try {
        registration = await navigator.serviceWorker.ready;

        if (ignore) return;

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", handleUpdateFound);
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          handleControllerChange,
          { once: true }
        );
      } catch (error) {
        console.error("[useServiceWorkerUpdate] Setup error:", error);
      }
    }

    setup();

    const checkInterval = setInterval(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
      } catch {}
    }, 5 * 60 * 1000);

    return () => {
      ignore = true;
      clearInterval(checkInterval);
      registration?.removeEventListener("updatefound", handleUpdateFound);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
      if (installingWorker && stateChangeHandler) {
        installingWorker.removeEventListener("statechange", stateChangeHandler);
      }
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker || isUpdating) return;

    setIsUpdating(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker, isUpdating]);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
  }, []);

  return {
    hasUpdate: !!waitingWorker && !isDismissed,
    isUpdating,
    applyUpdate,
    dismissUpdate,
  };
}
