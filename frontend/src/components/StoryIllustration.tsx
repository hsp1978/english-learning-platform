import type { ReactNode } from "react";

interface StoryIllustrationProps {
  text: string;
  genre: string;
  illustrationUrl?: string | null;
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function Sun() {
  return (
    <g>
      <circle cx="324" cy="52" r="24" fill="#facc15" />
      <g stroke="#facc15" strokeLinecap="round" strokeWidth="5">
        <line x1="324" y1="14" x2="324" y2="2" />
        <line x1="324" y1="102" x2="324" y2="90" />
        <line x1="286" y1="52" x2="274" y2="52" />
        <line x1="374" y1="52" x2="362" y2="52" />
        <line x1="296" y1="24" x2="288" y2="16" />
        <line x1="352" y1="80" x2="360" y2="88" />
        <line x1="352" y1="24" x2="360" y2="16" />
        <line x1="296" y1="80" x2="288" y2="88" />
      </g>
    </g>
  );
}

function Moon() {
  return (
    <g>
      <circle cx="320" cy="54" r="27" fill="#fde68a" />
      <circle cx="333" cy="43" r="27" fill="#172554" />
      <circle cx="254" cy="36" r="2" fill="#f8fafc" />
      <circle cx="285" cy="70" r="2.5" fill="#f8fafc" />
      <circle cx="362" cy="82" r="2" fill="#f8fafc" />
    </g>
  );
}

function Cloud({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#ffffff" opacity="0.9">
      <circle cx="18" cy="16" r="14" />
      <circle cx="36" cy="12" r="18" />
      <circle cx="58" cy="18" r="13" />
      <rect x="12" y="18" width="54" height="18" rx="9" />
    </g>
  );
}

function Tree({ x, y, color = "#22c55e" }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="18" y="48" width="14" height="42" rx="4" fill="#92400e" />
      <circle cx="25" cy="32" r="24" fill={color} />
      <circle cx="8" cy="45" r="18" fill={color} />
      <circle cx="44" cy="47" r="18" fill={color} />
    </g>
  );
}

function Bed() {
  return (
    <g transform="translate(58 106)">
      <rect x="0" y="34" width="220" height="42" rx="10" fill="#a78bfa" />
      <rect x="10" y="8" width="72" height="40" rx="12" fill="#f8fafc" />
      <rect x="82" y="18" width="134" height="31" rx="8" fill="#c4b5fd" />
      <rect x="8" y="75" width="12" height="24" rx="4" fill="#7c3aed" />
      <rect x="196" y="75" width="12" height="24" rx="4" fill="#7c3aed" />
    </g>
  );
}

function Barn() {
  return (
    <g transform="translate(42 78)">
      <rect x="24" y="58" width="120" height="80" rx="6" fill="#dc2626" />
      <path d="M18 60 L84 12 L150 60 Z" fill="#ef4444" />
      <rect x="68" y="90" width="34" height="48" rx="4" fill="#7f1d1d" />
      <path d="M70 92 L100 136 M100 92 L70 136" stroke="#fca5a5" strokeWidth="4" />
      <rect x="52" y="68" width="22" height="18" rx="2" fill="#fee2e2" />
      <rect x="94" y="68" width="22" height="18" rx="2" fill="#fee2e2" />
    </g>
  );
}

function School() {
  return (
    <g transform="translate(62 82)">
      <rect x="0" y="50" width="190" height="88" rx="8" fill="#f97316" />
      <path d="M18 50 L95 6 L172 50 Z" fill="#fb923c" />
      <rect x="78" y="88" width="34" height="50" rx="4" fill="#7c2d12" />
      <circle cx="95" cy="44" r="16" fill="#fef3c7" />
      <line x1="95" y1="34" x2="95" y2="44" stroke="#7c2d12" strokeWidth="3" />
      <line x1="95" y1="44" x2="104" y2="44" stroke="#7c2d12" strokeWidth="3" />
    </g>
  );
}

