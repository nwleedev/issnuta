// entries/settings/SettingsEntry — Server Component (entries layer)
// 역할: 설정 화면의 페이지 조립(상단/본문/하단 셸). 상호작용은 features/* 에서 담당.

import TopAppBar from "@/features/shell/ui/TopAppBar";
import BottomNav from "@/features/shell/ui/BottomNav";
import OptionsForm from "@/features/settings/ui/OptionsForm";

export default function SettingsEntry() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
      <TopAppBar title="설정" />
      <main className="max-w-screen-sm mx-auto w-full px-6 py-6 flex flex-col gap-4">
        <section className="prose dark:prose-invert max-w-none">
          <h1 className="text-xl font-semibold">설정</h1>
          <p className="opacity-80 text-sm">
            번역 모드, 언어 기본값, 오프라인 모델 캐시 관리 등의 옵션을 구성합니다.
          </p>
        </section>
        <OptionsForm onSubmit={async (v) => {
          // TODO: 저장 로직(로컬/서버) 연결
          console.log("settings.save", v);
        }} />
      </main>
      <BottomNav />
    </div>
  );
}
