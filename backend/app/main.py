from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
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


HEALTH_CHECK_TIMEOUT = 3.0


async def _check_database() -> dict[str, str]:
    try:
        async with asyncio.timeout(HEALTH_CHECK_TIMEOUT):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except TimeoutError:
        return {"status": "error", "detail": "timeout"}
    except Exception as exc:
        return {"status": "error", "detail": type(exc).__name__}


async def _check_redis() -> dict[str, str]:
    try:
        async with asyncio.timeout(HEALTH_CHECK_TIMEOUT):
            redis = await get_redis()
            await redis.ping()
        return {"status": "ok"}
    except TimeoutError:
        return {"status": "error", "detail": "timeout"}
    except Exception as exc:
        return {"status": "error", "detail": type(exc).__name__}


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

    @app.get("/health/live")
    async def liveness_check():
        """Process is up. Does not touch dependencies."""
        return {"status": "ok", "service": settings.app_name}

    @app.get("/health")
    async def health_check():
        """Readiness: verifies the dependencies the API cannot serve without."""
        checks = {
            "database": await _check_database(),
            "redis": await _check_redis(),
        }
        healthy = all(c["status"] == "ok" for c in checks.values())
        body = {
            "status": "ok" if healthy else "degraded",
            "service": settings.app_name,
            "checks": checks,
        }
        if not healthy:
            return JSONResponse(status_code=503, content=body)
        return body

    return app


app = create_app()
