"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useLessonDetail, useRecordLearning, useUnlockCharacter } from "@/hooks/useApi";
import { useLessonStorage } from "@/hooks/useLessonStorage";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/cn";
import { scorePronunciation } from "@/lib/pronunciation";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";
import PhonicsWritingPad from "@/components/PhonicsWritingPad";

type Step = "tap" | "blend" | "speak" | "feedback";

const PHONICS_WORD_MEANINGS: Record<string, string> = {
  bat: "박쥐",
  bed: "침대",
  bike: "자전거",
  bird: "새",
  black: "검은색",
  blue: "파란색",
  boat: "배",
  bone: "뼈",
  bus: "버스",
  cake: "케이크",
  car: "자동차",
  cat: "고양이",
  chat: "이야기하다",
  chin: "턱",
  clap: "박수치다",
  comb: "빗",
  corn: "옥수수",
  cute: "귀여운",
  dog: "개",
  farm: "농장",
  five: "다섯",
  flag: "깃발",
  fork: "포크",
  frog: "개구리",
  game: "게임",
  ghost: "유령",
  girl: "소녀",
  grab: "잡다",
  hen: "암탉",
  home: "집",
  hot: "뜨거운",
  kite: "연",
  knight: "기사",
  knock: "두드리다",
  know: "알다",
  lake: "호수",
  lamb: "어린 양",
  log: "통나무",
  make: "만들다",
  mat: "매트",
  park: "공원",
  pen: "펜",
  phone: "전화기",
  pot: "냄비",
  rain: "비",
  rose: "장미",
  run: "달리다",
  seat: "자리",
  seed: "씨앗",
  ship: "배",
  shop: "가게",
  stop: "멈추다",
  sun: "태양",
  thin: "얇은",
  this: "이것",
  time: "시간",
  tree: "나무",
  turn: "돌다",
  when: "언제",
  white: "하얀색",
  wrap: "싸다",
  write: "쓰다",
};

