"""
Tests for wallets endpoint - RED phase.
These tests define expected behavior. They WILL fail initially.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient


class MockDocumentSnapshot:
    """Fake Firestore document snapshot."""
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data

    @property
    def exists(self):
        return True

    def to_dict(self):
        return self._data


class MockDocumentRef:
    """Fake Firestore document reference."""
    def __init__(self, doc_id, data=None):
        self.id = doc_id
        self._data = data or {}

    def get(self):
        return MockDocumentSnapshot(self.id, self._data)

    def set(self, data):
        self._data = data

    def update(self, updates):
        self._data.update(updates)


class MockCollection:
    """Fake Firestore collection."""
    def __init__(self):
        self._docs = {}

    def document(self, doc_id):
        if doc_id not in self._docs:
            self._docs[doc_id] = MockDocumentRef(doc_id)
        return self._docs[doc_id]

    def order_by(self, *args, **kwargs):
        return self

    def stream(self):
        return [MockDocumentSnapshot(doc_id, ref._data) for doc_id, ref in self._docs.items()]


class MockFirestore:
    """Fake Firestore client for testing."""
    def __init__(self):
        self.collections = {}

    def collection(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection()
        return MockCollectionWrapper(self.collections[name])


class MockCollectionWrapper:
    """Wrapper to handle nested collections."""
    def __init__(self, collection):
        self._collection = collection
        self._docs = {}

    def document(self, doc_id):
        if doc_id not in self._docs:
            self._docs[doc_id] = MockFirestore()
        return MockDocWrapper(doc_id, self._docs[doc_id])

    def order_by(self, *args, **kwargs):
        return self

    def stream(self):
        return []


class MockDocWrapper:
    """Wrapper for document with subcollections."""
    def __init__(self, doc_id, firestore):
        self.id = doc_id
        self._firestore = firestore

    def collection(self, name):
        return self._firestore.collection(name)

    def get(self):
        return MockDocumentSnapshot(self.id, {"is_active": True})

    def set(self, data):
        pass

    def update(self, data):
        pass


class TestWalletsList:
    """Tests for GET /api/v1/wallets endpoint."""

    def test_list_wallets_requires_auth(self, client):
        """Wallets endpoint should require authentication."""
        response = client.get("/api/v1/wallets")
        assert response.status_code == 401

    def test_list_wallets_returns_empty_list_initially(self, client, mock_auth, auth_headers, mock_firestore):
        """New user should have empty wallet list."""
        response = client.get("/api/v1/wallets", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_list_wallets_returns_200_with_auth(self, client, mock_auth, auth_headers, mock_firestore):
        """Authenticated request should return 200."""
        response = client.get("/api/v1/wallets", headers=auth_headers)
        assert response.status_code == 200


class TestWalletsCreate:
    """Tests for POST /api/v1/wallets endpoint."""

    def test_create_wallet_requires_auth(self, client):
        """Create wallet should require authentication."""
        response = client.post("/api/v1/wallets", json={"name": "Test", "type": "cash"})
        assert response.status_code == 401

    def test_create_wallet_validates_required_fields(self, client, mock_auth, auth_headers, mock_firestore):
        """Create wallet should validate name and type are required."""
        response = client.post("/api/v1/wallets", json={}, headers=auth_headers)
        assert response.status_code == 422

    def test_create_wallet_validates_type_enum(self, client, mock_auth, auth_headers, mock_firestore):
        """Create wallet should validate type is one of allowed values."""
        response = client.post(
            "/api/v1/wallets",
            json={"name": "Test", "type": "invalid_type"},
            headers=auth_headers
        )
        assert response.status_code == 422

    def test_create_wallet_returns_201(self, client, mock_auth, auth_headers, mock_firestore):
        """Create wallet should return 201 on success."""
        response = client.post(
            "/api/v1/wallets",
            json={"name": "My Wallet", "type": "cash", "balance": 100000},
            headers=auth_headers
        )
        assert response.status_code == 201

    def test_create_wallet_returns_wallet_data(self, client, mock_auth, auth_headers, mock_firestore):
        """Create wallet should return created wallet data."""
        response = client.post(
            "/api/v1/wallets",
            json={"name": "My Wallet", "type": "cash", "balance": 100000},
            headers=auth_headers
        )
        data = response.json()
        assert "data" in data
        assert data["data"]["name"] == "My Wallet"
        assert data["data"]["type"] == "cash"
        assert data["data"]["balance"] == 100000


class TestWalletsUpdate:
    """Tests for PATCH /api/v1/wallets/{wallet_id} endpoint."""

    def test_update_wallet_requires_auth(self, client):
        """Update wallet should require authentication."""
        response = client.patch("/api/v1/wallets/some-id", json={"name": "Updated"})
        assert response.status_code == 401

    def test_update_wallet_returns_404_for_nonexistent(self, client, mock_auth, auth_headers, mock_firestore):
        """Update wallet should return 404 for non-existent wallet."""
        response = client.patch(
            "/api/v1/wallets/nonexistent-id",
            json={"name": "Updated"},
            headers=auth_headers
        )
        assert response.status_code == 404


class TestWalletsDelete:
    """Tests for DELETE /api/v1/wallets/{wallet_id} endpoint."""

    def test_delete_wallet_requires_auth(self, client):
        """Delete wallet should require authentication."""
        response = client.delete("/api/v1/wallets/some-id")
        assert response.status_code == 401

    def test_delete_wallet_returns_404_for_nonexistent(self, client, mock_auth, auth_headers, mock_firestore):
        """Delete wallet should return 404 for non-existent wallet."""
        response = client.delete("/api/v1/wallets/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404
