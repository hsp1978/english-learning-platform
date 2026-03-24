"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { useAuthStore } from "@/stores/authStore";
import { useRecordLearning } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";

interface StoryPage {
  page_number: number;
  text_content: string;
  words_data: { word: string; type: string }[];
  illustration_url: string | null;
  audio_url: string | null;
}

interface StoryQuiz {
  id: string;
  question_type: string;
  question_text: string;
  choices: string[];
  correct_index: number;
}

interface StoryDetail {
  id: string;
  title: string;
  author: string | null;
  genre: string;
  page_count: number;
  pages: StoryPage[];
  quizzes: StoryQuiz[];
}

export default function StoryReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);

  const { speak } = useSpeech();
  const { playSfx } = useAudio();
  const recordLearning = useRecordLearning();

  const [pageIndex, setPageIndex] = useState(0);
  const [highlightWord, setHighlightWord] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  const { data: story, isLoading } = useQuery({
    queryKey: ["story", bookId],
    queryFn: async () => {
      const res = await api.get<StoryDetail>(`/stories/${bookId}`, {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId && !!bookId,
  });

  const pages = story?.pages ?? [];
  const quizzes = story?.quizzes ?? [];
  const currentPage = pages[pageIndex];
  const isLastPage = pageIndex >= pages.length - 1;
  const currentQuiz = quizzes[quizIndex];
  const isLastQuiz = quizIndex >= quizzes.length - 1;

  const handleWordTap = useCallback(
    (word: string, index: number) => {
      setHighlightWord(index);
      speak(word);
      setTimeout(() => setHighlightWord(null), 800);
    },
    [speak],
  );

  const handleReadAll = useCallback(() => {
    if (!currentPage) return;
    const words = currentPage.text_content.split(/\s+/);
    words.forEach((word, i) => {
      setTimeout(() => {
        setHighlightWord(i);
        speak(word);
      }, i * 500);
    });
    setTimeout(() => setHighlightWord(null), words.length * 500 + 300);
  }, [currentPage, speak]);

  const handleNextPage = useCallback(() => {
    if (isLastPage) {
      if (quizzes.length > 0) {
        setShowQuiz(true);
      } else {
        router.back();
      }
    } else {
      setPageIndex((i) => i + 1);
      setHighlightWord(null);
    }
  }, [isLastPage, quizzes.length, router]);

  const handlePrevPage = useCallback(() => {
    if (pageIndex > 0) {
      setPageIndex((i) => i - 1);
      setHighlightWord(null);
    }
  }, [pageIndex]);

  const handleQuizAnswer = useCallback(
    async (answerIndex: number) => {
      if (selectedAnswer !== null || !currentQuiz) return;

      setSelectedAnswer(answerIndex);
      const isCorrect = answerIndex === currentQuiz.correct_index;

      if (isCorrect) {
        playSfx("correct");
        setQuizCorrect((c) => c + 1);
      } else {
        playSfx("wrong");
      }

      setTimeout(async () => {
        if (isLastQuiz) {
          // Record completion
          if (story && childId) {
            await recordLearning.mutateAsync({
              lesson_id: story.id,
              lesson_type: "story",
              score: quizzes.length > 0 ? quizCorrect / quizzes.length : 1,
              total_items: quizzes.length,
              correct_items: quizCorrect + (isCorrect ? 1 : 0),
              time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
            });
          }
          router.back();
        } else {
          setQuizIndex((i) => i + 1);
          setSelectedAnswer(null);
        }
      }, 1500);
    },
    [selectedAnswer, currentQuiz, isLastQuiz, story, childId, quizCorrect, quizzes.length, startTime, playSfx, recordLearning, router],
  );

  if (isLoading || !story) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          이야기 준비 중...
        </div>
      </div>
    );
  }

  // Quiz screen
  if (showQuiz && currentQuiz) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-8rem)] px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <span className="text-label-md text-on-surface-variant">퀴즈</span>
          <span className="text-label-md text-on-surface-variant">
            {quizIndex + 1} / {quizzes.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="card-child w-full max-w-sm text-center mb-6">
            <span className="inline-block bg-primary-container/20 text-primary px-3 py-1 rounded-full text-label-md mb-3">
              {currentQuiz.question_type.toUpperCase()}
            </span>
            <p className="text-title-lg text-on-surface mt-2 text-english">
              {currentQuiz.question_text}
            </p>
          </div>

          <div className="w-full max-w-sm space-y-3">
            {currentQuiz.choices.map((choice, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrectAnswer = i === currentQuiz.correct_index;
              const showResult = selectedAnswer !== null;

              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleQuizAnswer(i)}
                  disabled={selectedAnswer !== null}
                  className={cn(
                    "w-full p-5 rounded-2xl text-left text-english font-body font-medium",
                    "transition-all duration-300",
                    // Default state: elevated card
                    !showResult && "bg-surface-container-lowest shadow-child-ambient",
                    // Correct state - NO border, use ring
                    showResult && isCorrectAnswer &&
                      "bg-tertiary-container ring-4 ring-tertiary/30 text-on-tertiary-container",
                    // Wrong state
                    showResult && isSelected && !isCorrectAnswer &&
                      "bg-error-container/20 ring-4 ring-error/30 text-error",
                    // Unselected state
                    showResult && !isSelected && !isCorrectAnswer &&
                      "bg-surface-container-high text-on-surface-variant opacity-50",
                  )}
                >
                  <span className="mr-3 text-on-surface-variant font-label">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {choice}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Reader screen
  if (!currentPage) return null;
  const words = currentPage.text_content.split(/\s+/);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">
          <ChevronLeftIcon size={24} />
        </button>
        <span className="text-body-lg font-headline font-bold text-on-surface truncate max-w-[60%]">
          {story.title}
        </span>
        <span className="text-label-md text-on-surface-variant">
          {pageIndex + 1}/{pages.length}
        </span>
      </div>

      {/* Page progress */}
      <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-tertiary rounded-full transition-all duration-300"
          style={{ width: `${((pageIndex + 1) / pages.length) * 100}%` }}
        />
      </div>

      {/* Illustration placeholder */}
      <div className="w-full aspect-[16/9] bg-surface-container-low rounded-2xl mb-4 flex items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
        <span className="text-4xl">
          {story.genre === "informational" ? "🔬" : "📖"}
        </span>
      </div>

      {/* Text with tappable words */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pageIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          <div className="flex flex-wrap gap-x-2 gap-y-2 leading-relaxed">
            {words.map((word, i) => (
              <button
                key={i}
                onClick={() => handleWordTap(word.replace(/[.,!?]/g, ""), i)}
                className={cn(
                  "text-english font-body font-semibold px-3 py-1.5 rounded-xl",
                  "transition-all duration-300",
                  "spring-bounce",
                  highlightWord === i
                    ? "bg-primary text-on-primary scale-110 shadow-child-ambient"
                    : "text-on-surface hover:bg-surface-container-low active:scale-95",
                )}
              >
                {word}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <button
          onClick={handlePrevPage}
          disabled={pageIndex === 0}
          className={cn(
            "btn-tertiary-child text-sm",
            pageIndex === 0 && "opacity-30",
          )}
        >
          ← 이전
        </button>

        <button onClick={handleReadAll} className="btn-secondary-child text-sm px-4 py-2">
          전체 듣기
        </button>

        <button onClick={handleNextPage} className="btn-primary-child text-sm px-6 py-2">
          {isLastPage ? (quizzes.length > 0 ? "퀴즈 →" : "완료!") : "다음 →"}
        </button>
      </div>
    </div>
  );
}
