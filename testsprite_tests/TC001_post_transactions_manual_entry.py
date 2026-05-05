import datetime

import requests

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"
AUTH_USERNAME = "danubudiarto88@gmail.com"
AUTH_PASSWORD = "Rahasia88"
FIREBASE_API_KEY = "AIzaSyCvkor7gjuVhzJgPbqZoRTKJgEg2gY8PNQ"
TIMEOUT = 30


def get_auth_headers():
    # Firebase REST API sign-in
    firebase_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    login_resp = requests.post(
        firebase_url,
        json={"email": AUTH_USERNAME, "password": AUTH_PASSWORD, "returnSecureToken": True},
        timeout=TIMEOUT,
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("idToken")
    assert token, "Firebase login response missing idToken"
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def test_post_transactions_manual_entry():
    headers = get_auth_headers()

    wallets_resp = requests.get(f"{BASE_URL}{API_PREFIX}/wallets", headers=headers, timeout=TIMEOUT)
    assert wallets_resp.status_code == 200, f"Failed to get wallets: {wallets_resp.text}"
    wallets = wallets_resp.json().get("data", [])
    assert isinstance(wallets, list), "Wallets response is not a list"
    assert len(wallets) > 0, "No wallets available to assign transaction"

    wallet = wallets[0]
    wallet_id = wallet.get("id")
    assert wallet_id is not None, "Wallet ID missing"
    balance_before = float(wallet.get("balance", 0))

    today = datetime.date.today().isoformat()
    transaction_payload = {
        "amount": 10000,
        "type": "income",
        "category": "other",
        "date": today,
        "wallet_id": wallet_id,
        "note": "Test transaction from automated test",
    }

    post_resp = requests.post(f"{BASE_URL}{API_PREFIX}/transactions", json=transaction_payload, headers=headers, timeout=TIMEOUT)
    assert post_resp.status_code == 201, f"Failed to create transaction: {post_resp.text}"
    created_transaction = post_resp.json().get("data", {})
    transaction_id = created_transaction.get("id")
    assert transaction_id is not None, "Created transaction has no ID"

    try:
        list_resp = requests.get(f"{BASE_URL}{API_PREFIX}/transactions", headers=headers, timeout=TIMEOUT)
        assert list_resp.status_code == 200, f"Failed to list transactions: {list_resp.text}"
        transactions = list_resp.json().get("data", [])
        assert any(t.get("id") == transaction_id for t in transactions), "Created transaction not in transaction list"

        wallets_after_resp = requests.get(f"{BASE_URL}{API_PREFIX}/wallets", headers=headers, timeout=TIMEOUT)
        assert wallets_after_resp.status_code == 200, f"Failed to get wallets after transaction: {wallets_after_resp.text}"
        wallets_after = wallets_after_resp.json().get("data", [])
        wallet_after = next((w for w in wallets_after if w.get("id") == wallet_id), None)
        assert wallet_after is not None, "Wallet not found after transaction"

        balance_after = float(wallet_after.get("balance", 0))
        expected_balance = balance_before + transaction_payload["amount"]
        assert abs(balance_after - expected_balance) < 0.01, (
            f"Wallet balance not updated correctly: before={balance_before}, after={balance_after}, expected={expected_balance}"
        )
    finally:
        del_resp = requests.delete(f"{BASE_URL}{API_PREFIX}/transactions/{transaction_id}", headers=headers, timeout=TIMEOUT)
        assert del_resp.status_code in (200, 204), f"Failed to delete transaction in cleanup: {del_resp.text}"


test_post_transactions_manual_entry()
