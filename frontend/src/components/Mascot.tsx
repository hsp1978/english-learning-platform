"use client";

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";

type Expression = "happy" | "excited" | "thinking" | "cheering" | "wink" | "sad";

interface MascotProps {
  name?: string;
  message?: string;
  expression?: Expression;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
  children?: ReactNode;
  onTap?: () => void;
}

const SIZES = {
  sm: { w: 72, h: 72, wingScale: 0.6, nameSize: "text-[10px]" },
  md: { w: 100, h: 100, wingScale: 0.85, nameSize: "text-xs" },
  lg: { w: 140, h: 140, wingScale: 1.2, nameSize: "text-sm" },
};

// Eye configurations per expression
const EYES: Record<Expression, { left: string; right: string }> = {
  happy:    { left: "M36 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", right: "M58 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" },
  excited:  { left: "M34 37 l4 -4 4 4 M36 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", right: "M56 37 l4 -4 4 4 M58 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" },
  thinking: { left: "M36 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", right: "M58 41 a3 2.5 0 1 0 6 0 a3 2.5 0 1 0 -6 0" },
  cheering: { left: "M34 37 l4 -4 4 4 M36 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", right: "M56 37 l4 -4 4 4 M58 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" },
  wink:     { left: "M36 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", right: "M58 42 Q61 39 64 42" },
  sad:      { left: "M36 42 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", right: "M58 42 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" },
};

const MOUTHS: Record<Expression, string> = {
  happy:    "M44 52 Q50 58 56 52",
  excited:  "M42 50 Q50 60 58 50 Z",
  thinking: "M46 53 Q50 55 54 53",
  cheering: "M42 50 Q50 62 58 50 Z",
  wink:     "M44 52 Q50 58 56 52",
  sad:      "M44 56 Q50 52 56 56",
};

