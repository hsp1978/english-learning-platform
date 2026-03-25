"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Howl } from "howler";
import { useGameStore } from "@/stores/gameStore";

const BGM_TRACKS = {
  home: "/audio/bgm/playful-garden.mp3",
  stories: "/audio/bgm/gentle-reading.mp3",
  learn: "/audio/bgm/focus-learning.mp3",
  collect: "/audio/bgm/sparkle-collection.mp3",
  default: "/audio/bgm/playful-garden.mp3",
} as const;

/**
 * BgmManager - 전역 배경 음악 관리자
 *
 * 페이지별로 다른 BGM을 자동으로 재생합니다.
 * - home: 활기찬 정원 분위기
 * - stories: 부드러운 독서 음악
 * - learn: 집중 학습 음악
 * - collect: 반짝이는 수집 음악
 *
 * 설정에서 켜기/끄기 가능
 */
export default function BgmManager() {
  const pathname = usePathname();
  const bgmEnabled = useGameStore((s) => s.bgmEnabled);
  const bgmRef = useRef<Howl | null>(null);
  const currentTrackRef = useRef<string>("");

  useEffect(() => {
    if (!bgmEnabled) {
      bgmRef.current?.fade(bgmRef.current.volume(), 0, 500);
      setTimeout(() => {
        bgmRef.current?.stop();
      }, 500);
      return;
    }

    // 페이지에 따라 BGM 선택
    let trackKey: keyof typeof BGM_TRACKS = "default";
    if (pathname.startsWith("/home")) trackKey = "home";
    else if (pathname.startsWith("/stories")) trackKey = "stories";
    else if (pathname.startsWith("/learn")) trackKey = "learn";
    else if (pathname.startsWith("/collect")) trackKey = "collect";

    const trackPath = BGM_TRACKS[trackKey];

    // 이미 같은 트랙이 재생 중이면 무시
    if (currentTrackRef.current === trackPath && bgmRef.current?.playing()) {
      return;
    }

    // 이전 BGM 페이드아웃 후 정지
    if (bgmRef.current) {
      const oldBgm = bgmRef.current;
      oldBgm.fade(oldBgm.volume(), 0, 500);
      setTimeout(() => {
        oldBgm.stop();
        oldBgm.unload();
      }, 500);
    }

    // 새 BGM 로드 및 재생
    currentTrackRef.current = trackPath;
    bgmRef.current = new Howl({
      src: [trackPath],
      loop: true,
      volume: 0,
      onloaderror: (id, error) => {
        console.warn(`BGM file not found: ${trackPath} - silently ignoring`, error);
      },
      onload: () => {
        // 페이드인으로 부드럽게 시작
        bgmRef.current?.play();
        bgmRef.current?.fade(0, 0.25, 1000);
      },
    });

    // Cleanup
    return () => {
      if (bgmRef.current) {
        const oldBgm = bgmRef.current;
        oldBgm.fade(oldBgm.volume(), 0, 300);
        setTimeout(() => {
          oldBgm.stop();
          oldBgm.unload();
        }, 300);
      }
    };
  }, [pathname, bgmEnabled]);

  return null; // 이 컴포넌트는 UI가 없습니다
}
