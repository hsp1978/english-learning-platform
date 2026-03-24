"""
Generate placeholder SVG character images for all 36 fairy characters.
Each character gets a unique color scheme, shape, and symbol based on its attributes.

Usage:
    python -m app.scripts.generators.generate_characters
    python -m app.scripts.generators.generate_characters --output-dir /path/to/output
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

SEED_DIR = Path(__file__).parent.parent / "seed_data"

RARITY_GLOW = {
    "common": {"ring": "#D5D3CF", "bg": "#F8F7F4"},
    "rare": {"ring": "#FFB8CC", "bg": "#FFF5F7"},
    "epic": {"ring": "#C4ADFF", "bg": "#F5F0FF"},
    "legendary": {"ring": "#FFD93D", "bg": "#FFFBEB"},
}

PHASE_PALETTES = {
    1: [
        {"body": "#FF85A8", "wing": "#FFB8CC", "accent": "#E84580"},
        {"body": "#9B6FFF", "wing": "#C4ADFF", "accent": "#7C4DFF"},
        {"body": "#4ECDC4", "wing": "#A8E6E0", "accent": "#2AB7AD"},
        {"body": "#FFD93D", "wing": "#FFECB3", "accent": "#F0C020"},
        {"body": "#FF8A80", "wing": "#FFCDD2", "accent": "#E8593C"},
        {"body": "#85B7EB", "wing": "#B5D4F4", "accent": "#378ADD"},
        {"body": "#97C459", "wing": "#C0DD97", "accent": "#639922"},
        {"body": "#F0997B", "wing": "#F5C4B3", "accent": "#D85A30"},
        {"body": "#ED93B1", "wing": "#F4C0D1", "accent": "#D4537E"},
    ],
    2: [
        {"body": "#E84580", "wing": "#FF85A8", "accent": "#C4356A"},
        {"body": "#7C4DFF", "wing": "#9B6FFF", "accent": "#5530B8"},
        {"body": "#2AB7AD", "wing": "#4ECDC4", "accent": "#1A8A82"},
        {"body": "#F0C020", "wing": "#FFD93D", "accent": "#D4A017"},
        {"body": "#E8593C", "wing": "#FF8A80", "accent": "#C04020"},
        {"body": "#378ADD", "wing": "#85B7EB", "accent": "#185FA5"},
        {"body": "#639922", "wing": "#97C459", "accent": "#3B6D11"},
        {"body": "#D85A30", "wing": "#F0997B", "accent": "#993C1D"},
        {"body": "#D4537E", "wing": "#ED93B1", "accent": "#993556"},
    ],
    3: [
        {"body": "#534AB7", "wing": "#7F77DD", "accent": "#3C3489"},
        {"body": "#0F6E56", "wing": "#1D9E75", "accent": "#085041"},
        {"body": "#993C1D", "wing": "#D85A30", "accent": "#712B13"},
        {"body": "#993556", "wing": "#D4537E", "accent": "#72243E"},
        {"body": "#5F5E5A", "wing": "#888780", "accent": "#444441"},
        {"body": "#185FA5", "wing": "#378ADD", "accent": "#0C447C"},
        {"body": "#3B6D11", "wing": "#639922", "accent": "#27500A"},
        {"body": "#854F0B", "wing": "#BA7517", "accent": "#633806"},
        {"body": "#A32D2D", "wing": "#E24B4A", "accent": "#791F1F"},
    ],
    4: [
        {"body": "#7C4DFF", "wing": "#C4ADFF", "accent": "#5530B8"},
        {"body": "#FF6B9D", "wing": "#FFB8CC", "accent": "#E84580"},
        {"body": "#4ECDC4", "wing": "#A8E6E0", "accent": "#2AB7AD"},
        {"body": "#FFD93D", "wing": "#FFECB3", "accent": "#D4A017"},
        {"body": "#378ADD", "wing": "#85B7EB", "accent": "#185FA5"},
        {"body": "#E24B4A", "wing": "#F09595", "accent": "#A32D2D"},
        {"body": "#1D9E75", "wing": "#5DCAA5", "accent": "#0F6E56"},
        {"body": "#BA7517", "wing": "#EF9F27", "accent": "#854F0B"},
        {"body": "#D4537E", "wing": "#ED93B1", "accent": "#993556"},
    ],
}

SYMBOLS = [
    "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z",  # star
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",  # heart
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",  # circle
    "M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z",  # house
    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",  # hexagon
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z",  # sparkle
]


def _generate_svg(
    char_name: str,
    rarity: str,
    phase: int,
    index_in_phase: int,
    is_locked: bool = False,
) -> str:
    rg = RARITY_GLOW[rarity]
    palette_list = PHASE_PALETTES.get(phase, PHASE_PALETTES[1])
    palette = palette_list[index_in_phase % len(palette_list)]
    symbol = SYMBOLS[index_in_phase % len(SYMBOLS)]

    if is_locked:
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="120" height="140">
  <defs>
    <filter id="s"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="120" height="140" rx="20" fill="#F1EFE8"/>
  <circle cx="60" cy="58" r="32" fill="#D5D3CF" opacity="0.4"/>
  <path d="M52 52v-6a8 8 0 0116 0v6" fill="none" stroke="#B4B2A9" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="48" y="52" width="24" height="18" rx="3" fill="#B4B2A9"/>
  <circle cx="60" cy="61" r="2.5" fill="#888780"/>
  <text x="60" y="108" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#888780">???</text>
  <text x="60" y="124" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#B4B2A9">{rarity}</text>
</svg>"""

    wing_d = "M28 50 Q10 30 20 55 Q14 65 28 60Z"
    wing_r = "M92 50 Q110 30 100 55 Q106 65 92 60Z"

    crown = ""
    if rarity == "legendary":
        crown = f'<path d="M45 22l5-10 5 7 5-7 5 10z" fill="#FFD93D" stroke="#F0C020" stroke-width="1"/>'
    elif rarity == "epic":
        crown = f'<circle cx="60" cy="18" r="5" fill="{palette["accent"]}" opacity="0.6"/>'

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="120" height="140">
  <defs>
    <filter id="g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="bg" cx="50%" cy="40%"><stop offset="0%" stop-color="{rg['bg']}"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="120" height="140" rx="20" fill="url(#bg)"/>
  <circle cx="60" cy="56" r="36" fill="{rg['ring']}" opacity="0.3" filter="url(#g)"/>
  <path d="{wing_d}" fill="{palette['wing']}" opacity="0.7"/>
  <path d="{wing_r}" fill="{palette['wing']}" opacity="0.7"/>
  <circle cx="60" cy="56" r="24" fill="{palette['body']}"/>
  <circle cx="52" cy="50" r="4" fill="white"/>
  <circle cx="68" cy="50" r="4" fill="white"/>
  <circle cx="53" cy="51" r="2" fill="{palette['accent']}"/>
  <circle cx="69" cy="51" r="2" fill="{palette['accent']}"/>
  <ellipse cx="60" cy="62" rx="6" ry="3" fill="{palette['accent']}" opacity="0.5"/>
  <circle cx="48" cy="58" r="4" fill="{palette['wing']}" opacity="0.5"/>
  <circle cx="72" cy="58" r="4" fill="{palette['wing']}" opacity="0.5"/>
  <g transform="translate(52,68) scale(0.7)" opacity="0.6"><path d="{symbol}" fill="{palette['accent']}"/></g>
  {crown}
  <text x="60" y="108" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="{palette['accent']}">{char_name}</text>
  <text x="60" y="124" text-anchor="middle" font-family="sans-serif" font-size="9" fill="{rg['ring']}">{rarity}</text>
</svg>"""


def generate_all(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(SEED_DIR / "characters.json", encoding="utf-8") as f:
        characters = json.load(f)

    phase_counters: dict[int, int] = {}

    for char in characters:
        phase = char["phase_number"]
        idx = phase_counters.get(phase, 0)
        phase_counters[phase] = idx + 1

        safe_name = char["name"].lower().replace(" ", "_").replace("'", "")

        # Unlocked version
        svg_unlocked = _generate_svg(
            char["name_ko"], char["rarity"], phase, idx, is_locked=False
        )
        (output_dir / f"{safe_name}_unlocked.svg").write_text(svg_unlocked, encoding="utf-8")

        # Locked version
        svg_locked = _generate_svg(
            char["name_ko"], char["rarity"], phase, idx, is_locked=True
        )
        (output_dir / f"{safe_name}_locked.svg").write_text(svg_locked, encoding="utf-8")

    total = len(characters) * 2
    print(f"Generated {total} SVG files ({len(characters)} characters × 2 states)")
    print(f"Output: {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "images" / "characters",
    )
    args = parser.parse_args()
    generate_all(args.output_dir)
