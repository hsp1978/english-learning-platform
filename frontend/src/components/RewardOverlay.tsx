"use client";

import { useEffect, useState } from "react";
import { useGameStore, type PendingReward } from "@/stores/gameStore";
import CelebrationModal from "@/components/CelebrationModal";

interface RewardContent {
  title: string;
  message: string;
  reward?: {
    type: "sticker" | "badge" | "xp";
    name: string;
    icon: string;
    amount?: number;
  };
}

function contentFor(reward: PendingReward): RewardContent {
  switch (reward.type) {
    case "month_up":
      return {
        title: "새로운 달 열림!",
        message: `이번 달 공부를 다 끝냈어! ${reward.amount}개월차 모험이 시작돼요 🚀`,
        reward: { type: "badge", name: `${reward.amount}개월차 모험가`, icon: "🗺️" },
      };
    case "level_up":
      return {
        title: "레벨 업!",
        message: `우와, 레벨 ${reward.amount}이 됐어요!`,
        reward: { type: "badge", name: `Level ${reward.amount}`, icon: "⭐" },
      };
    case "character":
      return {
        title: "새 친구 등장!",
        message: "새로운 요정 친구를 만났어요!",
        reward: { type: "sticker", name: reward.label, icon: "🧚" },
      };
    case "badge":
      return {
        title: "배지 획득!",
        message: "멋진 배지를 받았어요!",
        reward: { type: "badge", name: reward.label, icon: "🏅" },
      };
    case "coins":
      return {
        title: "코인 획득!",
        message: "반짝반짝 코인을 모았어요!",
        reward: { type: "badge", name: reward.label, icon: "🪙", amount: reward.amount },
      };
    default:
      return {
        title: "잘했어요!",
        message: reward.label,
        reward: { type: "xp", name: reward.label, icon: "✨", amount: reward.amount },
      };
  }
}

/**
 * Global consumer for the gameStore pendingRewards queue.
 * Shows one CelebrationModal at a time (month-up, level-up, characters...).
 */
export default function RewardOverlay() {
  const pendingRewards = useGameStore((s) => s.pendingRewards);
  const popReward = useGameStore((s) => s.popReward);
  const [current, setCurrent] = useState<PendingReward | null>(null);

  useEffect(() => {
    if (!current && pendingRewards.length > 0) {
      const next = popReward();
      if (next) setCurrent(next);
    }
  }, [current, pendingRewards, popReward]);

  if (!current) return null;

  const content = contentFor(current);

  return (
    <CelebrationModal
      isOpen
      onClose={() => setCurrent(null)}
      title={content.title}
      message={content.message}
      reward={content.reward}
      autoCloseDelay={7000}
    />
  );
}
