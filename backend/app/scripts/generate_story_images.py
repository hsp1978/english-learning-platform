"""
Generate and attach illustrations for story reader pages.

Usage:
    python -m app.scripts.generate_story_images --title "The Lost Teddy"
    python -m app.scripts.generate_story_images --story-id <uuid> --include-cover
    python -m app.scripts.generate_story_images --all --missing-only
    python -m app.scripts.generate_story_images --title "The Lost Teddy" --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.models.models import Story
from app.services.story_image_service import (
    ImageFormat,
    StoryImageGenerationError,
    StoryImageService,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate story illustrations")
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--story-id", help="Generate images for one story UUID")
    scope.add_argument("--title", help="Generate images for stories with this title")
    scope.add_argument(
        "--all", action="store_true", help="Generate images for all active stories"
    )

    parser.add_argument("--page", type=int, help="Generate one page number only")
    parser.add_argument(
        "--limit", type=int, help="Limit the number of stories processed"
    )
    parser.add_argument(
        "--include-cover",
        action="store_true",
        help="Also generate cover_image_url for each story",
    )
    parser.add_argument(
        "--cover-only",
        action="store_true",
        help="Generate only cover_image_url and skip page illustrations",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Regenerate images even when URLs already exist",
    )
    parser.add_argument(
        "--missing-only",
        action="store_true",
        help="Skip records that already have image URLs. This is the default unless --overwrite is used.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print prompts and DB targets without calling the image API",
    )
    parser.add_argument("--size", help="Image size, e.g. 1536x1024")
    parser.add_argument("--quality", help="Image quality: low, medium, high, or auto")
    parser.add_argument(
        "--format",
        choices=["jpeg", "png", "webp"],
        help="Generated file format",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.0,
        help="Seconds to wait between image requests",
    )
    return parser


async def load_stories(args: argparse.Namespace) -> list[Story]:
    async with async_session_factory() as db:
        statement = (
            select(Story)
            .options(selectinload(Story.pages))
            .where(Story.is_active.is_(True))
            .order_by(Story.target_month, Story.title)
        )

        if args.story_id:
            statement = statement.where(Story.id == args.story_id)
        elif args.title:
            statement = statement.where(Story.title == args.title)

        if args.limit:
            statement = statement.limit(args.limit)

        result = await db.execute(statement)
        stories = list(result.scalars().all())

        # Keep ORM objects usable after this short-lived read session.
        for story in stories:
            story.pages = sorted(story.pages, key=lambda page: page.page_number)

        return stories


async def generate_images(args: argparse.Namespace) -> int:
    settings = get_settings()
    if not settings.openai_api_key and not args.dry_run:
        print("OPENAI_API_KEY is not configured. Use --dry-run to inspect prompts.")
        return 2

    stories = await load_stories(args)
    if not stories:
        print("No matching stories found.")
        return 1

    generated = 0
    skipped = 0
    failed = 0
    output_format = args.format

    async with StoryImageService(settings) as image_service:
        async with async_session_factory() as db:
            for loaded_story in stories:
                story = await db.get(
                    Story,
                    loaded_story.id,
                    options=[selectinload(Story.pages)],
                )
                if story is None:
                    skipped += 1
                    continue

                pages = sorted(story.pages, key=lambda page: page.page_number)
                print(f"\nStory: {story.title} ({story.id})")

                if args.include_cover or args.cover_only:
                    if story.cover_image_url and not args.overwrite:
                        print(f"  cover: skip existing {story.cover_image_url}")
                        skipped += 1
                    elif args.dry_run:
                        prompt = image_service.build_cover_prompt(story, pages)
                        print("  cover: dry-run prompt")
                        print(indent(prompt))
                    else:
                        try:
                            asset = await image_service.generate_cover_image(
                                story,
                                pages,
                                size=args.size,
                                quality=args.quality,
                                output_format=cast_format(output_format),
                            )
                            story.cover_image_url = (
                                image_service.save_story_cover_image(
                                    story,
                                    asset,
                                )
                            )
                            await db.commit()
                            generated += 1
                            print(f"  cover: generated {story.cover_image_url}")
                            await sleep_if_needed(args.sleep)
                        except StoryImageGenerationError as exc:
                            await db.rollback()
                            failed += 1
                            print(f"  cover: failed {exc}")

                if args.cover_only:
                    continue

                target_pages = pages
                if args.page is not None:
                    target_pages = [
                        page for page in pages if page.page_number == args.page
                    ]

                for page in target_pages:
                    page_number = page.page_number

                    if page.illustration_url and not args.overwrite:
                        print(
                            f"  page {page_number}: "
                            f"skip existing {page.illustration_url}"
                        )
                        skipped += 1
                        continue

                    if args.dry_run:
                        prompt = image_service.build_page_prompt(story, page)
                        print(f"  page {page_number}: dry-run prompt")
                        print(indent(prompt))
                        continue

                    try:
                        asset = await image_service.generate_page_image(
                            story,
                            page,
                            size=args.size,
                            quality=args.quality,
                            output_format=cast_format(output_format),
                        )
                        page.illustration_url = image_service.save_story_page_image(
                            story,
                            page,
                            asset,
                        )
                        await db.commit()
                        generated += 1
                        print(
                            f"  page {page_number}: generated {page.illustration_url}"
                        )
                        await sleep_if_needed(args.sleep)
                    except StoryImageGenerationError as exc:
                        await db.rollback()
                        failed += 1
                        print(f"  page {page_number}: failed {exc}")

    print(f"\nDone. generated={generated}, skipped={skipped}, failed={failed}")
    return 1 if failed else 0


def cast_format(value: str | None) -> ImageFormat | None:
    if value is None:
        return None
    return value  # type: ignore[return-value]


def indent(text: str) -> str:
    return "\n".join(f"    {line}" for line in text.splitlines())


async def sleep_if_needed(seconds: float) -> None:
    if seconds > 0:
        await asyncio.sleep(seconds)


def main() -> int:
    # Allow running this file directly from a copied backend directory.
    backend_dir = Path(__file__).resolve().parents[2]
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    parser = build_parser()
    args = parser.parse_args()
    return asyncio.run(generate_images(args))


if __name__ == "__main__":
    raise SystemExit(main())
