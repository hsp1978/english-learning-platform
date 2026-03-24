"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";

interface ReviewItem {
  item_type: string;
  item_key: string;
  word?: string;
  sentence?: string;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
}

export default function ReviewPage() {
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);
  const queryClient = useQueryClient();

  const { speak } = useSpeech();
  const { playSfx } = useAudio();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const { data: items, isLoading } = useQuery({
    queryKey: ["review-due", childId],
    queryFn: async () => {
      const res = await api.get<ReviewItem[]>("/review/due", {
        params: { child_id: childId, limit: 20 },
      });
      return res.data;
    },
    enabled: !!childId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-due", childId] });
    },
  });

  const currentItem = items?.[currentIndex];
  const totalItems = items?.length ?? 0;
  const hasMore = currentIndex < totalItems - 1;

  const handleReveal = useCallback(() => {
    if (!showAnswer && currentItem) {
      setShowAnswer(true);
      const word = currentItem.word || currentItem.sentence || "";
      speak(word);
    }
  }, [showAnswer, currentItem, speak]);

  const handleScore = useCallback(
    async (score: number) => {
      if (!currentItem) return;

      await recordReview.mutateAsync({
        item_type: currentItem.item_type,
        item_key: currentItem.item_key,
        score,
      });

      playSfx(score >= 3 ? "correct" : "wrong");
      setReviewedCount((c) => c + 1);

      if (hasMore) {
        setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setShowAnswer(false);
        }, 800);
      } else {
        setTimeout(() => {
          router.push("/home");
        }, 1500);
      }
    },
    [currentItem, recordReview, playSfx, hasMore, router]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          복습 준비 중...
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="font-display text-xl text-slate-800 mb-2">
            모두 완료했어요!
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            복습할 단어가 없어요. 내일 다시 만나요!
          </p>
          <button onClick={() => router.push("/home")} className="btn-primary">
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400">
          <ChevronLeftIcon size={24} />
        </button>
        <span className="text-sm text-slate-600">
          {currentIndex + 1} / {totalItems}
        </span>
        <span className="text-sm text-mint-500 font-medium">
          완료: {reviewedCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-fairy-400 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
        />
      </div>

      {/* Card */}
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
              <span className="badge bg-fairy-100 text-fairy-500 text-xs">
                {currentItem.item_type === "word" ? "단어" : "문장"}
              </span>
            </div>

            {!showAnswer ? (
              <div className="text-slate-400 text-sm mb-6">
                단어를 기억해 보세요!
              </div>
            ) : (
              <div>
                <p className="text-english text-3xl font-bold text-slate-800 mb-2">
                  {currentItem.word || currentItem.sentence}
                </p>
                <p className="text-xs text-slate-400">
                  반복: {currentItem.repetitions}회 · 간격: {currentItem.interval_days}일
                </p>
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={handleReveal}
              className="btn-primary px-8 py-3 text-base"
            >
              정답 보기
            </button>
          ) : (
            <div className="w-full max-w-sm space-y-3">
              <p className="text-sm text-slate-500 text-center mb-4">
                얼마나 기억하셨나요?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleScore(1)}
                  className="p-4 rounded-2xl bg-coral-50 border-2 border-coral-200 text-coral-600 font-medium"
                >
                  기억 안 남 😢
                </button>
                <button
                  onClick={() => handleScore(3)}
                  className="p-4 rounded-2xl bg-sunny-50 border-2 border-sunny-200 text-sunny-600 font-medium"
                >
                  어려웠어요 😅
                </button>
                <button
                  onClick={() => handleScore(4)}
                  className="p-4 rounded-2xl bg-fairy-50 border-2 border-fairy-200 text-fairy-600 font-medium"
                >
                  좋아요! 😊
                </button>
                <button
                  onClick={() => handleScore(5)}
                  className="p-4 rounded-2xl bg-mint-50 border-2 border-mint-300 text-mint-600 font-medium"
                >
                  완벽해요! 🎉
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Stats */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="flex justify-center gap-6 text-xs text-slate-400">
          <div>남은 카드: {totalItems - currentIndex - 1}</div>
          <div>·</div>
          <div>완료: {reviewedCount}</div>
        </div>
      </div>
    </div>
  );
}
