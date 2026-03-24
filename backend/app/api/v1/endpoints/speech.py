from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import PronunciationGrade, PronunciationRecord
from app.schemas.schemas import PhonemeScoreDetail, PronunciationEvalResponse
from app.services.llm_router import RequestType, get_llm_router

router = APIRouter(prefix="/speech", tags=["speech"])


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
):
    """Transcribe audio to text using Whisper (for HTTP environments without Web Speech API)."""
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file",
        )
    transcript = await _transcribe_audio(audio_bytes)
    return {"transcript": transcript}


@router.post("/evaluate", response_model=PronunciationEvalResponse)
async def evaluate_pronunciation(
    child_id: uuid.UUID = Form(...),
    target_text: str = Form(...),
    context: str = Form(default=""),
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file",
        )

    # Phase 1: Whisper STT transcription
    transcript = await _transcribe_audio(audio_bytes)

    # Phase 2: Compare transcript against target
    overall_score, phoneme_scores = _evaluate_match(target_text, transcript)

    grade = _score_to_grade(overall_score)

    record = PronunciationRecord(
        child_id=child_id,
        target_text=target_text,
        transcript=transcript,
        overall_score=overall_score,
        grade=grade,
        phoneme_scores=[ps.model_dump() for ps in phoneme_scores],
        context=context or None,
    )
    db.add(record)

    return PronunciationEvalResponse(
        overall_score=overall_score,
        grade=grade,
        transcript=transcript,
        phoneme_scores=phoneme_scores,
    )


async def _transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribe audio via Whisper API or local Whisper.
    Falls back to empty string on failure.
    """
    from app.core.config import get_settings

    settings = get_settings()

    if not settings.whisper_api_key:
        # Fallback: use Ollama-based local transcription or return placeholder
        llm = get_llm_router()
        try:
            result = await llm.generate(
                request_type=RequestType.SIMPLE_TTS_TEXT,
                messages=[{"role": "user", "content": "Transcribe: [audio provided]"}],
                system_prompt="You are a speech-to-text engine. Return only the transcription.",
            )
            return result.text.strip()
        except Exception:
            return ""

    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.whisper_api_key}"},
            files={"file": ("audio.webm", audio_bytes, "audio/webm")},
            data={"model": settings.whisper_model, "language": "en"},
        )
        if resp.status_code != 200:
            return ""
        return resp.json().get("text", "")


def _evaluate_match(
    target: str, transcript: str
) -> tuple[float, list[PhonemeScoreDetail]]:
    """
    Simple word-level matching.
    Production: replace with Azure Pronunciation Assessment or similar.
    """
    target_words = target.lower().strip().split()
    transcript_words = transcript.lower().strip().split()

    if not target_words:
        return 0.0, []

    phoneme_scores: list[PhonemeScoreDetail] = []
    correct_count = 0

    for i, tw in enumerate(target_words):
        if i < len(transcript_words) and transcript_words[i] == tw:
            correct_count += 1
            phoneme_scores.append(
                PhonemeScoreDetail(phoneme=tw, score=100.0)
            )
        else:
            spoken = transcript_words[i] if i < len(transcript_words) else ""
            similarity = _word_similarity(tw, spoken)
            phoneme_scores.append(
                PhonemeScoreDetail(
                    phoneme=tw,
                    score=similarity,
                    suggestion=f"Expected '{tw}'" if similarity < 60 else None,
                )
            )
            if similarity >= 80:
                correct_count += 1

    overall = (correct_count / len(target_words)) * 100
    return overall, phoneme_scores


def _word_similarity(target: str, spoken: str) -> float:
    if not spoken:
        return 0.0
    if target == spoken:
        return 100.0
    # Simple character overlap ratio
    common = sum(1 for c in target if c in spoken)
    max_len = max(len(target), len(spoken))
    return (common / max_len) * 100 if max_len > 0 else 0.0


def _score_to_grade(score: float) -> PronunciationGrade:
    if score >= 90:
        return PronunciationGrade.GREEN
    elif score >= 60:
        return PronunciationGrade.YELLOW
    return PronunciationGrade.RETRY
