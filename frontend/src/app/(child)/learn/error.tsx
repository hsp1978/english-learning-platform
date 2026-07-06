"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Learn route error:", error);
  }, [error]);

  return (
    <div className="px-4 py-6 min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="card-child w-full max-w-sm text-center py-10">
        <div className="text-5xl mb-4">✨</div>
        <p className="font-headline text-xl font-bold text-on-surface mb-2">
          레슨을 다시 불러와야 해요
        </p>
        <p className="font-kids text-sm text-on-surface-variant mb-6">
          잠깐 문제가 생겼지만 학습 기록은 보호되고 있어요.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary-child">
            새로고침
          </button>
          <button onClick={() => router.push("/learn")} className="btn-tertiary-child">
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
