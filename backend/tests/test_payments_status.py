from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_status_syncs_from_midtrans(client):
    with patch("app.api.v1.payments.fetch_and_sync_status",
               return_value={"order_id": "kw-x", "status": "paid"}):
        r = client.get("/api/v1/payments/kw-x/status", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
