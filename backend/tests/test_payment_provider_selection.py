from unittest.mock import MagicMock, patch

import pytest

from app.core.config import Settings
from app.services import payment_service as ps


def test_settings_mayar_allowed_emails_default_safe_empty():
    configured = Settings(_env_file=None, SECRET_KEY="secret")

    assert configured.MAYAR_ALLOWED_EMAILS == []


def test_settings_mayar_allowed_emails_parse_and_normalize_csv():
    configured = Settings(
        _env_file=None,
        SECRET_KEY="secret",
        MAYAR_ALLOWED_EMAILS="Tester@Example.com, second@example.com, tester@example.com ",
    )

    assert configured.MAYAR_ALLOWED_EMAILS == ["tester@example.com", "second@example.com"]


def test_settings_mayar_allowed_emails_parse_and_normalize_csv_from_dotenv(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "SECRET_KEY=secret\n"
        "MAYAR_ALLOWED_EMAILS=Tester@Example.com, second@example.com, tester@example.com \n",
        encoding="utf-8",
    )

    configured = Settings(_env_file=env_file)

    assert configured.MAYAR_ALLOWED_EMAILS == ["tester@example.com", "second@example.com"]


def test_mayar_provider_prefers_redirect_url_env_over_legacy_callback_env():
    with patch.object(ps.settings, "MAYAR_API_KEY", "mayar-key"), \
         patch.object(ps.settings, "MAYAR_BASE_URL", "https://api.mayar.id/hl/v1"), \
         patch.object(ps.settings, "MAYAR_REDIRECT_URL", "https://kaswise.com/upgrade"), \
         patch.object(ps.settings, "MAYAR_CALLBACK_URL", "https://legacy.example/callback"):
        provider = ps._mayar_provider()
        assert provider._redirect_url() == "https://kaswise.com/upgrade"


def test_mayar_provider_falls_back_to_legacy_callback_env_when_redirect_missing():
    with patch.object(ps.settings, "MAYAR_API_KEY", "mayar-key"), \
         patch.object(ps.settings, "MAYAR_BASE_URL", "https://api.mayar.id/hl/v1"), \
         patch.object(ps.settings, "MAYAR_REDIRECT_URL", None), \
         patch.object(ps.settings, "MAYAR_CALLBACK_URL", "https://kaswise.com/upgrade"):
        provider = ps._mayar_provider()
        assert provider._redirect_url() == "https://kaswise.com/upgrade"


def test_resolve_checkout_provider_name_blocks_mayar_for_non_allowlisted_email():
    with patch.object(ps.settings, "PAYMENT_PRIMARY_PROVIDER", "mayar"), \
         patch.object(ps.settings, "MAYAR_ALLOWED_EMAILS", []):
        with pytest.raises(ps.MayarAccessDeniedError):
            ps.resolve_checkout_provider_name(email="u1@example.com")


def test_resolve_checkout_provider_name_allows_mayar_for_allowlisted_email_case_insensitive():
    with patch.object(ps.settings, "PAYMENT_PRIMARY_PROVIDER", "mayar"), \
         patch.object(ps.settings, "MAYAR_ALLOWED_EMAILS", ["tester@example.com"]):
        assert ps.resolve_checkout_provider_name(email="Tester@Example.com") == "mayar"


def test_fetch_and_sync_status_with_mayar_uses_known_order_id_when_extradata_missing():
    """Mayar detail endpoint may not return extraData; known_order_id must be fallback."""
    from app.services.payments import orchestrator

    provider = MagicMock()
    provider.name = "mayar"
    provider.fetch_status.return_value = {
        "data": {
            "id": "inv-1",
            "amount": 29000,
            "status": "PAID",
            # No extraData here — simulates Mayar detail endpoint omission
        }
    }
    # extract_order_id returns empty because no extraData
    provider.extract_order_id.return_value = ""
    provider.map_internal_status.return_value = "paid"
    provider.extract_gross_amount.return_value = 29000
    provider.build_payment_update.side_effect = lambda payload, *, new_status: {
        "provider": "mayar",
        "provider_order_id": "inv-1",
        "provider_status": "PAID",
        "status": new_status,
        "raw_payload": payload,
    }
    provider.build_status_response.return_value = {"provider": "mayar", "provider_status": "PAID"}

    repo = MagicMock()
    repo.get_payment_by_order_id.return_value = {
        "id": "p1", "user_id": "u1", "plan": "monthly", "status": "pending", "amount": 29000,
    }

    result = orchestrator.fetch_and_sync_status(
        "kw-x",
        provider=provider,
        provider_order_id="inv-1",
        repository_module=repo,
        client=object(),
        activate_paid_profile=True,
    )

    # Should resolve order_id from known_order_id fallback, not fail silently
    assert result["status"] == "paid"
    repo.get_payment_by_order_id.assert_called_once()
    assert repo.get_payment_by_order_id.call_args.args[0] == "kw-x"
    repo.update_payment.assert_called_once()
    assert repo.update_payment.call_args.args[0] == "kw-x"
    assert repo.update_payment.call_args.args[1]["status"] == "paid"


def test_fetch_and_sync_status_with_mayar_does_not_activate_profile_when_disabled():
    provider = MagicMock()
    provider.name = "mayar"
    provider.fetch_status.return_value = {
        "data": {
            "id": "inv-1",
            "amount": 29000,
            "status": "PAID",
            "extraData": {"orderId": "kw-x"},
        }
    }
    provider.extract_order_id.return_value = "kw-x"
    provider.map_internal_status.return_value = "paid"
    provider.extract_gross_amount.return_value = 29000
    provider.build_payment_update.side_effect = lambda payload, *, new_status: {
        "provider": "mayar",
        "provider_order_id": "inv-1",
        "provider_status": "PAID",
        "status": new_status,
        "raw_payload": payload,
    }
    provider.build_status_response.return_value = {"provider": "mayar", "provider_status": "PAID"}

    with patch.object(ps, "_mayar_provider", return_value=provider), \
         patch.object(ps, "_get_supabase_service_client", return_value=object()), \
         patch.object(ps.settings, "MAYAR_ACTIVATION_ENABLED", False), \
         patch.object(ps.repository, "get_payment_by_order_id", return_value={
             "id": "p1", "user_id": "u1", "plan": "monthly", "status": "pending", "amount": 29000,
         }), \
         patch.object(ps.repository, "update_payment") as update_payment, \
         patch.object(ps.repository, "update_profile") as update_profile:
        result = ps.fetch_and_sync_status("kw-x", provider_name="mayar", provider_order_id="inv-1")

    assert result == {"order_id": "kw-x", "status": "pending", "provider": "mayar", "provider_status": "PAID"}
    update_profile.assert_not_called()
    provider.build_payment_update.assert_called_once_with(provider.fetch_status.return_value, new_status="pending")
    update_payment.assert_called_once()
    assert update_payment.call_args.args[0] == "kw-x"
    assert update_payment.call_args.args[1]["status"] == "pending"
    assert update_payment.call_args.args[1]["provider_status"] == "PAID"
    assert update_payment.call_args.args[1]["raw_payload"] == provider.fetch_status.return_value
    assert "paid_at" not in update_payment.call_args.args[1]
