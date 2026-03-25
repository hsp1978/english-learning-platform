from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Enums
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class UserRole(str, enum.Enum):
    CHILD = "child"
    PARENT = "parent"


class LessonType(str, enum.Enum):
    PHONICS = "phonics"
    SIGHT_WORDS = "sight_words"
    SENTENCES = "sentences"
    STORY = "story"
    CONVERSATION = "conversation"


class PhonicsLevel(str, enum.Enum):
    SHORT_VOWELS = "short_vowels"
    LONG_VOWELS = "long_vowels"
    BLENDS_DIGRAPHS = "blends_digraphs"
    ADVANCED = "advanced"


class SightWordPhase(str, enum.Enum):
    PRE_K = "pre_k"
    KINDER = "kinder"
    FIRST_GRADE = "first_grade"
    NOUNS = "nouns"


class PronunciationGrade(str, enum.Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RETRY = "retry"


class CharacterRarity(str, enum.Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class LLMTier(str, enum.Enum):
    LOCAL = "local"
    MID = "mid"
    HIGH = "high"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  User & Auth
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.PARENT)
    parent_pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    children: Mapped[list[ChildProfile]] = relationship(back_populates="parent")


class ChildProfile(Base):
    __tablename__ = "child_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    nickname: Mapped[str] = mapped_column(String(50))
    birth_year: Mapped[int] = mapped_column(Integer)
    avatar_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    current_phase: Mapped[int] = mapped_column(Integer, default=1)
    current_month: Mapped[int] = mapped_column(Integer, default=1)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    coins: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_login_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    parent: Mapped[User] = relationship(back_populates="children")
    learning_records: Mapped[list[LearningRecord]] = relationship(back_populates="child")
    pronunciation_records: Mapped[list[PronunciationRecord]] = relationship(
        back_populates="child"
    )
    collected_characters: Mapped[list[CollectedCharacter]] = relationship(
        back_populates="child"
    )
    spaced_repetition_items: Mapped[list[SpacedRepetitionItem]] = relationship(
        back_populates="child"
    )
    conversation_sessions: Mapped[list[ConversationSession]] = relationship(
        back_populates="child"
    )
    badges: Mapped[list[EarnedBadge]] = relationship(back_populates="child")
    purchased_items: Mapped[list[PurchasedItem]] = relationship(back_populates="child")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Curriculum Structure
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class CurriculumPhase(Base):
    __tablename__ = "curriculum_phases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phase_number: Mapped[int] = mapped_column(Integer, unique=True)
    title: Mapped[str] = mapped_column(String(200))
    title_ko: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    start_month: Mapped[int] = mapped_column(Integer)
    end_month: Mapped[int] = mapped_column(Integer)

    lessons: Mapped[list[Lesson]] = relationship(back_populates="phase")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    phase_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("curriculum_phases.id", ondelete="CASCADE")
    )
    lesson_type: Mapped[LessonType] = mapped_column(Enum(LessonType))
    month: Mapped[int] = mapped_column(Integer)
    order_index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    title_ko: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    phonics_level: Mapped[PhonicsLevel | None] = mapped_column(
        Enum(PhonicsLevel), nullable=True
    )
    sight_word_phase: Mapped[SightWordPhase | None] = mapped_column(
        Enum(SightWordPhase), nullable=True
    )
    unlock_character_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True
    )
    xp_reward: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    phase: Mapped[CurriculumPhase] = relationship(back_populates="lessons")
    items: Mapped[list[LessonItem]] = relationship(
        back_populates="lesson", order_by="LessonItem.order_index"
    )

    __table_args__ = (
        Index("ix_lessons_phase_month", "phase_id", "month"),
    )


