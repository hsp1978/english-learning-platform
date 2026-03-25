"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/cn";

interface StoryListItem {
  id: string;
  title: string;
  genre: string;
  lexile_min: number;
  lexile_max: number;
  page_count: number;
  cover_image_url: string | null;
  is_fiction: boolean;
  is_read: boolean;
}

export default function StoriesPage() {
  const router = useRouter();
  const childId = useAuthStore((s) => s.activeChildId);

  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories", childId],
    queryFn: async () => {
      const res = await api.get<StoryListItem[]>("/stories", {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse font-display text-fairy-400">
          서가 준비 중...
        </div>
      </div>
    );
  }

  const storyList = stories ?? [];
  const fiction = storyList.filter((s) => s.is_fiction);
  const nonFiction = storyList.filter((s) => !s.is_fiction);

  if (storyList.length === 0) {
    return (
      <div className="px-4 py-3 space-y-4 bg-surface text-on-surface min-h-[calc(100vh-8rem)]">
        <h1 className="text-headline-md text-on-surface">읽기</h1>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-body-lg text-on-surface-variant">
            아직 열린 스토리가 없어요
          </p>
          <p className="text-label-md text-on-surface-variant mt-2">
            학습을 진행하면 새로운 이야기가 열려요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-6 bg-surface text-on-surface min-h-[calc(100vh-8rem)]">
      <h1 className="text-headline-md text-on-surface">읽기</h1>

      {fiction.length > 0 && (
        <section>
          <h2 className="text-body-lg font-headline text-on-surface-variant mb-3">동화</h2>
          <div className="space-y-3">
            {fiction.map((story) => (
              <StoryCard key={story.id} story={story} onSelect={() => router.push(`/stories/${story.id}`)} />
            ))}
          </div>
        </section>
      )}

      {nonFiction.length > 0 && (
        <section>
          <h2 className="text-body-lg font-headline text-on-surface-variant mb-3">논픽션</h2>
          <div className="space-y-3">
            {nonFiction.map((story) => (
              <StoryCard key={story.id} story={story} onSelect={() => router.push(`/stories/${story.id}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StoryCard({ story, onSelect }: { story: StoryListItem; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "card-child w-full flex items-center gap-4 text-left",
        "hover:shadow-[0_24px_48px_-18px_rgba(160,55,59,0.15)]",
        story.is_read && "ring-2 ring-tertiary/30",
      )}
    >
      {/* Cover with tonal layering - Design System Section 4 */}
      <div className="w-16 h-20 rounded-xl bg-surface-container-high flex items-center justify-center text-3xl shrink-0 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]">
        {story.is_fiction ? "📖" : "🔬"}
      </div>
      <div className="flex-1 min-w-0 text-left">
        {/* Title: title-lg - Design System Typography */}
        <p className="text-title-lg text-on-surface truncate">{story.title}</p>
        {/* Metadata: label-md with on-surface-variant */}
        <p className="text-label-md text-on-surface-variant mt-1">
          {story.page_count}페이지 · L{story.lexile_min}-{story.lexile_max}
        </p>
      </div>
      {story.is_read && (
        <span className="text-xs text-tertiary font-bold shrink-0 bg-tertiary-container/30 px-3 py-1 rounded-full">
          완독
        </span>
      )}
    </button>
  );
}
