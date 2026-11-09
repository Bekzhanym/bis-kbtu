import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from .config import ACCESS_TOKEN_MINUTES, REFRESH_TOKEN_DAYS, SECRET_KEY

_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt, expected = stored.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations))
    return hmac.compare_digest(dk.hex(), expected)


def password_fingerprint(password_hash: str) -> str:
    """Short fingerprint of the stored hash. It changes when the password changes,
    so refresh tokens issued before a password change stop working."""
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


def _encode(user_id: int, kind: str, lifetime: timedelta, **extra) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "type": kind, "iat": now, "exp": now + lifetime, **extra}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def _decode(token: str, kind: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    # A refresh token must not be accepted as an access token and vice versa
    if payload.get("type") != kind:
        return None
    return payload


def create_access_token(user_id: int) -> str:
    return _encode(user_id, "access", timedelta(minutes=ACCESS_TOKEN_MINUTES))


def create_refresh_token(user_id: int, password_hash: str) -> str:
    return _encode(user_id, "refresh", timedelta(days=REFRESH_TOKEN_DAYS),
                   pwd=password_fingerprint(password_hash))


def decode_access_token(token: str) -> int | None:
    payload = _decode(token, "access")
    try:
        return int(payload["sub"]) if payload else None
    except (KeyError, ValueError):
        return None


def decode_refresh_token(token: str) -> tuple[int, str] | None:
    """Returns (user_id, password fingerprint) or None."""
    payload = _decode(token, "refresh")
    try:
        return (int(payload["sub"]), str(payload["pwd"])) if payload else None
    except (KeyError, ValueError):
        return None
