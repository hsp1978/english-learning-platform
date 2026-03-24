from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.core.tuning import get_tuning, reload_tuning

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/tuning")
async def get_tuning_config(
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """View current tuning configuration."""
    tuning = get_tuning()
    return {
        "groups": tuning.groups(),
        "config": tuning.raw(),
    }


@router.get("/tuning/{group}")
async def get_group_config(
    group: str,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """View resolved config for a specific AB test group."""
    tuning = get_tuning()
    return {
        "group": group,
        "spaced_repetition": tuning.spaced_repetition(group),
        "xp_rewards": tuning.xp_rewards(group),
        "level_thresholds": tuning.level_thresholds(group),
        "pronunciation": tuning.pronunciation(group),
        "adaptive": tuning.adaptive(group),
        "lesson_difficulty": tuning.lesson_difficulty(group),
        "month_advancement": tuning.month_advancement(group),
    }


@router.post("/tuning/reload")
async def reload_tuning_config(
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    """Hot-reload tuning.json from disk."""
    reload_tuning()
    return {"status": "reloaded"}


@router.get("/tuning/compare")
async def compare_groups(
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Side-by-side comparison of all groups for a specific section."""
    tuning = get_tuning()
    groups = tuning.groups()

    comparison = {}
    for section_fn_name in ["xp_rewards", "spaced_repetition", "pronunciation", "adaptive", "lesson_difficulty", "month_advancement"]:
        fn = getattr(tuning, section_fn_name)
        comparison[section_fn_name] = {g: fn(g) for g in groups}

    comparison["level_thresholds"] = {
        g: tuning.level_thresholds(g) for g in groups
    }

    return {"groups": groups, "comparison": comparison}
