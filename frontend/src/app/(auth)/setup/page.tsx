"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "motion/react";

export default function SetupPage() {
  const router = useRouter();
  const setChildren = useAuthStore((s) => s.setChildren);

  const [form, setForm] = useState({
    nickname: "",
    birth_year: new Date().getFullYear() - 7,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.nickname.trim()) {
      setError("아이 이름을 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/children", {
        nickname: form.nickname.trim(),
        birth_year: form.birth_year,
      });

      setChildren([res.data]);
      router.replace("/home");
    } catch (err: any) {
      console.error("프로필 생성 에러:", err);
      setError("프로필 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const ageOptions = Array.from({ length: 13 }, (_, i) => ({
    year: currentYear - (i + 4),
    age: i + 4,
  }));

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen flex items-center justify-center p-4 md:p-8">
      <main className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-xl p-8 md:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">🧚✨</div>
            <h1 className="font-headline font-extrabold text-3xl tracking-tight text-primary mb-3">
              아이 프로필 만들기
            </h1>
            <p className="text-on-surface-variant font-medium">
              English Fairy와 함께할 아이의 정보를 알려주세요
            </p>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="font-label text-sm font-bold text-on-surface-variant px-1" htmlFor="nickname">
                아이 이름
              </label>
              <input
                id="nickname"
                type="text"
                placeholder="예: 민수, 서연"
                value={form.nickname}
                onChange={(e) => update("nickname", e.target.value)}
                required
                maxLength={20}
                className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none text-on-surface"
              />
            </div>

            <div className="space-y-2">
              <label className="font-label text-sm font-bold text-on-surface-variant px-1" htmlFor="birth_year">
                출생연도
              </label>
              <select
                id="birth_year"
                value={form.birth_year}
                onChange={(e) => update("birth_year", parseInt(e.target.value))}
                className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all outline-none text-on-surface"
              >
                {ageOptions.map((opt) => (
                  <option key={opt.year} value={opt.year}>
                    {opt.year}년 ({opt.age}세)
                  </option>
                ))}
              </select>
              <p className="text-xs text-on-surface-variant px-1">
                현재 만 {currentYear - form.birth_year}세
              </p>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-label text-sm font-bold text-primary px-1 text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-hero-texture text-on-primary font-headline font-bold rounded-xl shadow-parent-ambient hover:scale-[1.02] transition-transform duration-300 disabled:opacity-50 disabled:hover:scale-100 mt-8"
            >
              {loading ? "생성 중..." : "시작하기! 🚀"}
            </button>
          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-on-surface-variant">
              나중에 설정에서 언제든지 수정할 수 있어요
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
