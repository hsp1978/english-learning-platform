"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useCallback } from "react";
import FairyCharacter from "./FairyCharacter";
import { cn } from "@/lib/cn";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  reward?: {
    type: "sticker" | "badge" | "xp";
    name: string;
    icon: string;
    amount?: number;
  };
  autoCloseDelay?: number; // milliseconds, 0 = no auto close
}

export default function CelebrationModal({
  isOpen,
  onClose,
  title = "축하해요!",
  message = "정말 잘했어요!",
  reward,
  autoCloseDelay = 5000,
}: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "shared">("idle");

  const handleShare = useCallback(async () => {
    setShareStatus("sharing");

    try {
      // Web Share API 사용 (모바일에서 지원)
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `${message}\n${reward ? `${reward.name} 획득!` : ""}`,
          url: window.location.href,
        });
        setShareStatus("shared");
      } else {
        // 폴백: 클립보드에 복사
        const shareText = `🎉 ${title}\n${message}\n${reward ? `✨ ${reward.name} 획득!` : ""}\n\n#영어요정 #EnglishFairy`;
        await navigator.clipboard.writeText(shareText);
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 2000);
      }
    } catch (error) {
      console.error("Share failed:", error);
      setShareStatus("idle");
    }
  }, [title, message, reward]);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);

      if (autoCloseDelay > 0) {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      setShowConfetti(false);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateZ: -10 }}
              animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotateZ: 10 }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 300,
              }}
              className="relative bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Confetti Effect */}
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(30)].map((_, i) => {
                    const colors = ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98", "#DDA0DD", "#FFB6C1"];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    const randomX = Math.random() * 100;
                    const randomDelay = Math.random() * 0.5;
                    const randomDuration = 2 + Math.random() * 2;

                    return (
                      <motion.div
                        key={i}
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: randomColor,
                          left: `${randomX}%`,
                          top: "-10%",
                        }}
                        animate={{
                          y: [0, 600],
                          x: [0, (Math.random() - 0.5) * 200],
                          rotateZ: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                          opacity: [1, 1, 0],
                        }}
                        transition={{
                          duration: randomDuration,
                          delay: randomDelay,
                          ease: "easeIn",
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Sparkle Stars */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute text-4xl"
                  style={{
                    left: `${15 + (i % 4) * 25}%`,
                    top: `${i < 4 ? "10%" : "80%"}`,
                  }}
                  animate={{
                    scale: [0, 1.5, 1],
                    rotateZ: [0, 180, 360],
                    opacity: [0, 1, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                >
                  ⭐
                </motion.div>
              ))}

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                {/* Fairy Character */}
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <FairyCharacter
                    mood="celebration"
                    size="lg"
                  />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="text-4xl md:text-5xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 text-center"
                >
                  {title}
                </motion.h2>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl font-kids font-bold text-slate-700 text-center"
                >
                  {message}
                </motion.p>

                {/* Reward Display */}
                {reward && (
                  <motion.div
                    initial={{ scale: 0, rotateZ: -180 }}
                    animate={{ scale: 1, rotateZ: 0 }}
                    transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-yellow-300/50 blur-2xl rounded-full" />

                    {/* Reward Card */}
                    <div className="relative bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 min-w-[200px]">
                      {/* Reward Icon */}
                      <motion.div
                        animate={{
                          rotateY: [0, 360],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="text-6xl"
                      >
                        {reward.icon}
                      </motion.div>

                      {/* Reward Name */}
                      <div className="text-center">
                        <p className="text-sm font-kids text-slate-500 uppercase tracking-wide">
                          {reward.type === "sticker" ? "새 스티커" : reward.type === "badge" ? "새 배지" : "경험치"}
                        </p>
                        <p className="text-lg font-headline font-bold text-slate-800">
                          {reward.name}
                        </p>
                        {reward.amount && (
                          <p className="text-2xl font-black text-primary mt-1">
                            +{reward.amount} XP
                          </p>
                        )}
                      </div>

                      {/* Ribbon */}
                      <div className="absolute -top-3 -right-3 bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        NEW!
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 w-full mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShare}
                    disabled={shareStatus === "sharing"}
                    className={cn(
                      "flex-1 btn-secondary-child flex items-center justify-center gap-2",
                      shareStatus === "shared" && "bg-tertiary-container text-on-tertiary-container"
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {shareStatus === "shared" ? "check_circle" : "share"}
                    </span>
                    {shareStatus === "idle" && "엄마한테 보여주기"}
                    {shareStatus === "sharing" && "공유 중..."}
                    {shareStatus === "shared" && "복사 완료!"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="flex-1 btn-primary-child bg-gradient-to-r from-pink-400 to-purple-500 text-white"
                  >
                    계속하기
                  </motion.button>
                </div>

                {/* Share Hint */}
                <p className="text-xs text-slate-400 text-center">
                  💡 멋진 성과를 가족과 함께 나눠요!
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
