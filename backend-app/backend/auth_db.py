"""PostgreSQL persistence for accounts, sessions, and user profiles."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg
from psycopg.rows import dict_row

from src.models import CabinState, ProfilePreset, UserProfile
from src.validator import validate_preset


SCHEMA = """
CREATE TABLE IF NOT EXISTS app_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'ro',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    profile_name TEXT NOT NULL,
    preset JSONB NOT NULL,
    UNIQUE(user_id, profile_name)
);
CREATE TABLE IF NOT EXISTS user_routes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    origin JSONB NOT NULL,
    destination JSONB NOT NULL,
    route JSONB NOT NULL,
    saved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_routes_recent_idx ON user_routes(user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS user_routes_saved_idx ON user_routes(user_id, saved);
CREATE TABLE IF NOT EXISTS user_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    address JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_addresses_user_idx ON user_addresses(user_id, label, updated_at DESC);
ALTER TABLE user_addresses DROP CONSTRAINT IF EXISTS user_addresses_label_check;
CREATE TABLE IF NOT EXISTS user_vehicles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    make TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    fuel_type TEXT NOT NULL DEFAULT 'petrol',
    consumption_l_per_100km DOUBLE PRECISION NOT NULL,
    tank_capacity_l DOUBLE PRECISION NOT NULL,
    current_fuel_l DOUBLE PRECISION NOT NULL,
    fuel_price_per_l DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_vehicles_user_idx ON user_vehicles(user_id, name);
"""


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"pbkdf2_sha256$310000${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, rounds, salt_hex, digest_hex = stored.split("$")
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)).hex()
        return hmac.compare_digest(candidate, digest_hex)
    except (ValueError, TypeError):
        return False


class Database:
    def __init__(self, url: str):
        if not url:
            raise RuntimeError("DATABASE_URL is required, for example postgresql://postgres:postgres@localhost:5432/in_car_ai")
        self.url = url
        try:
            connection = psycopg.connect(self.url)
        except psycopg.OperationalError as error:
            if "does not exist" not in str(error).lower():
                raise
            maintenance_url = self.url.rsplit("/", 1)[0] + "/postgres"
            with psycopg.connect(maintenance_url, autocommit=True) as maintenance:
                maintenance.execute("CREATE DATABASE in_car_ai")
            connection = psycopg.connect(self.url)
        with connection as conn:
            conn.execute(SCHEMA)
            conn.execute("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'ro'")

    def create_user(self, email: str, password: str) -> dict[str, Any]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            row = conn.execute(
                "INSERT INTO app_users(email, password_hash) VALUES (%s, %s) RETURNING id, email, locale",
                (email, _hash_password(password)),
            ).fetchone()
            return dict(row)

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            row = conn.execute("SELECT id, email, password_hash, locale FROM app_users WHERE email=%s", (email,)).fetchone()
            return dict(row) if row else None

    def create_session(self, user_id: int) -> str:
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        expires = datetime.now(timezone.utc) + timedelta(days=30)
        with psycopg.connect(self.url) as conn:
            conn.execute("INSERT INTO app_sessions(token_hash, user_id, expires_at) VALUES (%s, %s, %s)", (token_hash, user_id, expires))
        return raw

    def get_user_by_session(self, raw: str | None) -> dict[str, Any] | None:
        if not raw:
            return None
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            row = conn.execute(
                "SELECT u.id, u.email, u.locale FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.expires_at > NOW()",
                (token_hash,),
            ).fetchone()
            return dict(row) if row else None

    def update_user_locale(self, user_id: int, locale: str) -> str:
        if locale not in {"ro", "en"}:
            raise ValueError("Locale-ul trebuie să fie 'ro' sau 'en'.")
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            row = conn.execute(
                "UPDATE app_users SET locale=%s WHERE id=%s RETURNING locale",
                (locale, user_id),
            ).fetchone()
        return str(row["locale"])

    def delete_session(self, raw: str | None) -> None:
        if raw:
            with psycopg.connect(self.url) as conn:
                conn.execute("DELETE FROM app_sessions WHERE token_hash=%s", (hashlib.sha256(raw.encode()).hexdigest(),))

    def list_profiles(self, user_id: int) -> list[UserProfile]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            rows = conn.execute("SELECT profile_name, preset FROM user_profiles WHERE user_id=%s ORDER BY profile_name", (user_id,)).fetchall()
        return [UserProfile(profile_name=row["profile_name"], preset=ProfilePreset(**row["preset"])) for row in rows]

    def find_profile(self, user_id: int, profile_name: str) -> UserProfile | None:
        return next((p for p in self.list_profiles(user_id) if p.profile_name.casefold() == profile_name.strip().casefold()), None)

    def save_profile(self, user_id: int, profile_name: str, preset: dict[str, Any]) -> UserProfile:
        name = profile_name.strip()
        profile = UserProfile(profile_name=name, preset=ProfilePreset(**preset))
        validate_preset(profile.preset)
        with psycopg.connect(self.url) as conn:
            conn.execute(
                "INSERT INTO user_profiles(user_id, profile_name, preset) VALUES (%s, %s, %s) ON CONFLICT (user_id, profile_name) DO UPDATE SET preset=EXCLUDED.preset",
                (user_id, name, psycopg.types.json.Jsonb(profile.preset.model_dump())),
            )
        return profile

    def create_from_state(self, user_id: int, profile_name: str, state: CabinState, overrides: dict | None = None) -> UserProfile:
        values = {
            "temperature": state.temperature,
            "fan_speed": state.fan_speed,
            "airflow_direction": state.airflow_direction,
            "ambient_color": state.ambient_color,
            "ambient_intensity": state.ambient_intensity,
            "audio_volume": state.audio_volume,
        }
        values.update(overrides or {})
        return self.save_profile(user_id, profile_name, values)

    def update_preset(self, user_id: int, profile_name: str, updates: dict[str, Any]) -> UserProfile:
        current = self.find_profile(user_id, profile_name)
        if current is None:
            raise ValueError(f"Profilul '{profile_name}' nu există.")
        values = current.preset.model_dump()
        values.update(updates)
        return self.save_profile(user_id, current.profile_name, values)

    def list_routes(self, user_id: int) -> list[dict[str, Any]]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            rows = conn.execute(
                "SELECT id, name, origin, destination, route, saved, created_at, last_used_at FROM user_routes WHERE user_id=%s ORDER BY last_used_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_recent_routes(self, user_id: int) -> list[dict[str, Any]]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            rows = conn.execute(
                "SELECT id, name, origin, destination, route, saved, created_at, last_used_at FROM user_routes WHERE user_id=%s AND saved=FALSE ORDER BY last_used_at DESC LIMIT 20",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def save_recent_route(self, user_id: int, name: str, origin: dict[str, Any], destination: dict[str, Any], route: dict[str, Any]) -> dict[str, Any]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            conn.execute(
                "DELETE FROM user_routes WHERE user_id=%s AND origin->>'display_name'=%s AND destination->>'display_name'=%s AND saved=FALSE",
                (user_id, origin.get("display_name", ""), destination.get("display_name", "")),
            )
            row = conn.execute(
                "INSERT INTO user_routes(user_id, name, origin, destination, route, saved) VALUES (%s, %s, %s, %s, %s, FALSE) RETURNING id, name, origin, destination, route, saved, created_at, last_used_at",
                (user_id, name, psycopg.types.json.Jsonb(origin), psycopg.types.json.Jsonb(destination), psycopg.types.json.Jsonb(route)),
            ).fetchone()
        return dict(row)

    def save_route(self, user_id: int, name: str, origin: dict[str, Any], destination: dict[str, Any], route: dict[str, Any]) -> dict[str, Any]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            conn.execute(
                "DELETE FROM user_routes WHERE user_id=%s AND origin->>'display_name'=%s AND destination->>'display_name'=%s",
                (user_id, origin.get("display_name", ""), destination.get("display_name", "")),
            )
            row = conn.execute(
                "INSERT INTO user_routes(user_id, name, origin, destination, route, saved) VALUES (%s, %s, %s, %s, %s, TRUE) RETURNING id, name, origin, destination, route, saved, created_at, last_used_at",
                (user_id, name, psycopg.types.json.Jsonb(origin), psycopg.types.json.Jsonb(destination), psycopg.types.json.Jsonb(route)),
            ).fetchone()
        return dict(row)

    def remove_saved_route(self, user_id: int, route_id: int) -> None:
        with psycopg.connect(self.url) as conn:
            conn.execute("DELETE FROM user_routes WHERE id=%s AND user_id=%s", (route_id, user_id))

    def list_addresses(self, user_id: int) -> list[dict[str, Any]]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            rows = conn.execute(
                "SELECT id, label, address, created_at, updated_at FROM user_addresses WHERE user_id=%s ORDER BY label, updated_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def save_address(self, user_id: int, label: str, address: dict[str, Any], address_id: int | None = None) -> dict[str, Any]:
        label = label.strip()
        if not label:
            raise ValueError("Tipul adresei trebuie să fie home sau work.")
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            if address_id is not None:
                row = conn.execute(
                    "UPDATE user_addresses SET label=%s, address=%s, updated_at=NOW() WHERE id=%s AND user_id=%s RETURNING id, label, address, created_at, updated_at",
                    (label, psycopg.types.json.Jsonb(address), address_id, user_id),
                ).fetchone()
                if row is None:
                    raise ValueError("Adresa nu există.")
            else:
                conn.execute("DELETE FROM user_addresses WHERE user_id=%s AND label=%s", (user_id, label))
                row = conn.execute(
                    "INSERT INTO user_addresses(user_id, label, address) VALUES (%s, %s, %s) RETURNING id, label, address, created_at, updated_at",
                    (user_id, label, psycopg.types.json.Jsonb(address)),
                ).fetchone()
        return dict(row)

    def delete_address(self, user_id: int, address_id: int) -> None:
        with psycopg.connect(self.url) as conn:
            conn.execute("DELETE FROM user_addresses WHERE id=%s AND user_id=%s", (address_id, user_id))

    def list_vehicles(self, user_id: int) -> list[dict[str, Any]]:
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            rows = conn.execute("SELECT id, name, make, model, fuel_type, consumption_l_per_100km, tank_capacity_l, current_fuel_l, fuel_price_per_l FROM user_vehicles WHERE user_id=%s ORDER BY name", (user_id,)).fetchall()
        return [dict(row) for row in rows]

    def save_vehicle(self, user_id: int, values: dict[str, Any], vehicle_id: int | None = None) -> dict[str, Any]:
        name = str(values.get("name", "")).strip()
        if not name:
            raise ValueError("Numele profilului mașinii este obligatoriu.")
        consumption = float(values["consumption_l_per_100km"])
        tank = float(values["tank_capacity_l"])
        current = float(values["current_fuel_l"])
        price = float(values["fuel_price_per_l"])
        if consumption <= 0 or tank <= 0 or price < 0:
            raise ValueError("Valorile mașinii nu sunt valide.")
        current = max(0, min(current, tank))
        fuel_type = str(values.get("fuel_type", "petrol"))
        if fuel_type not in {"petrol", "diesel", "hybrid"}:
            raise ValueError("Tipul combustibilului nu este valid.")
        params = (name, str(values.get("make", "")).strip(), str(values.get("model", "")).strip(), fuel_type, consumption, tank, current, price)
        with psycopg.connect(self.url, row_factory=dict_row) as conn:
            if vehicle_id is None:
                conn.execute("DELETE FROM user_vehicles WHERE user_id=%s AND name=%s", (user_id, name))
                row = conn.execute("INSERT INTO user_vehicles(user_id, name, make, model, fuel_type, consumption_l_per_100km, tank_capacity_l, current_fuel_l, fuel_price_per_l) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id, name, make, model, fuel_type, consumption_l_per_100km, tank_capacity_l, current_fuel_l, fuel_price_per_l", (user_id, *params)).fetchone()
            else:
                row = conn.execute("UPDATE user_vehicles SET name=%s, make=%s, model=%s, fuel_type=%s, consumption_l_per_100km=%s, tank_capacity_l=%s, current_fuel_l=%s, fuel_price_per_l=%s, updated_at=NOW() WHERE id=%s AND user_id=%s RETURNING id, name, make, model, fuel_type, consumption_l_per_100km, tank_capacity_l, current_fuel_l, fuel_price_per_l", (*params, vehicle_id, user_id)).fetchone()
                if row is None:
                    raise ValueError("Profilul mașinii nu există.")
        return dict(row)

    def delete_vehicle(self, user_id: int, vehicle_id: int) -> None:
        with psycopg.connect(self.url) as conn:
            conn.execute("DELETE FROM user_vehicles WHERE id=%s AND user_id=%s", (vehicle_id, user_id))
