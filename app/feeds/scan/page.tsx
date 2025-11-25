"use client";

import dynamic from "next/dynamic";

const FeedQrScannerEntry = dynamic(
  () =>
    import("@/entries/feeds/FeedQrScannerEntry").then(
      (mod) => mod.default
    ),
  {
    ssr: false,
  }
);

export default function FeedQrScanPage() {
  return <FeedQrScannerEntry />;
}

