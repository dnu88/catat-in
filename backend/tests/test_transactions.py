"""
Tests for transactions endpoint - simplified for stability testing.
Focus on auth and validation, not complex Firestore mocking.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient


class TestTransactionsAuth:
    """Tests for transaction endpoint authentication."""

    def test_create_transaction_requires_auth(self, client):
        """Create transaction should require authentication."""
        response = client.post("/api/v1/transactions", json={
            "wallet_id": "wallet-123",
            "type": "expense",
            "amount": 10000,
            "category": "food"
        })
        assert response.status_code == 401

    def test_list_transactions_requires_auth(self, client):
        """List transactions should require authentication."""
        response = client.get("/api/v1/transactions")
        assert response.status_code == 401

    def test_get_transaction_requires_auth(self, client):
        """Get single transaction should require authentication."""
        response = client.get("/api/v1/transactions/tx-123")
        assert response.status_code == 401

    def test_update_transaction_requires_auth(self, client):
        """Update transaction should require authentication."""
        response = client.patch("/api/v1/transactions/tx-123", json={"amount": 15000})
        assert response.status_code == 401

    def test_delete_transaction_requires_auth(self, client):
        """Delete transaction should require authentication."""
        response = client.delete("/api/v1/transactions/tx-123")
        assert response.status_code == 401


class TestTransactionsValidation:
    """Tests for transaction input validation."""

    def test_create_transaction_validates_required_fields(self, client, mock_auth, auth_headers, mock_firestore):
        """Create transaction should validate required fields."""
        response = client.post("/api/v1/transactions", json={}, headers=auth_headers)
        assert response.status_code == 422

    def test_create_transaction_validates_type_enum(self, client, mock_auth, auth_headers, mock_firestore):
        """Create transaction should validate type is income or expense."""
        response = client.post(
            "/api/v1/transactions",
            json={
                "wallet_id": "wallet-123",
                "type": "invalid_type",
                "amount": 10000,
                "category": "food"
            },
            headers=auth_headers
        )
        assert response.status_code == 422

    def test_create_transaction_validates_amount_positive(self, client, mock_auth, auth_headers, mock_firestore):
        """Create transaction should validate amount is positive."""
        response = client.post(
            "/api/v1/transactions",
            json={
                "wallet_id": "wallet-123",
                "type": "expense",
                "amount": -100,
                "category": "food"
            },
            headers=auth_headers
        )
        assert response.status_code == 422

    def test_create_transaction_validates_amount_zero(self, client, mock_auth, auth_headers, mock_firestore):
        """Create transaction should reject zero amount."""
        response = client.post(
            "/api/v1/transactions",
            json={
                "wallet_id": "wallet-123",
                "type": "expense",
                "amount": 0,
                "category": "food"
            },
            headers=auth_headers
        )
        assert response.status_code == 422


class TestWalletBalanceUpdate:
    """Tests for the _adjust_wallet_balance function - the bug fix target."""

    def test_adjust_wallet_balance_income_increases_balance(self, mock_firestore):
        """Income should increase wallet balance."""
        from app.api.v1.transactions import _adjust_wallet_balance

        # Mock wallet with balance 50000
        mock_wallet_snap = Mock()
        mock_wallet_snap.exists = True
        mock_wallet_snap.to_dict.return_value = {"balance": 50000.0}

        mock_wallet_ref = Mock()
        mock_wallet_ref.get.return_value = mock_wallet_snap
        mock_wallet_ref.update = Mock()

        with patch('app.api.v1.transactions._wallet_ref', return_value=mock_wallet_ref):
            _adjust_wallet_balance("test-uid", "wallet-123", "income", 25000.0)

        # Verify balance was increased
        mock_wallet_ref.update.assert_called_once()
        call_args = mock_wallet_ref.update.call_args[0][0]
        assert call_args["balance"] == 75000.0  # 50000 + 25000

    def test_adjust_wallet_balance_expense_decreases_balance(self, mock_firestore):
        """Expense should decrease wallet balance."""
        from app.api.v1.transactions import _adjust_wallet_balance

        # Mock wallet with balance 50000
        mock_wallet_snap = Mock()
        mock_wallet_snap.exists = True
        mock_wallet_snap.to_dict.return_value = {"balance": 50000.0}

        mock_wallet_ref = Mock()
        mock_wallet_ref.get.return_value = mock_wallet_snap
        mock_wallet_ref.update = Mock()

        with patch('app.api.v1.transactions._wallet_ref', return_value=mock_wallet_ref):
            _adjust_wallet_balance("test-uid", "wallet-123", "expense", 10000.0)

        # Verify balance was decreased
        mock_wallet_ref.update.assert_called_once()
        call_args = mock_wallet_ref.update.call_args[0][0]
        assert call_args["balance"] == 40000.0  # 50000 - 10000

    def test_adjust_wallet_balance_reverse_flips_direction(self, mock_firestore):
        """Reverse flag should flip the balance change direction."""
        from app.api.v1.transactions import _adjust_wallet_balance

        # Mock wallet with balance 50000
        mock_wallet_snap = Mock()
        mock_wallet_snap.exists = True
        mock_wallet_snap.to_dict.return_value = {"balance": 50000.0}

        mock_wallet_ref = Mock()
        mock_wallet_ref.get.return_value = mock_wallet_snap
        mock_wallet_ref.update = Mock()

        with patch('app.api.v1.transactions._wallet_ref', return_value=mock_wallet_ref):
            _adjust_wallet_balance("test-uid", "wallet-123", "income", 25000.0, reverse=True)

        mock_wallet_ref.update.assert_called_once()
        call_args = mock_wallet_ref.update.call_args[0][0]
        assert call_args["balance"] == 25000.0  # 50000 - 25000 (reversed income)

    def test_adjust_wallet_balance_handles_missing_wallet(self, mock_firestore):
        """Should handle case where wallet doesn't exist gracefully."""
        from app.api.v1.transactions import _adjust_wallet_balance

        # Mock wallet not found
        mock_wallet_snap = Mock()
        mock_wallet_snap.exists = False

        mock_wallet_ref = Mock()
        mock_wallet_ref.get.return_value = mock_wallet_snap

        with patch('app.api.v1.transactions._wallet_ref', return_value=mock_wallet_ref):
            _adjust_wallet_balance("test-uid", "nonexistent", "income", 10000.0)

        # Should not call update
        mock_wallet_ref.update.assert_not_called()