function Ball({ x = 258, y = 166 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="24" fill="#f43f5e" />
      <path d="M-22 -4 C-8 8 8 8 22 -4" stroke="#fff1f2" strokeWidth="5" fill="none" />
      <path d="M-2 -22 C8 -8 8 8 -2 22" stroke="#fff1f2" strokeWidth="5" fill="none" />
    </g>
  );
}

function Dog({ red = false, big = false, x = 176, y = 150 }: { red?: boolean; big?: boolean; x?: number; y?: number }) {
  const scale = big ? 1.22 : 1;
  const color = red ? "#ef4444" : "#b45309";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="12" rx="58" ry="33" fill={color} />
      <circle cx="-48" cy="-14" r="27" fill={color} />
      <path d="M-62 -28 L-82 -50 L-75 -15 Z" fill="#7c2d12" />
      <circle cx="-56" cy="-20" r="4" fill="#111827" />
      <circle cx="-76" cy="-8" r="5" fill="#111827" />
      <path d="M48 0 C82 -26 88 -10 55 14" stroke={color} strokeWidth="13" fill="none" strokeLinecap="round" />
      <rect x="-34" y="38" width="12" height="36" rx="6" fill="#7c2d12" />
      <rect x="24" y="38" width="12" height="36" rx="6" fill="#7c2d12" />
    </g>
  );
}

