from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_pricing_promo_when_few_users(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=10):
        r = client.get("/api/v1/payments/pricing", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["tier"] == "promo"
    assert data["monthly"] == 29000 and data["yearly"] == 249000


def test_pricing_normal_when_quota_reached(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=100):
        r = client.get("/api/v1/payments/pricing", headers={"Authorization": "Bearer x"})
    assert r.json()["tier"] == "normal"
    assert r.json()["monthly"] == 39000
