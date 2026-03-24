"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

const SHAPES = ["✦", "✧", "♡", "⋆", "○"];
const COLORS = ["#FFB8CC", "#C4ADFF", "#A8E6E0", "#FFD93D", "#FF8A80"];

interface Particle {
  id: number;
  shape: string;
  color: string;
  x: number;
  size: number;
  delay: number;
  duration: number;
}

export default function FloatingParticles({ count = 8 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      shape: SHAPES[i % SHAPES.length],
      color: COLORS[i % COLORS.length],
      x: 5 + (i / count) * 90,
      size: 10 + Math.random() * 10,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 6,
    })),
  [count]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute select-none"
          style={{
            left: `${p.x}%`,
            fontSize: p.size,
            color: p.color,
            opacity: 0.25,
          }}
          animate={{
            y: ["-10%", "110vh"],
            x: [0, Math.sin(p.id) * 30, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {p.shape}
        </motion.div>
      ))}
    </div>
  );
}
