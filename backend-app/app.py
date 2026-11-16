import streamlit as st

from src import config
from src.cabin_state import create_default_state
from src.command_engine import create_openai_client, interpret_commands, local_interpret_command
from src.models import CabinState
from src.profile_service import ProfileService
from src.simulator import CabinSimulator
from src.status_service import build_status
from src.stt import transcribe_audio
from src.tts import synthesize_speech


st.set_page_config(page_title="In-Car Conversational AI", page_icon="🚗", layout="wide")


def get_simulator() -> CabinSimulator:
    if "simulator" not in st.session_state:
        st.session_state.simulator = CabinSimulator(create_default_state())
    return st.session_state.simulator


def get_profile_service() -> ProfileService:
    if "profile_service" not in st.session_state:
        st.session_state.profile_service = ProfileService(config.PROFILES_PATH)
    return st.session_state.profile_service


def get_active_profile() -> str | None:
    return st.session_state.get("active_profile")


def set_active_profile(name: str | None) -> None:
    st.session_state.active_profile = name


def load_profile(profile_name: str) -> dict:
    simulator, profiles = get_simulator(), get_profile_service()
    before = simulator.get_state()
    profile = profiles.find(profile_name)
    if profile is None:
        return build_status("rejected", get_active_profile(), "identify_profile", {"profile_name": profile_name}, before, before, "Profilul solicitat nu există.")
    set_active_profile(profile.profile_name)
    after = simulator.apply_preset(profile.preset)
    return build_status("implemented", profile.profile_name, "load_profile_preset", profile.preset.model_dump(), before, after, f"Am încărcat profilul {profile.profile_name}.")


def response_for(action: str, args: dict, state: CabinState) -> str:
    if action == "set_temperature":
        return f"Temperatura este acum setată la {state.temperature} de grade."
    if action == "set_fan_speed":
        return f"Ventilatorul este setat la treapta {state.fan_speed}."
    if action == "set_media_playback":
        return "Am pornit muzica." if state.media_playing else "Am oprit muzica."
    if action == "start_radio":
        return f"Am pornit radioul pe {state.radio_station}."
    if action == "set_air_conditioning":
        return "Aerul condiționat este pornit." if state.air_conditioning else "Aerul condiționat este oprit."
    if action == "set_steering_wheel_heating":
        return "Încălzirea volanului este pornită." if state.steering_wheel_heating else "Încălzirea volanului este oprită."
    if action == "set_ambient_color":
        return f"Luminile ambientale sunt setate pe {state.ambient_color}."
    if action == "set_ambient_intensity":
        return f"Intensitatea luminilor este {state.ambient_intensity} la sută."
    if action == "set_audio_volume":
        return f"Volumul este setat la {state.audio_volume} la sută."
    return "Comanda a fost aplicată și verificată."


def process_single_command(message: str, parsed_command: dict | None = None) -> dict:
    simulator, profiles = get_simulator(), get_profile_service()
    before = simulator.get_state()
    folded = message.lower()
    if "mai cald" in folded or "mai caldă" in folded:
        command = {"action": "set_temperature", "arguments": {"temperature": before.temperature + 1}}
    elif "mai rece" in folded:
        command = {"action": "set_temperature", "arguments": {"temperature": before.temperature - 1}}
    else:
        command = parsed_command or local_interpret_command(message) or interpret_commands(message)[0]
    action, arguments = command["action"], command["arguments"]

    try:
        if action == "unsafe_request":
            return build_status("rejected", get_active_profile(), action, {}, before, before, command["assistant_message"])
        if action in {"set_seat_position", "set_seat_massage", "relax_mode"} and before.vehicle_status != "parked":
            return build_status("rejected", get_active_profile(), action, arguments, before, before, "Această acțiune este permisă doar când mașina este parcată.")
        if action == "no_action":
            return build_status("not_understood", get_active_profile(), action, {}, before, before, command.get("assistant_message") or "Nu am înțeles comanda.")
        if action == "identify_profile":
            return load_profile(arguments["profile_name"])
        if action == "create_profile":
            profile = profiles.create_from_state(arguments["profile_name"], before)
            set_active_profile(profile.profile_name)
            return build_status("implemented", profile.profile_name, action, profile.preset.model_dump(), before, before, f"Am salvat profilul {profile.profile_name}.")
        if action == "update_profile_preset":
            profile_name = (arguments.get("profile_name") or get_active_profile() or "").strip()
            updates = {key: value for key, value in arguments.items() if key in {"temperature", "fan_speed", "airflow_direction", "ambient_color", "ambient_intensity", "audio_volume"} and value is not None}
            updated = profiles.update_preset(profile_name, updates)
            set_active_profile(updated.profile_name)
            after = simulator.apply_preset(updated.preset)
            return build_status("implemented", updated.profile_name, action, updates, before, after, f"Am actualizat profilul {updated.profile_name}.")

        after = simulator.apply_action(action, arguments)
        field_map = {"set_temperature": "temperature", "set_fan_speed": "fan_speed", "set_airflow_direction": "airflow_direction", "set_ambient_color": "ambient_color", "set_ambient_intensity": "ambient_intensity", "set_audio_volume": "audio_volume"}
        if get_active_profile() and action in field_map:
            profiles.update_preset(get_active_profile(), {field_map[action]: arguments[field_map[action]]})
        return build_status("unchanged" if before.model_dump() == after.model_dump() else "implemented", get_active_profile(), action, arguments, before, after, response_for(action, arguments, after))
    except Exception as error:
        return build_status("rejected", get_active_profile(), action, arguments, before, before, str(error))