class LessonItem(Base):
    __tablename__ = "lesson_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE")
    )
    order_index: Mapped[int] = mapped_column(Integer)
    content_type: Mapped[str] = mapped_column(String(50))
    content_data: Mapped[dict] = mapped_column(JSONB)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    lesson: Mapped[Lesson] = relationship(back_populates="items")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Phonics Data
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class PhonicsWord(Base):
    __tablename__ = "phonics_words"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    word: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    phonemes: Mapped[list] = mapped_column(JSONB)
    phonics_level: Mapped[PhonicsLevel] = mapped_column(Enum(PhonicsLevel))
    pattern: Mapped[str] = mapped_column(String(20))
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        Index("ix_phonics_words_level", "phonics_level"),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Sight Words Data
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class SightWord(Base):
    __tablename__ = "sight_words"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    word: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    phase: Mapped[SightWordPhase] = mapped_column(Enum(SightWordPhase))
    part_number: Mapped[int] = mapped_column(Integer)
    dolch_list: Mapped[bool] = mapped_column(Boolean, default=True)
    fry_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        Index("ix_sight_words_phase_part", "phase", "part_number"),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Sentence Patterns
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class SentencePattern(Base):
    __tablename__ = "sentence_patterns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    pattern_type: Mapped[str] = mapped_column(String(50))
    month: Mapped[int] = mapped_column(Integer)
    template: Mapped[str] = mapped_column(String(200))
    example_sentence: Mapped[str] = mapped_column(String(300))
    word_blocks: Mapped[list] = mapped_column(JSONB)
    correct_order: Mapped[list] = mapped_column(JSONB)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Stories / e-Library
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    title: Mapped[str] = mapped_column(String(200))
    author: Mapped[str | None] = mapped_column(String(100), nullable=True)
    genre: Mapped[str] = mapped_column(String(50))
    lexile_min: Mapped[int] = mapped_column(Integer, default=0)
    lexile_max: Mapped[int] = mapped_column(Integer, default=120)
    page_count: Mapped[int] = mapped_column(Integer)
    target_month: Mapped[int] = mapped_column(Integer)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_fiction: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    pages: Mapped[list[StoryPage]] = relationship(
        back_populates="story", order_by="StoryPage.page_number"
    )
    quiz_questions: Mapped[list[StoryQuiz]] = relationship(back_populates="story")


class StoryPage(Base):
    __tablename__ = "story_pages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )
    page_number: Mapped[int] = mapped_column(Integer)
    text_content: Mapped[str] = mapped_column(Text)
    words_data: Mapped[list] = mapped_column(JSONB)
    illustration_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    story: Mapped[Story] = relationship(back_populates="pages")


class StoryQuiz(Base):
    __tablename__ = "story_quizzes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )
    question_type: Mapped[str] = mapped_column(String(30))
    question_text: Mapped[str] = mapped_column(Text)
    choices: Mapped[list] = mapped_column(JSONB)
    correct_index: Mapped[int] = mapped_column(Integer)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    story: Mapped[Story] = relationship(back_populates="quiz_questions")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AI Conversation Scenarios
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class ConversationScenario(Base):
    __tablename__ = "conversation_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    title: Mapped[str] = mapped_column(String(200))
    title_ko: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_month: Mapped[int] = mapped_column(Integer)
    character_name: Mapped[str] = mapped_column(String(50))
    character_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    system_prompt_template: Mapped[str] = mapped_column(Text)
    allowed_vocabulary: Mapped[list] = mapped_column(JSONB)
    max_sentence_words: Mapped[int] = mapped_column(Integer, default=8)
    starter_messages: Mapped[list] = mapped_column(JSONB)
    llm_tier: Mapped[LLMTier] = mapped_column(Enum(LLMTier), default=LLMTier.HIGH)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE")
    )
    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversation_scenarios.id")
    )
    messages: Mapped[list] = mapped_column(JSONB, default=list)
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    child: Mapped[ChildProfile] = relationship(back_populates="conversation_sessions")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Learning Records & Progress Tracking
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class LearningRecord(Base):
    __tablename__ = "learning_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE")
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id")
    )
    lesson_type: Mapped[LessonType] = mapped_column(Enum(LessonType))
    score: Mapped[float] = mapped_column(Float, default=0.0)
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    correct_items: Mapped[int] = mapped_column(Integer, default=0)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    detail_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    child: Mapped[ChildProfile] = relationship(back_populates="learning_records")

    __table_args__ = (
        Index("ix_learning_records_child_date", "child_id", "completed_at"),
        Index("ix_learning_records_child_type", "child_id", "lesson_type"),
    )


