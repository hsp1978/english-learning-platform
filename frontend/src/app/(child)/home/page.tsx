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

        {/* Mission Checklist - 더 귀엽고 생동감 있게 */}
        <div className="space-y-3">
          {/* Mission 1: Next Lesson */}
          <motion.div
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => nextLesson && handleMissionClick(nextLesson.lesson_type, nextLesson.id)}
            className={cn(
              "relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl transition-all cursor-pointer",
              nextLesson
                ? "bg-gradient-to-r from-purple-50 via-pink-50 to-red-50 shadow-md hover:shadow-xl"
                : "bg-white/50 cursor-not-allowed opacity-60"
            )}
          >
            {/* 배경 장식 */}
            {nextLesson && (
              <div className="absolute top-0 right-0 text-5xl opacity-10 -rotate-12">
                🚀
              </div>
            )}

            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0",
              nextLesson
                ? "bg-gradient-to-br from-purple-400 to-pink-500 text-white shadow-lg ring-4 ring-purple-200"
                : "bg-surface-container-high text-on-surface-variant"
            )}>
              {nextLesson ? (
                <span className="text-2xl">🎯</span>
              ) : (
                <span className="text-2xl">✓</span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-headline font-bold text-base text-on-surface">
                {nextLesson ? nextLesson.title_ko : "다음 레슨 완료"}
              </p>
              <p className="text-xs text-on-surface-variant font-medium">
                {nextLesson ? "지금 시작하기! 🌟" : "모두 완료했어요!"}
              </p>
            </div>
            {nextLesson && (
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="material-symbols-outlined text-purple-600 text-3xl">arrow_forward</span>
              </motion.div>
            )}
          </motion.div>

          {/* Mission 2: Read Story */}
          <motion.div
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSfx("click"); router.push("/stories"); }}
            className="relative overflow-hidden flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer"
          >
            {/* 배경 장식 */}
            <div className="absolute top-0 right-0 text-5xl opacity-10 rotate-12">
              📖
            </div>

            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 text-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-blue-200 shrink-0">
              <span className="text-2xl">📚</span>
            </div>
            <div className="flex-1">
              <p className="font-headline font-bold text-base text-on-surface">
                스토리 1개 읽기
              </p>
              <p className="text-xs text-on-surface-variant font-medium">
                재미있는 이야기를 읽어요 📖
              </p>
            </div>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            >
              <span className="material-symbols-outlined text-blue-600 text-3xl">arrow_forward</span>
            </motion.div>
          </motion.div>

          {/* Mission 3: Collect Sticker */}
          <motion.div
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSfx("click"); router.push("/collect"); }}
            className="relative overflow-hidden flex items-center gap-4 p-5 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer"
          >
            {/* 배경 장식 */}
            <div className="absolute top-0 right-0 text-4xl opacity-15 rotate-12">
              ✨
            </div>
            <div className="absolute bottom-0 right-10 text-3xl opacity-10 -rotate-12">
              ⭐
            </div>

            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-yellow-200 shrink-0"
            >
              <span className="text-2xl">⭐</span>
            </motion.div>
            <div className="flex-1">
              <p className="font-headline font-bold text-base text-on-surface">
                스티커 확인하기
              </p>
              <p className="text-xs text-on-surface-variant font-medium">
                모은 스티커를 구경해요 ✨
              </p>
            </div>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            >
              <span className="material-symbols-outlined text-yellow-600 text-3xl">arrow_forward</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions Cards - 더 귀엽고 직관적인 디자인 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 책 읽기 카드 */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { playSfx("click"); router.push("/stories"); }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-purple-50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all aspect-square"
        >
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 text-6xl opacity-20 -rotate-12">
            📖
          </div>
          <div className="absolute bottom-0 left-0 text-4xl opacity-15 rotate-12">
            📚
          </div>

          {/* 아이콘 원형 배경 */}
          <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-4xl">📚</span>
          </div>

          {/* 텍스트 */}
          <div className="relative z-10 text-center">
            <span className="font-headline font-black text-lg text-blue-900 block">책 읽기</span>
            <span className="text-xs text-blue-700 font-medium">재미있는 이야기</span>
          </div>
        </motion.button>

        {/* 게임 카드 */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { playSfx("click"); router.push("/learn"); }}
          className="relative overflow-hidden bg-gradient-to-br from-green-100 via-emerald-50 to-teal-50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all aspect-square"
        >
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 text-6xl opacity-20 rotate-12">
            🎮
          </div>
          <div className="absolute bottom-0 left-0 text-4xl opacity-15 -rotate-12">
            🎯
          </div>

          {/* 아이콘 원형 배경 */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="relative z-10 w-16 h-16 bg-gradient-to-br from-green-400 to-teal-400 rounded-full flex items-center justify-center shadow-lg"
          >
            <span className="text-4xl">🎮</span>
          </motion.div>

          {/* 텍스트 */}
          <div className="relative z-10 text-center">
            <span className="font-headline font-black text-lg text-green-900 block">게임</span>
            <span className="text-xs text-green-700 font-medium">신나게 놀자!</span>
          </div>
        </motion.button>

        {/* 내 컬렉션 카드 */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { playSfx("click"); router.push("/collect"); }}
          className="relative overflow-hidden bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all aspect-square"
        >
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 text-5xl opacity-20 rotate-12">
            ⭐
          </div>
          <div className="absolute top-2 left-2 text-3xl opacity-15 -rotate-12">
            ✨
          </div>
          <div className="absolute bottom-0 left-0 text-4xl opacity-15 rotate-45">
            🌟
          </div>

          {/* 아이콘 원형 배경 */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="relative z-10 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg"
          >
            <span className="text-4xl">⭐</span>
          </motion.div>

          {/* 텍스트 */}
          <div className="relative z-10 text-center">
            <span className="font-headline font-black text-lg text-yellow-900 block">내 컬렉션</span>
            <span className="text-xs text-yellow-700 font-medium">스티커 보물함</span>
          </div>
        </motion.button>

        {/* 곧 열려요 카드 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-md opacity-60 cursor-not-allowed aspect-square"
        >
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 text-6xl opacity-10">
            🎵
          </div>
          <div className="absolute bottom-0 left-0 text-4xl opacity-10 rotate-12">
            🎶
          </div>

          {/* 아이콘 원형 배경 */}
          <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow">
            <span className="text-4xl">🔒</span>
          </div>

          {/* 텍스트 */}
          <div className="relative z-10 text-center">
            <span className="font-headline font-black text-lg text-gray-600 block">곧 열려요</span>
            <span className="text-xs text-gray-500 font-medium">준비중이에요</span>
          </div>
        </motion.button>
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

      {/* Lesson List - 더 귀엽고 생동감 있는 레슨 카드 */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🗺️</span>
          <h3 className="text-headline-md font-headline font-black text-on-surface">모험을 골라요</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentLessons.map((lesson, idx) => {
            const isCompleted = lesson.is_completed;
            const isNew = !isCompleted && lesson.id === nextLesson?.id;

            const gradients = [
              "bg-gradient-to-br from-purple-100 via-pink-50 to-red-50",
              "bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-50",
              "bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-50"
            ];
            const textColors = ["text-purple-600", "text-blue-600", "text-yellow-600"];
            const ringColors = ["ring-purple-300", "ring-blue-300", "ring-yellow-300"];
            const emojis = ["🎨", "🎵", "🌟"];
            const bgGradient = gradients[idx % 3];
            const tc = textColors[idx % 3];
            const ringColor = ringColors[idx % 3];
            const emoji = emojis[idx % 3];

            return (
              <motion.div
                key={lesson.id}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleMissionClick(lesson.lesson_type, lesson.id)}
                className={cn(
                  "card-child overflow-hidden flex flex-col cursor-pointer group relative",
                  isCompleted && "ring-4 ring-green-400 bg-gradient-to-br from-green-50 to-emerald-50"
                )}
              >
                {/* 이미지/아이콘 영역 */}
                <div className={cn(
                  "aspect-video relative overflow-hidden flex items-center justify-center",
                  isCompleted ? "bg-gradient-to-br from-green-100 to-emerald-100" : bgGradient
                )}>
                  {isNew ? (
                    <div className="relative w-full h-full">
                      <img
                        alt="Lesson Cover"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXPmrstjP3HNwoqqUvnE68CcftmLahMLINOsD_d0vs-zClhzbma4G1Xu0uj9z3sAbS-FH0ES70UVDdX15-kC1GYiyhY3Z-3MiDkjPYhmX2ibobmXYwUXequ5SAgkpAP8K9U3IvVunlhRrNG3sG5cXcXK_3Tthutej345qrMpnvkJdOIpXkm8vg4sptxR0Y9QPHlq0Bqq_3jYqy1K5yvinUSoIVG6hPT4yA8KgeIUxTZAWkZCIS8laXalvbDg9srmZAoNHFmfR4w-sA"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  ) : (
                    <>
                      {/* 배경 장식 이모지 */}
                      <div className="absolute top-2 right-2 text-5xl opacity-20 rotate-12">
                        {emoji}
                      </div>
                      <div className="absolute bottom-2 left-2 text-4xl opacity-15 -rotate-12">
                        {emoji}
                      </div>
                      {/* 중앙 아이콘 */}
                      <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center shadow-xl z-10",
                        isCompleted ? "bg-gradient-to-br from-green-400 to-emerald-500" : `${bgGradient}`
                      )}>
                        <span className="text-5xl">{emoji}</span>
                      </div>
                    </>
                  )}

                  {/* 배지 */}
                  <div className={cn(
                    "absolute top-4 left-4 text-white px-4 py-1.5 rounded-full text-xs font-headline font-black shadow-lg backdrop-blur-sm",
                    isCompleted
                      ? "bg-green-500/90"
                      : isNew
                      ? "bg-gradient-to-r from-pink-500 to-red-500 animate-pulse"
                      : tc.replace('text-', 'bg-') + "/90"
                  )}>
                    {isCompleted ? "완료!" : isNew ? "✨ 새 이야기" : lesson.lesson_type.replace('_', ' ')}
                  </div>

                  {/* 완료 체크 마크 */}
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4"
                    >
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-white">
                        <span className="text-3xl">✓</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 카드 내용 */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-title-lg font-headline font-black text-on-surface mb-2 group-hover:text-purple-600 transition-colors">
                      {lesson.title_ko}
                    </h4>
                    <p className="text-on-surface-variant text-sm font-body line-clamp-2">
                      {lesson.title}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-label-md font-kids flex items-center gap-1 px-3 py-1 rounded-full",
                        isCompleted
                          ? "bg-green-100 text-green-700"
                          : `${bgGradient} ${tc}`
                      )}>
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        5분
                      </span>
                    </div>

                    <motion.button
                      whileHover={{ x: 5 }}
                      className={cn(
                        "font-headline font-bold flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition-all",
                        isCompleted
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : isNew
                          ? "bg-gradient-to-r from-pink-500 to-red-500 text-white hover:shadow-lg"
                          : `${bgGradient} ${tc} hover:shadow-lg`
                      )}
                    >
                      {isCompleted ? "다시 하기" : isNew ? "탐험하기" : "시작"}
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
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
