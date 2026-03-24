import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChildProfile } from "@/types";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  activeChildId: string | null;
  children: ChildProfile[];
  parentPinVerified: boolean;

  setAuthenticated: (userId: string) => void;
  setChildren: (children: ChildProfile[]) => void;
  setActiveChild: (childId: string) => void;
  setParentPinVerified: (verified: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      activeChildId: null,
      children: [],
      parentPinVerified: false,

      setAuthenticated: (userId) =>
        set({ isAuthenticated: true, userId }),

      setChildren: (children) =>
        set((state) => ({
          children,
          activeChildId: state.activeChildId ?? children[0]?.id ?? null,
        })),

      setActiveChild: (childId) =>
        set({ activeChildId: childId }),

      setParentPinVerified: (verified) =>
        set({ parentPinVerified: verified }),

      logout: () =>
        set({
          isAuthenticated: false,
          userId: null,
          activeChildId: null,
          children: [],
          parentPinVerified: false,
        }),
    }),
    {
      name: "ef-auth",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        activeChildId: state.activeChildId,
      }),
    },
  ),
);