interface PhonicsItem {
  word: string;
  phonemes: string[];
  contentType: string;
  keyword?: string;
  sound?: string;
  meaning?: string;
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
  const { playSfx, playPhoneme, playWord, playRhythmBeep, stopBgm } = useAudio();

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
  const [isPlayingWord, setIsPlayingWord] = useState(false);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const currentIndexRef = useRef(currentIndex);
  const correctCountRef = useRef(correctCount);
  const autoAdvanceIndexRef = useRef<number | null>(null);
  const wrongWordsRef = useRef<Set<string>>(new Set());
  const correctWordsRef = useRef<Set<string>>(new Set());
  const scheduleTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      fn();
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    correctCountRef.current = correctCount;
  }, [correctCount]);

  // Play light background rhythm when lesson starts
  useEffect(() => {
    if (isRestored && lesson) {
      // Start a subtle background rhythm (optional - can be disabled)
      // playBgm('/audio/bgm/learning-rhythm.mp3', 0.15);
    }
    return () => {
      // Clean up BGM and any pending timers when leaving lesson
      stopBgm();
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, [isRestored, lesson, stopBgm]);

  // Parse lesson items into phonics words
  const words: PhonicsItem[] = (lesson?.items ?? []).map((item) => {
    // Handle different content types
    let word = "";
    let phonemes: string[] = [];
    let keyword: string | undefined;
    let sound: string | undefined;
    let meaning: string | undefined;

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

    meaning =
      typeof item.content_data?.meaning_ko === "string"
        ? item.content_data.meaning_ko
        : typeof item.content_data?.meaning === "string"
          ? item.content_data.meaning
          : typeof item.content_data?.translation_ko === "string"
            ? item.content_data.translation_ko
            : typeof item.content_data?.word_ko === "string"
              ? item.content_data.word_ko
              : PHONICS_WORD_MEANINGS[word.toLowerCase()];

    return {
      word,
      phonemes,
      contentType: item.content_type,
      keyword,
      sound,
      meaning,
    };
  });

  const currentWord = words[currentIndex];
  const totalWords = words.length;
  const isLastWord = currentIndex >= totalWords - 1;
  const isAlphabetLesson = currentWord?.contentType === "letter_sound";
  const currentWritingIndex = currentWord
    ? currentWord.phonemes.findIndex((_, index) => !tappedPhonemes.has(index))
    : -1;

  const handleNext = useCallback(async () => {
    autoAdvanceIndexRef.current = null;

    if (isLastWord) {
      // Lesson complete
      if (lesson && childId) {
        const finalCorrectCount = correctCountRef.current;
        const score = totalWords > 0 ? finalCorrectCount / totalWords : 0;
        await recordLearning.mutateAsync({
          lesson_id: lesson.id,
          lesson_type: "phonics",
          score,
          total_items: totalWords,
          correct_items: finalCorrectCount,
          time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
          detail_data: {
            wrong_items: Array.from(wrongWordsRef.current),
            correct_items: Array.from(correctWordsRef.current),
          },
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
    startTime,
    recordLearning,
    unlockCharacter,
    clearProgress,
    router,
    setCurrentIndex,
  ]);

  const scheduleAlphabetAdvance = useCallback(() => {
    const sourceIndex = currentIndexRef.current;
    autoAdvanceIndexRef.current = sourceIndex;

    scheduleTimeout(() => {
      if (
        autoAdvanceIndexRef.current !== sourceIndex ||
        currentIndexRef.current !== sourceIndex
      ) {
        return;
      }

      autoAdvanceIndexRef.current = null;
      void handleNext();
    }, 700);
  }, [handleNext, scheduleTimeout]);

  const handleWritingPronounce = useCallback(
    (phoneme: string, index: number) => {
      playRhythmBeep(index);
      playPhoneme(phoneme);
    },
    [playPhoneme, playRhythmBeep],
  );

  const handleCompleteWriting = useCallback(
    (index: number) => {
      if (!currentWord) return;
      const wasCompleted = tappedPhonemes.has(index);

      setTappedPhonemes((prev) => {
        if (prev.has(index)) return prev;
        const updated = new Set(prev);
        updated.add(index);
        return updated;
      });

      if (isAlphabetLesson && !wasCompleted) {
        setCorrectCount((count) => {
          const nextCount = count + 1;
          correctCountRef.current = nextCount;
          return nextCount;
        });
      }

      playSfx("correct");
      setMascotExpr("excited");

      if (isAlphabetLesson && !wasCompleted) {
        scheduleAlphabetAdvance();
        return;
      }

      if (index >= currentWord.phonemes.length - 1) {
        scheduleTimeout(() => {
          playWord(currentWord.word);
          setMascotExpr("cheering");
        }, 250);
      }
    },
    [
      currentWord,
      isAlphabetLesson,
      playSfx,
      playWord,
      scheduleAlphabetAdvance,
      scheduleTimeout,
      setCorrectCount,
      tappedPhonemes,
    ],
  );

  const allTapped = currentWord
    ? tappedPhonemes.size >= currentWord.phonemes.length
    : false;

  const handleBlend = useCallback(() => {
    if (!currentWord) return;

    // Play rhythmic sequence for each phoneme before blending
    currentWord.phonemes.forEach((_phoneme, index) => {
      scheduleTimeout(() => {
        playRhythmBeep(index);
      }, index * 200); // 200ms between each beep
    });

    // Play blend sfx and word after rhythm sequence
    const totalDelay = currentWord.phonemes.length * 200;
    scheduleTimeout(() => {
      playSfx("blend");
      playWord(currentWord.word);
    }, totalDelay);

    setStep("speak");
  }, [currentWord, playSfx, playWord, playRhythmBeep, scheduleTimeout]);

  const handleReplay = useCallback(() => {
    if (!currentWord || isPlayingWord) return;
    playSfx("click");
    playWord(currentWord.word);
    setIsPlayingWord(true);
    // Reset after word playback (estimated duration)
    scheduleTimeout(() => setIsPlayingWord(false), 1500);
  }, [currentWord, isPlayingWord, playSfx, playWord, scheduleTimeout]);

  const handleMicStart = useCallback(() => {
    startListening();
  }, [startListening]);

  const handleMicStop = useCallback(async () => {
    const finalText = await stopListening();

    // Word-boundary + edit-distance evaluation (more accurate than substring match)
    const { isCorrect } = scorePronunciation(currentWord?.word ?? "", finalText);

    if (currentWord?.word) {
      if (isCorrect) {
        correctWordsRef.current.add(currentWord.word);
      } else {
        wrongWordsRef.current.add(currentWord.word);
      }
    }

    if (isCorrect) {
      setFeedbackGrade("green");
      setCorrectCount((c) => c + 1);
      playSfx("correct");
      setShowConfetti(true);
      setMascotExpr("cheering");
      scheduleTimeout(() => setShowConfetti(false), 2000);
    } else {
      setFeedbackGrade("yellow");
      playSfx("wrong");
      setMascotExpr("thinking");
    }
    setStep("feedback");
  }, [stopListening, currentWord, playSfx, setCorrectCount, scheduleTimeout]);

  if (isLoading || !lesson || !isRestored) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          곧 시작돼요! 잠깐만 ✨
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
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant spring-bounce"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <span className="font-kids font-bold text-lg text-on-surface">
          {currentIndex + 1} / {totalWords}
        </span>
        <div className="w-12 h-12 rounded-2xl bg-tertiary-container flex items-center justify-center">
          <span className="font-kids font-black text-sm text-tertiary">+{lesson.xp_reward}</span>
        </div>
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
      <div className="text-center mb-8">
        <p className="font-kids text-xl font-bold text-on-surface mb-2">
          {step === "tap" && isAlphabetLesson && !allTapped && `글자 ${currentWord.word}를 따라 써 보세요! ✏️`}
          {step === "tap" && isAlphabetLesson && allTapped && "잘 썼어요! 다음 글자로 갈게요! 🎯"}
          {step === "tap" && !isAlphabetLesson && !allTapped && `"${currentWord.word}" 알파벳을 하나씩 써 보세요! ✏️`}
          {step === "tap" && !isAlphabetLesson && allTapped && "좋아요! 이제 소리를 합쳐 읽어 볼까요? 🎵"}
          {step === "blend" && "이제 합쳐볼까요? 🎵"}
          {step === "speak" && `"${currentWord.word}" 따라 말해 보세요! 🎤`}
          {step === "feedback" && feedbackGrade === "green" && "정말 잘했어요! 🌟"}
          {step === "feedback" && feedbackGrade === "yellow" && "한 번 더 해볼까요? 💪"}
        </p>
        {isAlphabetLesson && currentWord.keyword && step === "tap" && (
          <p className="font-kids text-base text-on-surface-variant mt-2">
            {currentWord.word} is for <span className="font-headline font-bold text-primary">{currentWord.keyword}</span>
          </p>
        )}
      </div>

      {/* Letter writing */}
      <div className="flex flex-col items-center justify-center gap-8 mb-8 w-full">
        {isAlphabetLesson ? (
          <AnimatePresence mode="wait">
            {!allTapped && currentWritingIndex >= 0 ? (
              <PhonicsWritingPad
                word={currentWord.word}
                phonemes={currentWord.phonemes}
                activeIndex={currentWritingIndex}
                completedIndices={tappedPhonemes}
                onPronounce={handleWritingPronounce}
                onComplete={handleCompleteWriting}
              />
            ) : (
              <motion.div
                key={`${currentWord.word}-alphabet-written`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
                className="w-full max-w-sm rounded-3xl bg-surface-container-lowest p-6 text-center shadow-child-ambient"
              >
                <span className="mx-auto h-24 min-w-24 rounded-3xl bg-tertiary px-6 flex items-center justify-center font-kids text-6xl font-black text-on-tertiary shadow-child-ambient">
                  {currentWord.word}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            {!allTapped && currentWritingIndex >= 0 ? (
              <PhonicsWritingPad
                word={currentWord.word}
                phonemes={currentWord.phonemes}
                activeIndex={currentWritingIndex}
                completedIndices={tappedPhonemes}
                onPronounce={handleWritingPronounce}
                onComplete={handleCompleteWriting}
              />
            ) : (
              <motion.div
                key={`${currentWord.word}-written`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
                className="w-full max-w-xl rounded-3xl bg-surface-container-lowest p-6 text-center shadow-child-ambient"
              >
                <div className="mb-5 flex items-center justify-center gap-2">
                  {currentWord.phonemes.map((phoneme, index) => (
                    <span
                      key={`${currentWord.word}-done-${phoneme}-${index}`}
                      className="h-16 min-w-16 rounded-2xl bg-tertiary px-4 flex items-center justify-center font-kids text-4xl font-black text-on-tertiary shadow-child-ambient"
                    >
                      {phoneme}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => playWord(currentWord.word)}
                  className="mx-auto h-14 rounded-2xl bg-primary-container px-5 flex items-center justify-center gap-2 font-kids text-lg font-bold text-on-primary-container active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined fill-icon text-2xl">volume_up</span>
                  {currentWord.word}
                </button>
                {currentWord.meaning && (
                  <p className="mt-3 font-kids text-xl font-bold text-on-surface">
                    {currentWord.meaning}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Action area */}
      <div className="flex flex-col items-center gap-4 mt-auto mb-8">
        {/* Fallback next button while alphabet auto-advance is pending */}
        {step === "tap" && isAlphabetLesson && allTapped && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            onClick={handleNext}
            className="btn-primary-child"
          >
            {isLastWord ? "레슨 완료! 🎊" : "다음 글자 →"}
          </motion.button>
        )}

        {/* Blend button - only show for multi-phoneme words */}
        {step === "tap" && !isAlphabetLesson && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: allTapped ? 1 : 0.4 }}
            onClick={allTapped ? handleBlend : undefined}
            disabled={!allTapped}
            className="btn-primary-child"
          >
            합쳐서 읽기! 🎵
          </motion.button>
        )}

        {/* Mic button */}
        {step === "speak" && (
          <div className="flex flex-col items-center gap-4">
            {/* Replay button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                isPlayingWord
                  ? { opacity: 1, scale: [1, 1.05, 1], boxShadow: ["0 4px 6px rgba(0,0,0,0.1)", "0 8px 16px rgba(78,205,196,0.4)", "0 4px 6px rgba(0,0,0,0.1)"] }
                  : { opacity: 1, scale: 1 }
              }
              whileTap={{ scale: 0.9, rotate: -15 }}
              transition={
                isPlayingWord
                  ? { repeat: Infinity, duration: 1.5 }
                  : { type: "spring", stiffness: 300 }
              }
              onClick={handleReplay}
              disabled={isPlayingWord}
              className={cn(
                "btn-secondary-child flex items-center gap-2 transition-colors",
                isPlayingWord && "bg-tertiary text-on-tertiary"
              )}
            >
              <motion.span
                className="material-symbols-outlined fill-icon text-xl"
                animate={
                  isPlayingWord
                    ? { rotate: [0, 360] }
                    : { rotate: 0 }
                }
                whileTap={!isPlayingWord ? { rotate: 360 } : {}}
                transition={
                  isPlayingWord
                    ? { repeat: Infinity, duration: 1, ease: "linear" }
                    : { duration: 0.6, ease: "easeInOut" }
                }
              >
                {isPlayingWord ? "volume_up" : "replay"}
              </motion.span>
              {isPlayingWord ? "재생 중..." : "다시 듣기"}
            </motion.button>

            <motion.button
              onTouchStart={handleMicStart}
              onTouchEnd={handleMicStop}
              onMouseDown={handleMicStart}
              onMouseUp={handleMicStop}
              className={cn("mic-btn", isListening && "recording")}
              whileTap={{ scale: 0.95 }}
              animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
            >
              <motion.svg
                width={40}
                height={40}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                animate={isListening ? { y: [0, -3, 0] } : { y: 0 }}
                transition={isListening ? { repeat: Infinity, duration: 1 } : {}}
              >
                <rect x="9" y="1" width="6" height="12" rx="3" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </motion.svg>
            </motion.button>

            {/* Voice recognition status */}
            <AnimatePresence mode="wait">
              {transcript && transcript !== "" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="card-child px-4 py-2 text-center"
                >
                  <p className="font-kids text-sm text-on-surface-variant mb-1">
                    {transcript === "인식 중..." ? "🎤 음성 분석 중..." : "들은 내용:"}
                  </p>
                  <p className="font-headline text-lg font-bold text-primary">
                    {transcript === "인식 중..." ? (
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        ⏳
                      </motion.span>
                    ) : (
                      transcript
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="font-kids text-sm text-on-surface-variant">
              {isListening ? "듣고 있어요... 🎧" : "버튼을 누르고 말하세요"}
            </p>
          </div>
        )}

        {/* Feedback + Next */}
        {step === "feedback" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="card-child text-center py-6 px-8">
              {feedbackGrade === "green" ? (
                <div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="material-symbols-outlined text-white text-5xl fill-icon">check_circle</span>
                  </div>
                  <p className="font-headline text-2xl font-black text-tertiary mb-2">
                    완벽해요! 🌟
                  </p>
                  <p className="font-kids text-base text-on-surface-variant">
                    +10 XP 획득!
                  </p>
                </div>
              ) : (
                <div>
                  <motion.div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg"
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <motion.span
                      className="material-symbols-outlined text-white text-5xl fill-icon"
                      animate={{ rotate: [0, 360] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                      refresh
                    </motion.span>
                  </motion.div>
                  <p className="font-headline text-xl font-black text-primary mb-2">
                    다시 해볼까? 💪
                  </p>
                  <p className="font-kids text-base text-on-surface-variant">
                    넌 할 수 있어!
                  </p>
                </div>
              )}
            </div>

            <button onClick={handleNext} className="btn-primary-child">
              {isLastWord ? "레슨 완료! 🎊" : "다음 단어 →"}
            </button>
          </motion.div>
        )}

        {/* Skip Button */}
        {step !== "feedback" && (
          <button
            onClick={handleNext}
            className="mt-4 btn-tertiary-child"
          >
            나중에 하기
          </button>
        )}
      </div>
    </div>
  );
}
