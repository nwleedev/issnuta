"use client";

import type { ReactNode } from "react";

import { useIsClient } from "@/shared/lib/is-client";
import { useServiceWorkerUpdate } from "@/shared/lib/use-service-worker-update";
import { UpdatePrompt } from "@/shared/ui/update-prompt";

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

function ServiceWorkerUpdatePrompt() {
  const { hasUpdate, isUpdating, applyUpdate, dismissUpdate } =
    useServiceWorkerUpdate();

  return (
    <UpdatePrompt
      open={hasUpdate}
      onUpdate={applyUpdate}
      onDismiss={dismissUpdate}
      isUpdating={isUpdating}
    />
  );
}

export function ServiceWorkerProvider({
  children,
}: ServiceWorkerProviderProps) {
  const isClient = useIsClient();

  return (
    <>
      {children}
      {isClient && <ServiceWorkerUpdatePrompt />}
    </>
  );
}
