"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface PhonicsWritingPadProps {
  word: string;
  phonemes: string[];
  activeIndex: number;
  completedIndices: Set<number>;
  onPronounce: (phoneme: string, index: number) => void;
  onComplete: (index: number) => void;
}

const MIN_TRACE_LENGTH = 80;
const GUIDE_VIEW_HEIGHT = 124;
const GUIDE_SAMPLE_INTERVAL = 6;
const DRAW_SAMPLE_INTERVAL = 5;
const TRACE_TOLERANCE = 28;
const MIN_TOTAL_GUIDE_COVERAGE = 0.7;
const MIN_STROKE_GUIDE_COVERAGE = 0.55;
const MIN_DRAW_ON_GUIDE_RATIO = 0.45;

type Point = {
  x: number;
  y: number;
};

type GuideStroke = {
  d: string;
};

type GuideSample = Point & {
  strokeId: string;
};

const LETTER_GUIDES: Record<string, GuideStroke[]> = {
  a: [
    { d: "M66 48 C48 30 25 42 24 68 C23 96 58 102 68 76" },
    { d: "M69 48 L69 96" },
  ],
  b: [
    { d: "M32 24 L32 96" },
    { d: "M34 59 C54 40 79 52 78 75 C77 101 45 103 34 83" },
  ],
  c: [
    { d: "M71 40 C43 28 23 47 25 70 C27 96 53 104 74 88" },
  ],
  d: [
    { d: "M69 24 L69 96" },
    { d: "M67 59 C47 40 22 52 23 75 C24 101 56 103 67 83" },
  ],
  e: [
    { d: "M32 67 L74 67 C70 36 28 36 26 62 C24 91 56 103 76 84" },
  ],
  f: [
    { d: "M66 28 C45 20 38 36 39 54 L39 98" },
    { d: "M25 54 L64 54" },
  ],
  g: [
    { d: "M67 58 C46 39 23 51 24 75 C25 101 57 102 68 82" },
    { d: "M69 52 L69 103 C68 119 42 119 35 108" },
  ],
  h: [
    { d: "M31 24 L31 96" },
    { d: "M32 60 C47 43 74 50 74 96" },
  ],
  i: [
    { d: "M50 52 L50 96" },
    { d: "M50 35 L50 36" },
  ],
  j: [
    { d: "M58 52 L58 99 C58 116 36 119 30 104" },
    { d: "M58 35 L58 36" },
  ],
  k: [
    { d: "M31 24 L31 96" },
    { d: "M75 50 L32 76 L76 96" },
  ],
  l: [
    { d: "M50 24 L50 96" },
  ],
  m: [
    { d: "M20 52 L20 96" },
    { d: "M21 60 C31 45 48 50 48 96" },
    { d: "M49 60 C60 45 77 50 77 96" },
  ],
  n: [
    { d: "M30 52 L30 96" },
    { d: "M31 60 C47 43 74 50 74 96" },
  ],
  o: [
    { d: "M70 58 C70 34 28 34 28 66 C28 99 72 99 72 66 C72 50 62 40 50 40" },
  ],
  p: [
    { d: "M31 52 L31 110" },
    { d: "M33 59 C54 40 79 52 78 75 C77 100 45 102 33 83" },
  ],
  q: [
    { d: "M67 59 C46 40 22 52 23 75 C24 101 56 103 67 83" },
    { d: "M69 52 L69 110" },
  ],
  r: [
    { d: "M32 52 L32 96" },
    { d: "M33 61 C44 45 62 45 70 58" },
  ],
  s: [
    { d: "M73 46 C47 30 24 45 37 63 C48 78 75 70 73 88 C71 108 37 107 25 92" },
  ],
  t: [
    { d: "M52 26 L52 96" },
    { d: "M32 49 L74 49" },
  ],
  u: [
    { d: "M28 52 L28 78 C28 100 70 100 70 52" },
    { d: "M70 52 L70 96" },
  ],
  v: [
    { d: "M25 52 L50 96 L75 52" },
  ],
  w: [
    { d: "M18 52 L34 96 L50 62 L66 96 L82 52" },
  ],
  x: [
    { d: "M28 52 L74 96" },
    { d: "M74 52 L28 96" },
  ],
  y: [
    { d: "M25 52 L50 80 L75 52" },
    { d: "M50 80 L38 112" },
  ],
  z: [
    { d: "M28 52 L74 52 L28 96 L76 96" },
  ],
};

const FALLBACK_GUIDE: GuideStroke[] = [
  { d: "M50 28 L50 94" },
];

function getGuideLetters(target: string) {
  const letters = target.toLowerCase().replace(/[^a-z]/g, "").split("");
  return letters.length > 0 ? letters : [target.toLowerCase().charAt(0)];
}

function getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function isPointNearAny(point: Point, samples: readonly Point[], tolerance: number) {
  const toleranceSquared = tolerance * tolerance;

  return samples.some((sample) => {
    const dx = point.x - sample.x;
    const dy = point.y - sample.y;
    return dx * dx + dy * dy <= toleranceSquared;
  });
}

