"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { queryKeys } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import CelebrationModal from "@/components/CelebrationModal";
import StoryIllustration from "@/components/StoryIllustration";

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

async function synthesizeTts(text: string): Promise<Blob> {
  const res = await api.post<Blob>("/tts/synthesize", null, {
    params: { text, voice: "shimmer", speed: 0.88 },
    responseType: "blob",
  });
  return res.data;
}

function getWordTimingWeight(word: string) {
  const cleanWord = word.replace(/[^a-zA-Z']/g, "");
  const lengthWeight = Math.max(0.78, Math.min(2.2, 0.48 + cleanWord.length * 0.19));
  const pauseWeight = /[.!?]$/.test(word)
    ? 0.65
    : /[,;:]$/.test(word)
      ? 0.32
      : 0;
  return lengthWeight + pauseWeight;
}

function estimateSpeechDurationMs(words: string[]) {
  const totalWeight = words.reduce((sum, word) => sum + getWordTimingWeight(word), 0);
  return Math.max(1200, totalWeight * 360);
}

function buildWordHighlightOffsets(words: string[], durationMs: number) {
  const weights = words.map(getWordTimingWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const usableDuration = Math.max(800, durationMs * 0.97);
  let cursor = 0;

  return weights.map((weight) => {
    const offset = totalWeight > 0 ? (cursor / totalWeight) * usableDuration : 0;
    cursor += weight;
    return Math.max(0, Math.round(offset));
  });
}

function waitForAudioMetadata(audio: HTMLAudioElement) {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    audio.onloadedmetadata = () => resolve();
    audio.onerror = () => reject(new Error("Audio metadata failed"));
  });
}

export default function StoryReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const childId = useAuthStore((s) => s.activeChildId);
  const addXP = useGameStore((s) => s.addXP);

  const { speak } = useSpeech();
  const { playSfx } = useAudio();

  const [pageIndex, setPageIndex] = useState(0);
  const [highlightWord, setHighlightWord] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const readTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const readAudioRef = useRef<HTMLAudioElement | null>(null);
  const readAudioUrlRef = useRef<string | null>(null);

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

  const clearReadTimers = useCallback(() => {
    readTimersRef.current.forEach((timer) => clearTimeout(timer));
    readTimersRef.current = [];
  }, []);

  const stopReadPlayback = useCallback(() => {
    clearReadTimers();
    readAudioRef.current?.pause();
    readAudioRef.current = null;

    if (readAudioUrlRef.current) {
      URL.revokeObjectURL(readAudioUrlRef.current);
      readAudioUrlRef.current = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setHighlightWord(null);
  }, [clearReadTimers]);

  const scheduleWordHighlights = useCallback(
    (words: string[], durationMs: number) => {
      clearReadTimers();
      if (words.length === 0) return;

      const offsets = buildWordHighlightOffsets(words, durationMs);
      offsets.forEach((offset, index) => {
        const timer = setTimeout(() => {
          setHighlightWord(index);
        }, offset);
        readTimersRef.current.push(timer);
      });

      const clearTimer = setTimeout(() => {
        setHighlightWord(null);
      }, Math.max(...offsets, 0) + 900);
      readTimersRef.current.push(clearTimer);
    },
    [clearReadTimers],
  );

  const speakWithWordHighlights = useCallback(
    (text: string, words: string[]) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }

      const durationMs = estimateSpeechDurationMs(words);
      let searchStart = 0;
      const wordPositions = words.map((word, index) => {
        const charIndex = text.indexOf(word, searchStart);
        if (charIndex >= 0) {
          searchStart = charIndex + word.length;
        }
        return { index, charIndex };
      });

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.82;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.onstart = () => scheduleWordHighlights(words, durationMs);
      utterance.onboundary = (event) => {
        if (event.charIndex < 0) return;
        const current = wordPositions.reduce((match, position) => {
          if (position.charIndex >= 0 && position.charIndex <= event.charIndex) {
            return position.index;
          }
          return match;
        }, 0);
        setHighlightWord(current);
      };
      utterance.onend = () => {
        clearReadTimers();
        setHighlightWord(null);
      };
      utterance.onerror = () => {
        clearReadTimers();
        setHighlightWord(null);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [clearReadTimers, scheduleWordHighlights],
  );

  useEffect(() => stopReadPlayback, [stopReadPlayback]);

  useEffect(() => {
    stopReadPlayback();
  }, [pageIndex, showQuiz, stopReadPlayback]);

  const handleWordTap = useCallback(
    async (word: string, index: number) => {
      // Remove punctuation for clearer pronunciation
      const cleanWord = word.replace(/[.,!?;:]/g, "");
      stopReadPlayback();
      setHighlightWord(index);

      try {
        const audioBlob = await synthesizeTts(cleanWord);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setHighlightWord(null);
          URL.revokeObjectURL(audioUrl);
        };

        audio.play();
      } catch (error) {
        console.warn("TTS API failed. Falling back to browser TTS.", error);
        // Fallback to browser TTS if API fails
        speak(cleanWord);
        setTimeout(() => setHighlightWord(null), 800);
      }
    },
    [speak, stopReadPlayback],
  );

  const handleReadAll = useCallback(async () => {
    if (!currentPage) return;

    stopReadPlayback();

    const fullText = currentPage.text_content;
    const words = fullText.split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);

    try {
      const audioBlob = await synthesizeTts(fullText);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      readAudioRef.current = audio;
      readAudioUrlRef.current = audioUrl;

      audio.onended = () => {
        clearReadTimers();
        setHighlightWord(null);
        URL.revokeObjectURL(audioUrl);
        if (readAudioUrlRef.current === audioUrl) {
          readAudioUrlRef.current = null;
        }
        if (readAudioRef.current === audio) {
          readAudioRef.current = null;
        }
      };

      await waitForAudioMetadata(audio);
      await audio.play();

      const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration * 1000
        : estimateSpeechDurationMs(words);
      scheduleWordHighlights(words, durationMs);
    } catch (error) {
      console.warn("TTS API failed. Falling back to browser TTS.", error);
      // Fallback to browser TTS if API fails
      stopReadPlayback();
      speakWithWordHighlights(fullText, words);
    }
  }, [clearReadTimers, currentPage, scheduleWordHighlights, speakWithWordHighlights, stopReadPlayback]);

  const completeStory = useCallback(
    async (correctItems: number, totalItems: number) => {
      if (!story || !childId) return;

      const score = totalItems > 0 ? correctItems / totalItems : 1;
      const res = await api.post<{ xp_earned: number }>(
        `/stories/${story.id}/complete`,
        {
          score,
          total_items: totalItems,
          correct_items: correctItems,
          time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
        },
        { params: { child_id: childId } },
      );
      addXP(res.data.xp_earned);
      await queryClient.invalidateQueries({ queryKey: ["stories", childId] });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.curriculumMap(childId),
      });
    },
    [addXP, childId, queryClient, startTime, story],
  );

  const handleNextPage = useCallback(async () => {
    if (isLastPage) {
      if (quizzes.length > 0) {
        setShowQuiz(true);
      } else {
        await completeStory(0, 0);
        setShowCelebration(true);
      }
    } else {
      setPageIndex((i) => i + 1);
      setHighlightWord(null);
    }
  }, [completeStory, isLastPage, quizzes.length]);

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
          const correctItems = quizCorrect + (isCorrect ? 1 : 0);
          await completeStory(correctItems, quizzes.length);
          // Show celebration modal instead of going back immediately
          setShowCelebration(true);
        } else {
          setQuizIndex((i) => i + 1);
          setSelectedAnswer(null);
        }
      }, 1500);
    },
    [selectedAnswer, currentQuiz, isLastQuiz, quizCorrect, quizzes.length, playSfx, completeStory],
  );

  if (isLoading || !story) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          이야기가 곧 시작돼요 ✨
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

  const finalScore = quizzes.length > 0 ? Math.round((quizCorrect / quizzes.length) * 100) : 100;

  return (
    <>
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          router.back();
        }}
        title="스토리 완독! 🎉"
        message={`${story.title}을(를) 끝까지 읽었어요!`}
        reward={{
          type: "sticker",
          name: "책벌레 스티커",
          icon: "📚",
          amount: finalScore >= 80 ? 50 : 30,
        }}
        autoCloseDelay={6000}
      />

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

      <StoryIllustration
        text={currentPage.text_content}
        genre={story.genre}
        illustrationUrl={currentPage.illustration_url}
      />

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
                onClick={() => handleWordTap(word, i)}
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
    </>
  );
}
