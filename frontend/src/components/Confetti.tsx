"use client";

import { motion, AnimatePresence } from "motion/react";
import { useMemo } from "react";

const CONFETTI_COLORS = ["#FF6B9D", "#7C4DFF", "#4ECDC4", "#FFD93D", "#FF8A80", "#FFB8CC", "#C4ADFF"];
const SHAPES = ["●", "■", "▲", "♥", "★"];

interface ConfettiProps {
  show: boolean;
  count?: number;
  duration?: number;
}

interface Piece {
  id: number;
  color: string;
  shape: string;
  x: number;
  size: number;
  delay: number;
  rotation: number;
  xDrift: number;
}

export default function Confetti({ show, count = 40, duration = 2.5 }: ConfettiProps) {
  const pieces = useMemo<Piece[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      shape: SHAPES[i % SHAPES.length],
      x: 10 + Math.random() * 80,
      size: 8 + Math.random() * 12,
      delay: Math.random() * 0.4,
      rotation: Math.random() * 720 - 360,
      xDrift: (Math.random() - 0.5) * 100,
    })),
  [count]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((p) => (
            <motion.div
              key={p.id}
              className="absolute select-none"
              style={{
                left: `${p.x}%`,
                top: "-5%",
                fontSize: p.size,
                color: p.color,
              }}
              initial={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
              animate={{
                y: "110vh",
                x: p.xDrift,
                opacity: [1, 1, 0],
                rotate: p.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration,
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {p.shape}
            </motion.div>
          ))}

          {/* Center starburst */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 rounded-full bg-sunny-400/30" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Small reward burst — use after getting XP or coins */
export function RewardBurst({ show, emoji = "⭐", text = "+10 XP" }: { show: boolean; emoji?: string; text?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.5, y: 0 }}
            animate={{ scale: 1, y: -40 }}
            exit={{ scale: 0, y: -80, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="text-5xl">{emoji}</span>
            <motion.span
              className="font-display text-xl text-sunny-500 mt-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {text}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
