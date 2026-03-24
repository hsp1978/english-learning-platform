"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { setTokens } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { TokenResponse } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post<TokenResponse>("/auth/login", {
        email,
        password,
      });
      setTokens(res.data.access_token, res.data.refresh_token);

      const payload = JSON.parse(atob(res.data.access_token.split(".")[1]));
      setAuthenticated(payload.sub);

      const childrenRes = await api.get("/children");

      if (!childrenRes.data || childrenRes.data.length === 0) {
        router.replace("/setup");
      } else {
        useAuthStore.getState().setChildren(childrenRes.data);
        router.replace("/home");
      }
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen flex items-center justify-center p-4 md:p-8">
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">
        
        {/* Left Section: Parent Experience */}
        <section className="lg:col-span-5 p-8 md:p-12 flex flex-col justify-between order-2 lg:order-1 bg-surface-container-lowest">
          <div>
            <header className="mb-12">
              <h1 className="font-headline font-extrabold text-3xl tracking-tight text-primary mb-2">English Fairy</h1>
              <p className="text-on-surface-variant font-medium">부모님 환영합니다. 자녀의 학습 여정을 관리하세요.</p>
            </header>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-sm font-bold text-on-surface-variant px-1" htmlFor="email">이메일 주소</label>
                <input 
                  id="email" 
                  type="email" 
                  required
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none" 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="font-label text-sm font-bold text-on-surface-variant" htmlFor="password">비밀번호</label>
                  <button type="button" onClick={() => router.push("/reset-password")} className="text-xs font-bold text-primary hover:text-primary-dim transition-colors">Forgot?</button>
                </div>
                <input 
                  id="password" 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-surface-container-highest/50 border-none rounded-md focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline-variant outline-none" 
                />
              </div>

              {error && (
                <p className="font-label text-sm font-bold text-error px-1">{error}</p>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-hero-texture text-on-primary font-headline font-bold rounded-xl shadow-parent-ambient hover:scale-[1.02] transition-transform duration-300 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "로그인 중..." : "대시보드 접속"}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-outline-variant/20"></div>
              <span className="text-xs font-bold text-outline-variant uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-outline-variant/20"></div>
            </div>

            <div className="mt-8 flex justify-center">
              <p className="text-sm text-on-surface-variant font-medium">
                계정이 없으신가요? <button onClick={() => router.push("/signup")} className="text-primary font-bold">회원가입</button>
              </p>
            </div>
          </div>
        </section>

        {/* Right Section: Child Experience (Visual Play) */}
        <section className="lg:col-span-7 bg-surface-container-low p-8 md:p-12 relative flex flex-col items-center justify-center order-1 lg:order-2 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-12 right-12 w-32 h-32 bg-tertiary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-12 left-12 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"></div>
          
          <div className="relative w-full max-w-lg text-center">
            <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-kids font-bold text-sm mb-6 shadow-sm">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              스마트한 우리 아이 첫 영어
            </div>
            
            <h2 className="font-kids font-bold text-4xl text-on-background mb-8 leading-tight">
              놀이로 배우는 <br />
              <span className="text-tertiary">초등 영어!</span>
            </h2>

            {/* Child Profiles Bento Grid - Dummy visuals for now as this is a login screen */}
            <div className="grid grid-cols-2 gap-6 mb-12 max-w-sm mx-auto">
              <div className="group relative flex flex-col items-center gap-3 focus:outline-none">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-1 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  <div className="w-full h-full rounded-[1.25rem] overflow-hidden bg-tertiary-container/30 flex items-center justify-center">
                    <span className="text-6xl">🧚</span>
                  </div>
                </div>
                <span className="font-kids font-bold text-lg text-on-background">재미있는</span>
              </div>
              <div className="group relative flex flex-col items-center gap-3 focus:outline-none">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-1 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <div className="w-full h-full rounded-[1.25rem] overflow-hidden bg-primary-container/30 flex items-center justify-center">
                    <span className="text-6xl">✨</span>
                  </div>
                </div>
                <span className="font-kids font-bold text-lg text-on-background">마법같은</span>
              </div>
            </div>

            <div className="mt-8">
              <span className="inline-flex items-center gap-2 text-on-surface-variant font-kids font-bold text-sm hover:text-primary transition-colors cursor-default">
                <span className="material-symbols-outlined text-lg">help</span>
                부모님 계정으로 먼저 로그인해주세요
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
