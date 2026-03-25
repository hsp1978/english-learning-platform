"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCurriculumMap, queryKeys } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/cn";
import { LockIcon, CheckIcon } from "@/components/ui/Icons";
import type { Lesson, CurriculumPhase } from "@/types";

const LESSON_TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  PHONICS: { emoji: "🔤", label: "파닉스" },
  SIGHT_WORDS: { emoji: "👁️", label: "사이트워드" },
  SENTENCES: { emoji: "🚂", label: "문장 빌더" },
  STORY: { emoji: "📖", label: "스토리" },
  CONVERSATION: { emoji: "💬", label: "AI 대화" },
};

export default function LearnPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const childId = useAuthStore((s) => s.activeChildId);
  const { data: curriculum, isLoading } = useCurriculumMap();

  // Force refresh curriculum data on page load to ensure fresh lesson lock states
  useEffect(() => {
    if (childId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.curriculumMap(childId),
      });
    }
  }, [childId, queryClient]);

  if (isLoading || !curriculum) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400 text-xl">
          커리큘럼 불러오는 중...
        </div>
      </div>
    );
  }

  const child = curriculum.child_progress;

  return (
    <div className="px-4 py-3 space-y-6">
      <h1 className="font-display text-xl text-slate-800">배우기</h1>

      {curriculum.phases.map((phase) => (
        <PhaseSection
          key={phase.id}
          phase={phase}
          lessons={curriculum.lessons.filter(
            (l) => l.month >= phase.start_month && l.month <= phase.end_month,
          )}
          currentMonth={child.current_month}
          onSelectLesson={(lesson) => {
            // Convert lesson type to URL format (SIGHT_WORDS -> sight-words, PHONICS -> phonics)
            const urlType = lesson.lesson_type.toLowerCase().replace(/_/g, '-');
            router.push(`/learn/${urlType}/${lesson.id}`);
          }}
        />
      ))}
    </div>
  );
}

function PhaseSection({
  phase,
  lessons,
  currentMonth,
  onSelectLesson,
}: {
  phase: CurriculumPhase;
  lessons: Lesson[];
  currentMonth: number;
  onSelectLesson: (lesson: Lesson) => void;
}) {
  const isActive =
    currentMonth >= phase.start_month && currentMonth <= phase.end_month;
  const isCompleted = currentMonth > phase.end_month;
  const isLocked = currentMonth < phase.start_month;

  const months = Array.from(
    new Set(lessons.map((l) => l.month)),
  ).sort((a, b) => a - b);

  return (
    <section>
      <div
        className={cn(
          "flex items-center gap-3 mb-3",
          isLocked && "opacity-40",
        )}
      >
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
            isCompleted && "bg-mint-400 text-white",
            isActive && "bg-fairy-400 text-white",
            isLocked && "bg-slate-200 text-slate-400",
          )}
        >
          {isCompleted ? <CheckIcon size={16} /> : phase.phase_number}
        </div>
        <div>
          <h2 className="font-display text-base text-slate-800">
            Phase {phase.phase_number}
          </h2>
          <p className="text-xs text-slate-400">{phase.title_ko}</p>
        </div>
      </div>

      <div className="space-y-3 mt-4 bg-surface-container-low rounded-2xl p-4">
        {months.map((month) => {
          const monthLessons = lessons
            .filter((l) => l.month === month)
            .sort((a, b) => a.order_index - b.order_index);

          return (
            <div key={month}>
              <p
                className={cn(
                  "text-xs font-medium mb-1.5",
                  month === currentMonth
                    ? "text-fairy-500"
                    : "text-slate-400",
                )}
              >
                Month {month}
              </p>
              <div className="space-y-2">
                {monthLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onSelect={onSelectLesson}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LessonCard({
  lesson,
  onSelect,
}: {
  lesson: Lesson;
  onSelect: (lesson: Lesson) => void;
}) {
  const info = LESSON_TYPE_LABELS[lesson.lesson_type] ?? {
    emoji: "📚",
    label: lesson.lesson_type,
  };

  return (
    <button
      onClick={() => !lesson.is_locked && onSelect(lesson)}
      disabled={lesson.is_locked}
      className={cn(
        "w-full bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 text-left shadow-child-ambient spring-bounce",
        lesson.is_locked && "opacity-40 cursor-not-allowed shadow-none",
        lesson.is_completed && "ring-2 ring-mint-400",
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-magic-50 flex items-center justify-center text-lg shrink-0">
        {lesson.is_locked ? (
          <LockIcon size={18} className="text-slate-400" />
        ) : (
          info.emoji
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm text-slate-800 truncate">
          {lesson.title_ko}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {info.label} · {lesson.title}
        </p>
      </div>
      <div className="shrink-0">
        {lesson.is_completed ? (
          <div className="w-6 h-6 rounded-full bg-mint-400 flex items-center justify-center">
            <CheckIcon size={14} className="text-white" />
          </div>
        ) : !lesson.is_locked ? (
          <span className="text-xs text-fairy-400 font-medium">
            +{lesson.xp_reward}
          </span>
        ) : null}
      </div>
    </button>
  );
}
