from types import SimpleNamespace
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from app.services import payment_service as ps


def _resp(data):
    return SimpleNamespace(data=data)


def test_count_paid_users():
    client = MagicMock()
    q = client.table.return_value.select.return_value.eq.return_value
    q.execute.return_value = _resp([{"user_id": "a"}, {"user_id": "a"}, {"user_id": "b"}])
    with patch.object(ps, "_get_supabase_service_client", return_value=client):
        assert ps.count_paid_users() == 2  # distinct


def test_activate_premium_from_notification_paid():
    client = MagicMock()
    pay = client.table.return_value.select.return_value.eq.return_value.limit.return_value
    pay.execute.return_value = _resp([{"id": "p1", "user_id": "u1", "plan": "monthly",
                                       "status": "pending"}])
    with patch.object(ps, "_get_supabase_service_client", return_value=client), \
         patch.object(ps, "_now", return_value=datetime(2026, 6, 7, tzinfo=timezone.utc)):
        result = ps.activate_premium_from_notification(
            {"order_id": "kw-x", "transaction_status": "settlement",
             "fraud_status": "accept", "payment_type": "qris"})
    assert result == "paid"
    update_calls = client.table.return_value.update.call_args_list
    assert any("plan_type" in (c.args[0] if c.args else {}) for c in update_calls)


def test_activate_idempotent_already_paid():
    client = MagicMock()
    pay = client.table.return_value.select.return_value.eq.return_value.limit.return_value
    pay.execute.return_value = _resp([{"id": "p1", "user_id": "u1", "plan": "monthly",
                                       "status": "paid"}])
    with patch.object(ps, "_get_supabase_service_client", return_value=client):
        result = ps.activate_premium_from_notification(
            {"order_id": "kw-x", "transaction_status": "settlement", "fraud_status": "accept"})
    assert result == "paid"
    # tidak ada update profiles plan_type lagi (idempoten)
    update_calls = client.table.return_value.update.call_args_list
    assert not any("plan_type" in (c.args[0] if c.args else {}) for c in update_calls)
