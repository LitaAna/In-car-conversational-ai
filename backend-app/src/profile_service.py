import json
from pathlib import Path

from .models import CabinState, ProfilePreset, UserProfile
from .validator import validate_preset


class ProfileService:
    def __init__(self, profiles_path: Path):
        self.profiles_path = profiles_path
        self.profiles_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.profiles_path.exists():
            self._write({"profiles": []})

    def _read(self) -> dict:
        with self.profiles_path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        data.setdefault("profiles", [])
        return data

    def _write(self, data: dict) -> None:
        with self.profiles_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)

    def list_profiles(self) -> list[UserProfile]:
        return [UserProfile.model_validate(item) for item in self._read()["profiles"]]

    def find(self, profile_name: str) -> UserProfile | None:
        normalized = profile_name.strip().casefold()
        return next(
            (profile for profile in self.list_profiles() if profile.profile_name.casefold() == normalized),
            None,
        )

    def create_from_state(
        self,
        profile_name: str,
        state: CabinState,
        overrides: dict | None = None,
    ) -> UserProfile:
        values = {
            "temperature": state.temperature,
            "fan_speed": state.fan_speed,
            "airflow_direction": state.airflow_direction,
            "ambient_color": state.ambient_color,
            "ambient_intensity": state.ambient_intensity,
            "audio_volume": state.audio_volume,
        }
        values.update(overrides or {})
        preset = ProfilePreset(**values)
        validate_preset(preset)

        data = self._read()
        existing = self.find(profile_name)
        if existing:
            data["profiles"] = [
                item
                for item in data["profiles"]
                if item["profile_name"].casefold() != profile_name.strip().casefold()
            ]

        profile = UserProfile(profile_name=profile_name.strip(), preset=preset)
        data["profiles"].append(profile.model_dump())
        self._write(data)
        return profile

    def update_preset(self, profile_name: str, updates: dict) -> UserProfile:
        profile = self.find(profile_name)
        if profile is None:
            raise ValueError(f"Profilul '{profile_name}' nu există.")

        values = profile.preset.model_dump()
        values.update(updates)
        updated = UserProfile(
            profile_name=profile.profile_name,
            preset=ProfilePreset(**values),
        )
        validate_preset(updated.preset)

        data = self._read()
        data["profiles"] = [
            updated.model_dump() if item["profile_name"].casefold() == profile_name.strip().casefold() else item
            for item in data["profiles"]
        ]
        self._write(data)
        return updated
