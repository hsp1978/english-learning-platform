from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.redis import close_redis, get_redis
from app.services.llm_router import get_llm_router
from app.services.story_image_service import resolve_story_image_storage_dir


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    await get_redis()
    get_llm_router()
    yield
    # Shutdown
    llm = get_llm_router()
    await llm.close()
    await close_redis()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        lifespan=lifespan,
        docs_url="/docs" if settings.app_debug else None,
        redoc_url="/redoc" if settings.app_debug else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.app_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    story_image_dir = resolve_story_image_storage_dir(settings)
    story_image_dir.mkdir(parents=True, exist_ok=True)
    if settings.story_image_base_url.startswith("/"):
        app.mount(
            settings.story_image_base_url,
            StaticFiles(directory=str(story_image_dir)),
            name="story_images",
        )

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "service": settings.app_name}

    return app


app = create_app()
