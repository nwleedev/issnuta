import TranslatorLoader from "@/entries/ui/TranslatorLoader";
import OfflinePrefetchButton from "@/features/offline/ui/OfflinePrefetchButton";
import TopAppBar from "@/features/shell/ui/TopAppBar";

export default function Page() {
  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] items-stretch min-h-[100dvh] bg-[#fafaf7]">
      <TopAppBar title="Issnuta" />
      <main className="flex w-full max-w-screen-sm mx-auto flex-col gap-5 px-5 py-5">
        <div className="flex flex-col gap-2">
          <div className="flex gap-x-2 items-center">
            <OfflinePrefetchButton className="mb-1" />
          </div>
        </div>

        <TranslatorLoader />
      </main>
    </div>
  );
}
