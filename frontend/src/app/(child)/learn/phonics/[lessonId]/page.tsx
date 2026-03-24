"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useLessonDetail, useRecordLearning, useUnlockCharacter } from "@/hooks/useApi";
import { useLessonStorage } from "@/hooks/useLessonStorage";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";

type Step = "tap" | "blend" | "speak" | "feedback";

const ALPHABET_EXAMPLES: Record<string, { word: string; meaning: string }[]> = {
  a: [{ word: "apple", meaning: "사과" }, { word: "ant", meaning: "개미" }, { word: "alligator", meaning: "악어" }],
  b: [{ word: "bear", meaning: "곰" }, { word: "bird", meaning: "새" }, { word: "banana", meaning: "바나나" }],
  c: [{ word: "cat", meaning: "고양이" }, { word: "car", meaning: "자동차" }, { word: "cup", meaning: "컵" }],
  d: [{ word: "dog", meaning: "개" }, { word: "duck", meaning: "오리" }, { word: "door", meaning: "문" }],
  e: [{ word: "elephant", meaning: "코끼리" }, { word: "egg", meaning: "계란" }, { word: "eagle", meaning: "독수리" }],
  f: [{ word: "fish", meaning: "물고기" }, { word: "frog", meaning: "개구리" }, { word: "fox", meaning: "여우" }],
  g: [{ word: "goat", meaning: "염소" }, { word: "grape", meaning: "포도" }, { word: "giraffe", meaning: "기린" }],
  h: [{ word: "hat", meaning: "모자" }, { word: "horse", meaning: "말" }, { word: "house", meaning: "집" }],
  i: [{ word: "igloo", meaning: "이글루" }, { word: "ice", meaning: "얼음" }, { word: "iron", meaning: "철" }],
  j: [{ word: "juice", meaning: "주스" }, { word: "jam", meaning: "잼" }, { word: "jelly", meaning: "젤리" }],
  k: [{ word: "kangaroo", meaning: "캥거루" }, { word: "key", meaning: "열쇠" }, { word: "kite", meaning: "연" }],
  l: [{ word: "lion", meaning: "사자" }, { word: "lemon", meaning: "레몬" }, { word: "leaf", meaning: "나뭇잎" }],
  m: [{ word: "monkey", meaning: "원숭이" }, { word: "mouse", meaning: "쥐" }, { word: "moon", meaning: "달" }],
  n: [{ word: "nest", meaning: "둥지" }, { word: "net", meaning: "그물" }, { word: "nose", meaning: "코" }],
  o: [{ word: "octopus", meaning: "문어" }, { word: "orange", meaning: "오렌지" }, { word: "owl", meaning: "올빼미" }],
  p: [{ word: "pig", meaning: "돼지" }, { word: "piano", meaning: "피아노" }, { word: "panda", meaning: "판다" }],
  q: [{ word: "queen", meaning: "여왕" }, { word: "quilt", meaning: "이불" }, { word: "quiet", meaning: "조용한" }],
  r: [{ word: "rabbit", meaning: "토끼" }, { word: "ring", meaning: "반지" }, { word: "rose", meaning: "장미" }],
  s: [{ word: "sun", meaning: "태양" }, { word: "star", meaning: "별" }, { word: "snake", meaning: "뱀" }],
  t: [{ word: "tiger", meaning: "호랑이" }, { word: "tree", meaning: "나무" }, { word: "train", meaning: "기차" }],
  u: [{ word: "umbrella", meaning: "우산" }, { word: "uncle", meaning: "삼촌" }, { word: "up", meaning: "위" }],
  v: [{ word: "violin", meaning: "바이올린" }, { word: "vase", meaning: "꽃병" }, { word: "van", meaning: "승합차" }],
  w: [{ word: "water", meaning: "물" }, { word: "wolf", meaning: "늑대" }, { word: "window", meaning: "창문" }],
  x: [{ word: "xylophone", meaning: "실로폰" }, { word: "x-ray", meaning: "엑스레이" }, { word: "xmas", meaning: "크리스마스" }],
  y: [{ word: "yoyo", meaning: "요요" }, { word: "yellow", meaning: "노란색" }, { word: "yacht", meaning: "요트" }],
  z: [{ word: "zebra", meaning: "얼룩말" }, { word: "zero", meaning: "영" }, { word: "zoo", meaning: "동물원" }],
};

