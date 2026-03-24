"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudio } from "@/hooks/useAudio";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import type { ChatMessage } from "@/types";

export default function TalkSessionPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);
  const addXP = useGameStore((s) => s.addXP);

  const { speak, startListening, stopListening, isListening, isTranscribing, transcript, supported } = useSpeech();
  const { playSfx } = useAudio();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [totalXP, setTotalXP] = useState(0);
  const [textInput, setTextInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const streamingTextRef = useRef("");
  const spokenLenRef = useRef(0);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  // WebSocket connection
  useEffect(() => {
    if (!childId || !scenarioId) return;

    const token = getAccessToken();
    if (!token) return;

    const wsUrl = `${env.wsUrl}/talk/ws/${scenarioId}?token=${token}&child_id=${childId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "assistant_message":
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.content },
          ]);
          speak(data.content);
          break;

        case "token":
          setIsThinking(false);
          setStreamingText((prev) => {
            const next = prev + data.token;
            streamingTextRef.current = next;

            // --- Streaming TTS Logic ---
            const unspokend = next.slice(spokenLenRef.current);
            const match = unspokend.match(/^([\s\S]*?[.!?]+[\s]*)/);
            if (match) {
              const sentence = match[1].trim();
              if (sentence) {
                speak(sentence, true);
                spokenLenRef.current += match[1].length;
              }
            }
            // ---------------------------

            return next;
          });
          break;

        case "turn_complete": {
          setIsThinking(false);
          const finalText = streamingTextRef.current;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: finalText },
          ]);
          
          // Speak any remaining text that didn't have punctuation
          const remaining = finalText.slice(spokenLenRef.current).trim();
          if (remaining) {
            speak(remaining, true);
          }
          
          setStreamingText("");
          streamingTextRef.current = "";
          spokenLenRef.current = 0;
          setTotalXP((prev) => prev + data.xp_earned);
          addXP(data.xp_earned);
          break;
        }

        case "session_end":
          setTotalXP(data.total_xp);
          break;

        case "error":
          console.error("WS error:", data.message);
          break;
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, scenarioId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsRef.current || !text.trim()) return;

      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setIsThinking(true);
      setStreamingText("");
      streamingTextRef.current = "";
      spokenLenRef.current = 0;

      wsRef.current.send(JSON.stringify({ type: "chat", message: text }));
    },
    [],
  );

  const handleMicToggle = useCallback(async () => {
    if (isListening) {
      const finalText = await stopListening();
      if (finalText.trim()) {
        sendMessage(finalText);
      }
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening, sendMessage]);

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      sendMessage(textInput.trim());
      setTextInput("");
    }
  }, [textInput, sendMessage]);

  const handleEndSession = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "end" }));
    playSfx("correct");
    stopListening(); // also disable mic just in case
    router.back();
  }, [playSfx, router, stopListening]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400">
          <ChevronLeftIcon size={24} />
        </button>
        <div className="flex items-center gap-2">
          <span className="badge-xp text-xs">+{totalXP} XP</span>
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-mint-400" : "bg-slate-300",
            )}
          />
        </div>
        <button onClick={handleEndSession} className="btn-ghost text-sm">
          종료
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-magic-100 flex items-center justify-center text-sm mr-2 shrink-0 mt-1">
                  🧚
                </div>
              )}
              <div
                onClick={msg.role === "assistant" ? () => speak(msg.content) : undefined}
                className={cn(
                  "max-w-[75%] px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-fairy-400 text-white rounded-2xl rounded-br-md"
                    : "bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm cursor-pointer active:scale-[0.97] transition-transform",
                )}
              >
                <span className="text-english">{msg.content}</span>
                {msg.role === "assistant" && (
                  <span className="inline-block ml-1.5 text-fairy-300 align-middle" aria-label="다시 듣기">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="inline">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming text */}
        {streamingText && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-magic-100 flex items-center justify-center text-sm mr-2 shrink-0 mt-1">
              🧚
            </div>
            <div className="max-w-[75%] px-4 py-2.5 text-sm bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm">
              <span className="text-english">{streamingText}</span>
              <span className="animate-pulse ml-0.5">|</span>
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {isThinking && !streamingText && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-magic-100 flex items-center justify-center text-sm mr-2">
              🧚
            </div>
            <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area - always visible at bottom */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-white/80 backdrop-blur-sm safe-bottom">
        <div className="flex items-center gap-2">
          {/* Mic button - always shown */}
          <button
            onClick={handleMicToggle}
            disabled={isTranscribing}
            className={cn(
              "shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-white transition-all duration-150 active:scale-95",
              isListening ? "animate-pulse bg-red-400" : (isTranscribing ? "animate-pulse bg-fairy-300" : "bg-fairy-400"),
            )}
          >
            <svg
              width={22}
              height={22}
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

          {/* Text input + send */}
          {isListening || isTranscribing ? (
            <p className="text-xs text-slate-400 flex-1 min-w-0">
              {transcript
                ? <span className="text-slate-700 text-english">{transcript}</span>
                : "듣고 있어요... 말해 보세요!"}
            </p>
          ) : (
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                placeholder="또는 타이핑으로 입력하세요"
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-full bg-white border border-slate-200 outline-none focus:border-fairy-300 focus:ring-1 focus:ring-fairy-200 text-english"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-fairy-400 text-white disabled:opacity-40 active:scale-95 transition-transform"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