function sampleSvgPath(d: string) {
  if (typeof document === "undefined") return [];

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);

  try {
    const totalLength = path.getTotalLength();
    const sampleCount = Math.max(2, Math.ceil(totalLength / GUIDE_SAMPLE_INTERVAL));

    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const point = path.getPointAtLength((totalLength * index) / sampleCount);
      return { x: point.x, y: point.y };
    });
  } catch {
    return [];
  }
}

function buildGuideSamples(target: string, canvas: HTMLCanvasElement): GuideSample[] {
  const rect = canvas.getBoundingClientRect();
  const guideLetters = getGuideLetters(target);
  const viewWidth = Math.max(guideLetters.length, 1) * 100;
  const scale = Math.min(rect.width / viewWidth, rect.height / GUIDE_VIEW_HEIGHT);
  const offsetX = (rect.width - viewWidth * scale) / 2;
  const offsetY = (rect.height - GUIDE_VIEW_HEIGHT * scale) / 2;

  return guideLetters.flatMap((letter, letterIndex) => {
    const strokes = LETTER_GUIDES[letter] ?? FALLBACK_GUIDE;

    return strokes.flatMap((stroke, strokeIndex) =>
      sampleSvgPath(stroke.d).map((point) => ({
        x: offsetX + (letterIndex * 100 + point.x) * scale,
        y: offsetY + point.y * scale,
        strokeId: `${letterIndex}-${strokeIndex}`,
      })),
    );
  });
}

