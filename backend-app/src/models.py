from typing import Any, Literal

from pydantic import BaseModel, Field


PASSENGER_SEATS = ("front_passenger", "rear_left_passenger", "rear_right_passenger")


class CabinState(BaseModel):
    temperature: int = 22
    fan_speed: int = 2
    airflow_direction: str = "face"
    air_conditioning: bool = False
    steering_wheel_heating: bool = False
    seat_heating: dict[str, int] = Field(
        default_factory=lambda: {
            "driver": 0,
            "front_passenger": 0,
            "rear_left_passenger": 0,
            "rear_right_passenger": 0,
        }
    )
    seat_ventilation: dict[str, bool] = Field(
        default_factory=lambda: {
            "driver": False,
            "front_passenger": False,
            "rear_left_passenger": False,
            "rear_right_passenger": False,
        }
    )
    seat_ventilation_level: dict[str, int] = Field(
        default_factory=lambda: {
            "driver": 0,
            "front_passenger": 0,
            "rear_left_passenger": 0,
            "rear_right_passenger": 0,
        }
    )
    ambient_color: str = "white"
    ambient_intensity: int = 50
    ambient_lights_on: bool = True
    ambient_zones: dict[str, dict[str, Any]] = Field(
        default_factory=lambda: {
            "driver": {"color": "white", "intensity": 50},
            "front_passenger": {"color": "white", "intensity": 50},
            "rear": {"color": "white", "intensity": 50},
        }
    )
    audio_volume: int = 30
    media_source: str = "none"
    media_playing: bool = False
    current_track: str = "Nicio melodie selectată"
    radio_station: str = "Niciun post selectat"
    radio_station_index: int = 0
    vehicle_status: Literal["parked", "moving", "unknown"] = "parked"


class ProfilePreset(BaseModel):
    temperature: int
    fan_speed: int
    airflow_direction: str
    ambient_color: str
    ambient_intensity: int
    audio_volume: int


class UserProfile(BaseModel):
    profile_name: str = Field(min_length=1, max_length=80)
    preset: ProfilePreset


class CommandResult(BaseModel):
    status: Literal[
        "implemented",
        "rejected",
        "failed",
        "unchanged",
        "partially_implemented",
        "not_understood",
    ]
    active_profile: str | None = None
    last_command: dict[str, Any] = Field(default_factory=dict)
    cabin_state: dict[str, Any] = Field(default_factory=dict)
    message: str = ""
