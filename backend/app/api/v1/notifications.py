"""Notification API — preferences CRUD and notification inbox."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user
from app.models.notifications import (
    NotificationListResponse,
    NotificationPreferences,
    NotificationPreferencesUpdate,
    UnreadCountResponse,
)
from app.services.notification_service import (
    get_preferences,
    update_preferences,
    list_notifications,
    get_unread_count,
    mark_notification_read,
    mark_all_read,
)

router = APIRouter()


@router.get("/preferences", response_model=NotificationPreferences)
async def read_preferences(current_user: dict = Depends(get_current_user)):
    """Return current notification preferences for the authenticated user."""
    return get_preferences(current_user["user_id"])


@router.put("/preferences", response_model=NotificationPreferences)
async def write_preferences(
    body: NotificationPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update notification preferences. Only provided fields are changed."""
    patch = body.model_dump(exclude_unset=True)
    return update_preferences(current_user["user_id"], patch)


@router.get("", response_model=NotificationListResponse)
async def read_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    unread_only: bool = Query(default=False, alias="unreadOnly"),
    current_user: dict = Depends(get_current_user),
):
    """List notifications for the current user, newest first."""
    return list_notifications(current_user["user_id"], limit=limit, unread_only=unread_only)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def read_unread_count(current_user: dict = Depends(get_current_user)):
    """Return the number of unread notifications."""
    count = get_unread_count(current_user["user_id"])
    return {"unread_count": count}


@router.patch("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def patch_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a single notification as read."""
    mark_notification_read(current_user["user_id"], notification_id)


@router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def patch_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all unread notifications as read."""
    mark_all_read(current_user["user_id"])
