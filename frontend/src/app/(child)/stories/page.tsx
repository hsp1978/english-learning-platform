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
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-6xl animate-bounce">📚</div>
        <div className="font-kids text-xl font-bold text-primary">
          책장을 정리하고 있어요...
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
        <h1 className="font-headline text-3xl font-black text-on-surface mb-6">책방 📚</h1>
        <div className="card-child text-center py-16">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-6xl">📚</span>
          </div>
          <p className="font-headline text-2xl font-bold text-on-surface mb-3">
            아직 읽을 책이 없어요
          </p>
          <p className="font-kids text-base text-on-surface-variant max-w-md mx-auto">
            레슨을 완료하면 재미있는 이야기들이 열려요! 지금 바로 학습을 시작해보세요 ✨
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-8 bg-surface text-on-surface min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center shadow-lg">
          <span className="text-4xl">📚</span>
        </div>
        <div>
          <h1 className="font-headline text-3xl font-black text-on-surface">책방</h1>
          <p className="font-kids text-sm text-on-surface-variant">
            {storyList.filter(s => s.is_read).length}/{storyList.length}권 완독
          </p>
        </div>
      </div>

      {fiction.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
              <span className="text-2xl">📖</span>
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">동화</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fiction.map((story) => (
              <StoryCard key={story.id} story={story} onSelect={() => router.push(`/stories/${story.id}`)} />
            ))}
          </div>
        </section>
      )}

      {nonFiction.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center">
              <span className="text-2xl">🔬</span>
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">논픽션</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        "card-child w-full flex flex-col gap-4 text-left overflow-hidden",
        "spring-bounce",
        story.is_read && "ring-2 ring-tertiary",
      )}
    >
      {/* Cover Image/Icon */}
      <div className={cn(
        "w-full aspect-[4/3] rounded-2xl flex items-center justify-center text-6xl relative overflow-hidden",
        story.is_fiction
          ? "bg-gradient-to-br from-primary-container/40 to-secondary-container/40"
          : "bg-gradient-to-br from-tertiary-container/40 to-secondary-container/40"
      )}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 text-8xl opacity-30 rotate-12">
            {story.is_fiction ? "📖" : "🔬"}
          </div>
        </div>
        <span className="relative z-10">{story.is_fiction ? "📖" : "🔬"}</span>

        {/* Read Badge */}
        {story.is_read && (
          <div className="absolute top-4 right-4 bg-gradient-to-br from-green-400 to-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <span className="material-symbols-outlined text-sm fill-icon">check_circle</span>
            <span className="font-kids font-bold text-xs">완독</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-2 pb-2">
        <p className="font-headline text-lg font-bold text-on-surface line-clamp-2 mb-2">
          {story.title}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">auto_stories</span>
            <span className="font-kids text-xs text-on-surface-variant">
              {story.page_count}페이지
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">school</span>
            <span className="font-kids text-xs text-on-surface-variant">
              L{story.lexile_min}-{story.lexile_max}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
