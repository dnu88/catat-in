"""
Tests for backend wallet route contract after Supabase migration.

Wallets are now managed directly by Supabase clients under RLS; the FastAPI
backend no longer exposes legacy Firestore wallet CRUD routes.
"""


class TestWalletRoutes:
    def test_wallet_collection_route_is_not_mounted(self, client):
        response = client.get('/api/v1/wallets')
        assert response.status_code == 404

    def test_wallet_detail_route_is_not_mounted(self, client):
        response = client.patch('/api/v1/wallets/wallet-123', json={'name': 'Updated'})
        assert response.status_code == 404

    def test_wallet_create_route_is_not_mounted(self, client):
        response = client.post('/api/v1/wallets', json={'name': 'Cash', 'type': 'cash'})
        assert response.status_code == 404