interface PhonicsItem {
  word: string;
  phonemes: string[];
  contentType: string;
  keyword?: string;
  sound?: string;
}

export default function PhonicsLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);
  const addXP = useGameStore((s) => s.addXP);

  const { data: lesson, isLoading } = useLessonDetail(lessonId);
  const recordLearning = useRecordLearning();
  const unlockCharacter = useUnlockCharacter();
  const { speak, startListening, stopListening, isListening, transcript } = useSpeech();
  const { playSfx, playPhoneme, playWord } = useAudio();

  const {
    isRestored,
    currentIndex,
    setCurrentIndex,
    correctCount,
    setCorrectCount,
    clearProgress,
  } = useLessonStorage(childId, "phonics", lessonId as string);

  const [step, setStep] = useState<Step>("tap");
  const [tappedPhonemes, setTappedPhonemes] = useState<Set<number>>(new Set());
  const [feedbackGrade, setFeedbackGrade] = useState<"green" | "yellow" | null>(null);
  const [startTime] = useState(Date.now());
  const [showConfetti, setShowConfetti] = useState(false);
  const [mascotExpr, setMascotExpr] = useState<"happy" | "excited" | "cheering" | "thinking">("happy");

  // Debug: Log entire lesson object
  console.log("전체 레슨 데이터:", lesson);
  console.log("레슨 아이템 개수:", lesson?.items?.length);

  // Parse lesson items into phonics words
  const words: PhonicsItem[] = (lesson?.items ?? []).map((item, idx) => {
    console.log(`아이템 ${idx}:`, {
      id: item.id,
      content_type: item.content_type,
      content_data: item.content_data,
      content_data_type: typeof item.content_data,
      content_data_keys: item.content_data ? Object.keys(item.content_data) : [],
    });

    // Handle different content types
    let word = "";
    let phonemes: string[] = [];
    let keyword: string | undefined;
    let sound: string | undefined;

    if (item.content_type === "letter_sound") {
      // Alphabet lesson: use letter as both word and phoneme
      word = typeof item.content_data?.letter === "string" ? item.content_data.letter : "";
      phonemes = word ? [word] : [];
      keyword = typeof item.content_data?.keyword === "string" ? item.content_data.keyword : undefined;
      sound = typeof item.content_data?.sound === "string" ? item.content_data.sound : undefined;
    } else if (item.content_type === "phonics_word" || item.content_type === "phonics_blend") {
      // Phonics blending lesson (both types use same structure)
      word = typeof item.content_data?.word === "string" ? item.content_data.word : "";
      phonemes = Array.isArray(item.content_data?.phonemes) ? item.content_data.phonemes : [];
    }

    console.log(`파싱 결과 ${idx}:`, { word, phonemes, keyword, sound });

    return {
      word,
      phonemes,
      contentType: item.content_type,
      keyword,
      sound,
    };
  });

  const currentWord = words[currentIndex];
  const totalWords = words.length;
  const isLastWord = currentIndex >= totalWords - 1;
  const isAlphabetLesson = currentWord?.contentType === "letter_sound";

  const handleTapPhoneme = useCallback(
    (index: number) => {
      // Allow repeated taps for alphabet lessons
      if (!currentWord) return;
      if (!isAlphabetLesson && step !== "tap") return;

      const phoneme = currentWord.phonemes[index];
      playPhoneme(phoneme);

      const updated = new Set(tappedPhonemes);
      updated.add(index);
      setTappedPhonemes(updated);

      // For alphabet lessons, mark as tapped but allow repeated listening
      if (isAlphabetLesson && !tappedPhonemes.has(index)) {
        // Only count as correct on first tap
        setCorrectCount((c) => c + 1);
      }
    },
    [currentWord, isAlphabetLesson, step, tappedPhonemes, playPhoneme],
  );

  const allTapped = currentWord
    ? tappedPhonemes.size >= currentWord.phonemes.length
    : false;

  const handleBlend = useCallback(() => {
    if (!currentWord) return;
    playSfx("blend");
    playWord(currentWord.word);
    setStep("speak");
  }, [currentWord, playSfx, playWord]);

  const handleMicStart = useCallback(() => {
    startListening();
  }, [startListening]);

  const handleMicStop = useCallback(async () => {
    const finalText = await stopListening();

    // Simple evaluation: compare transcript to target
    const target = currentWord?.word.toLowerCase() ?? "";
    const spoken = finalText.toLowerCase().trim();
    const isCorrect = spoken === target || spoken.includes(target);

    if (isCorrect) {
      setFeedbackGrade("green");
      setCorrectCount((c) => c + 1);
      playSfx("correct");
      setShowConfetti(true);
      setMascotExpr("cheering");
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setFeedbackGrade("yellow");
      playSfx("wrong");
      setMascotExpr("thinking");
    }
    setStep("feedback");
  }, [stopListening, transcript, currentWord, playSfx]);

  const handleNext = useCallback(async () => {
    if (isLastWord) {
      // Lesson complete
      if (lesson && childId) {
        const score = totalWords > 0 ? correctCount / totalWords : 0;
        await recordLearning.mutateAsync({
          lesson_id: lesson.id,
          lesson_type: "phonics",
          score,
          total_items: totalWords,
          correct_items: correctCount,
          time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
        });

        if (lesson.unlock_character_id) {
          await unlockCharacter.mutateAsync(lesson.unlock_character_id);
        }
      }
      clearProgress();
      router.back();
      return;
    }

    setCurrentIndex((i) => i + 1);
    setStep("tap");
    setTappedPhonemes(new Set());
    setFeedbackGrade(null);
    setMascotExpr("happy");
  }, [
    isLastWord,
    lesson,
    childId,
    totalWords,
    correctCount,
    startTime,
    recordLearning,
    unlockCharacter,
    router,
    clearProgress,
  ]);

  if (isLoading || !lesson || !isRestored) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          레슨 준비 중...
        </div>
      </div>
    );
  }

  if (!currentWord || totalWords === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 mb-4">레슨 데이터가 없습니다.</p>
        <pre className="text-xs text-left bg-surface-container-high p-4 rounded-xl overflow-auto shadow-inner">
          {JSON.stringify({ lesson: lesson?.items }, null, 2)}
        </pre>
        <button onClick={() => router.back()} className="btn-primary mt-4">
          뒤로 가기
        </button>
      </div>
    );
  }

  if (!currentWord.phonemes || currentWord.phonemes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 mb-4">글자 데이터가 없습니다.</p>
        <pre className="text-xs text-left bg-surface-container-high p-4 rounded-xl overflow-auto shadow-inner">
          {JSON.stringify({ currentWord, words }, null, 2)}
        </pre>
        <button onClick={() => router.back()} className="btn-primary mt-4">
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] px-4 py-3 bg-surface text-on-surface">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-slate-400"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <span className="text-sm text-slate-400">
          {currentIndex + 1} / {totalWords}
        </span>
        <span className="badge-xp text-xs">+{lesson.xp_reward} XP</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center mb-6">
        {words.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              i < currentIndex && "bg-mint-400",
              i === currentIndex && "bg-fairy-400",
              i > currentIndex && "bg-slate-200",
            )}
          />
        ))}
      </div>

      {/* Guide text */}
      <div className="text-center mb-6">
        <p className="font-display text-base text-slate-600">
          {step === "tap" && isAlphabetLesson && !allTapped && `글자 ${currentWord.word}를 터치해서 소리를 들어보세요!`}
          {step === "tap" && isAlphabetLesson && allTapped && `${currentWord.word}로 시작하는 단어들을 터치해 들어보세요!`}
          {step === "tap" && !isAlphabetLesson && "글자를 하나씩 터치해 보세요!"}
          {step === "blend" && "이제 합쳐볼까요?"}
          {step === "speak" && `"${currentWord.word}" 따라 말해 보세요!`}
          {step === "feedback" && feedbackGrade === "green" && "정말 잘했어요! 🌟"}
          {step === "feedback" && feedbackGrade === "yellow" && "한 번 더 해볼까요?"}
        </p>
        {isAlphabetLesson && currentWord.keyword && step === "tap" && (
          <p className="text-sm text-slate-400 mt-2">
            {currentWord.word} is for <span className="text-english font-semibold">{currentWord.keyword}</span>
          </p>
        )}
      </div>

      {/* Letter blocks & Examples */}
      <div className="flex flex-col items-center justify-center gap-8 mb-8 w-full">
        <div className="flex items-center justify-center gap-3">
          <AnimatePresence mode="popLayout">
            {currentWord.phonemes.map((phoneme, i) => (
              <motion.button
                key={`${currentIndex}-${i}`}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                onClick={() => handleTapPhoneme(i)}
                className={cn(
                  "w-20 h-24 rounded-3xl flex items-center justify-center text-5xl font-kids font-bold transition-all duration-300 spring-bounce border-none cursor-pointer",
                  tappedPhonemes.has(i) 
                    ? feedbackGrade === "green"
                      ? "bg-tertiary text-on-tertiary shadow-child-ambient"
                      : "bg-primary text-on-primary shadow-child-ambient"
                    : "bg-surface-container-lowest text-on-surface hover:shadow-child-ambient",
                )}
              >
                <span className="text-english">{phoneme}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Examples */}
        <AnimatePresence>
          {isAlphabetLesson && allTapped && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 w-full max-w-sm mx-auto"
            >
              {ALPHABET_EXAMPLES[currentWord.word.toLowerCase()]?.map((ex, i) => (
                <motion.button
                  key={`${currentWord.word}-ex-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                  onClick={() => {
                    playWord(ex.word.toLowerCase());
                    playSfx("correct");
                  }}
                  className="w-full bg-surface-container-low rounded-2xl p-4 flex items-center justify-between shadow-child-ambient border-none active:scale-[0.98] transition-transform"
                >
                  <div className="flex flex-col items-start gap-1 text-left">
                    <span className="font-kids font-bold text-3xl text-primary capitalize">{ex.word}</span>
                    <span className="font-display text-sm text-slate-500">{ex.meaning}</span>
                  </div>
                  <div className="w-12 h-12 flex-shrink-0 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary border-none">
                    <span className="material-symbols-outlined fill-icon text-2xl">volume_up</span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action area */}
      <div className="flex flex-col items-center gap-4 mt-auto mb-8">
        {/* Next button for alphabet lessons (always visible after first tap) */}
        {step === "tap" && isAlphabetLesson && allTapped && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            onClick={handleNext}
            className="bg-primary text-on-primary px-10 py-5 rounded-3xl font-kids font-bold text-xl shadow-child-ambient spring-bounce"
          >
            {isLastWord ? "레슨 완료!" : "다음 →"}
          </motion.button>
        )}

        {/* Blend button - only show for multi-phoneme words */}
        {step === "tap" && !isAlphabetLesson && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: allTapped ? 1 : 0.4 }}
            onClick={allTapped ? handleBlend : undefined}
            disabled={!allTapped}
            className="bg-primary text-on-primary px-10 py-5 rounded-3xl font-kids font-bold text-xl shadow-child-ambient spring-bounce"
          >
            합치기!
          </motion.button>
        )}

        {/* Mic button */}
        {step === "speak" && (
          <button
            onTouchStart={handleMicStart}
            onTouchEnd={handleMicStop}
            onMouseDown={handleMicStart}
            onMouseUp={handleMicStop}
            className={cn("mic-btn", isListening && "recording")}
          >
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          </button>
        )}

        {/* Feedback + Next */}
        {step === "feedback" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div
              className={cn(
                "px-6 py-3 rounded-2xl font-display text-base",
                feedbackGrade === "green" &&
                  "bg-mint-50 text-mint-500",
                feedbackGrade === "yellow" &&
                  "bg-sunny-400/20 text-sunny-500",
              )}
            >
              {feedbackGrade === "green" && "Perfect! +10 XP 🌟"}
              {feedbackGrade === "yellow" && "Almost! 다시 들어보세요"}
            </div>

            <button onClick={handleNext} className="bg-primary text-on-primary px-10 py-5 rounded-3xl font-kids font-bold text-xl shadow-child-ambient spring-bounce">
              {isLastWord ? "레슨 완료!" : "다음 →"}
            </button>
          </motion.div>
        )}

        {/* Skip Button */}
        {step !== "feedback" && (
          <button 
            onClick={handleNext} 
            className="mt-4 text-sm text-slate-400 underline decoration-slate-300 active:text-slate-500"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
