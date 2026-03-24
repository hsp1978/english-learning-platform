from fastapi import APIRouter

from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.children import router as children_router
from app.api.v1.endpoints.conversation import router as conversation_router
from app.api.v1.endpoints.curriculum import router as curriculum_router
from app.api.v1.endpoints.gamification import router as gamification_router
from app.api.v1.endpoints.parent import router as parent_router
from app.api.v1.endpoints.review import router as review_router
from app.api.v1.endpoints.speech import router as speech_router
from app.api.v1.endpoints.stories import router as stories_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(children_router)
api_router.include_router(curriculum_router)
api_router.include_router(speech_router)
api_router.include_router(stories_router)
api_router.include_router(conversation_router)
api_router.include_router(gamification_router)
api_router.include_router(parent_router)
api_router.include_router(review_router)
api_router.include_router(admin_router)
