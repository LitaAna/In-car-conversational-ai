from typing import Any

from .models import CabinState, ProfilePreset


ALLOWED_AIRFLOW = {"face", "feet", "windshield", "mixed"}
ALLOWED_COLORS = {"red", "blue", "green", "white", "purple", "yellow", "cyan"}
ALLOWED_MEDIA_SOURCES = {"none", "radio", "bluetooth", "local"}
PARKED_ONLY_ACTIONS = {"set_seat_position", "set_seat_massage", "relax_mode"}
ALLOWED_SEATS = {
    "driver",
    "front_passenger",
    "rear_left_passenger",
    "rear_right_passenger",
    "all_passengers",
}
ALLOWED_AMBIENT_ZONES = {"driver", "front_passenger", "rear"}


def _require_int_range(name: str, value: Any, minimum: int, maximum: int) -> None:
    if not isinstance(value, int) or isinstance(value, bool) or not minimum <= value <= maximum:
        raise ValueError(f"{name} trebuie să fie un număr între {minimum} și {maximum}.")


def validate_action(action: str, arguments: dict[str, Any]) -> None:
    if action == "set_temperature":
        _require_int_range("Temperatura", arguments.get("temperature"), 16, 30)
    elif action == "set_fan_speed":
        _require_int_range("Viteza ventilatorului", arguments.get("fan_speed"), 0, 5)
    elif action == "set_airflow_direction":
        value = str(arguments.get("airflow_direction", ""))
        directions = value.split("+") if value else []
        if value not in {"", "mixed"} and (any(direction not in {"face", "feet", "windshield"} for direction in directions) or len(set(directions)) != len(directions)):
            raise ValueError("Direcția fluxului de aer nu este disponibilă.")
    elif action == "set_air_conditioning":
        if not isinstance(arguments.get("enabled"), bool):
            raise ValueError("Starea aerului condiționat trebuie să fie booleană.")
    elif action == "set_steering_wheel_heating":
        if not isinstance(arguments.get("enabled"), bool):
            raise ValueError("Starea încălzirii volanului trebuie să fie booleană.")
    elif action == "set_seat_heating":
        if arguments.get("seat") not in ALLOWED_SEATS:
            raise ValueError("Scaunul trebuie să fie șofer, pasager față sau pasager spate stânga/dreapta.")
        _require_int_range("Nivelul încălzirii", arguments.get("level"), 0, 3)
    elif action == "set_seat_ventilation":
        if arguments.get("seat") not in ALLOWED_SEATS:
            raise ValueError("Scaunul trebuie să fie șofer, pasager față sau pasager spate stânga/dreapta.")
        if not isinstance(arguments.get("enabled"), bool):
            raise ValueError("Ventilația scaunului trebuie să fie booleană.")
    elif action == "set_seat_ventilation_level":
        if arguments.get("seat") not in ALLOWED_SEATS:
            raise ValueError("Scaunul selectat nu este disponibil.")
        _require_int_range("Nivelul ventilației scaunului", arguments.get("level"), 0, 5)
    elif action == "set_ambient_zone_color":
        if arguments.get("zone") not in ALLOWED_AMBIENT_ZONES:
            raise ValueError("Zona luminilor nu este disponibilă.")
        if str(arguments.get("ambient_color", "")).lower() not in ALLOWED_COLORS:
            raise ValueError("Culoarea ambientală nu este disponibilă.")
    elif action == "set_ambient_zone_intensity":
        if arguments.get("zone") not in ALLOWED_AMBIENT_ZONES:
            raise ValueError("Zona luminilor nu este disponibilă.")
        _require_int_range("Intensitatea ambientală", arguments.get("ambient_intensity"), 0, 100)
    elif action == "set_ambient_color":
        if str(arguments.get("ambient_color", "")).lower() not in ALLOWED_COLORS:
            raise ValueError("Culoarea ambientală nu este disponibilă.")
    elif action == "set_ambient_lights":
        if not isinstance(arguments.get("enabled"), bool):
            raise ValueError("Starea luminilor ambientale este invalidă.")
    elif action == "set_ambient_intensity":
        _require_int_range("Intensitatea ambientală", arguments.get("ambient_intensity"), 0, 100)
    elif action == "set_audio_volume":
        _require_int_range("Volumul audio", arguments.get("audio_volume"), 0, 100)
    elif action == "set_media_source":
        if arguments.get("media_source") not in ALLOWED_MEDIA_SOURCES:
            raise ValueError("Sursa media nu este disponibilă.")
    elif action == "set_media_playback":
        if not isinstance(arguments.get("playing"), bool):
            raise ValueError("Starea redării media trebuie să fie booleană.")
    elif action in {"next_track", "previous_track", "start_radio", "change_radio_station"}:
        return
    elif action in PARKED_ONLY_ACTIONS:
        raise ValueError("Această acțiune este permisă doar când mașina este parcată.")
    elif action in {"identify_profile", "create_profile"}:
        name = str(arguments.get("profile_name", "")).strip()
        if not name or len(name) > 80:
            raise ValueError("Numele profilului este obligatoriu și trebuie să aibă maximum 80 de caractere.")
    else:
        raise ValueError(f"Acțiunea '{action}' nu este implementată.")


def validate_preset(preset: ProfilePreset) -> None:
    validate_action("set_temperature", {"temperature": preset.temperature})
    validate_action("set_fan_speed", {"fan_speed": preset.fan_speed})
    validate_action("set_airflow_direction", {"airflow_direction": preset.airflow_direction})
    validate_action("set_ambient_color", {"ambient_color": preset.ambient_color})
    validate_action("set_ambient_intensity", {"ambient_intensity": preset.ambient_intensity})
    validate_action("set_audio_volume", {"audio_volume": preset.audio_volume})


def validate_state(state: CabinState) -> None:
    validate_action("set_temperature", {"temperature": state.temperature})
    validate_action("set_fan_speed", {"fan_speed": state.fan_speed})
    validate_action("set_airflow_direction", {"airflow_direction": state.airflow_direction})
    validate_action("set_ambient_color", {"ambient_color": state.ambient_color})
    validate_action("set_ambient_intensity", {"ambient_intensity": state.ambient_intensity})
    validate_action("set_audio_volume", {"audio_volume": state.audio_volume})
