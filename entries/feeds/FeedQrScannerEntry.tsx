"use client";

import { useRouter } from "next/navigation";

import { FeedQrScanner } from "@/features/feeds/ui/FeedQrScanner";

export default function FeedQrScannerEntry() {
  const router = useRouter();

  const handleClose = () => {
    router.push("/feeds");
  };

  return (
    <FeedQrScanner
      onClose={handleClose}
      onImported={handleClose}
    />
  );
}

