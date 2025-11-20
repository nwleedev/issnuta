// entries/phrasebook/PhrasebookEntry — Server Component (entries layer)
// 역할: 프레이즈북 화면의 페이지 조립(상단/본문/하단 셸). 상호작용은 features/* 에서 담당.

import TopAppBar from "@/features/shell/ui/TopAppBar";
import BottomNav from "@/features/shell/ui/BottomNav";
import BottomSheet from "@/features/sheet/ui/BottomSheet";
import PhraseForm from "@/features/phrasebook/ui/PhraseForm";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

export default function PhrasebookEntry() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
      <TopAppBar title="프레이즈북" />
      <main className="max-w-screen-sm mx-auto w-full px-6 py-6 flex flex-col gap-4">
        <section className="prose dark:prose-invert max-w-none">
          <h1 className="text-xl font-semibold">프레이즈북</h1>
          <p className="opacity-80 text-sm">여행/일상에서 자주 쓰는 문장을 모아두고 오프라인에서도 확인할 수 있습니다.</p>
        </section>

        {/* TODO: features/phrasebook/ui/PhraseList.tsx, PhraseForm.tsx 생성 후 조립 */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="gap-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">예시 카테고리</span>
              <BottomSheet
                title="프레이즈 추가"
                trigger={<Button size="sm">추가</Button>}
              >
                <PhraseForm onSubmit={async (v) => {
                  // TODO: features 레이어에서 IndexedDB/서버로 저장 로직 연결
                  // 현재는 콘솔 출력으로 대체
                  console.log("phrase.save", v);
                }} />
              </BottomSheet>
            </div>
            <ul className="grid gap-2">
              <li className="grid grid-cols-[1fr_auto] items-center px-3 py-2 rounded-lg bg-muted">
                <span>안녕하세요 — こんにちは</span>
                <Button variant="ghost" size="sm" disabled>
                  복사
                </Button>
              </li>
              <li className="grid grid-cols-[1fr_auto] items-center px-3 py-2 rounded-lg bg-muted">
                <span>감사합니다 — ありがとうございます</span>
                <Button variant="ghost" size="sm" disabled>
                  복사
                </Button>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