export default function Mascot({
  name = "별이",
  message,
  expression = "happy",
  size = "md",
  animate = true,
  className,
  children,
  onTap,
}: MascotProps) {
  const [expr, setExpr] = useState(expression);
  const [blink, setBlink] = useState(false);
  const [tapBounce, setTapBounce] = useState(false);
  const sz = SIZES[size];

  useEffect(() => { setExpr(expression); }, [expression]);

  // Random blink
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const handleTap = useCallback(() => {
    setTapBounce(true);
    setExpr("excited");
    setTimeout(() => setTapBounce(false), 400);
    setTimeout(() => setExpr(expression), 1200);
    onTap?.();
  }, [expression, onTap]);

  const isWideOpen = expr === "excited" || expr === "cheering";
  const bodyColor = "#FF85A8";
  const bodyDark = "#E84580";
  const wingColor = "#FFB8CC";
  const blushColor = "#FFCDD2";
  const sparkle = isWideOpen || expr === "wink";

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* Character body */}
      <motion.div
        animate={animate ? {
          y: tapBounce ? [0, -12, 0] : [0, -5, 0],
        } : {}}
        transition={tapBounce
          ? { duration: 0.4, ease: "easeOut" }
          : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative shrink-0 cursor-pointer"
        onClick={handleTap}
        style={{ width: sz.w, height: sz.w }}
      >
        <svg viewBox="0 0 100 100" width={sz.w} height={sz.w}>
          <defs>
            <radialGradient id="bodyGrad" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#FFA8C5" />
              <stop offset="100%" stopColor={bodyColor} />
            </radialGradient>
            <radialGradient id="glowGrad" cx="50%" cy="50%">
              <stop offset="0%" stopColor={wingColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={wingColor} stopOpacity="0" />
            </radialGradient>
            <filter id="softShadow">
              <feGaussianBlur stdDeviation="2" />
              <feOffset dy="2" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Glow circle behind */}
          <circle cx="50" cy="50" r="46" fill="url(#glowGrad)" />

          {/* Left wing */}
          <motion.g
            animate={{ rotate: [-8, 12, -8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: "42px", originY: "45px" }}
          >
            <path d="M30 42 Q12 25 18 50 Q20 58 30 52Z" fill={wingColor} opacity="0.75" />
            <path d="M30 42 Q18 30 22 48 Q24 54 30 50Z" fill="#FFD5E0" opacity="0.5" />
          </motion.g>

          {/* Right wing */}
          <motion.g
            animate={{ rotate: [8, -12, 8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: "58px", originY: "45px" }}
          >
            <path d="M70 42 Q88 25 82 50 Q80 58 70 52Z" fill={wingColor} opacity="0.75" />
            <path d="M70 42 Q82 30 78 48 Q76 54 70 50Z" fill="#FFD5E0" opacity="0.5" />
          </motion.g>

          {/* Body (round) */}
          <circle cx="50" cy="50" r="24" fill="url(#bodyGrad)" filter="url(#softShadow)" />

          {/* Highlight arc */}
          <path d="M35 40 Q42 32 55 36" fill="none" stroke="white" strokeWidth="2" opacity="0.35" strokeLinecap="round" />

          {/* Blush cheeks */}
          <ellipse cx="34" cy="52" rx="5" ry="3" fill={blushColor} opacity="0.55" />
          <ellipse cx="66" cy="52" rx="5" ry="3" fill={blushColor} opacity="0.55" />

          {/* Eyes */}
          <g fill={blink ? "none" : "#3D2B4A"} stroke={blink ? "#3D2B4A" : "none"} strokeWidth="2" strokeLinecap="round">
            {blink ? (
              <>
                <path d="M36 41 L42 41" />
                <path d="M58 41 L64 41" />
              </>
            ) : (
              <>
                <path d={EYES[expr].left} />
                <path d={EYES[expr].right} />
                {/* Eye highlights */}
                <circle cx="40" cy="39" r="1.2" fill="white" />
                <circle cx="62" cy="39" r="1.2" fill="white" />
              </>
            )}
          </g>

          {/* Mouth */}
          <path
            d={MOUTHS[expr]}
            fill={isWideOpen ? bodyDark : "none"}
            stroke={isWideOpen ? "none" : bodyDark}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Crown for cheering */}
          {expr === "cheering" && (
            <motion.g
              initial={{ scale: 0, y: 5 }}
              animate={{ scale: 1, y: 0 }}
            >
              <path d="M38 24 L42 16 L47 22 L52 14 L57 22 L62 16 L62 28 L38 28Z" fill="#FFD93D" stroke="#F0C020" strokeWidth="1" />
            </motion.g>
          )}

          {/* Tiara for excited */}
          {expr === "excited" && (
            <motion.g
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <circle cx="50" cy="22" r="4" fill="#FFD93D" />
              <circle cx="50" cy="22" r="2" fill="#FFF8E1" />
            </motion.g>
          )}
        </svg>

        {/* Sparkle particles */}
        {sparkle && (
          <>
            <motion.div
              className="absolute -top-1 -right-1 text-sm"
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >✨</motion.div>
            <motion.div
              className="absolute top-0 -left-2 text-xs"
              animate={{ scale: [1, 0.7, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >✦</motion.div>
          </>
        )}

        {/* Name tag */}
        <div className={cn(
          "absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap",
          "px-2 py-0.5 rounded-full",
          "bg-fairy-400 text-white font-display",
          sz.nameSize,
        )}>
          {name}
        </div>
      </motion.div>

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, x: -8, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative mt-2"
          >
            {/* Bubble */}
            <div className="speech-bubble max-w-[240px]">
              <p className="font-display text-sm text-slate-800 leading-relaxed">
                {message}
              </p>
              {children}
            </div>
            {/* Tail pointing left */}
            <div className="absolute left-[-8px] top-4 w-0 h-0 border-t-[6px] border-t-transparent border-r-[10px] border-r-white border-b-[6px] border-b-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
