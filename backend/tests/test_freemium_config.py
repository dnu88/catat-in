from app.core.config import settings


def test_freemium_defaults():
    assert settings.ANTHROPIC_MODEL_EXTRACT == "claude-haiku-4-5"
    assert settings.ANTHROPIC_MODEL_INSIGHT == "claude-sonnet-4-6"
    assert settings.FREE_CHAT_MONTHLY == 25
    assert settings.PREMIUM_CHAT_MONTHLY == 200
    assert settings.PREMIUM_PHOTO_MONTHLY == 100
    assert settings.PROMO_MAX_SUBSCRIBERS == 100
    assert settings.PRICE_MONTHLY_PROMO == 29000
    assert settings.PRICE_MONTHLY_NORMAL == 39000
    assert settings.PRICE_YEARLY_PROMO == 249000
    assert settings.PRICE_YEARLY_NORMAL == 349000