class PronunciationRecord(Base):
    __tablename__ = "pronunciation_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE")
    )
    target_text: Mapped[str] = mapped_column(String(200))
    transcript: Mapped[str | None] = mapped_column(String(200), nullable=True)
    overall_score: Mapped[float] = mapped_column(Float)
    grade: Mapped[PronunciationGrade] = mapped_column(Enum(PronunciationGrade))
    phoneme_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    audio_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    context: Mapped[str | None] = mapped_column(String(50), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    child: Mapped[ChildProfile] = relationship(back_populates="pronunciation_records")

    __table_args__ = (
        Index("ix_pronunciation_child_date", "child_id", "recorded_at"),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Spaced Repetition (SM-2)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class SpacedRepetitionItem(Base):
    __tablename__ = "spaced_repetition_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE")
    )
    item_type: Mapped[str] = mapped_column(String(30))
    item_key: Mapped[str] = mapped_column(String(100))
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_reviewed: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    child: Mapped[ChildProfile] = relationship(back_populates="spaced_repetition_items")

    __table_args__ = (
        UniqueConstraint("child_id", "item_type", "item_key", name="uq_sr_child_item"),
        Index("ix_sr_next_review", "child_id", "next_review"),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Gamification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    name: Mapped[str] = mapped_column(String(100), unique=True)
    name_ko: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rarity: Mapped[CharacterRarity] = mapped_column(Enum(CharacterRarity))
    linked_lesson_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    linked_rule: Mapped[str | None] = mapped_column(String(100), nullable=True)
    image_url_locked: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url_unlocked: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phase_number: Mapped[int] = mapped_column(Integer)


class CollectedCharacter(Base):
    __tablename__ = "collected_characters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE")
    )
    character_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("characters.id")
    )
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    child: Mapped[ChildProfile] = relationship(back_populates="collected_characters")

    __table_args__ = (
        UniqueConstraint("child_id", "character_id", name="uq_collected_char"),
    )


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    name_ko: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    condition_type: Mapped[str] = mapped_column(String(50))
    condition_value: Mapped[int] = mapped_column(Integer)
    reward_coins: Mapped[int] = mapped_column(Integer, default=10, server_default="10")
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class EarnedBadge(Base):
    __tablename__ = "earned_badges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE")
    )
    badge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("badges.id")
    )
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    child: Mapped[ChildProfile] = relationship(back_populates="badges")

    __table_args__ = (
        UniqueConstraint("child_id", "badge_id", name="uq_earned_badge"),
    )


class ShopItem(Base):
    __tablename__ = "shop_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    category: Mapped[str] = mapped_column(String(30))
    name: Mapped[str] = mapped_column(String(100))
    name_ko: Mapped[str] = mapped_column(String(100))
    price_coins: Mapped[int] = mapped_column(Integer)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    item_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class PurchasedItem(Base):
    __tablename__ = "purchased_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE")
    )
    shop_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shop_items.id")
    )
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    child: Mapped[ChildProfile] = relationship(back_populates="purchased_items")

    __table_args__ = (
        UniqueConstraint("child_id", "shop_item_id", name="uq_purchased_item"),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LLM Request Logging
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class LLMRequestLog(Base):
    __tablename__ = "llm_request_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    child_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    tier: Mapped[LLMTier] = mapped_column(Enum(LLMTier))
    model_name: Mapped[str] = mapped_column(String(100))
    request_type: Mapped[str] = mapped_column(String(50))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        Index("ix_llm_logs_created", "created_at"),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  TTS Audio Cache
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TTSAudioCache(Base):
    """
    Cache table for TTS-generated audio files.
    Stores pre-generated audio for words and sentences to reduce API costs
    and improve response time.
    """
    __tablename__ = "tts_audio_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_new_uuid
    )
    text_content: Mapped[str] = mapped_column(String(500), index=True)
    text_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    voice: Mapped[str] = mapped_column(String(20), default="nova")
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    audio_data: Mapped[bytes] = mapped_column(Text)  # Base64-encoded MP3
    audio_size_bytes: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    __table_args__ = (
        Index("ix_tts_cache_text_hash", "text_hash"),
        Index("ix_tts_cache_usage", "usage_count"),
    )
