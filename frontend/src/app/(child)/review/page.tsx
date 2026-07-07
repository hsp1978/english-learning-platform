"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import Confetti from "@/components/Confetti";

interface ReviewItem {
  item_type: string;
  item_key: string;
  word?: string | null;
  sentence?: string | null;
  next_review: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
}

interface QuizChoice {
  text: string;
  isCorrect: boolean;
}

// Fallback distractors when the due queue has too few words to borrow from
const FALLBACK_WORDS = [
  "cat", "dog", "sun", "hat", "bed", "run", "big", "red",
  "you", "see", "like", "play", "book", "tree", "fish", "cake",
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function displayText(item: ReviewItem): string {
  return item.word || item.sentence || item.item_key;
}

function isSentenceItem(item: ReviewItem): boolean {
  return item.item_type.includes("sentence");
}

/** Scramble a sentence's word order to make a wrong-but-plausible distractor. */
function scrambleSentence(sentence: string, attempt: number): string {
  const words = sentence.replace(/[.!?]$/, "").split(" ").filter(Boolean);
  if (words.length < 2) return sentence + "?";
  for (let tries = 0; tries < 10; tries += 1) {
    const mixed = shuffle(words);
    const candidate = mixed.join(" ") + (sentence.match(/[.!?]$/)?.[0] ?? "");
    if (candidate !== sentence) return candidate;
  }
  // Deterministic fallback: swap two words
  const swapped = [...words];
  const i = attempt % (words.length - 1);
  [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
  return swapped.join(" ") + (sentence.match(/[.!?]$/)?.[0] ?? "");
}

function buildChoices(item: ReviewItem, allItems: ReviewItem[]): QuizChoice[] {
  const answer = displayText(item);
  const distractors: string[] = [];

  if (isSentenceItem(item)) {
    let attempt = 0;
    while (distractors.length < 2 && attempt < 8) {
      const fake = scrambleSentence(answer, attempt);
      if (fake !== answer && !distractors.includes(fake)) distractors.push(fake);
      attempt += 1;
    }
  } else {
    const pool = allItems
      .filter((other) => !isSentenceItem(other) && displayText(other) !== answer)
      .map(displayText);
    const fallback = FALLBACK_WORDS.filter(
      (w) => w !== answer.toLowerCase() && !pool.includes(w)
    );
    for (const candidate of shuffle([...pool, ...shuffle(fallback)])) {
      if (distractors.length >= 2) break;
      if (!distractors.includes(candidate)) distractors.push(candidate);
    }
  }

  return shuffle([
    { text: answer, isCorrect: true },
    ...distractors.map((text) => ({ text, isCorrect: false })),
  ]);
}

export default function ReviewPage() {
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);
  const queryClient = useQueryClient();

  const { speak } = useSpeech();
  const { playSfx } = useAudio();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["review-due", childId],
    queryFn: async () => {
      const res = await api.get<ReviewItem[]>("/review/due", {
        params: { child_id: childId, limit: 20 },
      });
      return res.data;
    },
    enabled: !!childId,
    staleTime: Infinity, // keep the quiz set stable during the session
  });

  const recordReview = useMutation({
    mutationFn: async ({
      item_type,
      item_key,
      score,
    }: {
      item_type: string;
      item_key: string;
      score: number;
    }) => {
      await api.post(
        "/review/record",
        { item_type, item_key, score },
        { params: { child_id: childId } }
      );
    },
  });

  const currentItem = items?.[currentIndex];
  const totalItems = items?.length ?? 0;
  const hasMore = currentIndex < totalItems - 1;

  // Build the 3 choices once per question
  const choices = useMemo(
    () => (currentItem && items ? buildChoices(currentItem, items) : []),
    [currentItem, items]
  );

  const playQuestion = useCallback(() => {
    if (currentItem) speak(displayText(currentItem));
  }, [currentItem, speak]);

  // Auto-play the word/sentence when a new question appears
  useEffect(() => {
    if (currentItem && !isRevealed) {
      const timer = setTimeout(() => playQuestion(), 600);
      return () => clearTimeout(timer);
    }
  }, [currentItem, isRevealed, playQuestion]);

  const goNext = useCallback(() => {
    if (hasMore) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setIsRevealed(false);
    } else {
      setIsFinished(true);
      queryClient.invalidateQueries({ queryKey: ["review-due", childId] });
    }
  }, [hasMore, queryClient, childId]);

  const handleChoice = useCallback(
    (choiceIndex: number) => {
      if (isRevealed || !currentItem) return;

      const choice = choices[choiceIndex];
      setSelectedIndex(choiceIndex);
      setIsRevealed(true);
      setReviewedCount((c) => c + 1);

      if (choice.isCorrect) {
        playSfx("correct");
        setCorrectCount((c) => c + 1);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1500);
      } else {
        playSfx("wrong");
        // Say it once more so she hears the right answer
        setTimeout(() => speak(displayText(currentItem)), 400);
      }

      recordReview.mutate({
        item_type: currentItem.item_type,
        item_key: currentItem.item_key,
        score: choice.isCorrect ? 5 : 2,
      });

      setTimeout(goNext, choice.isCorrect ? 1400 : 2600);
    },
    [isRevealed, currentItem, choices, playSfx, speak, recordReview, goNext]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          복습이 곧 시작돼요 ✨
        </div>
      </div>
    );
  }

  if (!items || items.length === 0 || isFinished) {
    const finished = isFinished && reviewedCount > 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        {finished && <Confetti show />}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">{finished ? "🏆" : "✨"}</div>
          <h2 className="font-display text-xl text-slate-800 mb-2">
            {finished ? "복습 끝! 정말 잘했어!" : "모두 완료했어요!"}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {finished
              ? `${reviewedCount}개 중 ${correctCount}개 맞혔어요! 🌟`
              : "복습할 단어가 없어요. 내일 다시 만나요!"}
          </p>
          <button onClick={() => router.push("/home")} className="btn-primary">
            홈으로
          </button>
        </motion.div>
      </div>
    );
  }

  if (!currentItem) return null;

  const isSentence = isSentenceItem(currentItem);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] px-4 py-3">
      <Confetti show={showConfetti} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400">
          <ChevronLeftIcon size={24} />
        </button>
        <span className="text-sm text-slate-600">
          {currentIndex + 1} / {totalItems}
        </span>
        <span className="text-sm text-mint-500 font-medium">
          맞힘: {correctCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-fairy-400 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
        />
      </div>

      {/* Quiz card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <div className="card-elevated w-full max-w-sm p-8 text-center mb-8">
            <div className="mb-4">
              <span className="badge bg-fairy-100 text-fairy-500 text-xs px-3 py-1 rounded-full">
                {isSentence ? "문장 듣기" : "단어 듣기"}
              </span>
            </div>

            <p className="text-sm text-slate-500 mb-5">
              잘 듣고 {isSentence ? "들은 문장을" : "들은 단어를"} 골라줘!
            </p>

            {/* Replay button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={playQuestion}
              aria-label="다시 듣기"
              className="w-20 h-20 rounded-full bg-gradient-to-br from-fairy-400 to-lavender-400 text-white flex items-center justify-center mx-auto shadow-child-soft"
            >
              <span className="material-symbols-outlined fill-icon text-4xl">
                volume_up
              </span>
            </motion.button>
            <p className="text-xs text-slate-400 mt-3">누르면 다시 들려줘요</p>
          </div>

          {/* Choices */}
          <div className="w-full max-w-sm space-y-3">
            {choices.map((choice, i) => {
              const chosen = selectedIndex === i;
              const showCorrect = isRevealed && choice.isCorrect;
              const showWrong = isRevealed && chosen && !choice.isCorrect;
              return (
                <motion.button
                  key={`${currentIndex}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => handleChoice(i)}
                  disabled={isRevealed}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 font-bold transition-all duration-300",
                    isSentence ? "text-base" : "text-xl",
                    "text-english",
                    showCorrect
                      ? "bg-mint-50 border-mint-400 text-mint-600 scale-105"
                      : showWrong
                        ? "bg-coral-50 border-coral-400 text-coral-600 animate-[shake_0.4s_ease-in-out]"
                        : isRevealed
                          ? "bg-slate-50 border-slate-100 text-slate-300"
                          : "bg-white border-fairy-200 text-slate-700 hover:border-fairy-400 hover:scale-[1.02] active:scale-95"
                  )}
                >
                  {choice.text}
                  {showCorrect && " ✅"}
                  {showWrong && " ❌"}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Stats */}
      <div className="mt-auto pt-4">
        <div className="flex justify-center gap-6 text-xs text-slate-400">
          <div>남은 카드: {totalItems - currentIndex - 1}</div>
          <div>·</div>
          <div>완료: {reviewedCount}</div>
        </div>
      </div>
    </div>
  );
}
