"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useAudio } from "@/hooks/useAudio";
import { cn } from "@/lib/cn";

interface ShopItem {
  id: string;
  category: string;
  name: string;
  name_ko: string;
  price_coins: number;
  image_url: string | null;
  is_purchased: boolean;
}

const CATEGORY_INFO: Record<string, { emoji: string; label: string }> = {
  background: { emoji: "🎨", label: "배경" },
  avatar: { emoji: "👤", label: "아바타" },
  sticker: { emoji: "✨", label: "스티커" },
  theme: { emoji: "🎭", label: "테마" },
  item: { emoji: "🎁", label: "아이템" },
};

export default function ShopPage() {
  const childId = useAuthStore((s) => s.activeChildId);
  const coins = useGameStore((s) => s.coins);
  const queryClient = useQueryClient();
  const { playSfx } = useAudio();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["shop-items", childId],
    queryFn: async () => {
      const res = await api.get<ShopItem[]>("/game/shop", {
        params: { child_id: childId },
      });
      return res.data;
    },
    enabled: !!childId,
  });

  const purchaseItem = useMutation({
    mutationFn: async (itemId: string) => {
      await api.post(
        "/game/shop/purchase",
        { item_id: itemId },
        { params: { child_id: childId } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-items", childId] });
      queryClient.invalidateQueries({ queryKey: ["child-stats", childId] });
      playSfx("correct");
      setPurchaseSuccess(true);
      setTimeout(() => {
        setSelectedItem(null);
        setPurchaseSuccess(false);
      }, 2000);
    },
    onError: (error: any) => {
      playSfx("wrong");
      const message = error.response?.data?.detail || "구매에 실패했어요";
      alert(message);
    },
  });

  const handlePurchase = useCallback(
    (item: ShopItem) => {
      if (item.is_purchased) return;
      if (coins < item.price_coins) {
        playSfx("wrong");
        alert(`코인이 부족해요! (필요: ${item.price_coins}, 보유: ${coins})`);
        return;
      }
      setSelectedItem(item);
    },
    [coins, playSfx]
  );

  const confirmPurchase = useCallback(() => {
    if (selectedItem) {
      purchaseItem.mutate(selectedItem.id);
    }
  }, [selectedItem, purchaseItem]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-4xl">
          ✨
        </motion.div>
        <span className="font-kids text-primary text-lg ml-3">
          상점 준비 중...
        </span>
      </div>
    );
  }

  const allItems = items ?? [];
  const categories = Array.from(new Set(allItems.map((i) => i.category)));
  const filteredItems =
    selectedCategory !== null
      ? allItems.filter((i) => i.category === selectedCategory)
      : allItems;

  return (
    <div className="px-6 py-6 space-y-6 bg-surface min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-kids text-headline-md font-bold text-on-surface">요정 상점</h1>
        <div className="flex items-center gap-2 px-4 py-2 rounded-3xl bg-secondary-container shadow-child-ambient">
          <span className="text-lg">🪙</span>
          <span className="font-kids font-bold text-on-secondary-container">{coins}</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-6 py-3 rounded-3xl font-kids font-bold transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] whitespace-nowrap spring-bounce",
            selectedCategory === null
              ? "bg-primary text-on-primary shadow-child-ambient"
              : "bg-surface-container text-on-surface-variant"
          )}
        >
          전체
        </button>
        {categories.map((cat) => {
          const info = CATEGORY_INFO[cat] ?? { emoji: "📦", label: cat };
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-6 py-3 rounded-3xl font-kids font-bold transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] whitespace-nowrap spring-bounce",
                selectedCategory === cat
                  ? "bg-primary text-on-primary shadow-child-ambient"
                  : "bg-surface-container text-on-surface-variant"
              )}
            >
              {info.emoji} {info.label}
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏪</div>
          <p className="font-kids font-bold text-title-lg text-on-surface-variant">
            아직 준비된 상품이 없어요
          </p>
          <p className="font-kids text-body-lg text-on-surface-variant mt-2">
            조금만 기다려 주세요!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePurchase(item)}
              disabled={item.is_purchased}
              className={cn(
                "bg-surface-container-lowest rounded-3xl p-6 text-center shadow-child-ambient spring-bounce border-none",
                item.is_purchased && "opacity-50"
              )}
            >
              {/* Item visual */}
              <div className="w-full aspect-square rounded-2xl bg-primary-container/30 flex items-center justify-center text-5xl mb-4">
                {CATEGORY_INFO[item.category]?.emoji ?? "📦"}
              </div>

              {/* Item name */}
              <p className="font-kids font-bold text-body-lg text-on-surface mb-1 truncate">
                {item.name_ko}
              </p>
              <p className="text-label-md text-on-surface-variant truncate mb-3">
                {item.name}
              </p>

              {/* Price or status */}
              {item.is_purchased ? (
                <div className="bg-tertiary-container text-on-tertiary-container px-3 py-1.5 rounded-full text-label-md font-bold inline-block">
                  ✓ 보유 중
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-lg">🪙</span>
                  <span
                    className={cn(
                      "font-kids font-bold",
                      coins >= item.price_coins
                        ? "text-secondary"
                        : "text-primary"
                    )}
                  >
                    {item.price_coins}
                  </span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Purchase confirmation modal */}
      <AnimatePresence>
        {selectedItem && !purchaseSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-sm text-center shadow-[0_20px_40px_-15px_rgba(160,55,59,0.3)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-24 h-24 rounded-2xl bg-primary-container/40 flex items-center justify-center text-5xl mx-auto mb-6">
                {CATEGORY_INFO[selectedItem.category]?.emoji ?? "📦"}
              </div>

              <h3 className="font-kids font-bold text-title-lg text-on-surface mb-2">
                {selectedItem.name_ko}
              </h3>
              <p className="text-body-lg text-on-surface-variant mb-6">
                {selectedItem.name}
              </p>

              <div className="flex items-center justify-center gap-2 mb-8 bg-secondary-container rounded-3xl py-4">
                <span className="text-3xl">🪙</span>
                <span className="font-kids font-bold text-on-secondary-container text-2xl">
                  {selectedItem.price_coins}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 bg-secondary-container text-on-secondary-container py-4 rounded-3xl font-kids font-bold spring-bounce"
                >
                  취소
                </button>
                <button
                  onClick={confirmPurchase}
                  disabled={purchaseItem.isPending}
                  className="flex-1 bg-primary text-on-primary py-4 rounded-3xl font-kids font-bold shadow-child-ambient spring-bounce disabled:opacity-50"
                >
                  {purchaseItem.isPending ? "구매 중..." : "구매하기"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Success animation */}
        {purchaseSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="bg-surface-container-lowest rounded-3xl p-10 w-full max-w-sm text-center shadow-[0_20px_40px_-15px_rgba(160,55,59,0.3)]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="text-7xl mb-6"
              >
                🎉
              </motion.div>
              <h3 className="font-kids font-bold text-headline-md text-primary mb-3">
                구매 완료!
              </h3>
              <p className="font-kids text-body-lg text-on-surface-variant">
                즐겁게 사용해 보세요!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
