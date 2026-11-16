from copy import deepcopy
from typing import Any

from .models import CabinState, ProfilePreset
from . import config
from .models import PASSENGER_SEATS
from .validator import validate_action, validate_preset


class CabinSimulator:
    def __init__(self, initial_state: CabinState | None = None):
        self._state = initial_state or CabinState()

    def get_state(self) -> CabinState:
        return CabinState.model_validate(deepcopy(self._state.model_dump()))

    def set_vehicle_status(self, status: str) -> CabinState:
        if status not in {"parked", "moving", "unknown"}:
            raise ValueError("Starea vehiculului nu este validă.")
        self._state.vehicle_status = status
        return self.get_state()

    def apply_action(self, action: str, arguments: dict[str, Any]) -> CabinState:
        validate_action(action, arguments)

        if action == "set_temperature":
            self._state.temperature = arguments["temperature"]
        elif action == "set_fan_speed":
            self._state.fan_speed = arguments["fan_speed"]
        elif action == "set_airflow_direction":
            self._state.airflow_direction = arguments["airflow_direction"]
        elif action == "set_air_conditioning":
            self._state.air_conditioning = arguments["enabled"]
        elif action == "set_steering_wheel_heating":
            self._state.steering_wheel_heating = arguments["enabled"]
        elif action == "set_seat_heating":
            seats = PASSENGER_SEATS if arguments["seat"] == "all_passengers" else (arguments["seat"],)
            for seat in seats:
                self._state.seat_heating[seat] = arguments["level"]
        elif action == "set_seat_ventilation":
            seats = PASSENGER_SEATS if arguments["seat"] == "all_passengers" else (arguments["seat"],)
            for seat in seats:
                self._state.seat_ventilation[seat] = arguments["enabled"]
                self._state.seat_ventilation_level[seat] = 1 if arguments["enabled"] else 0
        elif action == "set_seat_ventilation_level":
            seats = PASSENGER_SEATS if arguments["seat"] == "all_passengers" else (arguments["seat"],)
            for seat in seats:
                self._state.seat_ventilation_level[seat] = arguments["level"]
                self._state.seat_ventilation[seat] = arguments["level"] > 0
        elif action == "set_ambient_color":
            self._state.ambient_color = arguments["ambient_color"].lower()
            for zone in self._state.ambient_zones.values():
                zone["color"] = self._state.ambient_color
        elif action == "set_ambient_lights":
            self._state.ambient_lights_on = arguments["enabled"]
        elif action == "set_ambient_intensity":
            self._state.ambient_intensity = arguments["ambient_intensity"]
            for zone in self._state.ambient_zones.values():
                zone["intensity"] = self._state.ambient_intensity
        elif action == "set_ambient_zone_color":
            self._state.ambient_zones[arguments["zone"]]["color"] = arguments["ambient_color"].lower()
        elif action == "set_ambient_zone_intensity":
            self._state.ambient_zones[arguments["zone"]]["intensity"] = arguments["ambient_intensity"]
        elif action == "set_audio_volume":
            self._state.audio_volume = arguments["audio_volume"]
        elif action == "set_media_source":
            self._state.media_source = arguments["media_source"]
            if arguments["media_source"] == "radio":
                station = config.RADIO_STATIONS[self._state.radio_station_index % len(config.RADIO_STATIONS)]
                self._state.radio_station = station["name"]
            elif arguments["media_source"] != "none":
                self._state.current_track = "Playlist demonstrativ"
        elif action == "set_media_playback":
            self._state.media_playing = arguments["playing"]
        elif action == "next_track":
            self._state.current_track = "Piesa demonstrativă următoare"
            self._state.media_playing = True
        elif action == "previous_track":
            self._state.current_track = "Piesa demonstrativă anterioară"
            self._state.media_playing = True
        elif action == "start_radio":
            self._state.media_source = "radio"
            station = config.RADIO_STATIONS[self._state.radio_station_index % len(config.RADIO_STATIONS)]
            self._state.radio_station = station["name"]
            self._state.media_playing = True
        elif action == "change_radio_station":
            self._state.radio_station_index = (self._state.radio_station_index + 1) % len(config.RADIO_STATIONS)
            station = config.RADIO_STATIONS[self._state.radio_station_index]
            self._state.media_source = "radio"
            self._state.radio_station = station["name"]
            self._state.media_playing = True
        else:
            raise ValueError(f"Acțiunea '{action}' nu poate modifica direct simulatorul.")

        return self.get_state()

    def apply_preset(self, preset: ProfilePreset) -> CabinState:
        validate_preset(preset)
        self._state.temperature = preset.temperature
        self._state.fan_speed = preset.fan_speed
        self._state.airflow_direction = preset.airflow_direction
        self._state.ambient_color = preset.ambient_color
        self._state.ambient_intensity = preset.ambient_intensity
        self._state.ambient_lights_on = True
        self._state.audio_volume = preset.audio_volume
        self._state.media_playing = False
        return self.get_state()
