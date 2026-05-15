"""
Tests for backend transaction route contract after Supabase migration.

Transactions are now managed directly by Supabase clients/Edge Functions; the
FastAPI backend no longer exposes legacy Firestore transaction CRUD routes.
"""


class TestTransactionsRoutes:
    def test_transactions_collection_route_is_not_mounted(self, client):
        response = client.get('/api/v1/transactions')
        assert response.status_code == 404

    def test_transaction_detail_route_is_not_mounted(self, client):
        response = client.get('/api/v1/transactions/tx-123')
        assert response.status_code == 404

    def test_transaction_create_route_is_not_mounted(self, client):
        response = client.post('/api/v1/transactions', json={})
        assert response.status_code == 404
