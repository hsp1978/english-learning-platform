"""
Generate placeholder SVG images for avatar parts (shop items).
Creates hair styles, outfits, accessories, and room decorations.

Usage:
    python -m app.scripts.generators.generate_avatars
"""
from __future__ import annotations

import json
from pathlib import Path

SEED_DIR = Path(__file__).parent.parent / "seed_data"

CATEGORY_TEMPLATES = {
    "hair": {
        "bg": "#FFF0F3",
        "icon_color": "#E84580",
        "base_shape": "M30 65 Q30 30 60 25 Q90 30 90 65",
    },
    "outfit": {
        "bg": "#F5F0FF",
        "icon_color": "#7C4DFF",
        "base_shape": "M40 40 L35 90 L85 90 L80 40 Q60 30 40 40Z",
    },
    "accessory": {
        "bg": "#E6FAF7",
        "icon_color": "#2AB7AD",
        "base_shape": "M60 30 L75 55 L95 55 L80 70 L85 95 L60 80 L35 95 L40 70 L25 55 L45 55Z",
    },
    "room": {
        "bg": "#FFF8E1",
        "icon_color": "#F0C020",
        "base_shape": "M25 85 L25 40 L60 20 L95 40 L95 85Z",
    },
}

ITEM_DETAILS = {
    "Ponytail": {"extra": '<path d="M60 25 Q65 10 70 25" fill="none" stroke="{c}" stroke-width="3"/>'},
    "Twin Tails": {"extra": '<path d="M40 30 Q35 10 30 30" fill="none" stroke="{c}" stroke-width="3"/><path d="M80 30 Q85 10 90 30" fill="none" stroke="{c}" stroke-width="3"/>'},
    "Short Bob": {"extra": '<rect x="35" y="50" width="50" height="8" rx="4" fill="{c}" opacity="0.5"/>'},
    "Braids": {"extra": '<path d="M40 55 L35 80" stroke="{c}" stroke-width="3" fill="none"/><path d="M80 55 L85 80" stroke="{c}" stroke-width="3" fill="none"/>'},
    "Curly": {"extra": '<circle cx="40" cy="50" r="6" fill="none" stroke="{c}" stroke-width="2"/><circle cx="60" cy="45" r="6" fill="none" stroke="{c}" stroke-width="2"/><circle cx="80" cy="50" r="6" fill="none" stroke="{c}" stroke-width="2"/>'},
    "Rainbow Hair": {"extra": '<rect x="35" y="50" width="10" height="20" rx="2" fill="#FF6B6B"/><rect x="45" y="50" width="10" height="20" rx="2" fill="#FFD93D"/><rect x="55" y="50" width="10" height="20" rx="2" fill="#4ECDC4"/><rect x="65" y="50" width="10" height="20" rx="2" fill="#9B6FFF"/><rect x="75" y="50" width="10" height="20" rx="2" fill="#FF85A8"/>'},
    "Princess Dress": {"extra": '<path d="M50 60 L35 90 L85 90 L70 60" fill="{c}" opacity="0.3"/><circle cx="60" cy="50" r="3" fill="{c}"/>'},
    "Fairy Costume": {"extra": '<path d="M45 50 L30 40 L45 55Z" fill="{c}" opacity="0.4"/><path d="M75 50 L90 40 L75 55Z" fill="{c}" opacity="0.4"/>'},
    "Space Suit": {"extra": '<circle cx="60" cy="45" r="15" fill="none" stroke="{c}" stroke-width="2"/><circle cx="60" cy="45" r="10" fill="{c}" opacity="0.15"/>'},
    "Crown": {"extra": '<path d="M40 35 L45 20 L55 30 L65 20 L75 30 L80 35Z" fill="#FFD93D" stroke="#F0C020" stroke-width="1.5"/>'},
    "Magic Wand": {"extra": '<line x1="55" y1="80" x2="75" y2="30" stroke="{c}" stroke-width="3" stroke-linecap="round"/><path d="M75 30 L80 20 L70 25Z" fill="#FFD93D"/>'},
    "Star Glasses": {"extra": '<path d="M38 45 L45 38 L52 45 L45 52Z" fill="none" stroke="{c}" stroke-width="2"/><path d="M68 45 L75 38 L82 45 L75 52Z" fill="none" stroke="{c}" stroke-width="2"/><line x1="52" y1="45" x2="68" y2="45" stroke="{c}" stroke-width="1.5"/>'},
    "Butterfly Wings": {"extra": '<path d="M30 50 Q20 30 40 40 Q50 45 45 55Z" fill="{c}" opacity="0.4"/><path d="M90 50 Q100 30 80 40 Q70 45 75 55Z" fill="{c}" opacity="0.4"/>'},
    "Flower Wallpaper": {"extra": '<circle cx="30" cy="30" r="5" fill="{c}" opacity="0.4"/><circle cx="60" cy="25" r="5" fill="{c}" opacity="0.3"/><circle cx="90" cy="35" r="5" fill="{c}" opacity="0.4"/><circle cx="45" cy="55" r="5" fill="{c}" opacity="0.3"/><circle cx="75" cy="60" r="5" fill="{c}" opacity="0.4"/>'},
    "Bookshelf": {"extra": '<rect x="35" y="35" width="50" height="8" rx="1" fill="{c}" opacity="0.7"/><rect x="35" y="50" width="50" height="8" rx="1" fill="{c}" opacity="0.7"/><rect x="35" y="65" width="50" height="8" rx="1" fill="{c}" opacity="0.7"/>'},
    "Cloud Lamp": {"extra": '<ellipse cx="55" cy="40" rx="18" ry="12" fill="white" opacity="0.8"/><ellipse cx="45" cy="45" rx="12" ry="10" fill="white" opacity="0.6"/><ellipse cx="68" cy="43" rx="10" ry="8" fill="white" opacity="0.6"/><line x1="55" y1="52" x2="55" y2="70" stroke="{c}" stroke-width="2"/>'},
}


