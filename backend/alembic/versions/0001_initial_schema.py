"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-22 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum(name: str, *values: str) -> postgresql.ENUM:
    return postgresql.ENUM(*values, name=name, create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    for enum_type in [
        postgresql.ENUM("CHILD", "PARENT", name="userrole"),
        postgresql.ENUM(
            "PHONICS",
            "SIGHT_WORDS",
            "SENTENCES",
            "STORY",
            "CONVERSATION",
            name="lessontype",
        ),
        postgresql.ENUM(
            "SHORT_VOWELS",
            "LONG_VOWELS",
            "BLENDS_DIGRAPHS",
            "ADVANCED",
            name="phonicslevel",
        ),
        postgresql.ENUM(
            "PRE_K",
            "KINDER",
            "FIRST_GRADE",
            "NOUNS",
            name="sightwordphase",
        ),
        postgresql.ENUM("GREEN", "YELLOW", "RETRY", name="pronunciationgrade"),
        postgresql.ENUM("COMMON", "RARE", "EPIC", "LEGENDARY", name="characterrarity"),
        postgresql.ENUM("LOCAL", "MID", "HIGH", name="llmtier"),
    ]:
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("name_ko", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("condition_type", sa.String(length=50), nullable=False),
        sa.Column("condition_value", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "characters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("name_ko", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "rarity",
            _enum("characterrarity", "COMMON", "RARE", "EPIC", "LEGENDARY"),
            nullable=False,
        ),
        sa.Column("linked_lesson_type", sa.String(length=50), nullable=True),
        sa.Column("linked_rule", sa.String(length=100), nullable=True),
        sa.Column("image_url_locked", sa.String(length=500), nullable=True),
        sa.Column("image_url_unlocked", sa.String(length=500), nullable=True),
        sa.Column("phase_number", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "conversation_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("title_ko", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_month", sa.Integer(), nullable=False),
        sa.Column("character_name", sa.String(length=50), nullable=False),
        sa.Column("character_image_url", sa.String(length=500), nullable=True),
        sa.Column("system_prompt_template", sa.Text(), nullable=False),
        sa.Column("allowed_vocabulary", postgresql.JSONB(), nullable=False),
        sa.Column("max_sentence_words", sa.Integer(), nullable=False),
        sa.Column("starter_messages", postgresql.JSONB(), nullable=False),
        sa.Column("llm_tier", _enum("llmtier", "LOCAL", "MID", "HIGH"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "curriculum_phases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phase_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("title_ko", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("start_month", sa.Integer(), nullable=False),
        sa.Column("end_month", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phase_number"),
    )

    op.create_table(
        "llm_request_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tier", _enum("llmtier", "LOCAL", "MID", "HIGH"), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("request_type", sa.String(length=50), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_llm_logs_created", "llm_request_logs", ["created_at"])

    op.create_table(
        "phonics_words",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("word", sa.String(length=50), nullable=False),
        sa.Column("phonemes", postgresql.JSONB(), nullable=False),
        sa.Column(
            "phonics_level",
            _enum(
                "phonicslevel",
                "SHORT_VOWELS",
                "LONG_VOWELS",
                "BLENDS_DIGRAPHS",
                "ADVANCED",
            ),
            nullable=False,
        ),
        sa.Column("pattern", sa.String(length=20), nullable=False),
        sa.Column("audio_url", sa.String(length=500), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_phonics_words_level", "phonics_words", ["phonics_level"])
    op.create_index("ix_phonics_words_word", "phonics_words", ["word"], unique=True)

    op.create_table(
        "sentence_patterns",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pattern_type", sa.String(length=50), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("template", sa.String(length=200), nullable=False),
        sa.Column("example_sentence", sa.String(length=300), nullable=False),
        sa.Column("word_blocks", postgresql.JSONB(), nullable=False),
        sa.Column("correct_order", postgresql.JSONB(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("audio_url", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "shop_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("name_ko", sa.String(length=100), nullable=False),
        sa.Column("price_coins", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("item_data", postgresql.JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sight_words",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("word", sa.String(length=50), nullable=False),
        sa.Column(
            "phase",
            _enum("sightwordphase", "PRE_K", "KINDER", "FIRST_GRADE", "NOUNS"),
            nullable=False,
        ),
        sa.Column("part_number", sa.Integer(), nullable=False),
        sa.Column("dolch_list", sa.Boolean(), nullable=False),
        sa.Column("fry_rank", sa.Integer(), nullable=True),
        sa.Column("audio_url", sa.String(length=500), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sight_words_phase_part", "sight_words", ["phase", "part_number"])
    op.create_index("ix_sight_words_word", "sight_words", ["word"], unique=True)

    op.create_table(
        "stories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("author", sa.String(length=100), nullable=True),
        sa.Column("genre", sa.String(length=50), nullable=False),
        sa.Column("lexile_min", sa.Integer(), nullable=False),
        sa.Column("lexile_max", sa.Integer(), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=False),
        sa.Column("target_month", sa.Integer(), nullable=False),
        sa.Column("cover_image_url", sa.String(length=500), nullable=True),
        sa.Column("is_fiction", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("role", _enum("userrole", "CHILD", "PARENT"), nullable=False),
        sa.Column("parent_pin_hash", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "child_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nickname", sa.String(length=50), nullable=False),
        sa.Column("birth_year", sa.Integer(), nullable=False),
        sa.Column("avatar_config", postgresql.JSONB(), nullable=True),
        sa.Column("current_phase", sa.Integer(), nullable=False),
        sa.Column("current_month", sa.Integer(), nullable=False),
        sa.Column("total_xp", sa.Integer(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("coins", sa.Integer(), nullable=False),
        sa.Column("streak_days", sa.Integer(), nullable=False),
        sa.Column("last_login_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phase_id", sa.Integer(), nullable=False),
        sa.Column(
            "lesson_type",
            _enum("lessontype", "PHONICS", "SIGHT_WORDS", "SENTENCES", "STORY", "CONVERSATION"),
            nullable=False,
        ),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("title_ko", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "phonics_level",
            _enum(
                "phonicslevel",
                "SHORT_VOWELS",
                "LONG_VOWELS",
                "BLENDS_DIGRAPHS",
                "ADVANCED",
            ),
            nullable=True,
        ),
        sa.Column(
            "sight_word_phase",
            _enum("sightwordphase", "PRE_K", "KINDER", "FIRST_GRADE", "NOUNS"),
            nullable=True,
        ),
        sa.Column("unlock_character_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["phase_id"], ["curriculum_phases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["unlock_character_id"], ["characters.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lessons_phase_month", "lessons", ["phase_id", "month"])

    op.create_table(
        "story_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("story_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=False),
        sa.Column("words_data", postgresql.JSONB(), nullable=False),
        sa.Column("illustration_url", sa.String(length=500), nullable=True),
        sa.Column("audio_url", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["story_id"], ["stories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "story_quizzes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("story_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_type", sa.String(length=30), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("choices", postgresql.JSONB(), nullable=False),
        sa.Column("correct_index", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["story_id"], ["stories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "collected_characters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"]),
        sa.ForeignKeyConstraint(["child_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("child_id", "character_id", name="uq_collected_char"),
    )

    op.create_table(
        "conversation_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scenario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("messages", postgresql.JSONB(), nullable=False),
        sa.Column("turn_count", sa.Integer(), nullable=False),
        sa.Column("xp_earned", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["child_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scenario_id"], ["conversation_scenarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "earned_badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("badge_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["badge_id"], ["badges.id"]),
        sa.ForeignKeyConstraint(["child_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("child_id", "badge_id", name="uq_earned_badge"),
    )

    op.create_table(
        "learning_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "lesson_type",
            _enum("lessontype", "PHONICS", "SIGHT_WORDS", "SENTENCES", "STORY", "CONVERSATION"),
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("total_items", sa.Integer(), nullable=False),
        sa.Column("correct_items", sa.Integer(), nullable=False),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=False),
        sa.Column("xp_earned", sa.Integer(), nullable=False),
        sa.Column("detail_data", postgresql.JSONB(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["child_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_learning_records_child_date",
        "learning_records",
        ["child_id", "completed_at"],
    )
    op.create_index(
        "ix_learning_records_child_type",
        "learning_records",
        ["child_id", "lesson_type"],
    )

    op.create_table(
        "lesson_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(length=50), nullable=False),
        sa.Column("content_data", postgresql.JSONB(), nullable=False),
        sa.Column("audio_url", sa.String(length=500), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "pronunciation_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_text", sa.String(length=200), nullable=False),
        sa.Column("transcript", sa.String(length=200), nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column(
            "grade",
            _enum("pronunciationgrade", "GREEN", "YELLOW", "RETRY"),
            nullable=False,
        ),
        sa.Column("phoneme_scores", postgresql.JSONB(), nullable=True),
        sa.Column("audio_file_url", sa.String(length=500), nullable=True),
        sa.Column("context", sa.String(length=50), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["child_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pronunciation_child_date",
        "pronunciation_records",
        ["child_id", "recorded_at"],
    )

    op.create_table(
        "purchased_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shop_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["child_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shop_item_id"], ["shop_items.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("child_id", "shop_item_id", name="uq_purchased_item"),
    )

    op.create_table(
        "spaced_repetition_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_type", sa.String(length=30), nullable=False),
        sa.Column("item_key", sa.String(length=100), nullable=False),
        sa.Column("ease_factor", sa.Float(), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("repetitions", sa.Integer(), nullable=False),
        sa.Column("next_review", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_reviewed", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["child_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("child_id", "item_type", "item_key", name="uq_sr_child_item"),
    )
    op.create_index(
        "ix_sr_next_review",
        "spaced_repetition_items",
        ["child_id", "next_review"],
    )


def downgrade() -> None:
    op.drop_index("ix_sr_next_review", table_name="spaced_repetition_items")
    op.drop_table("spaced_repetition_items")
    op.drop_table("purchased_items")
    op.drop_index("ix_pronunciation_child_date", table_name="pronunciation_records")
    op.drop_table("pronunciation_records")
    op.drop_table("lesson_items")
    op.drop_index("ix_learning_records_child_type", table_name="learning_records")
    op.drop_index("ix_learning_records_child_date", table_name="learning_records")
    op.drop_table("learning_records")
    op.drop_table("earned_badges")
    op.drop_table("conversation_sessions")
    op.drop_table("collected_characters")
    op.drop_table("story_quizzes")
    op.drop_table("story_pages")
    op.drop_index("ix_lessons_phase_month", table_name="lessons")
    op.drop_table("lessons")
    op.drop_table("child_profiles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("stories")
    op.drop_index("ix_sight_words_word", table_name="sight_words")
    op.drop_index("ix_sight_words_phase_part", table_name="sight_words")
    op.drop_table("sight_words")
    op.drop_table("shop_items")
    op.drop_table("sentence_patterns")
    op.drop_index("ix_phonics_words_word", table_name="phonics_words")
    op.drop_index("ix_phonics_words_level", table_name="phonics_words")
    op.drop_table("phonics_words")
    op.drop_index("ix_llm_logs_created", table_name="llm_request_logs")
    op.drop_table("llm_request_logs")
    op.drop_table("curriculum_phases")
    op.drop_table("conversation_scenarios")
    op.drop_table("characters")
    op.drop_table("badges")

    bind = op.get_bind()
    for enum_type in [
        postgresql.ENUM("LOCAL", "MID", "HIGH", name="llmtier"),
        postgresql.ENUM("COMMON", "RARE", "EPIC", "LEGENDARY", name="characterrarity"),
        postgresql.ENUM("GREEN", "YELLOW", "RETRY", name="pronunciationgrade"),
        postgresql.ENUM(
            "PRE_K",
            "KINDER",
            "FIRST_GRADE",
            "NOUNS",
            name="sightwordphase",
        ),
        postgresql.ENUM(
            "SHORT_VOWELS",
            "LONG_VOWELS",
            "BLENDS_DIGRAPHS",
            "ADVANCED",
            name="phonicslevel",
        ),
        postgresql.ENUM(
            "PHONICS",
            "SIGHT_WORDS",
            "SENTENCES",
            "STORY",
            "CONVERSATION",
            name="lessontype",
        ),
        postgresql.ENUM("CHILD", "PARENT", name="userrole"),
    ]:
        enum_type.drop(bind, checkfirst=True)
