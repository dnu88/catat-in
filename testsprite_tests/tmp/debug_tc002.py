import requests

FIREBASE_API_KEY = "AIzaSyCvkor7gjuVhzJgPbqZoRTKJgEg2gY8PNQ"
firebase_url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FIREBASE_API_KEY
login_resp = requests.post(firebase_url, json={"email": "danubudiarto88@gmail.com", "password": "Rahasia88", "returnSecureToken": True}, timeout=30)
token = login_resp.json().get("idToken")
headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}

resp = requests.post("http://localhost:8000/api/v1/ai/process", json={"input_type": "text", "data": "Gaji masuk 5000000 dari kantor via BCA pada 2026-05-01"}, headers=headers, timeout=30)
print("Status:", resp.status_code)
print("Response:", resp.text[:3000])
