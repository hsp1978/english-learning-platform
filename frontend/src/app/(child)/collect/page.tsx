"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCharacters } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { LockIcon } from "@/components/ui/Icons";
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
    <div className="px-4 py-3 space-y-4 bg-surface text-on-surface min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-slate-800">요정 도감</h1>
        <span className="text-sm text-slate-400">
          {collectedCount}/{allChars.length}
        </span>
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
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((char) => (
          <motion.button
            key={char.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedChar(char)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors spring-bounce",
              char.is_collected
                ? RARITY_COLORS[char.rarity]
                : "border-none bg-surface-container-high opacity-50",
            )}
          >
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-2xl">
              {char.is_collected ? "🧚" : <LockIcon size={20} className="text-slate-300" />}
            </div>
            <p
              className={cn(
                "text-[11px] font-medium text-center leading-tight",
                char.is_collected ? "text-slate-800" : "text-slate-400",
              )}
            >
              {char.is_collected ? char.name_ko : "???"}
            </p>
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full",
                char.is_collected
                  ? "bg-white/60 text-slate-600"
                  : "bg-slate-100 text-slate-400",
              )}
            >
              {RARITY_LABELS[char.rarity]}
            </span>
          </motion.button>
        ))}
      </div>

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