def _command_text(command: dict) -> str:
    action, args = command["action"], command["arguments"]
    if action == "set_temperature":
        return f"Setează temperatura la {args['temperature']} grade"
    if action == "set_air_conditioning":
        return "Pornește aerul condiționat" if args.get("enabled") else "Oprește aerul condiționat"
    if action == "set_media_playback":
        return "Pornește muzica" if args.get("playing") else "Oprește muzica"
    if action == "set_media_source":
        return f"Selectează sursa {args.get('media_source')}"
    if action == "next_track":
        return "Treci la următoarea piesă"
    if action == "previous_track":
        return "Revino la piesa anterioară"
    if action == "start_radio":
        return "Pornește radioul"
    if action == "identify_profile":
        return f"Încarcă profilul {args['profile_name']}"
    if action == "create_profile":
        return f"Creează un profil pentru {args['profile_name']}"
    return command.get("assistant_message") or action


def process_command(message: str) -> dict:
    """Execută toate acțiunile dintr-o frază, inclusiv cele sigure parțiale."""
    before = get_simulator().get_state()
    commands = interpret_commands(message)
    results = []
    for command in commands:
        if command["action"] == "unsafe_request":
            results.append(build_status("rejected", get_active_profile(), "unsafe_request", {}, get_simulator().get_state(), get_simulator().get_state(), command["assistant_message"]))
        else:
            results.append(process_single_command(_command_text(command), parsed_command=command))
    if len(results) == 1:
        return results[0]
    final_state = get_simulator().get_state()
    rejected = [item for item in results if item["status"] in {"rejected", "failed", "not_understood"}]
    implemented = [item for item in results if item["status"] == "implemented"]
    return {
        "status": "partially_implemented" if rejected and implemented else ("rejected" if rejected else "implemented"),
        "active_profile": get_active_profile(),
        "last_command": {"action": "multiple", "requested_values": {}, "actual_values": {}, "changed": before.model_dump() != final_state.model_dump(), "items": [item["last_command"] for item in results]},
        "cabin_state": final_state.model_dump(),
        "message": " ".join(item["message"] for item in results),
    }


def show_result(result: dict) -> None:
    st.success(result["message"] if result["status"] == "implemented" else result["message"])
    last = result["last_command"]
    if last.get("changed"):
        st.caption("Actualizare în timp real: " + ", ".join(f"{k}: {v}" for k, v in last.get("actual_values", {}).items()))
    st.json(result["cabin_state"])
    if st.session_state.get("audio_enabled", False):
        try:
            st.audio(synthesize_speech(result["message"], create_openai_client()), format="audio/mp3", autoplay=True)
        except Exception as error:
            st.caption(f"Audio indisponibil: {error}")


st.title("In-Car Conversational AI")
st.caption("Control vocal pentru funcții non-critice: climatizare, scaune, lumini și media")
simulator, profiles = get_simulator(), get_profile_service()
profile_names = [profile.profile_name for profile in profiles.list_profiles()]
with st.sidebar:
    st.subheader("Profil activ")
    selected = st.selectbox("Selectează profilul", ["— niciun profil —"] + profile_names, index=(["— niciun profil —"] + profile_names).index(get_active_profile()) if get_active_profile() in profile_names else 0)
    if selected != "— niciun profil —" and selected != get_active_profile():
        result = load_profile(selected)
        st.session_state.last_result = result
        st.rerun()
    vehicle_labels = {"parked": "Parcată", "moving": "În mișcare", "unknown": "Necunoscută"}
    current_status = simulator.get_state().vehicle_status
    selected_status = st.selectbox("Starea mașinii", list(vehicle_labels), format_func=lambda value: vehicle_labels[value], index=list(vehicle_labels).index(current_status))
    if selected_status != current_status:
        simulator.set_vehicle_status(selected_status)
        st.rerun()
    st.session_state.audio_enabled = st.toggle("Răspuns audio", value=st.session_state.get("audio_enabled", False))
    st.write(f"Stare vehicul: **{vehicle_labels[selected_status]}**")
    st.caption("Comenzile pentru frâne, accelerație și direcție sunt blocate.")

