import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  Character,
  CharacterUnlockResponse,
  ConversationScenario,
  CurriculumMap,
  LearnedWords,
  LearningRecord,
  LearningRecordCreate,
  LessonDetail,
  PronunciationResult,
  ReviewItem,
  ShopItem,
  WeeklyReport,
} from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";

// ── Key factory ──

export const queryKeys = {
  curriculumMap: (childId: string) => ["curriculum", "map", childId] as const,
  lessonDetail: (lessonId: string, childId: string) =>
    ["curriculum", "lesson", lessonId, childId] as const,
  reviewDue: (childId: string) => ["review", "due", childId] as const,
  characters: (childId: string) => ["characters", childId] as const,
  shopItems: (childId: string) => ["shop", childId] as const,
  scenarios: (childId: string) => ["scenarios", childId] as const,
  weeklyReport: (childId: string) => ["parent", "weekly", childId] as const,
  learnedWords: (childId: string, days: number) =>
    ["parent", "learned-words", childId, days] as const,
};

// ── Curriculum ──

export function useCurriculumMap() {
  const childId = useAuthStore((s) => s.activeChildId);
  return useQuery({
    queryKey: queryKeys.curriculumMap(childId ?? ""),
    queryFn: async () => {
      const res = await api.get<CurriculumMap>("/curriculum/map", {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLessonDetail(lessonId: string) {
  const childId = useAuthStore((s) => s.activeChildId);
  return useQuery({
    queryKey: queryKeys.lessonDetail(lessonId, childId ?? ""),
    queryFn: async () => {
      const res = await api.get<LessonDetail>(`/curriculum/lesson/${lessonId}`, {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId && !!lessonId,
  });
}

// ── Learning Records ──

export function useRecordLearning() {
  const childId = useAuthStore((s) => s.activeChildId);
  const queryClient = useQueryClient();
  const addXP = useGameStore((s) => s.addXP);
  const setRecommendation = useGameStore((s) => s.setRecommendation);
  const pushReward = useGameStore((s) => s.pushReward);

  return useMutation({
    mutationFn: async (body: LearningRecordCreate) => {
      const totalItems = Math.max(0, Math.trunc(body.total_items));
      const correctItems = Math.min(
        totalItems,
        Math.max(0, Math.trunc(body.correct_items))
      );
      const score = Math.min(1, Math.max(0, body.score));

      const res = await api.post<LearningRecord>("/progress/record", {
        ...body,
        score,
        total_items: totalItems,
        correct_items: correctItems,
        time_spent_seconds: Math.max(0, Math.trunc(body.time_spent_seconds)),
      }, {
        params: { child_id: childId },
      });
      return res.data;
    },
    onSuccess: (data) => {
      addXP(data.xp_earned);
      if (data.month_advanced && data.new_month) {
        pushReward({
          type: "month_up",
          amount: data.new_month,
          label: `${data.new_month}개월차`,
        });
      }
      if (data.adaptive_recommendation && data.adaptive_recommendation.action !== "none") {
        setRecommendation(data.adaptive_recommendation);
      }
      if (childId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.curriculumMap(childId),
        });
      }
    },
  });
}

// ── Spaced Repetition ──

export function useReviewDue() {
  const childId = useAuthStore((s) => s.activeChildId);
  return useQuery({
    queryKey: queryKeys.reviewDue(childId ?? ""),
    queryFn: async () => {
      const res = await api.get<ReviewItem[]>("/review/due", {
        params: { child_id: childId, limit: 20 },
      });
      return res.data;
    },
    enabled: !!childId,
    staleTime: 60 * 1000,
  });
}

export function useSubmitReview() {
  const childId = useAuthStore((s) => s.activeChildId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { item_type: string; item_key: string; score: number }) => {
      const res = await api.post<ReviewItem>("/review/record", body, {
        params: { child_id: childId },
      });
      return res.data;
    },
    onSuccess: () => {
      if (childId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.reviewDue(childId) });
      }
    },
  });
}

// ── Characters ──

export function useCharacters() {
  const childId = useAuthStore((s) => s.activeChildId);
  return useQuery({
    queryKey: queryKeys.characters(childId ?? ""),
    queryFn: async () => {
      const res = await api.get<Character[]>("/game/characters", {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId,
  });
}

export function useUnlockCharacter() {
  const childId = useAuthStore((s) => s.activeChildId);
  const queryClient = useQueryClient();
  const { addXP, addCoins, pushReward } = useGameStore();

  return useMutation({
    mutationFn: async (characterId: string) => {
      const res = await api.post<CharacterUnlockResponse>(
        "/game/characters/unlock",
        { character_id: characterId },
        { params: { child_id: childId } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      addXP(data.xp_earned);
      addCoins(data.coins_earned);
      pushReward({
        type: "character",
        label: data.character.name_ko,
        characterId: data.character.id,
      });
      if (childId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.characters(childId) });
      }
    },
  });
}

// ── Shop ──

export function useShopItems() {
  const childId = useAuthStore((s) => s.activeChildId);
  return useQuery({
    queryKey: queryKeys.shopItems(childId ?? ""),
    queryFn: async () => {
      const res = await api.get<ShopItem[]>("/game/shop", {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId,
  });
}

// ── AI Conversation ──

export function useConversationScenarios() {
  const childId = useAuthStore((s) => s.activeChildId);
  return useQuery({
    queryKey: queryKeys.scenarios(childId ?? ""),
    queryFn: async () => {
      const res = await api.get<ConversationScenario[]>("/talk/scenarios", {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId,
  });
}

// ── Child Progress ──

export function useAdvanceMonth() {
  const childId = useAuthStore((s) => s.activeChildId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!childId) throw new Error("No active child");
      const res = await api.patch(`/children/${childId}`, { advance_month: true });
      return res.data;
    },
    onSuccess: () => {
      if (childId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.curriculumMap(childId) });
      }
    },
  });
}

// ── Parent Dashboard ──

export function useWeeklyReport(childId: string) {
  return useQuery({
    queryKey: queryKeys.weeklyReport(childId),
    queryFn: async () => {
      const res = await api.get<WeeklyReport>(`/parent/report/weekly/${childId}`);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useLearnedWords(childId: string, days: number = 7) {
  return useQuery({
    queryKey: queryKeys.learnedWords(childId, days),
    queryFn: async () => {
      const res = await api.get<LearnedWords>(
        `/parent/report/learned-words/${childId}`,
        { params: { days } },
      );
      return res.data;
    },
    enabled: !!childId,
    staleTime: 10 * 60 * 1000,
  });
}
