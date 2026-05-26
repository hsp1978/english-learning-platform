"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from "motion/react";
import { useLessonDetail, useRecordLearning, useSubmitReview } from "@/hooks/useApi";
import { useLessonStorage } from "@/hooks/useLessonStorage";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";

interface SightWordItem {
  word: string;
}

// Keep each session short (attention span for ages 6-9).
const SESSION_SIZE = 8;

export default function SightWordsLessonPage() {
  const { setId } = useParams<{ setId: string }>();
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);

  const { data: lesson, isLoading } = useLessonDetail(setId);
  const recordLearning = useRecordLearning();
  const submitReview = useSubmitReview();
  const { speak } = useSpeech();
  const { playSfx, playWord } = useAudio();

  const {
    isRestored,
    currentIndex,
    setCurrentIndex,
    correctCount: knownCount,
    setCorrectCount: setKnownCount,
    clearProgress,
  } = useLessonStorage(childId, "sight-words", setId as string);

  const [startTime] = useState(Date.now());
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [showSessionBreak, setShowSessionBreak] = useState(false);

  useEffect(() => {
    if (isRestored && sessionStart === null) {
      setSessionStart(currentIndex);
    }
  }, [isRestored, currentIndex, sessionStart]);

  const cardsInSession =
    sessionStart !== null ? currentIndex - sessionStart + 1 : 0;

  // Debug: Log entire lesson object
  console.log("전체 레슨 데이터:", lesson);
  console.log("레슨 아이템 개수:", lesson?.items?.length);

  const words: SightWordItem[] = (lesson?.items ?? []).map((item, idx) => {
    console.log(`아이템 ${idx}:`, {
      id: item.id,
      content_type: item.content_type,
      content_data: item.content_data,
      content_data_type: typeof item.content_data,
      content_data_keys: item.content_data ? Object.keys(item.content_data) : [],
    });

    const word = (item.content_data.word as string) ?? "";
    console.log(`파싱 결과 ${idx}:`, { word });

    return { word };
  });

  const currentWord = words[currentIndex];
  const totalWords = words.length;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const bgRight = useTransform(x, [0, 150], ["rgba(78,205,196,0)", "rgba(78,205,196,0.3)"]);
  const bgLeft = useTransform(x, [-150, 0], ["rgba(255,138,128,0.3)", "rgba(255,138,128,0)"]);

  const handleDragEnd = useCallback(
    async (_: unknown, info: PanInfo) => {
      if (!currentWord) return;

      const swipeThreshold = 100;
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      console.log("드래그 종료", { offset, velocity, threshold: swipeThreshold });

      if (Math.abs(offset) < swipeThreshold) {
        // Reset position if not enough swipe
        console.log("충분하지 않음, 리셋");
        return;
      }

      let isKnow = false;

      if (offset > swipeThreshold) {
        // Swipe right = know
        console.log("알아요!");
        isKnow = true;
        playSfx("correct");
        setKnownCount((c) => c + 1);
        await submitReview.mutateAsync({
          item_type: "sight_word",
          item_key: currentWord.word,
          score: 5,
        });
      } else if (offset < -swipeThreshold) {
        // Swipe left = don't know
        console.log("모름!");
        playSfx("wrong");
        await submitReview.mutateAsync({
          item_type: "sight_word",
          item_key: currentWord.word,
          score: 1,
        });
      }

      // Brief UX pause before advancing
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (currentIndex >= totalWords - 1) {
        // Complete
        console.log("마지막 카드 완료");
        if (lesson && childId) {
          const finalKnownCount = isKnow ? knownCount + 1 : knownCount;
          const score = totalWords > 0 ? finalKnownCount / totalWords : 0;
          await recordLearning.mutateAsync({
            lesson_id: lesson.id,
            lesson_type: "sight_words",
            score,
            total_items: totalWords,
            correct_items: finalKnownCount,
            time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
          });
        }
        clearProgress();
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.back();
      } else if (cardsInSession >= SESSION_SIZE) {
        // Take a break — progress auto-saves to localStorage via useLessonStorage
        console.log("세션 쉬는 시간");
        setCurrentIndex((i) => i + 1);
        setShowSessionBreak(true);
      } else {
        console.log("다음 카드로");
        setCurrentIndex((i) => i + 1);
      }
    },
    [
      currentWord,
      currentIndex,
      totalWords,
      knownCount,
      lesson,
      childId,
      startTime,
      cardsInSession,
      playSfx,
      setKnownCount,
      setCurrentIndex,
      submitReview,
      recordLearning,
      router,
      clearProgress,
    ],
  );

  const handleDragStart = useCallback(() => {
    console.log("드래그 시작");
  }, []);

  const handleTapCard = useCallback(() => {
    console.log("카드 터치", currentWord?.word);
    if (currentWord) {
      playWord(currentWord.word);
      speak(currentWord.word);
    }
  }, [currentWord, playWord, speak]);

  if (isLoading || !lesson || !isRestored) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          카드가 곧 나와요 ✨
        </div>
      </div>
    );
  }

  if (showSessionBreak) {
    const sessionCount = sessionStart !== null ? currentIndex - sessionStart : SESSION_SIZE;
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-6 text-center">
        <div className="text-7xl mb-6">🌟</div>
        <h2 className="font-headline text-3xl font-black text-tertiary mb-3">
          오늘 {sessionCount}개 끝!
        </h2>
        <p className="font-kids text-base text-on-surface-variant mb-8">
          쉬어갈까, 조금 더 해볼까?
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setSessionStart(currentIndex);
              setShowSessionBreak(false);
            }}
            className="btn-primary-child"
          >
            조금 더 해볼래! 💪
          </button>
          <button
            onClick={() => {
              setShowSessionBreak(false);
              router.back();
            }}
            className="btn-tertiary-child"
          >
            오늘은 여기까지 🎉
          </button>
        </div>
      </div>
    );
  }

  if (!currentWord || totalWords === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 mb-4">단어 데이터가 없습니다.</p>
        <pre className="text-xs text-left bg-surface-container-high p-4 rounded-xl overflow-auto shadow-inner">
          {JSON.stringify({
            lesson_id: lesson?.id,
            lesson_title: lesson?.title,
            items_count: lesson?.items?.length,
            items: lesson?.items,
            words: words,
          }, null, 2)}
        </pre>
        <button onClick={() => router.back()} className="btn-primary mt-4">
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant spring-bounce"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <span className="font-kids font-bold text-lg text-on-surface">
          {currentIndex + 1} / {totalWords}
        </span>
        <div className="w-12 h-12 rounded-2xl bg-tertiary-container flex items-center justify-center">
          <span className="font-kids font-black text-sm text-tertiary">+{lesson.xp_reward}</span>
        </div>
      </div>

      {/* Progress bar - Design System */}
      <div className="progress-bar-child mb-8">
        <div
          className="progress-fill-child"
          style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
        >
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary text-sm fill-icon">auto_awesome</span>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="text-center mb-6">
        <p className="font-kids text-base text-on-surface mb-2">
          카드를 터치하면 발음을 들을 수 있어요 🔊
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shadow-md">
              <span className="text-white text-xl">←</span>
            </div>
            <span className="font-kids text-sm text-on-surface-variant">모름</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-kids text-sm text-on-surface-variant">알아</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-md">
              <span className="text-white text-xl">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flash card */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="relative w-full max-w-xs">
          {/* Background indicators */}
          <motion.div
            style={{ background: bgRight }}
            className="absolute inset-0 rounded-3xl pointer-events-none"
          />
          <motion.div
            style={{ background: bgLeft }}
            className="absolute inset-0 rounded-3xl pointer-events-none"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={`card-${currentIndex}`}
              drag="x"
              dragElastic={0.7}
              dragMomentum={false}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onTap={handleTapCard}
              style={{ x, rotate, opacity }}
              whileTap={{ scale: 0.95 }}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3
              }}
              className="flash-card cursor-pointer select-none"
            >
              <span>
                {currentWord.word}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Stats - Design System */}
      <div className="flex justify-center gap-4 mt-8 mb-6">
        <div className="card-child flex-1 max-w-[140px] text-center py-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-2 shadow-md">
            <span className="material-symbols-outlined text-white text-2xl fill-icon">check_circle</span>
          </div>
          <p className="font-headline text-3xl font-black text-tertiary">{knownCount}</p>
          <p className="text-label-md text-on-surface-variant mt-1">알아요</p>
        </div>
        <div className="card-child flex-1 max-w-[140px] text-center py-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-2 shadow-md">
            <span className="material-symbols-outlined text-white text-2xl fill-icon">refresh</span>
          </div>
          <p className="font-headline text-3xl font-black text-primary">
            {currentIndex - knownCount}
          </p>
          <p className="text-label-md text-on-surface-variant mt-1">복습</p>
        </div>
      </div>

      <div className="flex justify-center pb-6">
        <button
          onClick={async () => {
            if (currentIndex >= totalWords - 1) {
              if (lesson && childId) {
                const score = totalWords > 0 ? knownCount / totalWords : 0;
                await recordLearning.mutateAsync({
                  lesson_id: lesson.id,
                  lesson_type: "sight_words",
                  score,
                  total_items: totalWords,
                  correct_items: knownCount,
                  time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
                });
              }
              clearProgress();
              router.back();
            } else {
              setCurrentIndex((i) => i + 1);
            }
          }}
          className="btn-tertiary-child"
        >
          나중에 하기
        </button>
      </div>
    </div>
  );
}
