// entries/library/LibraryEntry — Server Component (entries layer)
// 역할: 보관함/기록 화면의 페이지 조립(상단/본문/하단 셸). 상호작용은 features/* 에서 담당.

import TopAppBar from "@/features/shell/ui/TopAppBar";
import BottomNav from "@/features/shell/ui/BottomNav";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

export default function LibraryEntry() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
      <TopAppBar title="보관함" />
      <main className="max-w-screen-sm mx-auto w-full px-6 py-6 flex flex-col gap-4">
        <section className="prose dark:prose-invert max-w-none">
          <h1 className="text-xl font-semibold">보관함</h1>
          <p className="opacity-80 text-sm">최근 번역 결과, 즐겨찾기, 내보내기 이력을 확인합니다.</p>
        </section>

        {/* TODO: Masonry/columns 폴백을 쓰는 카드 그리드 컴포넌트(features/cards/ui/…)를 연결합니다. */}
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))] gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="gap-2">
                <h3 className="text-base font-semibold">번역 #{i}</h3>
                <p className="text-sm text-foreground/70 line-clamp-2">
                  예시 결과 텍스트가 이곳에 표시됩니다. 실제 데이터 연동은 features 레이어에서 진행합니다.
                </p>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" disabled>
                    복사
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
