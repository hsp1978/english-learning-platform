import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface GameState {
  xp: number;
  level: number;
  coins: number;
  streakDays: number;
  pendingRewards: PendingReward[];
  bgmEnabled: boolean;
  sfxEnabled: boolean;

  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  setStreak: (days: number) => void;
  syncFromServer: (data: {
    total_xp: number;
    level: number;
    coins: number;
    streak_days: number;
  }) => void;
  pushReward: (reward: PendingReward) => void;
  popReward: () => PendingReward | undefined;
  toggleBgm: () => void;
  toggleSfx: () => void;
  setBgmEnabled: (enabled: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
}

export interface PendingReward {
  type: "xp" | "coins" | "character" | "badge" | "level_up";
  amount?: number;
  label: string;
  characterId?: string;
  badgeCode?: string;
}

const LEVEL_THRESHOLDS = [
  0, 100, 300, 500, 800, 1200, 1700, 2300, 3000, 4000, 5200, 6500, 8000,
];

function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return level;
}

export const useGameStore = create<GameState>()(
  immer((set, get) => ({
    xp: 0,
    level: 1,
    coins: 0,
    streakDays: 0,
    pendingRewards: [],
    bgmEnabled: false, // Disabled by default (BGM files not available)
    sfxEnabled: true,

    addXP: (amount) =>
      set((state) => {
        state.xp += amount;
        const newLevel = calculateLevel(state.xp);
        if (newLevel > state.level) {
          state.pendingRewards.push({
            type: "level_up",
            amount: newLevel,
            label: `Level ${newLevel}!`,
          });
        }
        state.level = newLevel;
      }),

    addCoins: (amount) =>
      set((state) => {
        state.coins += amount;
      }),

    spendCoins: (amount) => {
      const current = get().coins;
      if (current < amount) return false;
      set((state) => {
        state.coins -= amount;
      });
      return true;
    },

    setStreak: (days) =>
      set((state) => {
        state.streakDays = days;
      }),

    syncFromServer: (data) =>
      set((state) => {
        state.xp = data.total_xp;
        state.level = data.level;
        state.coins = data.coins;
        state.streakDays = data.streak_days;
      }),

    pushReward: (reward) =>
      set((state) => {
        state.pendingRewards.push(reward);
      }),

    popReward: () => {
      const rewards = get().pendingRewards;
      if (rewards.length === 0) return undefined;
      const reward = rewards[0];
      set((state) => {
        state.pendingRewards.splice(0, 1);
      });
      return reward;
    },

    toggleBgm: () =>
      set((state) => {
        state.bgmEnabled = !state.bgmEnabled;
      }),

    toggleSfx: () =>
      set((state) => {
        state.sfxEnabled = !state.sfxEnabled;
      }),

    setBgmEnabled: (enabled) =>
      set((state) => {
        state.bgmEnabled = enabled;
      }),

    setSfxEnabled: (enabled) =>
      set((state) => {
        state.sfxEnabled = enabled;
      }),
  })),
);
