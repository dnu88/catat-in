"""
Pytest fixtures for backend tests.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_firestore():
    """Mock Firestore client to avoid real Firebase calls."""
    from unittest.mock import Mock, MagicMock

    # Create a more realistic mock structure
    mock_db = Mock()

    # Mock the collection -> document -> collection chain
    def mock_collection(name):
        collection_mock = Mock()

        def mock_document(doc_id):
            doc_mock = Mock()

            def mock_subcollection(sub_name):
                sub_mock = Mock()

                # For wallets collection
                if sub_name == "wallets":
                    wallet_doc = Mock()
                    wallet_doc.get.return_value.exists = True
                    wallet_doc.get.return_value.to_dict.return_value = {"is_active": True, "balance": 50000}
                    wallet_doc.update = Mock()
                    sub_mock.document.return_value = wallet_doc

                # For transactions collection
                elif sub_name == "transactions":
                    tx_doc = Mock()
                    tx_doc.get.return_value.exists = True
                    tx_doc.get.return_value.to_dict.return_value = {
                        "wallet_id": "wallet-123",
                        "type": "expense",
                        "amount": 10000,
                        "category": "food",
                        "date": "2024-01-01"
                    }
                    tx_doc.update = Mock()
                    tx_doc.delete = Mock()
                    sub_mock.document.return_value = tx_doc
                    sub_mock.order_by.return_value = sub_mock
                    sub_mock.stream.return_value = []
                    sub_mock.where.return_value = sub_mock

                # For budgets collection
                elif sub_name == "budgets":
                    budget_query = Mock()
                    budget_query.get.return_value = []
                    sub_mock.where.return_value.where.return_value.where.return_value.limit.return_value = budget_query

                return sub_mock

            doc_mock.collection = mock_subcollection
            return doc_mock

        collection_mock.document = mock_document
        return collection_mock

    mock_db.collection = mock_collection

    with patch('app.core.firebase.get_firestore_client') as mock:
        mock.return_value = mock_db
        yield mock_db


@pytest.fixture
def mock_auth():
    """Mock Firebase auth to bypass token verification."""
    fake_user = {
        "user_id": "test-user-123",
        "email": "test@example.com"
    }

    with patch('app.core.auth.verify_id_token') as mock:
        mock.return_value = {"uid": fake_user["user_id"], "email": fake_user["email"]}
        yield fake_user


@pytest.fixture
def auth_headers():
    """Headers with fake auth token."""
    return {"Authorization": "Bearer fake-token-for-testing"}
