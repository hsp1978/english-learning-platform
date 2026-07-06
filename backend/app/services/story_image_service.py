from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import httpx

from app.core.config import Settings, get_settings
from app.models.models import Story, StoryPage

ImageFormat = Literal["jpeg", "png", "webp"]

_CONTENT_TYPES: dict[str, str] = {
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

_EXTENSIONS: dict[str, str] = {
    "jpeg": "jpg",
    "png": "png",
    "webp": "webp",
}


class StoryImageGenerationError(RuntimeError):
    """Raised when the image provider rejects or cannot complete a request."""


@dataclass(frozen=True)
class StoryImageAsset:
    image_bytes: bytes
    prompt: str
    output_format: ImageFormat

    @property
    def content_type(self) -> str:
        return _CONTENT_TYPES[self.output_format]

    @property
    def extension(self) -> str:
        return _EXTENSIONS[self.output_format]


def resolve_story_image_storage_dir(settings: Settings | None = None) -> Path:
    active_settings = settings or get_settings()
    storage_dir = Path(active_settings.story_image_storage_dir)
    if storage_dir.is_absolute():
        return storage_dir

    backend_dir = Path(__file__).resolve().parents[2]
    return backend_dir / storage_dir


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "story"


class StoryImageService:
    def __init__(
        self,
        settings: Settings | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._http_client = http_client
        self._owns_client = http_client is None

    async def __aenter__(self) -> StoryImageService:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()

    async def close(self) -> None:
        if self._http_client is not None and self._owns_client:
            await self._http_client.aclose()
            self._http_client = None

    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=180)
        return self._http_client

    def build_page_prompt(self, story: Story, page: StoryPage) -> str:
        return "\n".join(
            [
                "Create one warm children's book illustration for early English learners.",
                "",
                f"Story title: {story.title}",
                f"Genre: {story.genre}",
                f"Page number: {page.page_number}",
                f"Page text: {page.text_content}",
                "",
                "Style and composition:",
                "- friendly picture book illustration",
                "- soft colors, clear shapes, gentle lighting",
                "- landscape 16:9 composition",
                "- focus only on the concrete action and objects from this page",
                "- keep recurring characters visually consistent if names repeat",
                "- no scary mood, no photorealistic faces",
                "- no text, captions, letters, speech bubbles, watermark, or UI",
                "- suitable for young children learning English",
            ]
        )

    def build_cover_prompt(self, story: Story, pages: list[StoryPage]) -> str:
        page_text = " ".join(page.text_content for page in pages[:5])
        return "\n".join(
            [
                "Create one inviting children's book cover illustration.",
                "",
                f"Story title: {story.title}",
                f"Genre: {story.genre}",
                f"Story text summary: {page_text}",
                "",
                "Style and composition:",
                "- friendly picture book cover art",
                "- soft colors, clear central subject, gentle lighting",
                "- landscape 16:9 composition",
                "- show the main character or main object from the story",
                "- no text, title lettering, captions, watermark, or UI",
                "- suitable for young children learning English",
            ]
        )

    async def generate_page_image(
        self,
        story: Story,
        page: StoryPage,
        *,
        size: str | None = None,
        quality: str | None = None,
        output_format: ImageFormat | None = None,
    ) -> StoryImageAsset:
        prompt = self.build_page_prompt(story, page)
        return await self._generate_image(
            prompt,
            size=size,
            quality=quality,
            output_format=output_format,
        )

    async def generate_cover_image(
        self,
        story: Story,
        pages: list[StoryPage],
        *,
        size: str | None = None,
        quality: str | None = None,
        output_format: ImageFormat | None = None,
    ) -> StoryImageAsset:
        prompt = self.build_cover_prompt(story, pages)
        return await self._generate_image(
            prompt,
            size=size,
            quality=quality,
            output_format=output_format,
        )

    async def _generate_image(
        self,
        prompt: str,
        *,
        size: str | None = None,
        quality: str | None = None,
        output_format: ImageFormat | None = None,
    ) -> StoryImageAsset:
        if not self.settings.openai_api_key:
            raise StoryImageGenerationError("OPENAI_API_KEY is not configured")

        active_format = self._normalize_output_format(output_format)
        payload = {
            "model": self.settings.openai_image_model,
            "prompt": prompt,
            "size": size or self.settings.story_image_size,
            "quality": quality or self.settings.story_image_quality,
            "output_format": active_format,
            "background": "opaque",
            "n": 1,
        }

        try:
            response = await self.http_client.post(
                "https://api.openai.com/v1/images/generations",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            request_id = exc.response.headers.get("x-request-id", "unknown")
            body = exc.response.text[:500]
            raise StoryImageGenerationError(
                f"Image generation failed with status {exc.response.status_code} "
                f"(request_id={request_id}): {body}"
            ) from exc
        except httpx.HTTPError as exc:
            raise StoryImageGenerationError(
                f"Image generation request failed: {exc}"
            ) from exc

        data = response.json()
        image_base64 = (data.get("data") or [{}])[0].get("b64_json")
        if not image_base64:
            raise StoryImageGenerationError("Image response did not include b64_json")

        return StoryImageAsset(
            image_bytes=base64.b64decode(image_base64),
            prompt=prompt,
            output_format=active_format,
        )

    def save_story_page_image(
        self,
        story: Story,
        page: StoryPage,
        asset: StoryImageAsset,
    ) -> str:
        return self._save_local_image(
            story,
            f"page-{page.page_number:03d}",
            asset.image_bytes,
            asset.extension,
        )

    def save_story_cover_image(self, story: Story, asset: StoryImageAsset) -> str:
        return self._save_local_image(
            story,
            "cover",
            asset.image_bytes,
            asset.extension,
        )

    def _save_local_image(
        self,
        story: Story,
        stem: str,
        image_bytes: bytes,
        extension: str,
    ) -> str:
        storage_dir = resolve_story_image_storage_dir(self.settings)
        story_dir_name = f"{slugify(story.title)}-{str(story.id)[:8]}"
        story_dir = storage_dir / story_dir_name
        story_dir.mkdir(parents=True, exist_ok=True)

        image_path = story_dir / f"{stem}.{extension}"
        image_path.write_bytes(image_bytes)

        relative_path = image_path.relative_to(storage_dir).as_posix()
        return f"{self.settings.story_image_base_url.rstrip('/')}/{relative_path}"

    def _normalize_output_format(
        self,
        output_format: ImageFormat | None,
    ) -> ImageFormat:
        value = output_format or self.settings.story_image_output_format
        if value not in _EXTENSIONS:
            raise ValueError(
                "story image output format must be one of: "
                f"{', '.join(sorted(_EXTENSIONS))}"
            )
        return value  # type: ignore[return-value]
