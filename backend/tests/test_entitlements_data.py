from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from app.core import entitlements as ent


def _resp(data):
    return SimpleNamespace(data=data)


def test_load_state_premium_and_counts():
    client = MagicMock()
    prof = client.table.return_value.select.return_value.eq.return_value.limit.return_value
    prof.execute.return_value = _resp([{"plan_type": "premium",
                                        "plan_expires_at": "2099-01-01T00:00:00+00:00"}])
    usage = client.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    usage.execute.return_value = _resp([{"chat_count": 5, "photo_count": 2}])
    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        st = ent.load_state("user-1")
    assert st["is_premium"] is True
    assert st["plan_expires_at"] == "2099-01-01T00:00:00+00:00"
    assert st["chat_count"] == 5 and st["photo_count"] == 2
    assert "period_ym" in st


def test_record_use_calls_rpc():
    client = MagicMock()
    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        ent.record_use("user-1", "2026-06", "chat")
    client.rpc.assert_called_once_with(
        "increment_ai_usage",
        {"p_user_id": "user-1", "p_period": "2026-06", "p_kind": "chat"},
    )
    client.rpc.return_value.execute.assert_called_once()