def _generate_item_svg(name: str, name_ko: str, category: str, price: int) -> str:
    tmpl = CATEGORY_TEMPLATES.get(category, CATEGORY_TEMPLATES["accessory"])
    bg = tmpl["bg"]
    color = tmpl["icon_color"]
    shape = tmpl["base_shape"]
    detail = ITEM_DETAILS.get(name, {})
    extra = detail.get("extra", "").replace("{c}", color)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="20" fill="{bg}"/>
  <path d="{shape}" fill="{color}" opacity="0.25"/>
  {extra}
  <text x="60" y="100" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="{color}">{name_ko}</text>
  <text x="60" y="113" text-anchor="middle" font-family="sans-serif" font-size="9" fill="{color}" opacity="0.6">{price} coins</text>
</svg>"""


def generate_all(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(SEED_DIR / "gamification.json", encoding="utf-8") as f:
        data = json.load(f)

    items = data["shop_items"]
    count = 0

    for item in items:
        safe_name = item["name"].lower().replace(" ", "_").replace("'", "")
        svg = _generate_item_svg(
            item["name"],
            item["name_ko"],
            item["category"],
            item["price_coins"],
        )
        (output_dir / f"{safe_name}.svg").write_text(svg, encoding="utf-8")
        count += 1

    # Generate base avatar
    base_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
  <rect width="200" height="300" rx="24" fill="#FFF5F7"/>
  <circle cx="100" cy="90" r="40" fill="#FFD5C2"/>
  <circle cx="85" cy="82" r="5" fill="white"/><circle cx="115" cy="82" r="5" fill="white"/>
  <circle cx="86" cy="83" r="3" fill="#5A5850"/><circle cx="116" cy="83" r="3" fill="#5A5850"/>
  <ellipse cx="100" cy="96" rx="8" ry="4" fill="#FF85A8" opacity="0.5"/>
  <circle cx="80" cy="96" r="6" fill="#FFCDB2" opacity="0.5"/>
  <circle cx="120" cy="96" r="6" fill="#FFCDB2" opacity="0.5"/>
  <path d="M60 130 Q60 110 100 105 Q140 110 140 130 L145 220 Q145 240 100 245 Q55 240 55 220Z" fill="#E0D4FF"/>
  <path d="M55 220 L50 280 L80 280 L85 230Z" fill="#FFD5C2"/>
  <path d="M145 220 L150 280 L120 280 L115 230Z" fill="#FFD5C2"/>
  <path d="M60 130 L40 190 L70 185Z" fill="#FFD5C2"/>
  <path d="M140 130 L160 190 L130 185Z" fill="#FFD5C2"/>
  <path d="M65 75 Q100 45 135 75 Q138 60 100 40 Q62 60 65 75Z" fill="#8B6F47"/>
</svg>"""
    (output_dir / "base_avatar.svg").write_text(base_svg, encoding="utf-8")
    count += 1

    print(f"Generated {count} avatar SVG files")
    print(f"Output: {output_dir}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "images" / "avatars",
    )
    args = parser.parse_args()
    generate_all(args.output_dir)
