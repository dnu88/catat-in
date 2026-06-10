"""Pydantic models for notification preferences and notification items."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class NotificationPreferences(BaseModel):
    """Full notification preferences for a user."""

    enabled: bool = True
    daily_reminder_enabled: bool = True
    daily_reminder_time: str = Field(
        default="20:00", pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$"
    )
    budget_alert_enabled: bool = True
    budget_alert_thresholds: list[int] = [80, 100]
    weekly_summary_enabled: bool = True
    weekly_summary_day: int = Field(default=0, ge=0, le=6)
    weekly_summary_time: str = Field(
        default="19:00", pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$"
    )
    ai_insight_enabled: bool = True
    bill_reminder_enabled: bool = False
    timezone: str = "Asia/Jakarta"
    push_enabled: bool = False


class NotificationPreferencesUpdate(BaseModel):
    """Partial update for notification preferences."""

    enabled: bool | None = None
    daily_reminder_enabled: bool | None = None
    daily_reminder_time: str | None = Field(
        default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$"
    )
    budget_alert_enabled: bool | None = None
    budget_alert_thresholds: list[int] | None = None
    weekly_summary_enabled: bool | None = None
    weekly_summary_day: int | None = Field(default=None, ge=0, le=6)
    weekly_summary_time: str | None = Field(
        default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$"
    )
    ai_insight_enabled: bool | None = None
    bill_reminder_enabled: bool | None = None
    timezone: str | None = None
    push_enabled: bool | None = None


class NotificationItem(BaseModel):
    """A single notification record."""

    id: str
    type: str
    title: str
    body: str
    data: dict[str, Any] = Field(default_factory=dict)
    read_at: datetime | None = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Paginated notification list with unread count."""

    items: list[NotificationItem]
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Simple unread count response."""

    unread_count: int