st.subheader("Comandă text sau vocală")
text_command = st.chat_input("Exemplu: Setează temperatura la 20 de grade")
if text_command:
    result = process_command(text_command)
    st.session_state.last_result = result
    st.session_state.history = st.session_state.get("history", []) + [(text_command, result["message"])]
    st.rerun()

def stop_radio_for_recording() -> None:
    if get_simulator().get_state().media_playing:
        get_simulator().apply_action("set_media_playback", {"playing": False})


audio_value = st.audio_input("Înregistrează comanda", on_change=stop_radio_for_recording)
if audio_value is not None:
    audio_key = f"{audio_value.name}:{audio_value.size}"
    if st.session_state.get("last_audio_key") != audio_key:
        st.session_state.last_audio_key = audio_key
        # Oprește radioul înainte de procesarea unei noi comenzi vocale.
        simulator.apply_action("set_media_playback", {"playing": False})
        try:
            with st.spinner("Transcriu comanda în română..."):
                transcript = transcribe_audio(audio_value.getvalue(), audio_value.name or "recording.webm", create_openai_client())
            st.info(f"Am auzit: {transcript}")
            st.session_state.last_result = process_command(transcript)
            st.rerun()
        except Exception as error:
            st.error(str(error))

state = simulator.get_state()
if "last_result" in st.session_state:
    show_result(st.session_state.last_result)

st.subheader("Radio")
if state.media_source == "radio" and state.media_playing:
    st.subheader(f"Radio: {state.radio_station}")
    station = config.RADIO_STATIONS[state.radio_station_index % len(config.RADIO_STATIONS)]
    st.audio(station["url"], format=station["format"], autoplay=True)

st.subheader("Starea cabinei")
cols = st.columns(6)
for col, label, value in zip(cols, ["Temperatură", "Ventilator", "Aer condiționat", "Lumini", "Volum", "Redare"], [f"{state.temperature} °C", state.fan_speed, "Pornit" if state.air_conditioning else "Oprit", f"{state.ambient_color} / {state.ambient_intensity}%", f"{state.audio_volume}%", "Pornită" if state.media_playing else "Oprită"]):
    col.metric(label, value)

st.subheader("Creează un profil nou")
with st.form("create_profile_form"):
    new_profile_name = st.text_input("Numele profilului", placeholder="Exemplu: Maria")
    profile_cols = st.columns(2)
    with profile_cols[0]:
        profile_temperature = st.slider("Temperatură preferată (°C)", 16, 30, state.temperature)
        profile_fan_speed = st.slider("Viteză ventilator", 0, 5, state.fan_speed)
        airflow_values = ["face", "feet", "windshield", "mixed"]
        airflow_labels = {"face": "Față", "feet": "Picioare", "windshield": "Parbriz", "mixed": "Mixt"}
        profile_airflow = st.selectbox("Direcția aerului", airflow_values, index=airflow_values.index(state.airflow_direction), format_func=lambda value: airflow_labels[value])
    with profile_cols[1]:
        color_values = ["red", "blue", "green", "white", "purple", "yellow"]
        color_labels = {"red": "Roșu", "blue": "Albastru", "green": "Verde", "white": "Alb", "purple": "Mov", "yellow": "Galben"}
        profile_color = st.selectbox("Culoarea luminilor", color_values, index=color_values.index(state.ambient_color) if state.ambient_color in color_values else 0, format_func=lambda value: color_labels[value])
        profile_intensity = st.slider("Intensitatea luminilor (%)", 0, 100, state.ambient_intensity)
        profile_volume = st.slider("Volum audio (%)", 0, 100, state.audio_volume)
    save_profile = st.form_submit_button("Salvează profilul")
    if save_profile:
        if not new_profile_name.strip():
            st.error("Numele profilului este obligatoriu.")
        else:
            try:
                profile = profiles.create_from_state(
                    new_profile_name,
                    state,
                    {
                        "temperature": profile_temperature,
                        "fan_speed": profile_fan_speed,
                        "airflow_direction": profile_airflow,
                        "ambient_color": profile_color,
                        "ambient_intensity": profile_intensity,
                        "audio_volume": profile_volume,
                    },
                )
                set_active_profile(profile.profile_name)
                st.success(f"Profilul {profile.profile_name} a fost salvat și activat.")
                st.rerun()
            except Exception as error:
                st.error(str(error))

with st.expander("Stare tehnică detaliată"):
    st.json(state.model_dump())
