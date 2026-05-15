"""
Tests for health endpoint.
"""
import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Health check endpoint tests."""

    def test_health_returns_200(self, client):
        """Health endpoint should return 200 status."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_json(self, client):
        """Health endpoint should return JSON with status field."""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] in ("ok", "degraded")

    def test_health_includes_environment(self, client):
        """Health endpoint should include current environment."""
        response = client.get("/health")
        data = response.json()
        assert "environment" in data
        assert isinstance(data["environment"], str)

    def test_health_includes_version(self, client):
        """Health endpoint should include app version."""
        response = client.get("/health")
        data = response.json()
        assert "version" in data
        assert isinstance(data["version"], str)

    def test_root_returns_message(self, client):
        """Root endpoint should return welcome message."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
