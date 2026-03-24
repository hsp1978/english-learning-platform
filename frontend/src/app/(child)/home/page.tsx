"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useCurriculumMap } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useAudio } from "@/hooks/useAudio";
import { cn } from "@/lib/cn";

export default function HomePage() {
  const router = useRouter();
  const { level } = useGameStore();
  const { playSfx } = useAudio();

  const { data: curriculum, isLoading } = useCurriculumMap();

  const handleMissionClick = useCallback((lessonType: string, lessonId: string) => {
    playSfx("click");
    setTimeout(() => {
      const urlType = lessonType.toLowerCase().replace(/_/g, '-');
      router.push(`/learn/${urlType}/${lessonId}`);
    }, 200);
  }, [playSfx, router]);

  if (isLoading || !curriculum) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-4xl">
          ✨
        </motion.div>
        <span className="font-display text-primary text-lg">
          요정이 준비하고 있어요...
        </span>
      </div>
    );
  }

  const child = curriculum.child_progress;
  const currentLessons = curriculum.lessons.filter((l) => l.month === child.current_month && !l.is_locked);
  const completedCount = currentLessons.filter((l) => l.is_completed).length;
  const totalCount = currentLessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = currentLessons.find((l) => !l.is_completed);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 space-y-10 relative">
      {/* Today's Mission (Hero Section) - Design System: Gradient + rounded-3xl */}
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-child-ambient">
        {/* Hero gradient background - Design System Section 2: Glass & Gradient Rule */}
        <div className="absolute inset-0 bg-hero-texture opacity-95 rounded-3xl" />

        <div className="flex-1 space-y-6 z-10 relative">
          <span className="bg-white/20 text-white px-4 py-1.5 rounded-full font-headline font-bold text-label-md backdrop-blur-sm">
            Level {level} Explorer
          </span>
          {/* Typography: display-lg - Design System Section 3 */}
          <h2 className="text-display-lg font-headline font-black text-white leading-tight drop-shadow-lg">
            Welcome back,<br />{child?.nickname || "Little Fairy"}!
          </h2>
          {/* Body text with proper hierarchy */}
          <p className="text-body-lg text-white/90 font-body font-medium max-w-md drop-shadow-md">
            Ready to discover new magical stories and win shiny stickers today?
          </p>
          {nextLesson && (
            <button
              onClick={() => handleMissionClick(nextLesson.lesson_type, nextLesson.id)}
              className="btn-primary-child flex items-center gap-3 bg-white text-primary hover:scale-105"
            >
              <span className="material-symbols-outlined fill-icon text-2xl">play_circle</span>
              Start Today's Quest
            </button>
          )}
        </div>
        <div className="relative w-full md:w-1/2 h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl z-10">
          <img alt="Magical forest illustration" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAadg4hihepzQdfBeqrtLxBEwALDpSfqdsDLCg9D0jJyjpAQ3_RG1p-Cmj3Qeh0favQdZEgz9QeoK0trTVkyc3M3Gl-RfUxsPDo3iC_MwkazWugAV2kRZ1Oo2h5jhp-LBvdhlNuYVp0GqlH_9Zrj5RLmZyBjH0Ndw5wHZR0Ho3cgDtJEhQ6FZVelOu2FqN_OEm0uh6Wl3aJnPqPsq4uVjI8E4g-gxSQ0VOlvIqEZhsFH5-X4qufm1DXbBF2Q2pG0Avp8n2_jdpjPd94" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>
      </section>

      {/* Quick Actions List */}
      <section className="flex flex-wrap gap-4 justify-between">
        <button onClick={() => { playSfx("click"); router.push("/stories"); }} className="flex-1 min-w-[120px] aspect-square bg-primary-container/40 hover:bg-primary-container/60 text-on-primary-container rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">book</span>
          <span className="font-kids font-bold text-sm">Stories</span>
        </button>
        <button onClick={() => { playSfx("click"); router.push("/learn"); }} className="flex-1 min-w-[120px] aspect-square bg-secondary-container text-on-secondary-container rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">videogame_asset</span>
          <span className="font-kids font-bold text-sm">Games</span>
        </button>
        <button className="flex-1 min-w-[120px] aspect-square bg-tertiary-container text-on-tertiary-container rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">music_note</span>
          <span className="font-kids font-bold text-sm">Songs</span>
        </button>
        <button className="flex-1 min-w-[120px] aspect-square bg-surface-container-high text-on-surface-variant rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">brush</span>
          <span className="font-kids font-bold text-sm">Draw</span>
        </button>
        <button onClick={() => { playSfx("click"); router.push("/collect"); }} className="flex-1 min-w-[120px] aspect-square bg-surface-container-high text-on-surface-variant rounded-3xl flex flex-col items-center justify-center gap-2 spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">stars</span>
          <span className="font-kids font-bold text-sm">Badges</span>
        </button>
      </section>

      {/* Progress Card - Design System: card-child, NO borders */}
      <section className="card-child">
        {/* NO divider - use spacing-6 gap (Design System Rule 5) */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-headline-md text-on-surface">Your Journey</h3>
            <p className="text-on-surface-variant font-body text-sm mt-1">
              {totalCount - completedCount} lessons until next phase!
            </p>
          </div>
          <span className="text-tertiary font-headline font-black text-3xl">{progressPercent}%</span>
        </div>
        {/* Progress bar using design system classes */}
        <div className="progress-bar-child">
          <div className="progress-fill-child" style={{ width: `${Math.max(progressPercent, 5)}%` }}>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow-lg ghost-border flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-[14px] fill-icon">auto_awesome</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-4 px-2">
          <span className="text-label-md font-kids text-on-surface-variant">Start</span>
          <span className="text-label-md font-kids text-tertiary">Current</span>
          <span className="text-label-md font-kids text-on-surface-variant">Goal</span>
        </div>
      </section>

      {/* Lesson List */}
      <section className="space-y-6">
        <h3 className="text-headline-md text-on-surface">Pick Your Adventure</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentLessons.map((lesson, idx) => {
            const isCompleted = lesson.is_completed;
            const isNew = !isCompleted && lesson.id === nextLesson?.id;

            const bgs = [
              "bg-primary-container/10",
              "bg-secondary-container/20",
              "bg-tertiary-container/20"
            ];
            const textColors = ["text-primary", "text-secondary", "text-tertiary"];
            const icons = ["auto_stories", "mic_external_on", "headphones"];
            const bgClass = bgs[idx % 3];
            const tc = textColors[idx % 3];
            const icon = icons[idx % 3];

            return (
              <div
                key={lesson.id}
                onClick={() => !isCompleted && handleMissionClick(lesson.lesson_type, lesson.id)}
                className={cn(
                  "card-child overflow-hidden flex flex-col",
                  isCompleted ? "opacity-50" : "cursor-pointer"
                )}
              >
                <div className={cn("aspect-video relative overflow-hidden flex items-center justify-center", bgClass, isCompleted && "grayscale bg-surface-container-high")}>
                  {isCompleted ? (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-tertiary shadow-xl">
                        <span className="material-symbols-outlined fill-icon text-3xl">check_circle</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isNew ? (
                        <img alt="Lesson Cover" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXPmrstjP3HNwoqqUvnE68CcftmLahMLINOsD_d0vs-zClhzbma4G1Xu0uj9z3sAbS-FH0ES70UVDdX15-kC1GYiyhY3Z-3MiDkjPYhmX2ibobmXYwUXequ5SAgkpAP8K9U3IvVunlhRrNG3sG5cXcXK_3Tthutej345qrMpnvkJdOIpXkm8vg4sptxR0Y9QPHlq0Bqq_3jYqy1K5yvinUSoIVG6hPT4yA8KgeIUxTZAWkZCIS8laXalvbDg9srmZAoNHFmfR4w-sA" />
                      ) : (
                        <span className={cn("material-symbols-outlined text-6xl fill-icon", tc)}>{icon}</span>
                      )}
                      <div className={cn("absolute top-4 left-4 text-white px-3 py-1 rounded-full text-[10px] font-headline font-black tracking-widest uppercase", tc.replace('text-', 'bg-'))}>
                        {isNew ? "New Story" : lesson.lesson_type.replace('_', ' ')}
                      </div>
                    </>
                  )}
                </div>
                {/* Card content - NO dividers per Design System */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-title-lg text-on-surface mb-2">{lesson.title_ko}</h4>
                    <p className="text-on-surface-variant text-sm font-body line-clamp-2">{lesson.title}</p>
                  </div>
                  {!isCompleted && (
                    <div className="mt-6 flex items-center justify-between">
                      <span className={cn("text-label-md font-kids flex items-center gap-1", tc)}>
                        <span className="material-symbols-outlined text-sm">schedule</span> 5m
                      </span>
                      <button className={cn("font-kids font-bold flex items-center gap-1 group", tc)}>
                        {isNew ? "Explore" : "Start"} <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Help Button */}
      <div className="fixed bottom-24 right-6 z-40 md:bottom-12">
        <button className="w-16 h-16 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center spring-bounce">
          <span className="material-symbols-outlined text-3xl fill-icon">help</span>
        </button>
      </div>
    </div>
  );
}
