"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, Reorder } from "motion/react";
import { useLessonDetail, useRecordLearning } from "@/hooks/useApi";
import { useLessonStorage } from "@/hooks/useLessonStorage";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";

interface SentenceItem {
  sentence: string;
  wordBlocks: string[];
  correctOrder: number[];
}

export default function SentenceLessonPage() {
  const { patternId } = useParams<{ patternId: string }>();
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);

  const { data: lesson, isLoading } = useLessonDetail(patternId);
  const recordLearning = useRecordLearning();
  const { speak } = useSpeech();
  const { playSfx } = useAudio();

  const {
    isRestored,
    currentIndex,
    setCurrentIndex,
    correctCount,
    setCorrectCount,
    clearProgress,
  } = useLessonStorage(childId, "sentences", patternId as string);

  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());

  const items: SentenceItem[] = (lesson?.items ?? []).map((item) => {
    // Handle different content types
    if (item.content_type === "pronoun_match") {
      // Pronoun matching: use example sentence and split into words
      const sentence = (item.content_data.example as string) ?? "";
      const words = sentence.split(" ").filter(w => w.length > 0);
      return {
        sentence,
        wordBlocks: words,
        correctOrder: words.map((_, i) => i), // Correct order is sequential
      };
    } else if (item.content_type === "sentence_build") {
      // Sentence building: use provided structure
      return {
        sentence: (item.content_data.example_sentence as string) ?? "",
        wordBlocks: (item.content_data.word_blocks as string[]) ?? [],
        correctOrder: (item.content_data.correct_order as number[]) ?? [],
      };
    } else if (item.content_type === "noun_match") {
      // Noun matching: create simple sentence from noun
      const noun = (item.content_data.noun as string) ?? "";
      return {
        sentence: `This is a ${noun}.`,
        wordBlocks: ["This", "is", "a", `${noun}.`],
        correctOrder: [0, 1, 2, 3],
      };
    }
    // Default fallback
    return {
      sentence: "",
      wordBlocks: [],
      correctOrder: [],
    };
  });

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const isLast = currentIndex >= totalItems - 1;

  // Shuffle blocks on mount / index change
  useState(() => {
    if (currentItem) {
      const shuffled = [...currentItem.wordBlocks].sort(() => Math.random() - 0.5);
      setUserOrder(shuffled);
    }
  });

  const handleCheck = useCallback(() => {
    if (!currentItem) return;

    const correctSentence = currentItem.correctOrder.map(
      (i) => currentItem.wordBlocks[i],
    );
    const match = userOrder.every((w, i) => w === correctSentence[i]);

    setIsChecked(true);
    setIsCorrect(match);

    if (match) {
      playSfx("correct");
      speak(currentItem.sentence);
      setCorrectCount((c) => c + 1);
    } else {
      playSfx("wrong");
    }
  }, [currentItem, userOrder, playSfx, speak]);

  const handleNext = useCallback(async () => {
    if (isLast) {
      if (lesson && childId) {
        const score = totalItems > 0 ? correctCount / totalItems : 0;
        await recordLearning.mutateAsync({
          lesson_id: lesson.id,
          lesson_type: "sentences",
          score,
          total_items: totalItems,
          correct_items: correctCount,
          time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
        });
      }
      clearProgress();
      router.back();
      return;
    }

    const nextItem = items[currentIndex + 1];
    if (nextItem) {
      setUserOrder([...nextItem.wordBlocks].sort(() => Math.random() - 0.5));
    }
    setCurrentIndex((i) => i + 1);
    setIsChecked(false);
    setIsCorrect(false);
  }, [isLast, items, currentIndex, lesson, childId, totalItems, correctCount, startTime, recordLearning, router, clearProgress]);

  if (isLoading || !lesson || !isRestored) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          문장 준비 중...
        </div>
      </div>
    );
  }

  if (!currentItem || totalItems === 0) {
    return (
      <div className="p-4 text-center text-slate-400">문장 데이터가 없습니다.</div>
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
          {currentIndex + 1} / {totalItems}
        </span>
        <span className="badge-xp text-xs">+{lesson.xp_reward} XP</span>
      </div>

      {/* Guide */}
      <div className="text-center mb-6">
        <p className="font-display text-base text-slate-600">
          단어를 올바른 순서로 정렬하세요!
        </p>
        <p className="text-xs text-slate-400 mt-1">
          블록을 드래그하여 순서를 바꿔요
        </p>
      </div>

      {/* Track area */}
      <div className="bg-magic-50 rounded-2xl p-4 mb-6 min-h-[80px] flex items-center justify-center">
        <Reorder.Group
          axis="x"
          values={userOrder}
          onReorder={setUserOrder}
          className="flex flex-wrap gap-2 justify-center"
        >
          {userOrder.map((word) => (
            <Reorder.Item
              key={word}
              value={word}
              className={cn(
                "px-4 py-2.5 rounded-xl font-english text-base font-semibold",
                "cursor-grab active:cursor-grabbing select-none",
                "transition-colors",
                !isChecked && "bg-white text-slate-800 shadow-sm",
                isChecked && isCorrect && "bg-mint-400 text-white",
                isChecked && !isCorrect && "bg-coral-400/20 text-coral-500",
              )}
              whileDrag={{ scale: 1.1, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
            >
              {word}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Feedback */}
      {isChecked && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          {isCorrect ? (
            <p className="font-display text-base text-mint-500">
              정답이에요! 🎉
            </p>
          ) : (
            <div>
              <p className="font-display text-base text-coral-500 mb-1">
                다시 해볼까요?
              </p>
              <p className="text-xs text-slate-400">
                정답: {currentItem.sentence}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="mt-auto mb-8 flex flex-col items-center gap-3">
        {!isChecked && (
          <button onClick={handleCheck} className="btn-primary px-10">
            확인!
          </button>
        )}
        {isChecked && (
          <button onClick={handleNext} className="btn-primary px-10">
            {isLast ? "레슨 완료!" : "다음 →"}
          </button>
        )}
        
        {/* Skip Button */}
        {!isChecked && (
          <button 
            onClick={handleNext} 
            className="text-sm text-slate-400 underline decoration-slate-300 active:text-slate-500"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
