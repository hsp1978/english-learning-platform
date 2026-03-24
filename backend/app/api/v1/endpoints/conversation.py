from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token, get_current_user_id
from app.models.models import (
    ChildProfile,
    ConversationScenario,
    ConversationSession,
)
from app.schemas.schemas import ChatRequest, ChatResponse, ConversationScenarioResponse
from app.services.llm_router import RequestType, get_llm_router

router = APIRouter(prefix="/talk", tags=["conversation"])


@router.get("/scenarios", response_model=list[ConversationScenarioResponse])
async def list_scenarios(
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child_result = await db.execute(
        select(ChildProfile).where(
            ChildProfile.id == child_id,
            ChildProfile.parent_id == uuid.UUID(user_id),
        )
    )
    child = child_result.scalar_one_or_none()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")

    result = await db.execute(
        select(ConversationScenario)
        .where(
            ConversationScenario.is_active.is_(True),
            ConversationScenario.target_month <= child.current_month,
        )
        .order_by(ConversationScenario.target_month)
    )
    scenarios = list(result.scalars().all())
    return [ConversationScenarioResponse.model_validate(s) for s in scenarios]


@router.websocket("/ws/{scenario_id}")
async def conversation_websocket(
    websocket: WebSocket,
    scenario_id: uuid.UUID,
    token: str = Query(...),
    child_id: uuid.UUID = Query(...),
):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    from app.core.database import async_session_factory

    async with async_session_factory() as db:
        scenario = await _load_scenario(db, scenario_id)
        if scenario is None:
            await websocket.send_json({"type": "error", "message": "Scenario not found"})
            await websocket.close()
            return

        child = await _load_child(db, child_id, user_id)
        if child is None:
            await websocket.send_json({"type": "error", "message": "Child not found"})
            await websocket.close()
            return

        session = ConversationSession(
            child_id=child_id,
            scenario_id=scenario_id,
            messages=[],
        )
        db.add(session)
        await db.flush()

        system_prompt = _build_system_prompt(scenario, child)

        # Send starter message
        if scenario.starter_messages:
            starter = scenario.starter_messages[0]
            await websocket.send_json({
                "type": "assistant_message",
                "content": starter,
            })
            session.messages.append({"role": "assistant", "content": starter})
            session.turn_count += 1

        llm = get_llm_router()

        try:
            while True:
                raw = await websocket.receive_text()
                data = json.loads(raw)
                msg_type = data.get("type", "chat")

                if msg_type == "chat":
                    user_message = data.get("message", "").strip()
                    if not user_message:
                        continue

                    session.messages.append({"role": "user", "content": user_message})

                    messages_for_llm = [
                        {"role": m["role"], "content": m["content"]}
                        for m in session.messages
                    ]

                    # Stream response
                    full_response = ""
                    async for chunk in llm.generate_stream(
                        request_type=RequestType.FREE_CONVERSATION,
                        messages=messages_for_llm,
                        system_prompt=system_prompt,
                    ):
                        full_response += chunk
                        await websocket.send_json({
                            "type": "token",
                            "token": chunk,
                        })

                    session.messages.append({"role": "assistant", "content": full_response})
                    session.turn_count += 1

                    xp_per_turn = 4
                    session.xp_earned += xp_per_turn
                    child.total_xp += xp_per_turn

                    await websocket.send_json({
                        "type": "turn_complete",
                        "xp_earned": xp_per_turn,
                        "total_turns": session.turn_count,
                    })

                elif msg_type == "end":
                    session.ended_at = datetime.now(timezone.utc)
                    await db.commit()
                    await websocket.send_json({
                        "type": "session_end",
                        "total_xp": session.xp_earned,
                        "total_turns": session.turn_count,
                    })
                    break

        except WebSocketDisconnect:
            session.ended_at = datetime.now(timezone.utc)
            await db.commit()


def _build_system_prompt(scenario: ConversationScenario, child: ChildProfile) -> str:
    template = scenario.system_prompt_template
    return template.format(
        character_name=scenario.character_name,
        child_nickname=child.nickname,
        current_phase=child.current_phase,
        current_month=child.current_month,
        max_words=scenario.max_sentence_words,
        allowed_vocabulary=", ".join(scenario.allowed_vocabulary[:50]),
    )


async def _load_scenario(
    db: AsyncSession, scenario_id: uuid.UUID
) -> Optional[ConversationScenario]:
    result = await db.execute(
        select(ConversationScenario).where(ConversationScenario.id == scenario_id)
    )
    return result.scalar_one_or_none()


async def _load_child(
    db: AsyncSession, child_id: uuid.UUID, user_id: str
) -> Optional[ChildProfile]:
    result = await db.execute(
        select(ChildProfile).where(
            ChildProfile.id == child_id,
            ChildProfile.parent_id == uuid.UUID(user_id),
        )
    )
    return result.scalar_one_or_none()
