"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { setTokens } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { TokenResponse } from "@/types";

export default function SignupPage() {
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    parent_pin: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const requestData = {
      email: form.email,
      password: form.password,
      display_name: form.display_name,
      parent_pin: form.parent_pin || null,
    };

    console.log("회원가입 요청 데이터:", requestData);

    try {
      const res = await api.post<TokenResponse>("/auth/signup", requestData);
      setTokens(res.data.access_token, res.data.refresh_token);

      const payload = JSON.parse(atob(res.data.access_token.split(".")[1]));
      setAuthenticated(payload.sub);

      // 아이 프로필 작성 페이지로 이동
      router.replace("/setup");
    } catch (err: any) {
      console.error("회원가입 에러:", err);

      // HTTP 상태 코드로 먼저 판단
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 409) {
        setError("이미 등록된 이메일입니다.");
      } else if (typeof detail === "string") {
        // 단순 문자열 에러
        if (detail === "Email already registered") {
          setError("이미 등록된 이메일입니다.");
        } else {
          setError(detail);
        }
      } else if (Array.isArray(detail)) {
        // Pydantic 유효성 검사 에러의 경우
        const emailError = detail.find((e: any) => e.loc?.includes("email"));
        const passwordError = detail.find((e: any) => e.loc?.includes("password"));
        const nameError = detail.find((e: any) => e.loc?.includes("display_name"));

        if (emailError) {
          setError("올바른 이메일 형식을 입력해 주세요. (예: user@example.com)");
        } else if (passwordError) {
          setError("비밀번호는 8자 이상이어야 합니다.");
        } else if (nameError) {
          setError("이름을 입력해 주세요.");
        } else {
          // 여러 필드의 에러를 모두 표시
          const errors = detail.map((e: any) => {
            const field = e.loc?.[e.loc.length - 1];
            const fieldName = field === "email" ? "이메일" :
                            field === "password" ? "비밀번호" :
                            field === "display_name" ? "이름" : field;
            return `${fieldName}: ${e.msg}`;
          }).join("\n");
          setError(errors);
        }
      } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        setError("서버 연결 시간이 초과되었습니다. 다시 시도해 주세요.");
      } else {
        setError("회원가입에 실패했습니다. 입력 정보를 확인해 주세요.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen flex items-center justify-center p-4 md:p-8">
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">

        {/* Left Section: Form */}
        <section className="lg:col-span-5 p-8 md:p-12 flex flex-col justify-between order-2 lg:order-1 bg-surface-container-lowest">
          <div>
            <header className="mb-12">
              <h1 className="font-headline font-extrabold text-3xl tracking-tight text-primary mb-2">English Fairy</h1>
              <p className="text-on-surface-variant font-medium">새로운 학습 여정을 시작하세요</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-sm font-bold text-on-surface-variant px-1" htmlFor="display_name">보호자 이름</label>
                <input
                  id="display_name"
                  type="text"
                  placeholder="예: 홍길동"
                  value={form.display_name}
                  onChange={(e) => update("display_name", e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="font-label text-sm font-bold text-on-surface-variant px-1" htmlFor="email">이메일 주소</label>
                <input
                  id="email"
                  type="email"
                  placeholder="parent@example.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="font-label text-sm font-bold text-on-surface-variant px-1" htmlFor="password">비밀번호</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none"
                />
                <p className="text-xs text-on-surface-variant px-1">8자 이상 입력해 주세요</p>
              </div>

              <div className="space-y-2">
                <label className="font-label text-sm font-bold text-on-surface-variant px-1" htmlFor="parent_pin">학부모 PIN (선택)</label>
                <input
                  id="parent_pin"
                  type="password"
                  placeholder="4~6자리"
                  value={form.parent_pin}
                  onChange={(e) => update("parent_pin", e.target.value)}
                  maxLength={6}
                  className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none"
                />
              </div>

              {error && (
                <p className="font-label text-sm font-bold text-primary px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-hero-texture text-on-primary font-headline font-bold rounded-xl shadow-parent-ambient hover:scale-[1.02] transition-transform duration-300 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "가입 중..." : "계정 만들기"}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-outline-variant/20"></div>
              <span className="text-xs font-bold text-outline-variant uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-outline-variant/20"></div>
            </div>

            <div className="mt-8 flex justify-center">
              <p className="text-sm text-on-surface-variant font-medium">
                이미 계정이 있으신가요? <button onClick={() => router.push("/login")} className="text-primary font-bold">로그인</button>
              </p>
            </div>
          </div>
        </section>

        {/* Right Section: Visual */}
        <section className="lg:col-span-7 bg-surface-container-low p-8 md:p-12 relative flex flex-col items-center justify-center order-1 lg:order-2 overflow-hidden">
          <div className="absolute top-12 right-12 w-32 h-32 bg-tertiary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-12 left-12 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"></div>

          <div className="relative w-full max-w-lg text-center">
            <div className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-full font-kids font-bold text-sm mb-6 shadow-sm">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              English Fairy와 함께하는 영어 여행
            </div>

            <h2 className="font-kids font-bold text-4xl text-on-background mb-8 leading-tight">
              우리 아이 첫 영어,<br />
              <span className="text-tertiary">재미있게 시작!</span>
            </h2>

            <div className="grid grid-cols-2 gap-6 mb-12 max-w-sm mx-auto">
              <div className="group relative flex flex-col items-center gap-3">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-1 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  <div className="w-full h-full rounded-[1.25rem] overflow-hidden bg-tertiary-container/30 flex items-center justify-center">
                    <span className="text-6xl">📚</span>
                  </div>
                </div>
                <span className="font-kids font-bold text-lg text-on-background">재미있는 이야기</span>
              </div>
              <div className="group relative flex flex-col items-center gap-3">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-1 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <div className="w-full h-full rounded-[1.25rem] overflow-hidden bg-primary-container/30 flex items-center justify-center">
                    <span className="text-6xl">🎮</span>
                  </div>
                </div>
                <span className="font-kids font-bold text-lg text-on-background">신나는 게임</span>
              </div>
            </div>

            <div className="mt-8">
              <span className="inline-flex items-center gap-2 text-on-surface-variant font-kids font-bold text-sm">
                <span className="material-symbols-outlined text-lg">stars</span>
                AI 기반 개인 맞춤 학습
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