function WritingDirectionGuide({ target }: { target: string }) {
  const guideLetters = getGuideLetters(target);
  const viewWidth = Math.max(guideLetters.length, 1) * 100;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox={`0 0 ${viewWidth} 124`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g opacity="0.78">
        <line x1="0" y1="24" x2={viewWidth} y2="24" stroke="#cbd5e1" strokeWidth="1.5" />
        <line
          x1="0"
          y1="60"
          x2={viewWidth}
          y2="60"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        <line x1="0" y1="96" x2={viewWidth} y2="96" stroke="#cbd5e1" strokeWidth="1.5" />
      </g>

      {guideLetters.map((letter, letterIndex) => {
        const strokes = LETTER_GUIDES[letter] ?? FALLBACK_GUIDE;
        return (
          <g key={`${letter}-${letterIndex}`} transform={`translate(${letterIndex * 100} 0)`}>
            {strokes.map((stroke, strokeIndex) => (
              <g key={`${letter}-${strokeIndex}`}>
                <path
                  d={stroke.d}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function PhonicsWritingPad({
  word,
  phonemes,
  activeIndex,
  completedIndices,
  onPronounce,
  onComplete,
}: PhonicsWritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const traceLengthRef = useRef(0);
  const drawnSamplesRef = useRef<Point[]>([]);
  const completedRef = useRef(false);

  const [hasStroke, setHasStroke] = useState(false);
  const [canComplete, setCanComplete] = useState(false);

  const target = phonemes[activeIndex] ?? "";

  const configureCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#111827";
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    traceLengthRef.current = 0;
    drawnSamplesRef.current = [];
    lastPointRef.current = null;
    isDrawingRef.current = false;
    completedRef.current = false;
    setHasStroke(false);
    setCanComplete(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    configureCanvas();
    clearCanvas();

    const observer = new ResizeObserver(() => {
      configureCanvas();
      clearCanvas();
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [activeIndex, target, configureCanvas, clearCanvas]);

  const appendDrawSamples = useCallback((from: Point, to: Point) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / DRAW_SAMPLE_INTERVAL));

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      drawnSamplesRef.current.push({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      });
    }
  }, []);

  const evaluateTraceCompletion = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !target) return false;
    if (traceLengthRef.current < MIN_TRACE_LENGTH || drawnSamplesRef.current.length < 2) {
      return false;
    }

    const guideSamples = buildGuideSamples(target, canvas);
    if (guideSamples.length === 0) {
      return traceLengthRef.current >= MIN_TRACE_LENGTH;
    }

    const rect = canvas.getBoundingClientRect();
    const tolerance = Math.max(TRACE_TOLERANCE, Math.min(rect.width, rect.height) * 0.07);
    const strokeStats = new Map<string, { covered: number; total: number }>();
    let coveredGuideSamples = 0;

    guideSamples.forEach((sample) => {
      const stats = strokeStats.get(sample.strokeId) ?? { covered: 0, total: 0 };
      const isCovered = isPointNearAny(sample, drawnSamplesRef.current, tolerance);

      stats.total += 1;
      if (isCovered) {
        stats.covered += 1;
        coveredGuideSamples += 1;
      }
      strokeStats.set(sample.strokeId, stats);
    });

    const guideCoverage = coveredGuideSamples / guideSamples.length;
    const everyStrokeCovered = Array.from(strokeStats.values()).every(
      ({ covered, total }) => total > 0 && covered / total >= MIN_STROKE_GUIDE_COVERAGE,
    );
    const drawnOnGuideCount = drawnSamplesRef.current.filter((point) =>
      isPointNearAny(point, guideSamples, tolerance * 1.25),
    ).length;
    const drawnOnGuideRatio = drawnOnGuideCount / drawnSamplesRef.current.length;

    return (
      guideCoverage >= MIN_TOTAL_GUIDE_COVERAGE &&
      everyStrokeCovered &&
      drawnOnGuideRatio >= MIN_DRAW_ON_GUIDE_RATIO
    );
  }, [target]);

  const completeCurrentLetter = useCallback(() => {
    if (completedRef.current) return;

    const isComplete = evaluateTraceCompletion();
    setCanComplete(isComplete);
    if (!isComplete) return;

    completedRef.current = true;
    onComplete(activeIndex);
  }, [activeIndex, evaluateTraceCompletion, onComplete]);

  const drawTo = useCallback((point: Point) => {
    const canvas = canvasRef.current;
    const lastPoint = lastPointRef.current;
    if (!canvas || !lastPoint) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    traceLengthRef.current += Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    appendDrawSamples(lastPoint, point);
    setCanComplete(evaluateTraceCompletion());

    lastPointRef.current = point;
  }, [appendDrawSamples, evaluateTraceCompletion]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!target || completedRef.current) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const point = getCanvasPoint(event.currentTarget, event);
      isDrawingRef.current = true;
      lastPointRef.current = point;
      drawnSamplesRef.current.push(point);
      setHasStroke(true);
      setCanComplete(evaluateTraceCompletion());

      const ctx = event.currentTarget.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#111827";
        ctx.fill();
      }

      onPronounce(target, activeIndex);
    },
    [activeIndex, evaluateTraceCompletion, onPronounce, target],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      event.preventDefault();
      drawTo(getCanvasPoint(event.currentTarget, event));
    },
    [drawTo],
  );

  const stopDrawing = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    isDrawingRef.current = false;
    lastPointRef.current = null;
    completeCurrentLetter();
  }, [completeCurrentLetter]);

  return (
    <motion.div
      key={`${word}-${activeIndex}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="mb-4 flex items-center justify-center gap-2">
        {phonemes.map((phoneme, index) => {
          const isCompleted = completedIndices.has(index);
          const isActive = index === activeIndex;

          return (
            <div
              key={`${word}-${phoneme}-${index}`}
              className={cn(
                "h-14 min-w-14 rounded-2xl px-4 flex items-center justify-center font-kids text-3xl font-black transition-all",
                isCompleted && "bg-tertiary text-on-tertiary shadow-child-ambient",
                isActive && !isCompleted && "bg-primary text-on-primary shadow-child-ambient",
                !isActive && !isCompleted && "bg-surface-container-low text-on-surface-variant",
              )}
            >
              {phoneme}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-surface-container-lowest p-4 shadow-child-ambient">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-label text-xs font-bold text-on-surface-variant">
              써 보기
            </p>
            <p className="truncate font-headline text-3xl font-black text-primary">
              {target}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onPronounce(target, activeIndex)}
            className="h-12 min-w-12 rounded-2xl bg-primary-container px-4 flex items-center justify-center gap-2 font-kids font-bold text-on-primary-container active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined fill-icon text-xl">volume_up</span>
            <span className="hidden sm:inline">소리 듣기</span>
          </button>
        </div>

        <div className="relative h-64 w-full overflow-hidden rounded-3xl bg-white shadow-inner ring-2 ring-surface-container-highest sm:h-72">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <WritingDirectionGuide target={target} />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-20 h-full w-full cursor-crosshair touch-none"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.2fr]">
          <button
            type="button"
            onClick={clearCanvas}
            disabled={!hasStroke}
            className="h-12 rounded-2xl bg-surface-container-low px-4 flex items-center justify-center gap-2 font-kids font-bold text-on-surface-variant disabled:opacity-40 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-xl">ink_eraser</span>
            지우기
          </button>
          <button
            type="button"
            onClick={() => onPronounce(target, activeIndex)}
            className="h-12 rounded-2xl bg-secondary-container px-4 flex items-center justify-center gap-2 font-kids font-bold text-on-secondary-container active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined fill-icon text-xl">hearing</span>
            발음
          </button>
          <button
            type="button"
            onClick={completeCurrentLetter}
            disabled={!canComplete}
            className="col-span-2 h-12 rounded-2xl bg-hero-texture px-4 flex items-center justify-center gap-2 font-kids font-black text-on-primary disabled:opacity-40 active:scale-95 transition-transform sm:col-span-1"
          >
            <span className="material-symbols-outlined fill-icon text-xl">check_circle</span>
            다 썼어요
          </button>
        </div>
      </div>
    </motion.div>
  );
}
