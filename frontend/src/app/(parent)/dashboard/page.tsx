"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useWeeklyReport } from "@/hooks/useApi";
import { ChevronLeftIcon } from "@/components/ui/Icons";

export default function DashboardPage() {
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);
  const children = useAuthStore((s) => s.children);
  const { data: report, isLoading, isError } = useWeeklyReport(childId ?? "");

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      {/* Header - Glassmorphic Navigation (Parent Theme) */}
      <header className="sticky top-0 z-50 bg-surface/60 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-6 py-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-on-surface-variant hover:text-on-surface transition-colors">
            <ChevronLeftIcon size={24} />
          </button>
          <h1 className="font-display text-title-lg font-semibold text-on-surface">
            학부모 대시보드
          </h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {!childId && (
          <div className="text-center py-16">
            <div className="bg-surface-container-low rounded-xl p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <p className="text-on-surface-variant mb-6 font-medium">자녀 프로필을 선택해주세요.</p>
              <button
                onClick={() => router.push("/login")}
                className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-xl font-display font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              >
                로그인하기
              </button>
            </div>
          </div>
        )}

        {childId && isLoading && (
          <div className="text-center py-16">
            <div className="animate-pulse text-on-surface-variant font-medium">
              리포트 불러오는 중...
            </div>
          </div>
        )}

        {childId && isError && (
          <div className="text-center py-16">
            <div className="bg-surface-container-low rounded-xl p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <p className="text-primary mb-6 font-semibold">리포트를 불러오는데 실패했습니다.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-secondary-container text-on-secondary-container px-6 py-3 rounded-xl font-display font-semibold hover:bg-secondary-container/80 transition-all"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {report && (
          <>
            {/* Child info */}
            <section>
              <h2 className="font-display text-label-md font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                학습자 정보
              </h2>
              <div className="bg-surface-container backdrop-blur-xl rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="font-display text-title-lg font-semibold text-on-surface">
                  {report.child.nickname}
                </p>
                <p className="text-body-lg text-on-surface-variant mt-1">
                  Level {report.child.level} · Phase {report.child.current_phase} · Month{" "}
                  {report.child.current_month}
                </p>
              </div>
            </section>

            {/* Weekly summary */}
            <section>
              <h2 className="font-display text-label-md font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                주간 요약 ({report.period_start} ~ {report.period_end})
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="연속 학습"
                  value={`${report.streak_days}일`}
                />
                <StatCard
                  label="새로 배운 단어"
                  value={`${report.new_words_learned}개`}
                />
                <StatCard
                  label="수집 캐릭터"
                  value={`${report.characters_collected}종`}
                />
                <StatCard
                  label="발음 평균"
                  value={`${Math.round(report.pronunciation_avg_score)}점`}
                />
              </div>
            </section>

            {/* Accuracy by type */}
            <section>
              <h2 className="font-display text-label-md font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                영역별 정확도
              </h2>
              <div className="bg-surface-container backdrop-blur-xl rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <AccuracyBar
                  label="파닉스"
                  value={report.phonics_accuracy}
                  color="bg-primary"
                />
                <AccuracyBar
                  label="사이트워드"
                  value={report.sight_word_accuracy}
                  color="bg-tertiary"
                />
                <AccuracyBar
                  label="문장 조립"
                  value={report.sentence_accuracy}
                  color="bg-secondary"
                />
              </div>
            </section>

            {/* Daily stats */}
            <section>
              <h2 className="font-display text-label-md font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                일별 학습 시간
              </h2>
              <div className="bg-surface-container backdrop-blur-xl rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-end gap-2 h-32">
                  {report.daily_stats.map((stat) => {
                    const maxTime = Math.max(
                      ...report.daily_stats.map((s) => s.total_time_seconds),
                      1,
                    );
                    const height = (stat.total_time_seconds / maxTime) * 100;
                    const dayLabel = stat.date.slice(5);

                    return (
                      <div
                        key={stat.date}
                        className="flex-1 flex flex-col items-center gap-2"
                      >
                        <div
                          className="w-full bg-primary rounded-md transition-all hover:bg-primary/80"
                          style={{ height: `${Math.max(height, 8)}%` }}
                        />
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          {dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* AI Analysis */}
            {report.llm_analysis && (
              <section>
                <h2 className="font-display text-label-md font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  AI 분석 코멘트
                </h2>
                <div className="bg-tertiary-container/30 backdrop-blur-xl rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <p className="text-body-lg text-on-surface leading-relaxed">
                    {report.llm_analysis}
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container backdrop-blur-xl rounded-xl p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <p className="font-display text-headline-md font-bold text-on-surface">{value}</p>
      <p className="text-label-md text-on-surface-variant mt-1 font-medium">{label}</p>
    </div>
  );
}

function AccuracyBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const percent = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-body-lg text-on-surface font-medium">{label}</span>
        <span className="font-display text-body-lg font-bold text-on-surface">{percent}%</span>
      </div>
      <div className="w-full h-3 bg-surface-container-high rounded-md overflow-hidden">
        <div
          className={`h-full rounded-md transition-all duration-700 ease-out ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