function Cat({ little = false, under = false, x = 186, y = 144 }: { little?: boolean; under?: boolean; x?: number; y?: number }) {
  const scale = little ? 0.78 : 1;
  return (
    <g transform={`translate(${x} ${under ? y + 42 : y}) scale(${scale})`}>
      <ellipse cx="0" cy="16" rx="48" ry="30" fill="#94a3b8" />
      <circle cx="-42" cy="-10" r="25" fill="#94a3b8" />
      <path d="M-58 -30 L-72 -54 L-44 -36 Z" fill="#64748b" />
      <path d="M-30 -30 L-18 -54 L-12 -28 Z" fill="#64748b" />
      <circle cx="-50" cy="-14" r="4" fill="#111827" />
      <circle cx="-34" cy="-14" r="4" fill="#111827" />
      <path d="M-44 -5 L-40 1 L-48 1 Z" fill="#fda4af" />
      <path d="M42 8 C78 -18 82 20 50 28" stroke="#94a3b8" strokeWidth="10" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Hen({ x = 182, y = 150 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="15" rx="40" ry="30" fill="#f8fafc" />
      <circle cx="-34" cy="-5" r="21" fill="#f8fafc" />
      <path d="M-42 -27 L-35 -43 L-28 -27 Z" fill="#ef4444" />
      <path d="M-56 -4 L-75 5 L-56 12 Z" fill="#f97316" />
      <circle cx="-40" cy="-8" r="3" fill="#111827" />
      <line x1="-12" y1="42" x2="-12" y2="58" stroke="#f97316" strokeWidth="5" />
      <line x1="14" y1="42" x2="14" y2="58" stroke="#f97316" strokeWidth="5" />
    </g>
  );
}

function Eggs() {
  return (
    <g fill="#fef9c3" stroke="#facc15" strokeWidth="2">
      <ellipse cx="246" cy="198" rx="14" ry="18" />
      <ellipse cx="275" cy="198" rx="14" ry="18" />
      <ellipse cx="304" cy="198" rx="14" ry="18" />
    </g>
  );
}

function Pig() {
  return (
    <g transform="translate(210 156)">
      <ellipse cx="0" cy="18" rx="54" ry="34" fill="#f9a8d4" />
      <circle cx="-44" cy="-8" r="28" fill="#f9a8d4" />
      <circle cx="-54" cy="-12" r="4" fill="#111827" />
      <ellipse cx="-70" cy="0" rx="13" ry="10" fill="#f472b6" />
      <circle cx="-74" cy="0" r="2" fill="#831843" />
      <circle cx="-66" cy="0" r="2" fill="#831843" />
      <path d="M54 12 C78 -4 80 26 58 28" stroke="#f9a8d4" strokeWidth="8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Duck() {
  return (
    <g transform="translate(210 146)">
      <ellipse cx="0" cy="24" rx="52" ry="31" fill="#facc15" />
      <circle cx="-42" cy="-2" r="24" fill="#fde047" />
      <path d="M-62 0 L-88 10 L-62 18 Z" fill="#f97316" />
      <circle cx="-48" cy="-7" r="3.5" fill="#111827" />
    </g>
  );
}

function Fish({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="32" ry="18" fill={color} />
      <path d="M32 0 L58 -20 L58 20 Z" fill={color} />
      <circle cx="-15" cy="-4" r="3" fill="#111827" />
    </g>
  );
}

function Rainbow() {
  return (
    <g transform="translate(72 48)" fill="none" strokeLinecap="round">
      <path d="M0 112 C46 8 162 8 208 112" stroke="#ef4444" strokeWidth="12" />
      <path d="M18 112 C56 28 152 28 190 112" stroke="#f97316" strokeWidth="12" />
      <path d="M36 112 C66 48 142 48 172 112" stroke="#facc15" strokeWidth="12" />
      <path d="M54 112 C76 68 132 68 154 112" stroke="#22c55e" strokeWidth="12" />
      <path d="M72 112 C86 88 122 88 136 112" stroke="#3b82f6" strokeWidth="12" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 48 C0 18 0 12 0 0" stroke="#166534" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="-15" cy="20" rx="16" ry="8" fill="#22c55e" transform="rotate(-28 -15 20)" />
      <ellipse cx="16" cy="30" rx="16" ry="8" fill="#22c55e" transform="rotate(28 16 30)" />
    </g>
  );
}

function Water() {
  return (
    <g>
      <rect x="0" y="132" width="384" height="84" fill="#38bdf8" />
      <path d="M0 145 C38 126 66 164 104 145 C142 126 170 164 208 145 C246 126 274 164 312 145 C350 126 378 164 416 145" stroke="#e0f2fe" strokeWidth="7" fill="none" />
    </g>
  );
}

function Background({ scene, night }: { scene: string; night: boolean }) {
  if (night) {
    return (
      <>
        <rect width="384" height="216" fill="#172554" />
        <rect x="0" y="154" width="384" height="62" fill="#1e3a8a" />
        <Moon />
      </>
    );
  }

  if (scene === "sea" || scene === "water") {
    return (
      <>
        <rect width="384" height="216" fill="#bae6fd" />
        <Cloud x={36} y={24} />
        <Sun />
        <Water />
      </>
    );
  }

  if (scene === "room") {
    return (
      <>
        <rect width="384" height="216" fill="#fef3c7" />
        <rect x="0" y="150" width="384" height="66" fill="#fed7aa" />
        <circle cx="330" cy="48" r="24" fill="#fbbf24" opacity="0.7" />
      </>
    );
  }

  return (
    <>
      <rect width="384" height="216" fill="#bfdbfe" />
      <Cloud x={34} y={28} />
      <Cloud x={214} y={30} />
      <Sun />
      <rect x="0" y="150" width="384" height="66" fill="#86efac" />
    </>
  );
}

function buildScene(text: string) {
  const lower = text.toLowerCase();
  const night = includesAny(lower, ["night", "moon"]);
  const scene = includesAny(lower, ["sea", "fish", "starfish"])
    ? "sea"
    : includesAny(lower, ["water", "duck", "swim"])
      ? "water"
      : includesAny(lower, ["bed", "room"])
        ? "room"
        : includesAny(lower, ["farm", "barn", "hen", "pig", "mud"])
          ? "farm"
          : includesAny(lower, ["school", "class"])
            ? "school"
            : "park";

  return { lower, night, scene };
}

export default function StoryIllustration({
  text,
  genre,
  illustrationUrl,
}: StoryIllustrationProps) {
  const { lower, night, scene } = buildScene(text);

  if (illustrationUrl) {
    return (
      <div className="w-full aspect-[16/9] overflow-hidden rounded-2xl mb-4 bg-surface-container-low shadow-child-ambient">
        <img
          src={illustrationUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const elements: ReactNode[] = [];

  if (includesAny(lower, ["rainbow"])) {
    elements.push(<Rainbow key="rainbow" />);
  }

  if (scene === "farm" || includesAny(lower, ["barn"])) {
    elements.push(<Barn key="barn" />);
  }

  if (scene === "school") {
    elements.push(<School key="school" />);
  }

  if (scene === "park") {
    elements.push(<Tree key="tree-left" x={22} y={86} />);
    elements.push(<Tree key="tree-right" x={310} y={86} color="#16a34a" />);
  }

  if (scene === "room" || includesAny(lower, ["bed"])) {
    elements.push(<Bed key="bed" />);
  }

  if (includesAny(lower, ["plant", "plants", "grow"])) {
    elements.push(<Plant key="plant-1" x={92} y={128} />);
    elements.push(<Plant key="plant-2" x={136} y={136} />);
    elements.push(<Plant key="plant-3" x={272} y={132} />);
  }

  if (includesAny(lower, ["dog"])) {
    elements.push(
      <Dog
        key="dog"
        red={includesAny(lower, ["red"])}
        big={includesAny(lower, ["big"])}
        x={includesAny(lower, ["park"]) ? 178 : 204}
        y={includesAny(lower, ["jump"]) ? 124 : 146}
      />,
    );
  }

  if (includesAny(lower, ["cat"])) {
    elements.push(
      <Cat
        key="cat"
        little={includesAny(lower, ["little"])}
        under={includesAny(lower, ["under"])}
        x={scene === "room" ? 196 : 184}
        y={scene === "room" ? 110 : 146}
      />,
    );
  }

  if (includesAny(lower, ["ball"])) {
    elements.push(<Ball key="ball" />);
  }

  if (includesAny(lower, ["hen"])) {
    elements.push(<Hen key="hen" />);
  }

  if (includesAny(lower, ["egg"])) {
    elements.push(<Eggs key="eggs" />);
  }

  if (includesAny(lower, ["pig"])) {
    elements.push(
      <g key="pig-scene">
        <ellipse cx="222" cy="195" rx="86" ry="21" fill="#92400e" opacity="0.55" />
        <Pig />
      </g>,
    );
  }

  if (includesAny(lower, ["duck"])) {
    elements.push(<Duck key="duck" />);
  }

  if (includesAny(lower, ["fish", "sea"])) {
    elements.push(<Fish key="fish-1" x={118} y={160} color="#fb7185" />);
    elements.push(<Fish key="fish-2" x={242} y={178} color="#facc15" />);
    elements.push(<Fish key="fish-3" x={302} y={146} color="#60a5fa" />);
  }

  if (includesAny(lower, ["sun"]) && !night) {
    elements.push(<Plant key="sun-plant" x={178} y={136} />);
  }

  if (elements.length === 0) {
    elements.push(
      <g key="book" transform="translate(128 88)">
        <path d="M0 18 C40 -4 72 10 96 28 L96 104 C68 84 40 80 0 104 Z" fill="#fef3c7" />
        <path d="M96 28 C122 10 154 -4 194 18 L194 104 C154 80 126 84 96 104 Z" fill="#fde68a" />
        <line x1="96" y1="28" x2="96" y2="104" stroke="#f59e0b" strokeWidth="4" />
      </g>,
    );
  }

  return (
    <div className="w-full aspect-[16/9] overflow-hidden rounded-2xl mb-4 bg-surface-container-low shadow-child-ambient">
      <svg
        viewBox="0 0 384 216"
        role="img"
        aria-label={`${genre} story illustration`}
        className="h-full w-full"
      >
        <Background scene={scene} night={night} />
        {elements}
      </svg>
    </div>
  );
}
