"use client";

import { migrateV1ToV2 } from "@/shared/storage/issnuta-db";
import { useEffect, type ReactNode } from "react";

type DbMigrationProviderProps = {
  children: ReactNode;
};

/**
 * IndexedDB 데이터 마이그레이션 Provider.
 *
 * - 앱 초기화 시 v1 → v2 마이그레이션 자동 실행
 * - 마이그레이션은 한 번만 실행됨 (localStorage 플래그로 추적)
 * - 마이그레이션 완료 후에도 앱 렌더링 차단 없음 (비동기)
 */
export function DbMigrationProvider({ children }: DbMigrationProviderProps) {
  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window === "undefined") return;

    migrateV1ToV2().catch((err) => {
      // 마이그레이션 실패 시 콘솔에만 로그 (앱 크래시 방지)
      console.error("[DbMigrationProvider] v1→v2 마이그레이션 실패:", err);
    });
  }, []);

  return <>{children}</>;
}
