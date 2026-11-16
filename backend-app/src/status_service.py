from typing import Any

from .models import CabinState, CommandResult


def build_status(
    status: str,
    active_profile: str | None,
    action: str,
    requested_values: dict[str, Any],
    before: CabinState,
    after: CabinState,
    message: str,
) -> dict[str, Any]:
    actual_values: dict[str, Any] = {}
    field_map = {
        "temperature": "temperature",
        "fan_speed": "fan_speed",
        "airflow_direction": "airflow_direction",
        "ambient_color": "ambient_color",
        "ambient_intensity": "ambient_intensity",
        "audio_volume": "audio_volume",
        "media_source": "media_source",
        "current_track": "current_track",
        "radio_station": "radio_station",
    }
    for requested_key, state_key in field_map.items():
        if requested_key in requested_values:
            actual_values[requested_key] = getattr(after, state_key)

    if action == "set_air_conditioning" and "enabled" in requested_values:
        actual_values["enabled"] = after.air_conditioning
    elif action == "set_steering_wheel_heating" and "enabled" in requested_values:
        actual_values["enabled"] = after.steering_wheel_heating
    elif action == "set_ambient_lights" and "enabled" in requested_values:
        actual_values["enabled"] = after.ambient_lights_on
    elif action == "set_seat_heating" and "seat" in requested_values:
        seat = requested_values["seat"]
        actual_values["level"] = (
            {target: after.seat_heating[target] for target in after.seat_heating if target != "driver"}
            if seat == "all_passengers"
            else after.seat_heating[seat]
        )
    elif action == "set_seat_ventilation" and "seat" in requested_values:
        seat = requested_values["seat"]
        actual_values["enabled"] = (
            {target: after.seat_ventilation[target] for target in after.seat_ventilation if target != "driver"}
            if seat == "all_passengers"
            else after.seat_ventilation[seat]
        )
    elif action == "set_seat_ventilation_level" and "seat" in requested_values:
        seat = requested_values["seat"]
        actual_values["level"] = (
            {target: after.seat_ventilation_level[target] for target in after.seat_ventilation_level}
            if seat == "all_passengers"
            else after.seat_ventilation_level[seat]
        )
    elif action == "set_media_playback" and "playing" in requested_values:
        actual_values["playing"] = after.media_playing
    elif action in {"set_ambient_zone_color", "set_ambient_zone_intensity"} and "zone" in requested_values:
        actual_values["zone"] = requested_values["zone"]
        actual_values.update(after.ambient_zones[requested_values["zone"]])
    elif action in {"next_track", "previous_track"}:
        actual_values["current_track"] = after.current_track
    elif action in {"start_radio", "change_radio_station"}:
        actual_values["media_source"] = after.media_source
        actual_values["radio_station"] = after.radio_station

    message_key_by_action = {
        "set_temperature": "assistant.confirm.temperature",
        "set_fan_speed": "assistant.confirm.fan",
        "set_airflow_direction": "assistant.confirm.airflow",
        "set_air_conditioning": "assistant.confirm.airConditioning",
        "set_ambient_color": "assistant.confirm.ambientColor",
        "set_ambient_lights": "assistant.confirm.ambientLights",
        "set_ambient_intensity": "assistant.confirm.ambientIntensity",
        "set_audio_volume": "assistant.confirm.volume",
        "start_radio": "assistant.confirm.radio",
        "set_media_playback": "assistant.confirm.playback",
        "change_radio_station": "assistant.confirm.station",
    }
    message_key = message_key_by_action.get(action, "assistant.confirm.generic")
    message_params = dict(actual_values)
    value_key_by_action = {
        "set_temperature": "temperature",
        "set_fan_speed": "fan_speed",
        "set_airflow_direction": "airflow_direction",
        "set_ambient_color": "ambient_color",
        "set_ambient_intensity": "ambient_intensity",
        "set_audio_volume": "audio_volume",
        "start_radio": "radio_station",
        "change_radio_station": "radio_station",
    }
    value_key = value_key_by_action.get(action)
    if value_key and value_key in actual_values:
        message_params["value"] = actual_values[value_key]
    if action == "set_air_conditioning" and "enabled" in actual_values:
        message_params["state"] = "state.on" if actual_values["enabled"] else "state.off"
    if action == "set_ambient_lights" and "enabled" in actual_values:
        message_params["state"] = "state.on" if actual_values["enabled"] else "state.off"
    if action == "set_media_playback" and "playing" in actual_values:
        message_params["state"] = "state.playing" if actual_values["playing"] else "state.paused"

    result = CommandResult(
        status=status,
        active_profile=active_profile,
        last_command={
            "action": action,
            "requested_values": requested_values,
            "actual_values": actual_values,
            "changed": before.model_dump() != after.model_dump(),
        },
        cabin_state=after.model_dump(),
        message=message,
    )
    payload = result.model_dump()
    payload["message_key"] = message_key
    payload["message_params"] = message_params
    return payload
