import TranslatorLoader from "@/entries/ui/TranslatorLoader";
import OfflinePrefetchButton from "@/features/offline/ui/OfflinePrefetchButton";
import TopAppBar from "@/features/shell/ui/TopAppBar";

export default function Page() {
  return (
    <main className="min-h-dvh bg-[#fafaf7]">
      <div className="mx-auto flex min-h-dvh max-w-screen-sm flex-col font-sans">
        <TopAppBar title="Issnuta" />
        <section className="flex flex-1 flex-col gap-5 px-5 py-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-x-2">
              <OfflinePrefetchButton className="mb-1" />
            </div>
          </div>

          <TranslatorLoader />
        </section>
      </div>
    </main>
  );
}
