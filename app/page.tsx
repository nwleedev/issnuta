import UniversalTranslatorLoader from "@/entries/ui/UniversalTranslatorLoader";
import OfflinePrefetchButton from "@/features/offline/ui/OfflinePrefetchButton";
import TopAppBar from "@/features/shell/ui/TopAppBar";

export default function Page() {
  return (
    <main className="flex flex-col flex-[1_1_0] px-4 items-center bg-[#fafaf7]">
      <div className="w-full shrink-0 sticky top-0 z-10 flex max-w-screen-sm flex-col font-sans">
        <TopAppBar title="Issnuta" />
      </div>
      <div className="w-full flex flex-[1_1_0] max-w-screen-sm flex-col font-sans">
        <section className="flex flex-1 flex-col gap-5 px-5 py-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-x-2">
              <OfflinePrefetchButton className="mb-1" />
            </div>
          </div>

          <UniversalTranslatorLoader />
        </section>
      </div>
    </main>
  );
}
