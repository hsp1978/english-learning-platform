"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useCurriculumMap } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useAudio } from "@/hooks/useAudio";
import { cn } from "@/lib/cn";
import FairyCharacter from "@/components/FairyCharacter";

export default function HomePage() {
  const router = useRouter();
  const { level } = useGameStore();
  const { playSfx } = useAudio();

  const { data: curriculum, isLoading } = useCurriculumMap();

  const handleMissionClick = useCallback((lessonType: string, lessonId: string) => {
    playSfx("click");
    setTimeout(() => {
      const urlType = lessonType.toLowerCase().replace(/_/g, '-');
      router.push(`/learn/${urlType}/${lessonId}`);
    }, 200);
  }, [playSfx, router]);

  if (isLoading || !curriculum) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-4xl">
          ✨
        </motion.div>
        <span className="font-display text-primary text-lg">
          요정이 준비하고 있어요...
        </span>
      </div>
    );
  }

  const child = curriculum.child_progress;
  const currentLessons = curriculum.lessons.filter((l) => l.month === child.current_month && !l.is_locked);
  const completedCount = currentLessons.filter((l) => l.is_completed).length;
  const totalCount = currentLessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = currentLessons.find((l) => !l.is_completed);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 space-y-10 relative">
      {/* 요정 캐릭터 - 왼쪽 상단 고정 */}
      <div className="fixed top-20 left-6 z-50 hidden md:block">
        <FairyCharacter
          mood={nextLesson ? "encouraging" : "happy"}
          message={nextLesson ? `${child?.nickname || "친구"}야, 오늘도 함께 공부하자!` : "잘 하고 있어요!"}
          size="lg"
          showMessage={true}
        />
      </div>

      {/* 모바일용 요정 - 상단에 작게 */}
      <div className="md:hidden flex justify-center mb-4">
        <FairyCharacter
          mood="happy"
          size="md"
        />
      </div>

      {/* Today's Mission (Hero Section) - Design System: Gradient + rounded-3xl */}
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-child-ambient">
        {/* Hero gradient background - Design System Section 2: Glass & Gradient Rule */}
        <div className="absolute inset-0 bg-hero-texture opacity-95 rounded-3xl" />

        <div className="flex-1 space-y-6 z-10 relative">
          <span className="bg-white/20 text-white px-4 py-1.5 rounded-full font-headline font-bold text-label-md backdrop-blur-sm">
            Level {level} Explorer
          </span>
          {/* Typography: display-lg - Design System Section 3 */}
          <h2 className="text-display-lg font-headline font-black text-white leading-tight drop-shadow-lg">
            {child?.nickname ? `${child.nickname}야,` : "요정 친구야,"}<br />다시 만나서 반가워!
          </h2>
          {/* Body text with proper hierarchy */}
          <p className="text-body-lg text-white/90 font-body font-medium max-w-md drop-shadow-md">
            오늘도 신나는 이야기와 예쁜 스티커를 모을 준비됐나요? ✨
          </p>
          {nextLesson && (
            <button
              onClick={() => handleMissionClick(nextLesson.lesson_type, nextLesson.id)}
              className="btn-primary-child flex items-center gap-3 bg-white text-primary hover:scale-105"
            >
              <span className="material-symbols-outlined fill-icon text-2xl">play_circle</span>
              오늘의 모험 시작하기
            </button>
          )}
        </div>
        <div className="relative w-full md:w-1/2 h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl z-10">
          <img alt="Magical forest illustration" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAadg4hihepzQdfBeqrtLxBEwALDpSfqdsDLCg9D0jJyjpAQ3_RG1p-Cmj3Qeh0favQdZEgz9QeoK0trTVkyc3M3Gl-RfUxsPDo3iC_MwkazWugAV2kRZ1Oo2h5jhp-LBvdhlNuYVp0GqlH_9Zrj5RLmZyBjH0Ndw5wHZR0Ho3cgDtJEhQ6FZVelOu2FqN_OEm0uh6Wl3aJnPqPsq4uVjI8E4g-gxSQ0VOlvIqEZhsFH5-X4qufm1DXbBF2Q2pG0Avp8n2_jdpjPd94" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>
      </section>

      {/* Daily Streak Card */}
      <section className="card-child bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 relative overflow-hidden">
        {/* Fire emoji background pattern */}
        <div className="absolute top-0 right-0 text-8xl opacity-10 -rotate-12">
          🔥
        </div>
        <div className="absolute bottom-0 left-0 text-6xl opacity-10 rotate-12">
          🔥
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <span className="text-4xl">🔥</span>
            </motion.div>
            <div>
              <h3 className="text-title-lg font-headline font-black text-on-surface">
                연속 학습 기록
              </h3>
              <p className="text-label-md text-on-surface-variant">
                매일 공부하면 불이 꺼지지 않아요!
              </p>
            </div>
          </div>

          <div className="text-center">
            <motion.div
              key={child.streak_days}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"
            >
              {child.streak_days}
            </motion.div>
            <span className="text-label-sm text-on-surface-variant font-bold">
              일 연속
            </span>
          </div>
        </div>

        {/* Streak milestones */}
        {child.streak_days > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-container-high">
            <div className="flex gap-2">
              {[1, 3, 7, 14, 30].map((milestone) => (
                <div
                  key={milestone}
                  className={cn(
                    "flex-1 h-2 rounded-full transition-all",
                    child.streak_days >= milestone
                      ? "bg-gradient-to-r from-orange-400 to-red-500"
                      : "bg-surface-container-high"
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {[1, 3, 7, 14, 30].map((milestone) => (
                <span
                  key={milestone}
                  className={cn(
                    "text-[10px] font-bold",
                    child.streak_days >= milestone
                      ? "text-orange-500"
                      : "text-on-surface-variant"
                  )}
                >
                  {milestone}일
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 오늘의 미션 (Today's Mission Checklist) */}
      <section className="card-child bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl">⭐</span>
          </div>
          <div>
            <h3 className="text-title-lg font-headline font-black text-on-surface">
              오늘의 미션
            </h3>
            <p className="text-label-md text-on-surface-variant">
              3가지를 완료하면 특별 선물! 🎁
            </p>
          </div>
        </div>

        {/* Mission Checklist */}
        <div className="space-y-3">
          {/* Mission 1: Next Lesson */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => nextLesson && handleMissionClick(nextLesson.lesson_type, nextLesson.id)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer",
              nextLesson
                ? "bg-white shadow-md hover:shadow-lg"
                : "bg-white/50 cursor-not-allowed opacity-60"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              nextLesson
                ? "bg-primary text-white ring-4 ring-primary/20"
                : "bg-surface-container-high text-on-surface-variant"
            )}>
              {nextLesson ? <span className="material-symbols-outlined text-lg">circle</span> : <span className="text-xl">✓</span>}
            </div>
            <div className="flex-1">
              <p className="font-kids font-bold text-on-surface">
                {nextLesson ? nextLesson.title_ko : "다음 레슨 완료"}
              </p>
              <p className="text-xs text-on-surface-variant">
                {nextLesson ? "지금 시작하기" : "모두 완료했어요!"}
              </p>
            </div>
            {nextLesson && (
              <span className="material-symbols-outlined text-primary">arrow_forward</span>
            )}
          </motion.div>

          {/* Mission 2: Read Story */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSfx("click"); router.push("/stories"); }}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center ring-4 ring-secondary/20">
              <span className="material-symbols-outlined text-lg">circle</span>
            </div>
            <div className="flex-1">
              <p className="font-kids font-bold text-on-surface">
                스토리 1개 읽기 📚
              </p>
              <p className="text-xs text-on-surface-variant">
                재미있는 이야기를 읽어요
              </p>
            </div>
            <span className="material-symbols-outlined text-secondary">arrow_forward</span>
          </motion.div>

          {/* Mission 3: Collect Sticker */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSfx("click"); router.push("/collect"); }}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="w-8 h-8 bg-tertiary text-white rounded-full flex items-center justify-center ring-4 ring-tertiary/20">
              <span className="material-symbols-outlined text-lg">circle</span>
            </div>
            <div className="flex-1">
              <p className="font-kids font-bold text-on-surface">
                스티커 확인하기 ✨
              </p>
              <p className="text-xs text-on-surface-variant">
                모은 스티커를 구경해요
              </p>
            </div>
            <span className="material-symbols-outlined text-tertiary">arrow_forward</span>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions List */}
      <section className="flex flex-wrap gap-4 justify-between">
        <button onClick={() => { playSfx("click"); router.push("/stories"); }} className="flex-1 min-w-[120px] aspect-square bg-primary-container/40 hover:bg-primary-container/60 text-on-primary-container rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">book</span>
          <span className="font-kids font-bold text-sm">책 읽기</span>
        </button>
        <button onClick={() => { playSfx("click"); router.push("/learn"); }} className="flex-1 min-w-[120px] aspect-square bg-secondary-container text-on-secondary-container rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">videogame_asset</span>
          <span className="font-kids font-bold text-sm">게임</span>
        </button>
        <button onClick={() => { playSfx("click"); router.push("/collect"); }} className="flex-1 min-w-[120px] aspect-square bg-tertiary-container text-on-tertiary-container rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">stars</span>
          <span className="font-kids font-bold text-sm">내 컬렉션</span>
        </button>
        <button className="flex-1 min-w-[120px] aspect-square bg-surface-container-high text-on-surface-variant rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce opacity-50">
          <span className="material-symbols-outlined text-3xl fill-icon">music_note</span>
          <span className="font-kids font-bold text-sm">곧 열려요</span>
        </button>
      </section>

      {/* Progress Card - Design System: card-child, NO borders */}
      <section className="card-child">
        {/* NO divider - use spacing-6 gap (Design System Rule 5) */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-headline-md text-on-surface">나의 여정</h3>
            <p className="text-on-surface-variant font-body text-sm mt-1">
              다음 단계까지 {totalCount - completedCount}개 레슨 남았어요!
            </p>
          </div>
          <span className="text-tertiary font-headline font-black text-3xl">{progressPercent}%</span>
        </div>
        {/* Progress bar using design system classes */}
        <div className="progress-bar-child">
          <div className="progress-fill-child" style={{ width: `${Math.max(progressPercent, 5)}%` }}>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow-lg ghost-border flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-[14px] fill-icon">auto_awesome</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-4 px-2">
          <span className="text-label-md font-kids text-on-surface-variant">시작</span>
          <span className="text-label-md font-kids text-tertiary">지금</span>
          <span className="text-label-md font-kids text-on-surface-variant">목표</span>
        </div>
      </section>

      {/* Lesson List */}
      <section className="space-y-6">
        <h3 className="text-headline-md text-on-surface">모험을 골라요</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentLessons.map((lesson, idx) => {
            const isCompleted = lesson.is_completed;
            const isNew = !isCompleted && lesson.id === nextLesson?.id;

            const bgs = [
              "bg-primary-container/10",
              "bg-secondary-container/20",
              "bg-tertiary-container/20"
            ];
            const textColors = ["text-primary", "text-secondary", "text-tertiary"];
            const icons = ["auto_stories", "mic_external_on", "headphones"];
            const bgClass = bgs[idx % 3];
            const tc = textColors[idx % 3];
            const icon = icons[idx % 3];

            return (
              <div
                key={lesson.id}
                onClick={() => !isCompleted && handleMissionClick(lesson.lesson_type, lesson.id)}
                className={cn(
                  "card-child overflow-hidden flex flex-col",
                  isCompleted ? "opacity-50" : "cursor-pointer"
                )}
              >
                <div className={cn("aspect-video relative overflow-hidden flex items-center justify-center", bgClass, isCompleted && "grayscale bg-surface-container-high")}>
                  {isCompleted ? (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-tertiary shadow-xl">
                        <span className="material-symbols-outlined fill-icon text-3xl">check_circle</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isNew ? (
                        <img alt="Lesson Cover" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXPmrstjP3HNwoqqUvnE68CcftmLahMLINOsD_d0vs-zClhzbma4G1Xu0uj9z3sAbS-FH0ES70UVDdX15-kC1GYiyhY3Z-3MiDkjPYhmX2ibobmXYwUXequ5SAgkpAP8K9U3IvVunlhRrNG3sG5cXcXK_3Tthutej345qrMpnvkJdOIpXkm8vg4sptxR0Y9QPHlq0Bqq_3jYqy1K5yvinUSoIVG6hPT4yA8KgeIUxTZAWkZCIS8laXalvbDg9srmZAoNHFmfR4w-sA" />
                      ) : (
                        <span className={cn("material-symbols-outlined text-6xl fill-icon", tc)}>{icon}</span>
                      )}
                      <div className={cn("absolute top-4 left-4 text-white px-3 py-1 rounded-full text-[10px] font-headline font-black tracking-widest uppercase", tc.replace('text-', 'bg-'))}>
                        {isNew ? "새 이야기" : lesson.lesson_type.replace('_', ' ')}
                      </div>
                    </>
                  )}
                </div>
                {/* Card content - NO dividers per Design System */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-title-lg text-on-surface mb-2">{lesson.title_ko}</h4>
                    <p className="text-on-surface-variant text-sm font-body line-clamp-2">{lesson.title}</p>
                  </div>
                  {!isCompleted && (
                    <div className="mt-6 flex items-center justify-between">
                      <span className={cn("text-label-md font-kids flex items-center gap-1", tc)}>
                        <span className="material-symbols-outlined text-sm">schedule</span> 5분
                      </span>
                      <button className={cn("font-kids font-bold flex items-center gap-1 group", tc)}>
                        {isNew ? "탐험하기" : "시작"} <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Help Button */}
      <div className="fixed bottom-24 right-6 z-40 md:bottom-12">
        <button className="w-16 h-16 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">help</span>
        </button>
      </div>
    </div>
  );
}
