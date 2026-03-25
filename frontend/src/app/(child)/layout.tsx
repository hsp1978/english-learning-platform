"use client";

import { type ReactNode, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import { useGameStore } from "@/stores/gameStore";
import { useAudio } from "@/hooks/useAudio";
import FloatingParticles from "@/components/FloatingParticles";
import BgmManager from "@/components/BgmManager";

const TABS = [
  { path: "/home", label: "놀이터", icon: "videogame_asset" },
  { path: "/stories", label: "책방", icon: "auto_stories" },
  { path: "/learn", label: "학습", icon: "face_5" },
  { path: "/collect", label: "스티커", icon: "auto_awesome" },
];

export default function ChildLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { playSfx } = useAudio();
  const { bgmEnabled, toggleBgm } = useGameStore();

  const activeTab = TABS.find((t) => pathname.startsWith(t.path))?.path ?? "/home";
  const isTalkSession = pathname.startsWith("/talk/");

  const handleTabClick = useCallback((path: string) => {
    if (path !== activeTab) {
      playSfx("click");
      router.push(path);
    }
  }, [activeTab, playSfx, router]);

  if (isTalkSession) {
    return (
      <div className="flex flex-col h-[100dvh]">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface">
      <BgmManager />
      <FloatingParticles count={6} />

      {/* TopAppBar */}
      <header className="bg-surface/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-none shadow-parent-ambient">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg spring-bounce">
            <span className="material-symbols-outlined fill-icon text-xl">auto_fix_high</span>
          </div>
          <h1 className="text-xl font-headline font-black text-primary tracking-tight">English Fairy</h1>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-6">
            <button onClick={() => handleTabClick("/home")} className={cn("font-headline font-bold", activeTab === "/home" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary transition-colors")}>놀이터</button>
            <button onClick={() => handleTabClick("/stories")} className={cn("font-headline font-bold transition-colors", activeTab === "/stories" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary")}>책방</button>
            <button onClick={() => handleTabClick("/collect")} className={cn("font-headline font-bold transition-colors", activeTab === "/collect" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary")}>스티커</button>
          </nav>
          <div className="flex gap-2">
            {/* BGM Toggle Button */}
            <button
              onClick={() => {
                playSfx("click");
                toggleBgm();
              }}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all spring-bounce",
                bgmEnabled
                  ? "text-primary bg-primary-container hover:bg-primary-container/80"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
              title={bgmEnabled ? "배경음악 끄기" : "배경음악 켜기"}
            >
              <span className="material-symbols-outlined">
                {bgmEnabled ? "music_note" : "music_off"}
              </span>
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors spring-bounce">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
            <button onClick={() => { playSfx("click"); router.push("/dashboard"); }} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors spring-bounce">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface/60 backdrop-blur-xl border-none pb-safe md:hidden shadow-parent-ambient">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => handleTabClick(tab.path)}
              className={cn("flex flex-col items-center justify-center px-4 py-2 transition-all font-kids font-bold text-xs", isActive ? "text-primary" : "text-on-surface-variant hover:scale-110")}
            >
              <span className={cn("material-symbols-outlined text-2xl", isActive && "fill-icon")}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
