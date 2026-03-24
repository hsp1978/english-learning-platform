"use client";

import { useCallback, useRef, useState } from "react";
import { env } from "@/lib/env";
import api from "@/lib/api";
import type { PronunciationResult } from "@/types";

interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onTranscript?: (text: string) => void;
}

interface UseSpeechReturn {
  speak: (text: string, queue?: boolean) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => Promise<string>;
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  evaluatePronunciation: (
    childId: string,
    targetText: string,
    context?: string,
  ) => Promise<PronunciationResult | null>;
  isEvaluating: boolean;
  supported: boolean;
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const {
    lang = "en-US",
    rate = 1.0,
    pitch = 1.2,
    onTranscript,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveStopRef = useRef<((text: string) => void) | null>(null);

  const supported =
    typeof window !== "undefined" &&
    ("speechSynthesis" in window || "webkitSpeechSynthesis" in window);

  const speak = useCallback(
    (text: string, queue: boolean = false) => {
      if (!supported) return;
      if (!queue) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1.0;

      // Load voices and select appropriate English voice
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();

        // Prefer Google US English or other clear English voices
        let preferred = voices.find(
          (v) => v.lang.startsWith("en") &&
            (v.name.includes("Google US English") ||
             v.name.includes("Samantha") ||
             v.name.includes("Victoria") ||
             v.name.includes("Karen") ||
             v.name.includes("Tessa"))
        );

        // Fallback to any female English voice
        if (!preferred) {
          preferred = voices.find(
            (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
          );
        }

        // Final fallback to any English voice
        if (!preferred) {
          preferred = voices.find((v) => v.lang.startsWith("en"));
        }

        if (preferred) {
          utterance.voice = preferred;
          console.log("Selected voice:", preferred.name, preferred.lang);
        } else {
          console.warn("No English voice found, using default");
        }
      };

      // Try to load voices immediately
      loadVoices();

      // If no voices yet, wait for them to load (Chrome issue)
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      }

      utterance.onstart = () => {
        console.log("Speaking:", text);
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log("Finished speaking");
        setIsSpeaking(false);
      };
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
      };

      // Small delay to ensure voice is loaded
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    },
    [lang, rate, pitch, supported],
  );

  const stopSpeaking = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [supported]);

  const hasBrowserSTT = useCallback(() => {
    return typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  const startListening = useCallback(async () => {
    if (!env.enableSpeech) return;

    setTranscript("");
    transcriptRef.current = "";
    chunksRef.current = [];

    // Try Web Speech API if available (HTTPS or localhost)
    if (hasBrowserSTT()) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = "";
        let interimText = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        const combined = finalText || interimText;
        transcriptRef.current = combined;
        setTranscript(combined);
        onTranscript?.(combined);
      };

      recognition.onend = () => {
        // Don't set isListening=false here — MediaRecorder may still be active
        recognitionRef.current = null;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition error:", e.error);
        }
        // Don't set isListening=false — Whisper fallback via MediaRecorder still works
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    }

    // Record audio blob (for Whisper fallback and pronunciation evaluation)
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch {
        console.warn("Microphone permission denied or unavailable");
      }
    }

    // Always set listening true — user can still type in fallback text input
    setIsListening(true);
  }, [lang, onTranscript, hasBrowserSTT]);

  const stopListening = useCallback(async (): Promise<string> => {
    setIsListening(false);

    // Stop Web Speech API if active
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop media recorder and collect audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>((res) => {
        mediaRecorderRef.current!.onstop = () => res();
        mediaRecorderRef.current!.stop();
      });
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    }

    // If browser STT already got a transcript, use it directly
    if (transcriptRef.current && transcriptRef.current !== "인식 중...") {
      return transcriptRef.current;
    }

    // Whisper fallback: send recorded audio to backend
    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (audioBlob.size < 100) {
      return "";
    }

    try {
      setIsTranscribing(true);
      setTranscript("인식 중...");
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const resp = await api.post<{ transcript: string }>("/speech/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const text = resp.data.transcript || "";
      transcriptRef.current = text;
      setTranscript(text);
      return text;
    } catch {
      setTranscript("");
      return "";
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const evaluatePronunciation = useCallback(
    async (
      childId: string,
      targetText: string,
      context?: string,
    ): Promise<PronunciationResult | null> => {
      setIsEvaluating(true);
      try {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return null;

        const formData = new FormData();
        formData.append("child_id", childId);
        formData.append("target_text", targetText);
        formData.append("context", context ?? "");
        formData.append("audio", audioBlob, "recording.webm");

        const res = await api.post<PronunciationResult>(
          "/speech/evaluate",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        return res.data;
      } catch {
        return null;
      } finally {
        setIsEvaluating(false);
      }
    },
    [],
  );

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    startListening,
    stopListening,
    isListening,
    isTranscribing,
    transcript,
    evaluatePronunciation,
    isEvaluating,
    supported,
  };
}
