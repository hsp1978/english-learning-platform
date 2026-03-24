from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import (
    CharacterRarity,
    LessonType,
    LLMTier,
    PhonicsLevel,
    PronunciationGrade,
    SightWordPhase,
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Auth
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=100)
    parent_pin: Optional[str] = Field(default=None, min_length=4, max_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ParentPinVerifyRequest(BaseModel):
    pin: str


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Child Profile
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class ChildProfileCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=50)
    birth_year: int = Field(ge=2010, le=2025)


class ChildProfileResponse(BaseModel):
    id: uuid.UUID
    nickname: str
    birth_year: int
    avatar_config: Optional[dict[str, Any]] = None
    current_phase: int
    current_month: int
    total_xp: int
    level: int
    coins: int
    streak_days: int

    model_config = {"from_attributes": True}


class ChildProgressUpdate(BaseModel):
    xp_delta: Optional[int] = None
    coins_delta: Optional[int] = None
    advance_month: Optional[bool] = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Curriculum
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class CurriculumPhaseResponse(BaseModel):
    id: int
    phase_number: int
    title: str
    title_ko: str
    description: str
    start_month: int
    end_month: int

    model_config = {"from_attributes": True}


class LessonResponse(BaseModel):
    id: uuid.UUID
    lesson_type: LessonType
    month: int
    order_index: int
    title: str
    title_ko: str
    description: Optional[str] = None
    phonics_level: Optional[PhonicsLevel] = None
    sight_word_phase: Optional[SightWordPhase] = None
    xp_reward: int
    is_completed: bool = False
    is_locked: bool = True

    model_config = {"from_attributes": True}


class LessonDetailResponse(LessonResponse):
    items: list[LessonItemResponse] = []
    unlock_character_id: Optional[uuid.UUID] = None


class LessonItemResponse(BaseModel):
    id: uuid.UUID
    order_index: int
    content_type: str
    content_data: dict[str, Any]
    audio_url: Optional[str] = None
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class CurriculumMapResponse(BaseModel):
    phases: list[CurriculumPhaseResponse]
    lessons: list[LessonResponse]
    child_progress: ChildProfileResponse


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Learning Records
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class LearningRecordCreate(BaseModel):
    lesson_id: uuid.UUID
    lesson_type: LessonType
    score: float = Field(ge=0.0, le=1.0)
    total_items: int = Field(ge=0)
    correct_items: int = Field(ge=0)
    time_spent_seconds: int = Field(ge=0)
    detail_data: Optional[dict[str, Any]] = None


class LearningRecordResponse(BaseModel):
    id: uuid.UUID
    lesson_type: LessonType
    score: float
    total_items: int
    correct_items: int
    time_spent_seconds: int
    xp_earned: int
    completed_at: datetime

    model_config = {"from_attributes": True}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Speech / Pronunciation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class PronunciationEvalRequest(BaseModel):
    target_text: str = Field(min_length=1, max_length=200)
    context: Optional[str] = None


class PhonemeScoreDetail(BaseModel):
    phoneme: str
    score: float
    suggestion: Optional[str] = None


class PronunciationEvalResponse(BaseModel):
    overall_score: float
    grade: PronunciationGrade
    transcript: Optional[str] = None
    phoneme_scores: list[PhonemeScoreDetail] = []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Stories
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class StoryListItem(BaseModel):
    id: uuid.UUID
    title: str
    genre: str
    lexile_min: int
    lexile_max: int
    page_count: int
    cover_image_url: Optional[str] = None
    is_fiction: bool
    is_read: bool = False

    model_config = {"from_attributes": True}


class StoryPageResponse(BaseModel):
    page_number: int
    text_content: str
    words_data: list[dict[str, Any]]
    illustration_url: Optional[str] = None
    audio_url: Optional[str] = None

    model_config = {"from_attributes": True}


class StoryQuizResponse(BaseModel):
    id: uuid.UUID
    question_type: str
    question_text: str
    choices: list[str]
    correct_index: int

    model_config = {"from_attributes": True}


class StoryDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    author: Optional[str] = None
    genre: str
    page_count: int
    pages: list[StoryPageResponse]
    quizzes: list[StoryQuizResponse] = []

    model_config = {"from_attributes": True}


class QuizAnswerRequest(BaseModel):
    question_id: uuid.UUID
    selected_index: int


class QuizResultResponse(BaseModel):
    correct: bool
    correct_index: int
    xp_earned: int


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AI Conversation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class ConversationScenarioResponse(BaseModel):
    id: uuid.UUID
    title: str
    title_ko: str
    description: Optional[str] = None
    character_name: str
    character_image_url: Optional[str] = None
    target_month: int

    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class ChatResponse(BaseModel):
    reply: str
    audio_url: Optional[str] = None
    feedback: Optional[PronunciationEvalResponse] = None
    xp_earned: int = 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Gamification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class CharacterResponse(BaseModel):
    id: uuid.UUID
    name: str
    name_ko: str
    description: Optional[str] = None
    rarity: CharacterRarity
    image_url_locked: Optional[str] = None
    image_url_unlocked: Optional[str] = None
    phase_number: int
    is_collected: bool = False
    unlocked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CharacterUnlockRequest(BaseModel):
    character_id: uuid.UUID


class CharacterUnlockResponse(BaseModel):
    success: bool
    character: CharacterResponse
    xp_earned: int
    coins_earned: int


class BadgeResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    name_ko: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_earned: bool = False
    earned_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ShopItemResponse(BaseModel):
    id: uuid.UUID
    category: str
    name: str
    name_ko: str
    price_coins: int
    image_url: Optional[str] = None
    is_purchased: bool = False

    model_config = {"from_attributes": True}


class PurchaseRequest(BaseModel):
    item_id: uuid.UUID


class PurchaseResponse(BaseModel):
    success: bool
    remaining_coins: int


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Spaced Repetition
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class ReviewItemResponse(BaseModel):
    item_type: str
    item_key: str
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review: datetime

    model_config = {"from_attributes": True}


class ReviewResultRequest(BaseModel):
    item_type: str
    item_key: str
    score: int = Field(ge=0, le=5)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Parent Dashboard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class DailyStatResponse(BaseModel):
    date: str
    total_time_seconds: int
    lessons_completed: int
    xp_earned: int
    accuracy: float


class WeeklyReportResponse(BaseModel):
    child: ChildProfileResponse
    period_start: str
    period_end: str
    daily_stats: list[DailyStatResponse]
    phonics_accuracy: float
    sight_word_accuracy: float
    sentence_accuracy: float
    pronunciation_avg_score: float
    new_words_learned: int
    characters_collected: int
    streak_days: int
    llm_analysis: Optional[str] = None


class DashboardResponse(BaseModel):
    children: list[ChildProfileResponse]
    recent_activity: list[LearningRecordResponse]
    weekly_summary: Optional[WeeklyReportResponse] = None
