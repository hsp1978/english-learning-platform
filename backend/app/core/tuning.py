"""
Tuning parameter service.
Loads tuning.json and resolves parameters based on AB test group.

Usage:
    from app.core.tuning import get_tuning
    tuning = get_tuning()
    xp = tuning.xp_rewards("control")["phonics_lesson_complete"]
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


_TUNING_PATH = Path(__file__).parent / "tuning.json"
_DEFAULT_GROUP = "control"


class TuningConfig:
    def __init__(self, data: dict[str, Any]) -> None:
        self._data = data

    def _resolve(self, section: str, group: str) -> dict[str, Any]:
        section_data = self._data.get(section, {})
        resolved = section_data.get(group)
        if resolved is None:
            resolved = section_data.get(_DEFAULT_GROUP, {})
        return resolved

    def spaced_repetition(self, group: str = _DEFAULT_GROUP) -> dict[str, Any]:
        return self._resolve("spaced_repetition", group)

    def xp_rewards(self, group: str = _DEFAULT_GROUP) -> dict[str, Any]:
        return self._resolve("xp_rewards", group)

    def level_thresholds(self, group: str = _DEFAULT_GROUP) -> list[int]:
        thresholds = self._data.get("level_thresholds", {})
        return thresholds.get(group, thresholds.get(_DEFAULT_GROUP, [0]))

    def pronunciation(self, group: str = _DEFAULT_GROUP) -> dict[str, Any]:
        return self._resolve("pronunciation_thresholds", group)

    def adaptive(self, group: str = _DEFAULT_GROUP) -> dict[str, Any]:
        return self._resolve("adaptive_learning", group)

    def lesson_difficulty(self, group: str = _DEFAULT_GROUP) -> dict[str, Any]:
        return self._resolve("lesson_difficulty", group)

    def month_advancement(self, group: str = _DEFAULT_GROUP) -> dict[str, Any]:
        return self._resolve("month_advancement", group)

    def groups(self) -> list[str]:
        return list(self._data.get("groups", {}).keys())

    def raw(self) -> dict[str, Any]:
        return self._data


@lru_cache
def get_tuning() -> TuningConfig:
    with open(_TUNING_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return TuningConfig(data)


def reload_tuning() -> TuningConfig:
    """Force reload from disk (for hot-reload during development)."""
    get_tuning.cache_clear()
    return get_tuning()
