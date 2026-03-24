"use client";

import { useRouter } from "next/navigation";
import { useConversationScenarios } from "@/hooks/useApi";

export default function TalkPage() {
  const router = useRouter();
  const { data: scenarios, isLoading } = useConversationScenarios();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          시나리오 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-4 bg-surface text-on-surface min-h-[calc(100vh-8rem)]">
      <h1 className="font-display text-xl text-slate-800">요정과 대화하기</h1>
      <p className="text-sm text-slate-400">
        요정 친구를 골라 영어로 이야기해 보세요!
      </p>

      <div className="space-y-3">
        {(scenarios ?? []).map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => router.push(`/talk/${scenario.id}`)}
            className="w-full bg-surface-container-lowest rounded-xl p-4 flex items-center gap-4 text-left shadow-child-ambient border-none spring-bounce transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl bg-magic-100 flex items-center justify-center text-2xl shrink-0">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base text-slate-800">
                {scenario.title_ko}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {scenario.character_name} · {scenario.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {(!scenarios || scenarios.length === 0) && (
        <div className="text-center py-12 text-slate-400 text-sm">
          아직 열린 시나리오가 없어요.
          <br />
          학습을 진행하면 새로운 대화가 열려요!
        </div>
      )}
    </div>
  );
}
