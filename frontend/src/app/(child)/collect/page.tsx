"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCharacters } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { LockIcon } from "@/components/ui/Icons";
import FairyCharacter from "@/components/FairyCharacter";
import type { Character, CharacterRarity } from "@/types";

const RARITY_COLORS: Record<CharacterRarity, string> = {
  common: "ring-2 ring-surface-container-high bg-surface-container shadow-sm border-none",
  rare: "ring-2 ring-fairy-300 bg-fairy-100 shadow-sm border-none",
  epic: "ring-2 ring-magic-300 bg-magic-100 shadow-sm border-none",
  legendary: "ring-2 ring-sunny-400 bg-sunny-100 shadow-sm border-none",
};

const RARITY_LABELS: Record<CharacterRarity, string> = {
  common: "일반",
  rare: "레어",
  epic: "에픽",
  legendary: "전설",
};

export default function CollectPage() {
  const { data: characters, isLoading } = useCharacters();
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          도감 불러오는 중...
        </div>
      </div>
    );
  }

  const allChars = characters ?? [];
  const collectedCount = allChars.filter((c) => c.is_collected).length;
  const phases = [1, 2, 3, 4];
  const filtered =
    selectedPhase !== null
      ? allChars.filter((c) => c.phase_number === selectedPhase)
      : allChars;

  return (
    <div className="px-4 py-6 space-y-6 bg-surface text-on-surface min-h-[calc(100vh-8rem)]">
      {/* Header with Fairy Character */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg font-headline font-black text-on-surface">
            나의 요정 친구들 ✨
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {collectedCount}/{allChars.length} 명 만났어요!
          </p>
        </div>
        <FairyCharacter
          mood={collectedCount > 5 ? "celebration" : "happy"}
          size="md"
          message={collectedCount > 5 ? "친구가 많아졌어요!" : "더 많은 친구를 만나요!"}
          showMessage={true}
        />
      </div>

      {/* Overall Progress */}
      <div className="card-child bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        <div className="flex justify-between items-center mb-3">
          <span className="text-title-lg font-headline font-bold text-on-surface">
            전체 진행도
          </span>
          <span className="text-3xl font-black text-primary">
            {Math.round((collectedCount / allChars.length) * 100)}%
          </span>
        </div>
        <div className="progress-bar-child">
          <div
            className="progress-fill-child bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400"
            style={{ width: `${Math.max((collectedCount / allChars.length) * 100, 5)}%` }}
          >
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
              <span className="text-xl">🧚</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedPhase(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            selectedPhase === null
              ? "bg-fairy-400 text-white"
              : "bg-slate-100 text-slate-600",
          )}
        >
          전체
        </button>
        {phases.map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPhase(p)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              selectedPhase === p
                ? "bg-fairy-400 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            Phase {p}
          </button>
        ))}
      </div>

      {/* Character grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filtered.map((char, idx) => (
          <motion.div
            key={char.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={char.is_collected ? { scale: 1.05, rotateZ: 3 } : {}}
              onClick={() => setSelectedChar(char)}
              className={cn(
                "w-full aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all relative overflow-hidden",
                char.is_collected
                  ? RARITY_COLORS[char.rarity] + " shadow-child-ambient"
                  : "border-none bg-surface-container-high",
              )}
            >
              {/* Sparkle Effect for Collected */}
              {char.is_collected && (
                <>
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full"
                      style={{
                        left: `${15 + i * 25}%`,
                        top: `${15 + (i % 2) * 70}%`,
                      }}
                      animate={{
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                    />
                  ))}
                </>
              )}

              {/* Lock Overlay for Uncollected */}
              {!char.is_collected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-2xl">
                  <LockIcon size={24} className="text-slate-300" />
                </div>
              )}

              {/* Character Icon */}
              <div className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center text-3xl",
                char.is_collected ? "bg-white/80 shadow-md" : "bg-white/40"
              )}>
                {char.is_collected ? "🧚" : "❓"}
              </div>

              {/* Name */}
              <p
                className={cn(
                  "text-xs font-kids font-bold text-center leading-tight",
                  char.is_collected ? "text-slate-800" : "text-slate-400",
                )}
              >
                {char.is_collected ? char.name_ko : "???"}
              </p>

              {/* Rarity Badge */}
              <span
                className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full font-bold",
                  char.is_collected
                    ? "bg-white/70 text-slate-700"
                    : "bg-slate-200/50 text-slate-400",
                )}
              >
                {RARITY_LABELS[char.rarity]}
              </span>

              {/* NEW Badge */}
              {char.is_collected && idx < 3 && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                  NEW
                </div>
              )}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {collectedCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-child text-center py-16"
        >
          <div className="text-7xl mb-4">🎁</div>
          <h3 className="text-title-lg text-on-surface mb-2 font-bold">
            첫 요정 친구를 만나요!
          </h3>
          <p className="text-body-md text-on-surface-variant max-w-sm mx-auto">
            레슨을 완료하고 퀴즈를 맞히면<br/>
            새로운 요정 친구를 만날 수 있어요 ✨
          </p>
        </motion.div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedChar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedChar(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-xs text-center shadow-parent-ambient border-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 rounded-2xl bg-magic-50 flex items-center justify-center text-4xl mx-auto mb-4">
                {selectedChar.is_collected ? "🧚" : "🔒"}
              </div>
              <h3 className="font-display text-lg text-slate-800">
                {selectedChar.is_collected ? selectedChar.name_ko : "???"}
              </h3>
              <p className="text-sm text-english text-slate-400 mt-0.5">
                {selectedChar.is_collected ? selectedChar.name : "???"}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {selectedChar.description ?? ""}
              </p>
              <div className="mt-3">
                <span
                  className={cn(
                    "badge text-xs",
                    selectedChar.rarity === "common" && "bg-slate-100 text-slate-600",
                    selectedChar.rarity === "rare" && "bg-fairy-100 text-fairy-500",
                    selectedChar.rarity === "epic" && "bg-magic-100 text-magic-500",
                    selectedChar.rarity === "legendary" && "bg-sunny-400/20 text-sunny-500",
                  )}
                >
                  {RARITY_LABELS[selectedChar.rarity]} · Phase {selectedChar.phase_number}
                </span>
              </div>
              <button
                onClick={() => setSelectedChar(null)}
                className="bg-surface-container-high text-on-surface-variant hover:bg-surface-dim transition-colors px-4 py-3 rounded-xl font-kids font-bold mt-4 w-full"
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
