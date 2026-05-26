"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useGameStore } from "@/stores/gameStore";
import { useAdvanceMonth } from "@/hooks/useApi";

export default function RecommendationBanner() {
  const router = useRouter();
  const recommendation = useGameStore((s) => s.pendingRecommendation);
  const clearRecommendation = useGameStore((s) => s.clearRecommendation);
  const advanceMonth = useAdvanceMonth();

  if (!recommendation) return null;

  const isAdvance = recommendation.action === "advance";

  const handlePrimary = async () => {
    if (isAdvance) {
      try {
        await advanceMonth.mutateAsync();
      } catch (error) {
        console.warn("Failed to advance month:", error);
      }
    } else {
      router.push("/review");
    }
    clearRecommendation();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="recommendation-banner"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-[60]"
      >
        <div
          className={`rounded-2xl p-4 shadow-child-ambient backdrop-blur-xl ${
            isAdvance
              ? "bg-gradient-to-br from-tertiary-container to-primary-container"
              : "bg-gradient-to-br from-surface-container-high to-secondary-container"
          }`}
        >
          <p className="font-kids font-bold text-base text-on-surface mb-3">
            {recommendation.message_ko}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePrimary}
              disabled={advanceMonth.isPending}
              className="flex-1 btn-primary-child py-2 text-sm disabled:opacity-50"
            >
              {isAdvance ? "좋아, 넘어갈래! 🚀" : "복습하러 가기 📚"}
            </button>
            <button
              onClick={clearRecommendation}
              className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface-variant font-kids text-sm"
            >
              나중에
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
