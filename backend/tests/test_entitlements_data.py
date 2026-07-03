from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.core import entitlements as ent


def _resp(data):
    return SimpleNamespace(data=data)


def _build_client(*, profile_rows, payment_rows=None, usage_rows=None):
    client = MagicMock()
    profile_query = MagicMock()
    payment_query = MagicMock()
    usage_query = MagicMock()

    profile_query.select.return_value.eq.return_value.limit.return_value.execute.return_value = _resp(
        profile_rows
    )
    payment_query.select.return_value.eq.return_value.eq.return_value.order.return_value.order.return_value.limit.return_value.execute.return_value = _resp(
        payment_rows or []
    )
    usage_query.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _resp(
        usage_rows or []
    )

    def table(name):
        if name == "profiles":
            return profile_query
        if name == "payments":
            return payment_query
        if name == "ai_usage":
            return usage_query
        raise AssertionError(f"unexpected table: {name}")

    client.table.side_effect = table
    return client


def test_current_period_ym_respects_subscription_anchor_day():
    anchor = datetime(2026, 6, 15, tzinfo=timezone.utc)

    assert ent.current_period_ym(
        now=datetime(2026, 7, 14, 12, 0, tzinfo=timezone.utc),
        subscription_started_at=anchor,
    ) == "2026-06"
    assert ent.current_period_ym(
        now=datetime(2026, 7, 15, 0, 0, tzinfo=timezone.utc),
        subscription_started_at=anchor,
    ) == "2026-07"


def test_load_state_premium_and_counts_uses_subscription_cycle():
    client = _build_client(
        profile_rows=[
            {
                "plan_type": "premium",
                "plan_expires_at": "2099-01-01T00:00:00+00:00",
            }
        ],
        payment_rows=[
            {
                "paid_at": "2026-06-15T08:00:00+00:00",
                "created_at": "2026-06-15T08:00:00+00:00",
            }
        ],
        usage_rows=[{"chat_count": 5, "photo_count": 2}],
    )
    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        st = ent.load_state("user-1", now=datetime(2026, 7, 14, 12, 0, tzinfo=timezone.utc))

    assert st["is_premium"] is True
    assert st["plan_expires_at"] == "2099-01-01T00:00:00+00:00"
    assert st["chat_count"] == 5 and st["photo_count"] == 2
    assert st["period_ym"] == "2026-06"


def test_load_state_free_user_stays_on_calendar_month():
    client = _build_client(
        profile_rows=[{"plan_type": "free", "plan_expires_at": None}],
        usage_rows=[{"chat_count": 3, "photo_count": 0}],
    )
    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        st = ent.load_state("user-1", now=datetime(2026, 7, 14, 12, 0, tzinfo=timezone.utc))

    assert st["is_premium"] is False
    assert st["period_ym"] == "2026-07"
    assert st["chat_count"] == 3 and st["photo_count"] == 0


def test_record_use_calls_rpc():
    client = MagicMock()
    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        ent.record_use("user-1", "2026-06", "chat")
    client.rpc.assert_called_once_with(
        "increment_ai_usage",
        {"p_user_id": "user-1", "p_period": "2026-06", "p_kind": "chat"},
    )
    client.rpc.return_value.execute.assert_called_once()


def test_record_use_falls_back_to_direct_upsert_when_rpc_fails():
    client = MagicMock()
    client.rpc.return_value.execute.side_effect = RuntimeError("rpc missing")
    usage_query = client.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    usage_query.execute.return_value = _resp([{"chat_count": 2, "photo_count": 1}])

    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        ent.record_use("user-1", "2026-06", "chat")

    client.table.return_value.upsert.assert_called_once_with(
        {
            "user_id": "user-1",
            "period_ym": "2026-06",
            "chat_count": 3,
            "photo_count": 1,
        },
        on_conflict="user_id,period_ym",
    )
    client.table.return_value.upsert.return_value.execute.assert_called_once()
