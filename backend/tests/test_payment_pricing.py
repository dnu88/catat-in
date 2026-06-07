import pytest
from app.services import payment_service as ps


def test_price_for_promo_and_normal():
    assert ps.price_for("monthly", "promo") == 29000
    assert ps.price_for("monthly", "normal") == 39000
    assert ps.price_for("yearly", "promo") == 249000
    assert ps.price_for("yearly", "normal") == 349000


def test_tier_for_count_boundary():
    assert ps.tier_for_count(0) == "promo"
    assert ps.tier_for_count(99) == "promo"
    assert ps.tier_for_count(100) == "normal"
    assert ps.tier_for_count(500) == "normal"


def test_price_for_invalid_plan():
    with pytest.raises(ValueError):
        ps.price_for("weekly", "promo")


def test_duration_days():
    assert ps.duration_days("monthly") == 30
    assert ps.duration_days("yearly") == 365
    with pytest.raises(ValueError):
        ps.duration_days("weekly")
