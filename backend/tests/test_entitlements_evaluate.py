from app.core import entitlements as ent


def test_free_chat_within_limit_allowed():
    d = ent.evaluate(is_premium=False, kind="chat", chat_count=10, photo_count=0)
    assert d.allowed is True


def test_free_chat_exhausted_paywall_402():
    d = ent.evaluate(is_premium=False, kind="chat", chat_count=25, photo_count=0)
    assert d.allowed is False and d.status_code == 402 and d.reason == "quota_exhausted"


def test_free_photo_is_premium_only_402():
    d = ent.evaluate(is_premium=False, kind="photo", chat_count=0, photo_count=0)
    assert d.allowed is False and d.status_code == 402 and d.reason == "premium_only"


def test_premium_chat_fairuse_429():
    d = ent.evaluate(is_premium=True, kind="chat", chat_count=200, photo_count=0)
    assert d.allowed is False and d.status_code == 429 and d.reason == "fair_use"


def test_premium_photo_within_and_over():
    assert ent.evaluate(is_premium=True, kind="photo", chat_count=0, photo_count=99).allowed is True
    over = ent.evaluate(is_premium=True, kind="photo", chat_count=0, photo_count=100)
    assert over.allowed is False and over.status_code == 429 and over.reason == "fair_use"
