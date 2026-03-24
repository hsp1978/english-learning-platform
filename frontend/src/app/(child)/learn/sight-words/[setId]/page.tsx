"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
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
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const bgRight = useTransform(x, [0, 150], ["rgba(78,205,196,0)", "rgba(78,205,196,0.2)"]);
  const bgLeft = useTransform(x, [-150, 0], ["rgba(255,138,128,0.2)", "rgba(255,138,128,0)"]);

  const handleDragEnd = useCallback(
    async (_: unknown, info: PanInfo) => {
      if (!currentWord) return;

      const swipeThreshold = 100;
      if (info.offset.x > swipeThreshold) {
        // Swipe right = know
        playSfx("correct");
        setKnownCount((c) => c + 1);
        await submitReview.mutateAsync({
          item_type: "sight_word",
          item_key: currentWord.word,
          score: 5,
        });
      } else if (info.offset.x < -swipeThreshold) {
        // Swipe left = don't know
        playSfx("wrong");
        await submitReview.mutateAsync({
          item_type: "sight_word",
          item_key: currentWord.word,
          score: 1,
        });
      } else {
        return; // Not enough swipe
      }

      if (currentIndex >= totalWords - 1) {
        // Complete
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
    },
    [
      currentWord,
      currentIndex,
      totalWords,
      knownCount,
      lesson,
      childId,
      startTime,
      playSfx,
      setKnownCount,
      setCurrentIndex,
      submitReview,
      recordLearning,
      router,
      clearProgress,
    ],
  );

  const handleTapCard = useCallback(() => {
    if (currentWord) {
      playWord(currentWord.word);
      speak(currentWord.word);
    }
  }, [currentWord, playWord, speak]);

  if (isLoading || !lesson || !isRestored) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          카드 준비 중...
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
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400">
          <ChevronLeftIcon size={24} />
        </button>
        <span className="text-sm text-slate-400">
          {currentIndex + 1} / {totalWords}
        </span>
        <span className="badge-xp text-xs">+{lesson.xp_reward} XP</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-fairy-400 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
        />
      </div>

      {/* Guide */}
      <div className="text-center mb-4">
        <p className="text-sm text-slate-400">
          카드를 터치하면 발음을 들을 수 있어요
        </p>
        <p className="text-xs text-slate-400 mt-1">
          ← 모름 · 알아 →
        </p>
      </div>

      {/* Flash card */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div className="relative w-full max-w-xs">
          {/* Background indicators */}
          <motion.div
            style={{ background: bgRight }}
            className="absolute inset-0 rounded-3xl"
          />
          <motion.div
            style={{ background: bgLeft }}
            className="absolute inset-0 rounded-3xl"
          />

          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            style={{ x, rotate }}
            onClick={handleTapCard}
            className="flash-card cursor-grab active:cursor-grabbing"
          >
            <span className="text-english text-slate-800">
              {currentWord.word}
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 mt-6 mb-4">
        <div className="text-center">
          <p className="font-display text-lg text-mint-500">{knownCount}</p>
          <p className="text-[11px] text-slate-400">알아요</p>
        </div>
        <div className="text-center">
          <p className="font-display text-lg text-coral-500">
            {currentIndex - knownCount}
          </p>
          <p className="text-[11px] text-slate-400">복습 필요</p>
        </div>
      </div>

      <div className="flex justify-center pb-4">
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
          className="text-sm text-slate-400 underline decoration-slate-300 active:text-slate-500"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
