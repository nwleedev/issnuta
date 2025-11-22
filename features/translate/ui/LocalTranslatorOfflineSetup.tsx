"use client";

import OfflineSetup from "@/features/offline/ui/OfflineSetup";

export type LocalTranslatorOfflineSetupProps = {
  modelId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

export default function LocalTranslatorOfflineSetup({
  modelId,
  open,
  onClose,
  onDone,
}: LocalTranslatorOfflineSetupProps) {
  return (
    <OfflineSetup
      modelId={modelId}
      open={open}
      onClose={() => onClose()}
      onDone={onDone}
    />
  );
}

