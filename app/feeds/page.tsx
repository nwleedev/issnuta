"use client";

import TopAppBar from "@/features/shell/ui/TopAppBar";
import { Button } from "@/shared/ui/button";
import { QrCode, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

const FeedsEntry = dynamic(
  () => import("@/entries/feeds/FeedsEntry").then((mod) => mod.default),
  {
    ssr: false,
  }
);

export default function FeedsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [isQrMenuOpen, setIsQrMenuOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-[#fafaf7]">
      <div className="mx-auto flex min-h-dvh max-w-screen-sm flex-col">
        <TopAppBar
          title="Feeds"
          subtitle="Saved translations"
          trailing={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="QR code actions"
              onClick={() => setIsQrMenuOpen(true)}
            >
              <QrCode className="h-5 w-5 text-[var(--text-primary)]" />
            </Button>
          }
        />

        {/* Search & Filter */}
        <div className="shrink-0 px-5 pb-4 pt-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-[#9a9a8f]" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search translations..."
              className="w-full h-11 pl-11 pr-11 bg-white border border-[#e8e8e0] rounded-xl text-[#2d2d28] placeholder:text-[#9a9a8f] focus:outline-none focus:border-[#5a4a3a] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9a9a8f] hover:text-[#5a4a3a] transition-colors"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex-1 h-9 rounded-xl text-sm transition-all ${
                filter === "all"
                  ? "bg-[#5a4a3a] text-[#fafaf7]"
                  : "bg-white text-[#6b6b60] hover:bg-[#f5f5f0] border border-[#e8e8e0]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("favorites")}
              className={`flex-1 h-9 rounded-xl text-sm transition-all ${
                filter === "favorites"
                  ? "bg-[#5a4a3a] text-[#fafaf7]"
                  : "bg-white text-[#6b6b60] hover:bg-[#f5f5f0] border border-[#e8e8e0]"
              }`}
            >
              Favorites
            </button>
          </div>
        </div>

        {/* List */}
        <FeedsEntry
          search={search}
          filter={filter}
          isQrMenuOpen={isQrMenuOpen}
          onQrMenuOpenChange={setIsQrMenuOpen}
        />
      </div>
    </main>
  );
}
