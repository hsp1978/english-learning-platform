"use client";

import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";

type SfxName = "correct" | "wrong" | "unlock" | "click" | "coin" | "levelup" | "blend";

const SFX_PATHS: Record<SfxName, string> = {
  correct: "/audio/sfx/correct.mp3",
  wrong: "/audio/sfx/wrong.mp3",
  unlock: "/audio/sfx/unlock.mp3",
  click: "/audio/sfx/click.mp3",
  coin: "/audio/sfx/coin.mp3",
  levelup: "/audio/sfx/levelup.mp3",
  blend: "/audio/sfx/blend.mp3",
};

const sfxCache = new Map<string, Howl>();

function getSfx(name: SfxName): Howl | null {
  const path = SFX_PATHS[name];
  let howl = sfxCache.get(path);
  if (!howl) {
    howl = new Howl({
      src: [path],
      preload: true,
      volume: 0.6,
      onloaderror: () => {
        console.warn(`SFX file not found: ${path} - silently ignoring`);
        // Mark as failed so we don't keep trying
        sfxCache.set(path, null as any);
      },
    });
    sfxCache.set(path, howl);
  }
  return howl;
}

export function useAudio() {
  const bgmRef = useRef<Howl | null>(null);

  const playSfx = useCallback((name: SfxName) => {
    try {
      const sfx = getSfx(name);
      if (sfx) {
        sfx.play();
      }
    } catch (error) {
      console.warn(`Failed to play SFX: ${name}`, error);
    }
  }, []);

  const playBgm = useCallback((path: string, volume = 0.3) => {
    bgmRef.current?.stop();
    bgmRef.current = new Howl({
      src: [path],
      loop: true,
      volume,
    });
    bgmRef.current.play();
  }, []);

  const stopBgm = useCallback(() => {
    bgmRef.current?.stop();
  }, []);

  const playWord = useCallback((word: string) => {
    const path = `/audio/words/${word.toLowerCase()}.mp3`;
    const howl = new Howl({
      src: [path],
      volume: 0.8,
      onloaderror: () => {
        console.warn(`Audio file not found, using TTS for: ${word}`);
        // Fallback to browser TTS
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(word);
          utterance.lang = 'en-US';
          utterance.rate = 0.75; // Slower for kids
          utterance.pitch = 1.3; // Higher pitch for cute tone
          utterance.volume = 1.0;

          // Try to select a female voice
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(voice =>
            voice.lang.startsWith('en') &&
            (voice.name.includes('Female') || voice.name.includes('Google US English'))
          );
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }

          window.speechSynthesis.speak(utterance);
        }
      },
    });
    howl.play();
  }, []);

  const playPhoneme = useCallback((phoneme: string) => {
    const safe = phoneme.replace(/[^a-zA-Z]/g, "").toLowerCase();

    // Directly use TTS for single letters (more reliable than empty audio files)
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech for immediate response
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(safe);
      utterance.lang = 'en-US';
      utterance.rate = 0.75; // Slower for kids to understand clearly
      utterance.pitch = 1.3; // Higher pitch for cute, child-friendly tone
      utterance.volume = 1.0;

      // Try to select a female voice for friendlier tone
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice =>
        voice.lang.startsWith('en') &&
        (voice.name.includes('Female') || voice.name.includes('Google US English'))
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Speak immediately
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn(`Speech synthesis not supported, trying audio files for: ${phoneme}`);
      // Fallback to audio files
      const paths = [
        `/audio/phonics/${safe}.mp3`,
        `/audio/words/${safe}.mp3`,
      ];
      const howl = new Howl({
        src: paths,
        volume: 0.8,
        onloaderror: () => console.warn(`Failed to load audio for: ${phoneme}`)
      });
      howl.play();
    }
  }, []);

  // Cleanup BGM on unmount
  useEffect(() => {
    return () => {
      bgmRef.current?.stop();
    };
  }, []);

  return { playSfx, playBgm, stopBgm, playWord, playPhoneme };
}
