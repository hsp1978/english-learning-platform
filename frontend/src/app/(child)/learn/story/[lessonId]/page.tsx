"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import type { StoryListItem } from "@/types";

export default function StoryLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);

  const { data: stories, isLoading, isError } = useQuery({
    queryKey: ["lesson-stories", lessonId, childId],
    queryFn: async () => {
      const res = await api.get<StoryListItem[]>(`/stories/for-lesson/${lessonId}`, {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!lessonId && !!childId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400 text-xl">
          읽을 이야기를 찾고 있어요...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-6 min-h-[calc(100vh-8rem)]">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 mb-4 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <div className="card-child text-center py-12">
          <p className="font-headline text-xl font-bold text-on-surface mb-2">
            스토리 레슨을 불러오지 못했어요
          </p>
          <button onClick={() => router.refresh()} className="btn-primary-child mt-4">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const storyList = stories ?? [];

  if (storyList.length === 0) {
    return (
      <div className="px-4 py-6 min-h-[calc(100vh-8rem)]">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 mb-4 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <div className="card-child text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <p className="font-headline text-xl font-bold text-on-surface mb-2">
            아직 연결된 스토리가 없어요
          </p>
          <p className="font-kids text-sm text-on-surface-variant">
            이 달의 스토리 콘텐츠를 먼저 추가해야 해요.
          </p>
        </div>
      </div>
    );
  }

  const readCount = storyList.filter((story) => story.is_read).length;

  return (
    <div className="px-4 py-6 space-y-6 bg-surface text-on-surface min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
          aria-label="뒤로 가기"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <div>
          <h1 className="font-headline text-2xl font-black text-on-surface">
            스토리 고르기
          </h1>
          <p className="font-kids text-sm text-on-surface-variant">
            {readCount}/{storyList.length}권 완독
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {storyList.map((story) => (
          <button
            key={story.id}
            onClick={() => router.push(`/stories/${story.id}`)}
            className={cn(
              "card-child w-full flex flex-col gap-4 text-left overflow-hidden spring-bounce",
              story.is_read && "ring-2 ring-tertiary",
            )}
          >
            <div
              className={cn(
                "w-full aspect-[4/3] rounded-2xl flex items-center justify-center text-6xl relative overflow-hidden",
                story.is_fiction
                  ? "bg-gradient-to-br from-primary-container/40 to-secondary-container/40"
                  : "bg-gradient-to-br from-tertiary-container/40 to-secondary-container/40",
              )}
            >
              <span className="relative z-10">{story.is_fiction ? "📖" : "🔬"}</span>
              {story.is_read && (
                <div className="absolute top-4 right-4 bg-gradient-to-br from-green-400 to-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <span className="material-symbols-outlined text-sm fill-icon">
                    check_circle
                  </span>
                  <span className="font-kids font-bold text-xs">완독</span>
                </div>
              )}
            </div>

            <div className="flex-1 px-2 pb-2">
              <p className="font-headline text-lg font-bold text-on-surface line-clamp-2 mb-2">
                {story.title}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">
                    auto_stories
                  </span>
                  <span className="font-kids text-xs text-on-surface-variant">
                    {story.page_count}페이지
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">
                    school
                  </span>
                  <span className="font-kids text-xs text-on-surface-variant">
                    L{story.lexile_min}-{story.lexile_max}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
