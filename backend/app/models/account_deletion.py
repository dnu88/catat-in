from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


AccountDeletionStatus = Literal["pending", "in_review", "completed", "rejected", "cancelled"]


class AccountDeletionRequestItem(BaseModel):
    id: str
    user_id: str
    email: str
    status: AccountDeletionStatus
    reason: str | None = None
    details: str | None = None
    review_notes: str | None = None
    requested_at: datetime
    reviewed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AccountDeletionRequestCreate(BaseModel):
    reason: str | None = Field(default=None, max_length=120)
    details: str | None = Field(default=None, max_length=500)
    confirm_email: str | None = Field(default=None, max_length=255)


class AccountDeletionRequestEnvelope(BaseModel):
    request: AccountDeletionRequestItem | None = None


class AccountDeletionRequestSubmitResponse(BaseModel):
    request: AccountDeletionRequestItem
    created: bool
