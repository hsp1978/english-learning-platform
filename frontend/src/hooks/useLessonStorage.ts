import { useState, useEffect } from "react";

export function useLessonStorage(
  childId: string | null,
  lessonType: string,
  lessonId: string
) {
  const [isRestored, setIsRestored] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [correctItemIndexes, setCorrectItemIndexes] = useState<Set<number>>(
    () => new Set()
  );

  const storageKey = `lesson-progress-${childId || "anon"}-${lessonType}-${lessonId}`;

  // Load from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.currentIndex === "number") {
          setCurrentIndex(parsed.currentIndex);
        }
        if (typeof parsed.correctCount === "number") {
          setCorrectCount(parsed.correctCount);
        }
        if (Array.isArray(parsed.correctItemIndexes)) {
          setCorrectItemIndexes(
            new Set(
              parsed.correctItemIndexes.filter(
                (index: unknown): index is number => typeof index === "number"
              )
            )
          );
        }
      }
    } catch (e) {
      console.error("Failed to restore progress", e);
    } finally {
      setIsRestored(true);
    }
  }, [storageKey]);

  // Save to storage on change
  useEffect(() => {
    if (!isRestored) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          currentIndex,
          correctCount,
          correctItemIndexes: Array.from(correctItemIndexes),
        })
      );
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  }, [isRestored, currentIndex, correctCount, correctItemIndexes, storageKey]);

  const clearProgress = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error("Failed to clear progress", e);
    }
  };

  return {
    isRestored,
    currentIndex,
    setCurrentIndex,
    correctCount,
    setCorrectCount,
    correctItemIndexes,
    setCorrectItemIndexes,
    clearProgress,
  };
}
