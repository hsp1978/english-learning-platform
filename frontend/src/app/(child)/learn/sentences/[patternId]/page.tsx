"use client";

import { useCallback, useState, useEffect } from "react";
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
  const { playSfx, playRhythmBeep } = useAudio();

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
  const [isDragging, setIsDragging] = useState(false);

  const items: SentenceItem[] = (lesson?.items ?? []).map((item) => {
    // Handle different content types
    if (item.content_type === "sentence_pattern") {
      // Sentence pattern: use complete sentence and split into words
      const sentence = (item.content_data.complete_sentence as string) ?? "";
      const words = sentence.split(" ").filter(w => w.length > 0);
      return {
        sentence,
        wordBlocks: words,
        correctOrder: words.map((_, i) => i), // Correct order is sequential
      };
    } else if (item.content_type === "pronoun_match") {
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
  useEffect(() => {
    if (currentItem) {
      const shuffled = [...currentItem.wordBlocks].sort(() => Math.random() - 0.5);
      setUserOrder(shuffled);
    }
  }, [currentIndex]);

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
          문장이 곧 나와요 ✨
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
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant spring-bounce"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <span className="font-kids font-bold text-lg text-on-surface">
          {currentIndex + 1} / {totalItems}
        </span>
        <div className="w-12 h-12 rounded-2xl bg-tertiary-container flex items-center justify-center">
          <span className="font-kids font-black text-sm text-tertiary">+{lesson.xp_reward}</span>
        </div>
      </div>

      {/* Guide */}
      <div className="text-center mb-8">
        <p className="font-kids text-xl font-bold text-on-surface mb-2">
          단어를 올바른 순서로 정렬하세요! 🎯
        </p>
        <p className="font-kids text-sm text-on-surface-variant">
          블록을 드래그하여 순서를 바꿔요
        </p>
      </div>

      {/* Track area */}
      <motion.div
        className="card-child bg-gradient-to-br from-secondary-container/20 to-tertiary-container/20 p-6 mb-6 min-h-[120px] flex items-center justify-center"
        animate={isDragging ? {
          scale: [1, 1.02, 1],
          boxShadow: [
            "0 4px 6px rgba(0,0,0,0.1)",
            "0 8px 20px rgba(78,205,196,0.3)",
            "0 4px 6px rgba(0,0,0,0.1)"
          ],
        } : {}}
        transition={isDragging ? { repeat: Infinity, duration: 1.5 } : {}}
      >
        <Reorder.Group
          values={userOrder}
          onReorder={(newOrder) => {
            setUserOrder(newOrder);
            playRhythmBeep(Math.floor(Math.random() * 3));
          }}
          className="flex flex-wrap gap-3 justify-center items-center"
          style={{ touchAction: 'none' }}
        >
          {userOrder.map((word, idx) => (
            <Reorder.Item
              key={`${word}-${idx}`}
              value={word}
              className={cn(
                "px-6 py-4 rounded-2xl font-headline text-xl font-black",
                "cursor-grab active:cursor-grabbing select-none",
                "transition-all duration-200",
                "shadow-child-ambient",
                !isChecked && "bg-surface-container-lowest text-on-surface hover:bg-surface-container",
                isChecked && isCorrect && "bg-gradient-to-br from-green-400 to-green-500 text-white",
                isChecked && !isCorrect && "bg-gradient-to-br from-red-400 to-red-500 text-white",
              )}
              onDragStart={() => {
                playSfx("click");
                setIsDragging(true);
              }}
              onDragEnd={() => {
                setIsDragging(false);
              }}
              whileDrag={{
                scale: 1.3,
                boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
                rotate: [0, -8, 8, -8, 0],
                zIndex: 1000,
                cursor: "grabbing",
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
              }}
              whileTap={{
                scale: 0.98,
              }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.1}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            >
              {word}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </motion.div>

      {/* Feedback */}
      {isChecked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="card-child text-center mb-6"
        >
          {isCorrect ? (
            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="material-symbols-outlined text-white text-4xl fill-icon">check_circle</span>
              </div>
              <p className="font-headline text-2xl font-black text-tertiary mb-2">
                정답이에요! 🎉
              </p>
              <p className="font-kids text-base text-on-surface-variant">
                {currentItem.sentence}
              </p>
            </div>
          ) : (
            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="material-symbols-outlined text-white text-4xl fill-icon">refresh</span>
              </div>
              <p className="font-headline text-xl font-black text-primary mb-2">
                다시 해볼까요?
              </p>
              <p className="font-kids text-sm text-on-surface-variant mb-1">
                정답은 이렇게 해요:
              </p>
              <p className="font-headline text-lg font-bold text-on-surface">
                {currentItem.sentence}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="mt-auto mb-8 flex flex-col items-center gap-4">
        {!isChecked && (
          <button onClick={handleCheck} className="btn-primary-child">
            확인하기!
          </button>
        )}
        {isChecked && (
          <button onClick={handleNext} className="btn-primary-child">
            {isLast ? "레슨 완료! 🎊" : "다음 문제 →"}
          </button>
        )}

        {/* Skip Button */}
        {!isChecked && (
          <button
            onClick={handleNext}
            className="btn-tertiary-child"
          >
            나중에 하기
          </button>
        )}
      </div>
    </div>
  );
}
