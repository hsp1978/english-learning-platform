"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/cn";

type FairyMood = "happy" | "excited" | "encouraging" | "celebration" | "thinking";

interface FairyCharacterProps {
  mood?: FairyMood;
  message?: string;
  size?: "sm" | "md" | "lg";
  showMessage?: boolean;
  className?: string;
}

const FAIRY_MESSAGES = {
  happy: ["안녕! 오늘도 만나서 반가워!", "함께 공부하자!", "오늘은 무엇을 할까?"],
  excited: ["와! 정말 멋져!", "신나는 일이 생길 거야!", "두근두근!"],
  encouraging: ["잘하고 있어!", "조금만 더 힘내!", "넌 할 수 있어!"],
  celebration: ["축하해! 정말 잘했어!", "완벽해!", "너는 천재야!"],
  thinking: ["음... 생각 중이야", "잠깐만 기다려줄래?", "준비하고 있어!"],
};

export default function FairyCharacter({
  mood = "happy",
  message,
  size = "md",
  showMessage = false,
  className,
}: FairyCharacterProps) {
  const [currentMessage, setCurrentMessage] = useState(message || "");
  const [isWaving, setIsWaving] = useState(false);

  useEffect(() => {
    if (!message && showMessage) {
      const messages = FAIRY_MESSAGES[mood];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setCurrentMessage(randomMessage);
    } else if (message) {
      setCurrentMessage(message);
    }
  }, [message, mood, showMessage]);

  useEffect(() => {
    // 주기적으로 손 흔들기
    const interval = setInterval(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const getSkinColor = () => {
    switch (mood) {
      case "celebration":
        return "#FFE5B4"; // 황금빛
      case "excited":
        return "#FFD4E5"; // 핑크빛
      default:
        return "#FFE8CC"; // 복숭아빛
    }
  };

  const getSparkleColor = () => {
    switch (mood) {
      case "celebration":
        return "#FFD700"; // 골드
      case "excited":
        return "#FF69B4"; // 핫핑크
      case "encouraging":
        return "#87CEEB"; // 하늘색
      default:
        return "#FFB6C1"; // 연분홍
    }
  };

  return (
    <div className={cn("relative inline-flex flex-col items-center gap-3", className)}>
      {/* 요정 캐릭터 */}
      <div className={cn("relative", sizeClasses[size])}>
        {/* 반짝이는 파티클 효과 */}
        {(mood === "celebration" || mood === "excited") && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: "50%",
                  top: "50%",
                  width: "8px",
                  height: "8px",
                }}
                animate={{
                  x: [0, (Math.cos((i * Math.PI * 2) / 6) * 40)],
                  y: [0, (Math.sin((i * Math.PI * 2) / 6) * 40)],
                  opacity: [1, 0],
                  scale: [1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{ backgroundColor: getSparkleColor() }}
                />
              </motion.div>
            ))}
          </>
        )}

        {/* 몸통 (둥근 원) */}
        <motion.div
          className="absolute inset-0 rounded-full shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${getSkinColor()} 0%, #FFF5E6 100%)`,
          }}
          animate={{
            scale: mood === "celebration" ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 0.6,
            repeat: mood === "celebration" ? Infinity : 0,
          }}
        >
          {/* 볼 */}
          <div className="absolute w-[25%] h-[15%] rounded-full bg-pink-300/60 left-[10%] top-[45%]" />
          <div className="absolute w-[25%] h-[15%] rounded-full bg-pink-300/60 right-[10%] top-[45%]" />

          {/* 눈 */}
          <motion.div
            className="absolute w-[12%] h-[12%] rounded-full bg-slate-800 left-[30%] top-[35%]"
            animate={mood === "celebration" ? { scaleY: [1, 0.1, 1] } : {}}
            transition={{ duration: 0.3, repeat: mood === "celebration" ? Infinity : 0, repeatDelay: 2 }}
          >
            <div className="absolute w-[40%] h-[40%] rounded-full bg-white top-[20%] left-[20%]" />
          </motion.div>
          <motion.div
            className="absolute w-[12%] h-[12%] rounded-full bg-slate-800 right-[30%] top-[35%]"
            animate={mood === "celebration" ? { scaleY: [1, 0.1, 1] } : {}}
            transition={{ duration: 0.3, repeat: mood === "celebration" ? Infinity : 0, repeatDelay: 2 }}
          >
            <div className="absolute w-[40%] h-[40%] rounded-full bg-white top-[20%] left-[20%]" />
          </motion.div>

          {/* 입 */}
          {mood === "happy" || mood === "excited" || mood === "celebration" ? (
            <div className="absolute left-[35%] top-[55%] w-[30%] h-[15%] border-b-4 border-slate-800 rounded-b-full" />
          ) : (
            <div className="absolute left-[40%] top-[60%] w-[20%] h-[8%] bg-slate-800 rounded-full" />
          )}

          {/* 왕관 */}
          <div className="absolute -top-[15%] left-[20%] w-[60%] h-[25%]">
            <svg viewBox="0 0 100 40" className="w-full h-full drop-shadow-lg">
              <path
                d="M10 30 L20 10 L30 25 L40 5 L50 25 L60 10 L70 25 L80 10 L90 30 Z"
                fill="#FFD700"
                stroke="#FFA500"
                strokeWidth="2"
              />
              {/* 왕관 보석들 */}
              <circle cx="40" cy="5" r="4" fill="#FF69B4" className="animate-pulse" />
              <circle cx="20" cy="10" r="3" fill="#87CEEB" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
              <circle cx="60" cy="10" r="3" fill="#98FB98" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
              <circle cx="80" cy="10" r="3" fill="#DDA0DD" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
            </svg>
          </div>

          {/* 날개 */}
          <motion.div
            className="absolute -left-[25%] top-[20%] w-[40%] h-[50%]"
            animate={isWaving ? {
              rotateZ: [0, -15, 0],
            } : {
              rotateZ: [-5, 5, -5],
            }}
            transition={{
              duration: isWaving ? 0.3 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "right center" }}
          >
            <svg viewBox="0 0 50 80" className="w-full h-full drop-shadow-xl">
              <ellipse cx="25" cy="40" rx="20" ry="35" fill="#E0BBE4" opacity="0.8" />
              <ellipse cx="25" cy="40" rx="15" ry="30" fill="#FFDFD3" opacity="0.6" />
              <ellipse cx="25" cy="40" rx="10" ry="25" fill="#FFF" opacity="0.4" />
            </svg>
          </motion.div>

          <motion.div
            className="absolute -right-[25%] top-[20%] w-[40%] h-[50%]"
            animate={isWaving ? {
              rotateZ: [0, 15, 0],
            } : {
              rotateZ: [5, -5, 5],
            }}
            transition={{
              duration: isWaving ? 0.3 : 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.1,
            }}
            style={{ transformOrigin: "left center" }}
          >
            <svg viewBox="0 0 50 80" className="w-full h-full drop-shadow-xl">
              <ellipse cx="25" cy="40" rx="20" ry="35" fill="#E0BBE4" opacity="0.8" />
              <ellipse cx="25" cy="40" rx="15" ry="30" fill="#FFDFD3" opacity="0.6" />
              <ellipse cx="25" cy="40" rx="10" ry="25" fill="#FFF" opacity="0.4" />
            </svg>
          </motion.div>

          {/* 마법 지팡이 */}
          <motion.div
            className="absolute -right-[30%] top-[60%] w-[40%] h-[8%]"
            animate={{
              rotateZ: isWaving ? [0, -20, 10, -20, 0] : [0, 10, 0],
            }}
            transition={{
              duration: isWaving ? 0.6 : 2,
              repeat: Infinity,
            }}
            style={{ transformOrigin: "left center" }}
          >
            <div className="w-full h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative">
              <motion.div
                className="absolute -right-2 -top-2 w-6 h-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <svg viewBox="0 0 24 24" className="w-full h-full">
                  <path
                    d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
                    fill="#FFD700"
                    stroke="#FFA500"
                    strokeWidth="1"
                  />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* 말풍선 */}
      <AnimatePresence>
        {showMessage && currentMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="relative"
          >
            {/* 말풍선 꼬리 */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white drop-shadow-md" />

            {/* 말풍선 본체 */}
            <div className="bg-white px-6 py-3 rounded-2xl shadow-xl max-w-xs">
              <p className="text-sm font-kids font-bold text-slate-800 text-center leading-relaxed">
                {currentMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
