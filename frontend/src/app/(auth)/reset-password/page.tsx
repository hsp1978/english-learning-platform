"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import api from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Call actual reset API
      await api.post("/auth/reset-password", { email });

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "비밀번호 재설정 요청에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-mesh min-h-screen flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-surface-container-lowest rounded-xl p-8 md:p-12 text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]"
        >
          <div className="text-6xl mb-6">✉️</div>
          <h2 className="font-headline font-extrabold text-2xl text-primary mb-3">
            이메일을 확인하세요
          </h2>
          <p className="text-body-lg text-on-surface-variant mb-8 leading-relaxed">
            {email}로 비밀번호 재설정 링크를 보냈습니다.
            <br />
            이메일을 확인해 주세요.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-4 bg-hero-texture text-on-primary font-headline font-bold rounded-xl shadow-parent-ambient hover:scale-[1.02] transition-transform duration-300"
          >
            로그인 페이지로
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-mesh min-h-screen flex items-center justify-center p-4 md:p-8 font-body">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-surface-container-lowest rounded-xl p-8 md:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]"
      >
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="font-headline font-extrabold text-3xl tracking-tight text-primary mb-3">
            비밀번호 재설정
          </h1>
          <p className="text-on-surface-variant font-medium">
            가입하신 이메일을 입력해 주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="font-label text-sm font-bold text-on-surface-variant px-1"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none text-on-surface"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-primary-container/30">
              <p className="text-sm text-primary font-semibold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-hero-texture text-on-primary font-headline font-bold rounded-xl shadow-parent-ambient hover:scale-[1.02] transition-transform duration-300 disabled:opacity-50 disabled:hover:scale-100"
            disabled={isLoading}
          >
            {isLoading ? "전송 중..." : "재설정 링크 받기"}
          </button>

          <div className="text-center pt-4">
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline transition-all"
            >
              ← 로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
