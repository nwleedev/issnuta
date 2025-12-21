"use client";

import { DbMigrationProvider } from "@/entries/providers/DbMigrationProvider";
import { ServiceWorkerProvider } from "@/entries/providers/ServiceWorkerProvider";
import { getQueryClient } from "@/shared/lib/query/client";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      <DbMigrationProvider>
        <ServiceWorkerProvider>{children}</ServiceWorkerProvider>
      </DbMigrationProvider>
    </QueryClientProvider>
  );
}
