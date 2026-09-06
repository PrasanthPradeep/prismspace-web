"""
Per-user Gmail OAuth store for PrismSpace Hive Bridge.
- One Google OAuth client (yours), many users (their Gmail).
- Tokens encrypted with FERNET_KEY, persisted in backend/user_tokens.db
- Handles login URL, code exchange, auto-refresh, status, disconnect.
"""
from __future__ import annotations

import os
import sqlite3
import time
import urllib.parse
from pathlib import Path

import httpx
from cryptography.fernet import Fernet, InvalidToken

DB_PATH = Path(__file__).resolve().parent / "user_tokens.db"

SCOPES = "openid email https://www.googleapis.com/auth/gmail.modify"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def _fernet() -> Fernet:
    key = os.environ.get("FERNET_KEY", "").strip()
    if not key:
        raise RuntimeError("FERNET_KEY not set in backend/.env")
    return Fernet(key.encode())


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(str(DB_PATH))
    con.execute(
        """CREATE TABLE IF NOT EXISTS user_tokens(
          user_id TEXT PRIMARY KEY, email TEXT,
          access_enc TEXT, refresh_enc TEXT, expiry INTEGER)"""
    )
    return con


def enc(v: str) -> str:
    return _fernet().encrypt(v.encode()).decode()


def dec(v: str) -> str:
    try:
        return _fernet().decrypt(v.encode()).decode()
    except InvalidToken:
        raise RuntimeError("FERNET_KEY mismatch — cannot decrypt stored token")


def build_login_url(state: str = "prism") -> str:
    cid = os.environ.get("GOOGLE_CLIENT_ID", "")
    redir = os.environ.get("GOOGLE_REDIRECT_URI", "")
    if not cid or not redir:
        raise RuntimeError("GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI not set")
    q = urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": redir, "response_type": "code",
        "scope": SCOPES, "access_type": "offline", "prompt": "consent",
        "state": state,
    })
    return f"{AUTH_URL}?{q}"


def exchange_code(code: str) -> dict:
    """Exchange OAuth code -> verify -> store. Returns {user_id, email}."""
    r = httpx.post(TOKEN_URL, data={
        "code": code,
        "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uri": os.environ.get("GOOGLE_REDIRECT_URI", ""),
        "grant_type": "authorization_code",
    }, timeout=20.0)
    data = r.json()
    if r.status_code != 200 or "access_token" not in data:
        raise RuntimeError(f"Token exchange failed: {data}")
    access, refresh, expires_in = data["access_token"], data.get("refresh_token", ""), data.get("expires_in", 3600)
    u = httpx.get(USERINFO_URL, headers={"Authorization": f"Bearer {access}"}, timeout=15.0).json()
    user_id, email = u.get("id", ""), u.get("email", "")
    if not user_id:
        raise RuntimeError(f"Userinfo failed: {u}")
    con = _db()
    try:
        cur = con.execute("SELECT refresh_enc FROM user_tokens WHERE user_id=?", (user_id,))
        row = cur.fetchone()
        # Keep old refresh token if Google didn't return a new one
        if not refresh and row:
            refresh_enc = row[0]
        else:
            refresh_enc = enc(refresh) if refresh else (row[0] if row else "")
        con.execute(
            "INSERT OR REPLACE INTO user_tokens VALUES(?,?,?,?,?)",
            (user_id, email, enc(access), refresh_enc, int(time.time()) + int(expires_in)),
        )
        con.commit()
    finally:
        con.close()
    return {"user_id": user_id, "email": email}


def get_valid_access_token(user_id: str) -> str | None:
    """Return fresh access token, auto-refreshing if expired. None if not connected."""
    if not user_id:
        return None
    con = _db()
    try:
        row = con.execute(
            "SELECT access_enc, refresh_enc, expiry FROM user_tokens WHERE user_id=?", (user_id,)
        ).fetchone()
    finally:
        con.close()
    if not row:
        return None
    access = dec(row[0])
    if int(row[2] or 0) - 60 > time.time():
        return access
    # Refresh
    try:
        refresh = dec(row[1]) if row[1] else ""
    except RuntimeError:
        return None
    if not refresh:
        return access  # no refresh token; use as-is until it 401s
    r = httpx.post(TOKEN_URL, data={
        "refresh_token": refresh,
        "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
        "grant_type": "refresh_token",
    }, timeout=20.0)
    data = r.json()
    if r.status_code != 200 or "access_token" not in data:
        return None
    new_access, expiry = data["access_token"], int(time.time()) + int(data.get("expires_in", 3600))
    con = _db()
    try:
        con.execute("UPDATE user_tokens SET access_enc=?, expiry=? WHERE user_id=?",
                    (enc(new_access), expiry, user_id))
        con.commit()
    finally:
        con.close()
    return new_access


def get_status(user_id: str) -> dict:
    con = _db()
    try:
        row = con.execute(
            "SELECT email, expiry FROM user_tokens WHERE user_id=?", (user_id,)
        ).fetchone()
    finally:
        con.close()
    if not row:
        return {"connected": False}
    return {"connected": True, "email": row[0], "expired": int(row[1] or 0) < time.time()}


def disconnect(user_id: str) -> None:
    con = _db()
    try:
        con.execute("DELETE FROM user_tokens WHERE user_id=?", (user_id,))
        con.commit()
    finally:
        con.close()
