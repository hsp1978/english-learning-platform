"""add object storage fields to tts cache

Revision ID: 8b6f7d4d3c21
Revises: 573a2bb8a38f
Create Date: 2026-06-18 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8b6f7d4d3c21"
down_revision: Union[str, None] = "573a2bb8a38f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tts_audio_cache",
        sa.Column("provider", sa.String(length=30), server_default="openai", nullable=False),
    )
    op.add_column(
        "tts_audio_cache",
        sa.Column("model_name", sa.String(length=100), server_default="tts-1", nullable=False),
    )
    op.add_column(
        "tts_audio_cache",
        sa.Column("content_type", sa.String(length=100), server_default="audio/mpeg", nullable=False),
    )
    op.add_column("tts_audio_cache", sa.Column("object_key", sa.String(length=500), nullable=True))
    op.add_column("tts_audio_cache", sa.Column("checksum", sa.String(length=128), nullable=True))
    op.alter_column("tts_audio_cache", "audio_data", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("tts_audio_cache", "audio_data", existing_type=sa.Text(), nullable=False)
    op.drop_column("tts_audio_cache", "checksum")
    op.drop_column("tts_audio_cache", "object_key")
    op.drop_column("tts_audio_cache", "content_type")
    op.drop_column("tts_audio_cache", "model_name")
    op.drop_column("tts_audio_cache", "provider")
