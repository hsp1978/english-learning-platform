"use client";

import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
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

interface WordOrderItem {
  id: string;
  word: string;
  sourceIndex: number;
}

function shuffleWordBlocks(item: SentenceItem, itemIndex: number): WordOrderItem[] {
  const blocks = item.wordBlocks.map((word, sourceIndex) => ({
    id: `${itemIndex}-${sourceIndex}-${word}`,
    word,
    sourceIndex,
  }));

  for (let i = blocks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }

  return blocks;
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
    correctItemIndexes,
    setCorrectItemIndexes,
    clearProgress,
  } = useLessonStorage(childId, "sentences", patternId as string);

  const [userOrder, setUserOrder] = useState<WordOrderItem[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [changedPositionIds, setChangedPositionIds] = useState<string[]>([]);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const changedPositionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongSentencesRef = useRef<Set<string>>(new Set());
  const correctSentencesRef = useRef<Set<string>>(new Set());

  const items: SentenceItem[] = useMemo(() => (lesson?.items ?? []).map((item) => {
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
  }), [lesson?.items]);

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const isLast = currentIndex >= totalItems - 1;
  const canGoPrevious = currentIndex > 0;

  // Shuffle blocks on mount / index change
  useEffect(() => {
    if (currentItem) {
      setUserOrder(shuffleWordBlocks(currentItem, currentIndex));
      setChangedPositionIds([]);
      setSelectedBlockId(null);
    }
  }, [currentIndex, currentItem]);

  useEffect(() => {
    return () => {
      if (changedPositionTimer.current) {
        clearTimeout(changedPositionTimer.current);
      }
    };
  }, []);

  const showMoveFeedback = useCallback((changedIds: string[]) => {
    setChangedPositionIds(changedIds);
    playRhythmBeep(Math.floor(Math.random() * 3));

    if (changedPositionTimer.current) {
      clearTimeout(changedPositionTimer.current);
    }

    changedPositionTimer.current = setTimeout(() => {
      setChangedPositionIds([]);
    }, 520);
  }, [playRhythmBeep]);

  const moveWordBlock = useCallback((blockId: string, direction: -1 | 1) => {
    if (isChecked) return;

    const currentIndexInOrder = userOrder.findIndex((block) => block.id === blockId);
    const nextIndexInOrder = currentIndexInOrder + direction;

    if (
      currentIndexInOrder < 0 ||
      nextIndexInOrder < 0 ||
      nextIndexInOrder >= userOrder.length
    ) {
      return;
    }

    const nextOrder = [...userOrder];
    const swappedBlock = nextOrder[nextIndexInOrder];
    [nextOrder[currentIndexInOrder], nextOrder[nextIndexInOrder]] = [
      nextOrder[nextIndexInOrder],
      nextOrder[currentIndexInOrder],
    ];

    setUserOrder(nextOrder);
    setSelectedBlockId(blockId);
    showMoveFeedback([blockId, swappedBlock.id]);
  }, [isChecked, showMoveFeedback, userOrder]);

  const handleCheck = useCallback(() => {
    if (!currentItem) return;
    setCompletionError(null);

    const match =
      userOrder.length === currentItem.correctOrder.length &&
      userOrder.every((block, i) => block.sourceIndex === currentItem.correctOrder[i]);

    setIsChecked(true);
    setIsCorrect(match);

    if (currentItem.sentence) {
      if (match) {
        correctSentencesRef.current.add(currentItem.sentence);
      } else {
        wrongSentencesRef.current.add(currentItem.sentence);
      }
    }

    if (match) {
      playSfx("correct");
      speak(currentItem.sentence);

      if (!correctItemIndexes.has(currentIndex)) {
        setCorrectItemIndexes((indexes) => new Set(indexes).add(currentIndex));
        setCorrectCount((count) => Math.min(totalItems, Math.max(0, count + 1)));
      }
    } else {
      playSfx("wrong");
      speak(currentItem.sentence);
    }
  }, [
    correctItemIndexes,
    currentIndex,
    currentItem,
    userOrder,
    playSfx,
    speak,
    setCorrectCount,
    setCorrectItemIndexes,
    totalItems,
  ]);

  const handleRetry = useCallback(() => {
    playSfx("click");
    setIsChecked(false);
    setIsCorrect(false);
    setSelectedBlockId(null);
    setChangedPositionIds([]);
    setCompletionError(null);
  }, [playSfx]);

  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0) return;

    const previousIndex = currentIndex - 1;
    const previousItem = items[previousIndex];

    if (previousItem) {
      setUserOrder(shuffleWordBlocks(previousItem, previousIndex));
    }

    playSfx("click");
    setCurrentIndex(() => previousIndex);
    setIsChecked(false);
    setIsCorrect(false);
    setSelectedBlockId(null);
    setChangedPositionIds([]);
    setCompletionError(null);
  }, [currentIndex, items, playSfx, setCurrentIndex]);

  const handleNext = useCallback(async () => {
    setCompletionError(null);

    if (isLast) {
      if (lesson && childId) {
        const finalCorrectCount = Math.min(
          totalItems,
          Math.max(0, correctCount, correctItemIndexes.size)
        );
        const score = totalItems > 0 ? finalCorrectCount / totalItems : 0;

        try {
          await recordLearning.mutateAsync({
            lesson_id: lesson.id,
            lesson_type: "sentences",
            score,
            total_items: totalItems,
            correct_items: finalCorrectCount,
            time_spent_seconds: Math.max(
              0,
              Math.round((Date.now() - startTime) / 1000)
            ),
            detail_data: {
              wrong_items: Array.from(wrongSentencesRef.current),
              correct_items: Array.from(correctSentencesRef.current),
            },
          });
        } catch (error) {
          console.error("Failed to record sentence lesson", error);
          setCompletionError("기록 저장에 실패했어요. 다시 한 번 눌러주세요.");
          return;
        }
      }
      clearProgress();
      router.back();
      return;
    }

    const nextItem = items[currentIndex + 1];
    if (nextItem) {
      setUserOrder(shuffleWordBlocks(nextItem, currentIndex + 1));
    }
    setCurrentIndex((i) => i + 1);
    setIsChecked(false);
    setIsCorrect(false);
    setSelectedBlockId(null);
    setChangedPositionIds([]);
    setCompletionError(null);
  }, [
    isLast,
    items,
    currentIndex,
    lesson,
    childId,
    totalItems,
    correctCount,
    correctItemIndexes,
    startTime,
    recordLearning,
    router,
    clearProgress,
    setCurrentIndex,
  ]);

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
          화살표로 한 칸씩 차근차근 맞춰요
        </p>
      </div>

      {/* Track area */}
      <motion.div
        className="card-child bg-gradient-to-br from-secondary-container/20 to-tertiary-container/20 p-6 mb-6 min-h-[120px] flex items-center justify-center"
      >
        <div className="flex flex-wrap gap-3 justify-center items-center">
          {userOrder.map((block, blockIndex) => {
            const isSelected = selectedBlockId === block.id;
            const changedPosition = changedPositionIds.includes(block.id);
            const canMoveLeft = blockIndex > 0 && !isChecked;
            const canMoveRight = blockIndex < userOrder.length - 1 && !isChecked;

            return (
              <motion.div
                key={block.id}
                className={cn(
                  "relative flex items-center gap-2 rounded-2xl p-2",
                  "transition-colors duration-200 select-none",
                  "shadow-child-ambient",
                  "will-change-transform",
                  !isChecked && "bg-surface-container-lowest text-on-surface",
                  !isChecked && changedPosition && "ring-4 ring-secondary/50 bg-secondary-container text-on-secondary-container",
                  !isChecked && isSelected && "ring-4 ring-tertiary/50",
                  isChecked && isCorrect && "bg-gradient-to-br from-green-400 to-green-500 text-white",
                  isChecked && !isCorrect && "bg-gradient-to-br from-red-400 to-red-500 text-white",
                )}
                layout
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 720,
                    damping: 28,
                    mass: 0.7,
                  },
                }}
                animate={changedPosition ? {
                  scale: [1, 1.1, 1],
                  y: [0, -10, 0],
                  boxShadow: [
                    "0 20px 40px -15px rgba(214,51,108,0.14)",
                    "0 18px 34px rgba(112,89,0,0.26)",
                    "0 20px 40px -15px rgba(214,51,108,0.14)",
                  ],
                } : {
                  scale: 1,
                  y: 0,
                }}
              >
                {!isChecked && (
                  <button
                    type="button"
                    onClick={() => moveWordBlock(block.id, -1)}
                    disabled={!canMoveLeft}
                    aria-label={`${block.word} 왼쪽으로 이동`}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      "bg-surface-container-low text-on-surface-variant",
                      "transition-all duration-200",
                      canMoveLeft ? "hover:bg-surface-container active:scale-95" : "opacity-25",
                    )}
                  >
                    <ChevronLeftIcon size={20} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!isChecked) {
                      playSfx("click");
                      setSelectedBlockId(block.id);
                    }
                  }}
                  className={cn(
                    "px-4 py-3 rounded-xl font-headline text-xl font-black",
                    "min-w-14 transition-colors duration-200",
                    !isChecked && "hover:bg-surface-container",
                  )}
                >
                  {block.word}
                </button>

                {!isChecked && (
                  <button
                    type="button"
                    onClick={() => moveWordBlock(block.id, 1)}
                    disabled={!canMoveRight}
                    aria-label={`${block.word} 오른쪽으로 이동`}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      "bg-surface-container-low text-on-surface-variant",
                      "transition-all duration-200",
                      canMoveRight ? "hover:bg-surface-container active:scale-95" : "opacity-25",
                    )}
                  >
                    <ChevronLeftIcon size={20} className="rotate-180" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
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
              <motion.button
                type="button"
                onClick={handleRetry}
                aria-label="현재 문제 다시 풀기"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-3 shadow-lg text-white"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
              >
                <span className="material-symbols-outlined text-white text-4xl fill-icon">refresh</span>
              </motion.button>
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
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              aria-label="이전 문제로 돌아가기"
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                "bg-surface-container-low text-on-surface-variant shadow-child-ambient",
                "transition-all duration-200",
                canGoPrevious ? "hover:bg-surface-container active:scale-95" : "opacity-30",
              )}
            >
              <ChevronLeftIcon size={26} />
            </button>

            <button
              onClick={handleNext}
              disabled={recordLearning.isPending}
              className={cn(
                "btn-primary-child inline-flex items-center gap-2",
                recordLearning.isPending && "opacity-70"
              )}
            >
              <span>
                {recordLearning.isPending ? "저장 중..." : isLast ? "레슨 완료! 🎊" : "다음 문제"}
              </span>
              {!isLast && <ChevronLeftIcon size={22} className="rotate-180" />}
            </button>
          </div>
        )}

        {completionError && (
          <p role="alert" className="font-kids text-sm font-bold text-primary">
            {completionError}
          </p>
        )}

        {/* Skip Button */}
        {!isChecked && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              aria-label="이전 문제로 돌아가기"
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                "bg-surface-container-low text-on-surface-variant",
                "transition-all duration-200",
                canGoPrevious ? "hover:bg-surface-container active:scale-95" : "opacity-30",
              )}
            >
              <ChevronLeftIcon size={24} />
            </button>

            <button
              onClick={handleNext}
              disabled={recordLearning.isPending}
              className={cn(
                "btn-tertiary-child inline-flex items-center gap-1",
                recordLearning.isPending && "opacity-70"
              )}
            >
              <span>{recordLearning.isPending ? "저장 중..." : "나중에 하기"}</span>
              <ChevronLeftIcon size={18} className="rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
