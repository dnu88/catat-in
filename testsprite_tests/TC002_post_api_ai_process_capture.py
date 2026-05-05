import os

import requests

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"
AUTH_USERNAME = os.getenv("TEST_EMAIL", "danubudiarto88@gmail.com")
AUTH_PASSWORD = os.getenv("TEST_PASSWORD", "Rahasia88")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyCvkor7gjuVhzJgPbqZoRTKJgEg2gY8PNQ")
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
    }


def test_post_api_ai_process_capture():
    url = f"{BASE_URL}{API_PREFIX}/ai/process"
    headers = get_auth_headers()

    high_confidence_payload = {
        "input_type": "text",
        "data": "Gaji masuk 5000000 dari kantor via BCA pada 2026-05-01",
    }

    low_confidence_payload = {
        "input_type": "text",
        "data": "Paid stuff",
    }

    image_payload = {
        "input_type": "image",
        "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
    }

    def post_payload(payload):
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    resp_json = post_payload(high_confidence_payload)
    assert "transaction" in resp_json, (
        "Response missing 'transaction' key for high confidence input"
    )
    transaction = resp_json["transaction"]
    for field in ("amount", "merchant", "date", "category", "confidence"):
        assert field in transaction, f"Missing '{field}' in extracted transaction"
    assert transaction["confidence"] >= 0.8, "Confidence expected to be high (>=0.8)"
    assert resp_json.get("auto_saved", False) is True, (
        "Expected auto_saved = True for high confidence"
    )

    resp_json_low = post_payload(low_confidence_payload)
    assert "extracted_fields" in resp_json_low, (
        "Response missing 'extracted_fields' for low confidence input"
    )
    assert "confidence" in resp_json_low, (
        "Response missing 'confidence' for low confidence input"
    )
    assert resp_json_low["confidence"] < 0.8, "Confidence expected to be low (<0.8)"
    assert resp_json_low.get("auto_saved", True) is False, (
        "Expected auto_saved = False for low confidence"
    )
    assert resp_json_low.get("review_required") is True, (
        "Review should be required for low confidence"
    )

    resp_json_image = post_payload(image_payload)
    assert "transaction" in resp_json_image, (
        "Response missing 'transaction' key for image input"
    )
    transaction_img = resp_json_image["transaction"]
    for field in ("amount", "merchant", "date", "category", "confidence"):
        assert field in transaction_img, (
            f"Missing '{field}' in image extracted transaction"
        )
    assert 0 <= transaction_img["confidence"] <= 1, (
        "Confidence should be between 0 and 1"
    )


test_post_api_ai_process_capture()
