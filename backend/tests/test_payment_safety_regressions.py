"""Payment safety regressions: synthetic credentials and no external writes."""
import hashlib
from unittest.mock import Mock
from datetime import datetime, timedelta, timezone

from app.core.auth import _is_active_premium_profile
from app.core.entitlements import evaluate

import pytest

from app.services.payments import orchestrator
from app.services.payments.providers.midtrans import MidtransProvider


def test_midtrans_missing_server_key_rejects_publicly_computable_signature():
    payload = {
        "order_id": "kw-qa-only",
        "status_code": "200",
        "gross_amount": "29000.00",
        "transaction_status": "settlement",
    }
    payload["signature_key"] = hashlib.sha512(
        b"kw-qa-only20029000.00"
    ).hexdigest()
    provider = MidtransProvider(server_key_getter=lambda: "")
    assert provider.verify_notification_signature(payload) is False


def test_midtrans_notification_cannot_activate_mayar_payment():
    repo = Mock()
    repo.get_profile.return_value = {}
    repo.get_payment_by_order_id.return_value = {
        "user_id": "qa-user", "plan": "monthly", "status": "pending",
        "amount": 29000, "provider": "mayar",
    }
    result = orchestrator.activate_premium_from_notification(
        {"order_id": "kw-qa-only", "transaction_status": "settlement", "gross_amount": "29000.00"},
        provider=MidtransProvider(), repository_module=repo, client=object(),
    )
    assert result == "pending"
    repo.update_profile.assert_not_called()
    repo.update_payment.assert_not_called()


@pytest.mark.parametrize("gross_amount", ["29000.99", "Infinity", "NaN", "not-a-number"])
def test_nonmatching_or_nonfinite_amount_cannot_grant_premium(gross_amount):
    repo = Mock()
    repo.get_profile.return_value = {}
    repo.get_payment_by_order_id.return_value = {
        "user_id": "qa-user", "plan": "monthly", "status": "pending",
        "amount": 29000, "provider": "midtrans",
    }
    result = orchestrator.activate_premium_from_notification(
        {"order_id": "kw-qa-only", "transaction_status": "settlement", "gross_amount": gross_amount},
        provider=MidtransProvider(), repository_module=repo, client=object(),
    )
    assert result == "pending"
    repo.update_profile.assert_not_called()
    repo.update_payment.assert_not_called()


@pytest.mark.parametrize("plan,days", [("monthly", 30), ("yearly", 365)])
def test_paid_renewal_entitlement_quota_and_sequential_replay(plan, days):
    # In-memory persistence only; this is an integration of domain functions,
    # not a real provider/DB/browser end-to-end purchase.
    now = datetime(2098, 1, 1, tzinfo=timezone.utc)
    prior_expiry = now + timedelta(days=10)
    profile = {"plan_type": "free", "plan_expires_at": prior_expiry.isoformat()}
    payment = {
        "user_id": "qa-user", "plan": plan, "status": "pending",
        "amount": 29000, "provider": "midtrans",
    }
    repo = Mock()
    repo.get_payment_by_order_id.side_effect = lambda *a, **kw: dict(payment)
    repo.get_profile.side_effect = lambda *a, **kw: dict(profile)
    repo.update_profile.side_effect = lambda uid, data, **kw: profile.update(data)
    repo.update_payment.side_effect = lambda oid, data, **kw: payment.update(data)
    payload = {"order_id": "kw-qa-only", "transaction_status": "settlement", "gross_amount": "29000.00"}
    kwargs = dict(provider=MidtransProvider(), repository_module=repo, client=object(), now_func=lambda: now)
    assert orchestrator.activate_premium_from_notification(payload, **kwargs) == "paid"
    assert profile["plan_expires_at"] == (prior_expiry + timedelta(days=days)).isoformat()
    assert payment["granted_until"] == profile["plan_expires_at"]
    assert _is_active_premium_profile(profile)
    assert evaluate(is_premium=True, kind="chat", chat_count=199, photo_count=0).allowed
    assert evaluate(is_premium=True, kind="chat", chat_count=200, photo_count=0).status_code == 429
    assert evaluate(is_premium=True, kind="photo", chat_count=0, photo_count=99).allowed
    assert evaluate(is_premium=True, kind="photo", chat_count=0, photo_count=100).status_code == 429
    assert orchestrator.activate_premium_from_notification(payload, **kwargs) == "paid"
    repo.update_profile.assert_called_once()
    repo.update_payment.assert_called_once()


@pytest.mark.parametrize("signature", [None, 123, [], {}])
def test_midtrans_nonstring_signature_rejected(signature):
    provider = MidtransProvider(server_key_getter=lambda: "qa-only")
    assert provider.verify_notification_signature({"signature_key": signature}) is False
