import re
import json
from typing import Any, Literal

from fastapi import Cookie, Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src import config
from src.cabin_state import create_default_state
from src.command_engine import create_openai_client, interpret_commands
from src.models import CabinState
from backend.auth_db import Database, verify_password
from backend.localization import auth_message, localize_result
from src.simulator import CabinSimulator
from src.status_service import build_status
from src.stt import transcribe_audio_details
from src.tts import synthesize_speech


app = FastAPI(title="In-Car Conversational AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = CabinSimulator(create_default_state())
db = Database(config.DATABASE_URL)
active_profile: str | None = None


class ActionRequest(BaseModel):
    action: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    locale: Literal["ro", "en"] = "ro"


class CommandRequest(BaseModel):
    message: str
    locale: Literal["ro", "en"] = "ro"


class SpeechRequest(BaseModel):
    text: str
    locale: Literal["ro", "en"] = "ro"


class LocaleRequest(BaseModel):
    locale: Literal["ro", "en"]


class ProfileRequest(BaseModel):
    profile_name: str
    preset: dict[str, Any] = Field(default_factory=dict)


class RouteRequest(BaseModel):
    name: str
    origin: dict[str, Any]
    destination: dict[str, Any]
    route: dict[str, Any]


class AddressRequest(BaseModel):
    label: str
    address: dict[str, Any]


class VehicleRequest(BaseModel):
    name: str
    make: str = ""
    model: str = ""
    fuel_type: Literal["petrol", "diesel", "hybrid"] = "petrol"
    consumption_l_per_100km: float
    tank_capacity_l: float
    current_fuel_l: float
    fuel_price_per_l: float


class VehicleLookupRequest(BaseModel):
    make: str
    model: str
    year: int | None = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    password_confirmation: str
    locale: Literal["ro", "en"] = "ro"


class LoginRequest(BaseModel):
    email: str
    password: str
    locale: Literal["ro", "en"] = "ro"


def current_user(session_id: str | None = Cookie(default=None)) -> dict[str, Any]:
    user = db.get_user_by_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Autentificarea este necesară.")
    return user


def _legacy_detect_language(text: str) -> str:
    """Detectează limba comenzii înainte de generarea confirmării audio."""
    normalized = text.lower()
    romanian = re.search(
        r"[ăâîșşțţ]|\b(seteaz|temperatura|grade|porneste|opreste|lumini|"
        r"ventilator|aerul|culoarea|intensitatea|muzica|radioul)\b",
        normalized,
    )
    english = re.search(
        r"\b(set|turn|switch|temperature|degrees|fan|air|conditioning|"
        r"lights|light|color|colour|intensity|music|radio|start|stop|volume)\b",
        normalized,
    )
    if english and not romanian:
        return "en"
    return "ro"


def detect_language(text: str) -> str:
    """Detectează limba pe baza scorului de cuvinte, nu a unui singur marker."""
    normalized = text.lower().translate(str.maketrans("ăâîșşțţ", "aaisstt"))
    romanian_words = re.findall(
        r"\b(seteaza|temperatura|grade|porneste|opreste|lumini|ventilator|aerul|"
        r"culoarea|intensitatea|muzica|radioul|scaun|sofer|pasager|schimba|limba|"
        r"romana|engleza|flux|directia|fata|picioare|parbriz|mixt|la)\b",
        normalized,
    )
    english_words = re.findall(
        r"\b(set|turn|switch|change|language|english|romanian|temperature|"
        r"degrees|fan|air|conditioning|lights|light|color|colour|intensity|"
        r"music|radio|start|stop|volume|seat|driver|passenger|airflow|flow|"
        r"direction|face|feet|windshield|mixed|to|the)\b",
        normalized,
    )
    romanian_score = len(romanian_words)
    english_score = len(english_words)
    return "en" if english_score > romanian_score else "ro"


def load_profile(profile_name: str, user_id: int) -> dict[str, Any]:
    global active_profile
    before = simulator.get_state()
    profile = db.find_profile(user_id, profile_name)
    if profile is None:
        return build_status("rejected", active_profile, "identify_profile", {"profile_name": profile_name}, before, before, "Profilul solicitat nu există.")
    active_profile = profile.profile_name
    after = simulator.apply_preset(profile.preset)
    return build_status("implemented", profile.profile_name, "load_profile_preset", profile.preset.model_dump(), before, after, f"Am încărcat profilul {profile.profile_name}.")


def execute_single_command(command: dict[str, Any], user_id: int, locale: Literal["ro", "en"] = "ro") -> dict[str, Any]:
    global active_profile
    before = simulator.get_state()

    action = command["action"]
    arguments = command["arguments"]

    if action == "unsafe_request":
        result = build_status("rejected", active_profile, action, arguments, before, before, command["assistant_message"])
        result["message"] = (
            "Nu pot executa comenzi pentru funcțiile de conducere ale autovehiculului."
            if locale == "ro"
            else "I cannot execute commands that control the vehicle's driving functions."
        )
        return result

    if action == "no_action":
        return localize_result(build_status("not_understood", active_profile, action, arguments, before, before, command.get("assistant_message") or "Nu am înțeles comanda."), locale)

    if action == "set_navigation_route":
        return localize_result(build_status("implemented", active_profile, action, arguments, before, before, f"Am pregătit traseul de la {arguments['origin']} la {arguments['destination']}."), locale)

    if action == "identify_profile":
        return localize_result(load_profile(arguments["profile_name"], user_id), locale)

    if action == "create_profile":
        profile = db.create_from_state(user_id, arguments["profile_name"], before)
        active_profile = profile.profile_name
        return localize_result(build_status("implemented", profile.profile_name, action, profile.preset.model_dump(), before, before, f"Am salvat profilul {profile.profile_name}."), locale)

    if action == "update_profile_preset":
        profile_name = (arguments.get("profile_name") or active_profile or "").strip()
        updates = {key: value for key, value in arguments.items() if key in {"temperature", "fan_speed", "airflow_direction", "ambient_color", "ambient_intensity", "audio_volume"} and value is not None}
        updated = db.update_preset(user_id, profile_name, updates)
        active_profile = updated.profile_name
        after = simulator.apply_preset(updated.preset)
        return localize_result(build_status("implemented", updated.profile_name, action, updates, before, after, f"Am actualizat profilul {updated.profile_name}."), locale)

    try:
        after = simulator.apply_action(action, arguments)
        if active_profile and action in {"set_temperature", "set_fan_speed", "set_airflow_direction", "set_ambient_color", "set_ambient_intensity", "set_audio_volume"}:
            field = {"set_temperature": "temperature", "set_fan_speed": "fan_speed", "set_airflow_direction": "airflow_direction", "set_ambient_color": "ambient_color", "set_ambient_intensity": "ambient_intensity", "set_audio_volume": "audio_volume"}[action]
            db.update_preset(user_id, active_profile, {field: arguments[field]})
        return localize_result(build_status("implemented", active_profile, action, arguments, before, after, f"Am aplicat comanda pentru {action}."), locale)
    except Exception as error:
        return localize_result(build_status("rejected", active_profile, action, arguments, before, before, str(error)), locale)


def execute_command(message: str, user_id: int, locale: Literal["ro", "en"] = "ro") -> dict[str, Any]:
    commands = interpret_commands(message, locale=locale)
    results = [execute_single_command(command, user_id, locale) for command in commands]
    if not results:
        return execute_single_command({"action": "no_action", "arguments": {}, "assistant_message": None}, user_id, locale)

    final_result = results[-1]
    if len(results) > 1:
        final_result["executed_commands"] = [result["last_command"] for result in results]
        final_result["messages"] = [result["message"] for result in results]
        final_result["message"] = " ".join(result["message"] for result in results)
    return final_result


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(request: RegisterRequest, response: Response):
    email = request.email.strip().lower()
    if "@" not in email or len(email) > 254:
        raise HTTPException(status_code=400, detail=auth_message(request.locale, "invalid_email"))
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail=auth_message(request.locale, "short_password"))
    if request.password != request.password_confirmation:
        raise HTTPException(status_code=400, detail=auth_message(request.locale, "password_mismatch"))
    try:
        user = db.create_user(email, request.password)
    except Exception as error:
        if "unique" in str(error).lower():
            raise HTTPException(status_code=409, detail=auth_message(request.locale, "duplicate_email")) from error
        raise
    response.set_cookie("session_id", db.create_session(user["id"]), httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30)
    return {"email": user["email"]}


@app.post("/api/auth/login")
def login(request: LoginRequest, response: Response):
    user = db.get_user_by_email(request.email.strip().lower())
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail=auth_message(request.locale, "invalid_credentials"))
    response.set_cookie("session_id", db.create_session(user["id"]), httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30)
    return {"email": user["email"]}


@app.get("/api/auth/me")
def me(user: dict[str, Any] = Depends(current_user)):
    return {"email": user["email"], "locale": user.get("locale", "ro")}


@app.put("/api/auth/locale")
def update_locale(request: LocaleRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    locale = db.update_user_locale(user["id"], request.locale)
    user["locale"] = locale
    return {"locale": locale}


@app.post("/api/auth/logout")
def logout(response: Response, session_id: str | None = Cookie(default=None)):
    db.delete_session(session_id)
    response.delete_cookie("session_id")
    return {"ok": True}


@app.get("/api/state")
def get_state(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return simulator.get_state().model_dump()


@app.get("/api/profiles")
def get_profiles(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return [profile.model_dump() for profile in db.list_profiles(user["id"])]


@app.post("/api/profiles")
def create_profile(request: ProfileRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    global active_profile
    before = simulator.get_state()
    profile = db.create_from_state(user["id"], request.profile_name, before, request.preset)
    active_profile = profile.profile_name
    after = simulator.apply_preset(profile.preset)
    return build_status("implemented", active_profile, "create_profile", profile.preset.model_dump(), before, after, f"Am creat profilul {profile.profile_name}.")


@app.put("/api/profiles/{profile_name}")
def update_profile(profile_name: str, request: ProfileRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    global active_profile
    before = simulator.get_state()
    updated = db.save_profile(user["id"], profile_name, request.preset)
    active_profile = updated.profile_name
    after = simulator.apply_preset(updated.preset)
    return build_status("implemented", active_profile, "update_profile_preset", updated.preset.model_dump(), before, after, f"Am actualizat profilul {updated.profile_name}.")


@app.get("/api/routes")
def get_routes(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return db.list_routes(user["id"])


@app.get("/api/routes/recent")
def get_recent_routes(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return db.list_recent_routes(user["id"])


@app.post("/api/routes/recent")
def create_recent_route(request: RouteRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return db.save_recent_route(user["id"], request.name, request.origin, request.destination, request.route)


@app.post("/api/routes")
def save_route(request: RouteRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return db.save_route(user["id"], request.name, request.origin, request.destination, request.route)


@app.delete("/api/routes/{route_id}")
def remove_saved_route(route_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    db.remove_saved_route(user["id"], route_id)
    return {"ok": True}


@app.delete("/api/routes/recent/{route_id}")
def remove_recent_route(route_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    db.remove_saved_route(user["id"], route_id)
    return {"ok": True}


@app.get("/api/addresses")
def get_addresses(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return db.list_addresses(user["id"])


@app.post("/api/addresses")
def create_address(request: AddressRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return db.save_address(user["id"], request.label, request.address)


@app.put("/api/addresses/{address_id}")
def update_address(address_id: int, request: AddressRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return db.save_address(user["id"], request.label, request.address, address_id)


@app.delete("/api/addresses/{address_id}")
def remove_address(address_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    db.delete_address(user["id"], address_id)
    return {"ok": True}


@app.get("/api/vehicles")
def get_vehicles(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return db.list_vehicles(user["id"])


@app.post("/api/vehicles/lookup")
def lookup_vehicle(request: VehicleLookupRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    make = request.make.strip()
    model = request.model.strip()
    if not make or not model:
        raise HTTPException(status_code=400, detail="Marca și modelul mașinii sunt obligatorii.")
    try:
        response = create_openai_client().chat.completions.create(
            model=config.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": "Ești un consultant auto. Returnează exclusiv JSON valid, fără markdown. Estimează valori realiste pentru configurația uzuală europeană. Câmpurile sunt fuel_type (petrol, diesel sau hybrid), consumption_l_per_100km (consum mixt), tank_capacity_l și fuel_price_per_l (preț estimativ în lei pentru România)."},
                {"role": "user", "content": f"Mașină: {make} {model}{f' ({request.year})' if request.year else ''}. Furnizează specificațiile pentru calculul consumului pe traseu."},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        values = json.loads(response.choices[0].message.content or "{}")
        fuel_type = values.get("fuel_type", "petrol")
        if fuel_type not in {"petrol", "diesel", "hybrid"}:
            fuel_type = "petrol"
        return {"make": make, "model": model, "fuel_type": fuel_type, "consumption_l_per_100km": float(values["consumption_l_per_100km"]), "tank_capacity_l": float(values["tank_capacity_l"]), "fuel_price_per_l": 10.0}
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=502, detail="AI-ul nu a putut identifica specificațiile mașinii.") from error


@app.post("/api/vehicles")
def create_vehicle(request: VehicleRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return db.save_vehicle(user["id"], request.model_dump())


@app.put("/api/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: int, request: VehicleRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return db.save_vehicle(user["id"], request.model_dump(), vehicle_id)


@app.delete("/api/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    db.delete_vehicle(user["id"], vehicle_id)
    return {"ok": True}


@app.post("/api/action")
def apply_action(request: ActionRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    global active_profile
    before: CabinState = simulator.get_state()

    if request.action == "identify_profile":
        return localize_result(load_profile(request.arguments["profile_name"], user["id"]), request.locale)

    try:
        if request.action == "set_vehicle_status":
            after = simulator.set_vehicle_status(str(request.arguments.get("status", "")))
            return build_status("implemented", active_profile, request.action, request.arguments, before, after, "Starea autovehiculului a fost actualizată.")
        after = simulator.apply_action(request.action, request.arguments)
        if active_profile and request.action in {"set_temperature", "set_fan_speed", "set_airflow_direction", "set_ambient_color", "set_ambient_intensity", "set_audio_volume"}:
            field = {"set_temperature": "temperature", "set_fan_speed": "fan_speed", "set_airflow_direction": "airflow_direction", "set_ambient_color": "ambient_color", "set_ambient_intensity": "ambient_intensity", "set_audio_volume": "audio_volume"}[request.action]
            db.update_preset(user["id"], active_profile, {field: request.arguments[field]})
        return localize_result(build_status("implemented", active_profile, request.action, request.arguments, before, after, f"Am aplicat acțiunea {request.action}."), request.locale)
    except Exception as error:
        return localize_result(build_status("rejected", active_profile, request.action, request.arguments, before, before, str(error)), request.locale)


@app.post("/api/command")
def command(request: CommandRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    result = execute_command(request.message, user["id"], request.locale)
    result["language"] = detect_language(request.message)
    result["locale"] = request.locale
    return result


@app.post("/api/voice")
async def voice(audio: UploadFile = File(...), locale: Literal["ro", "en"] = Form("ro"), user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    audio_bytes = await audio.read()
    transcription = transcribe_audio_details(
        audio_bytes, audio.filename or "recording.webm", create_openai_client()
    )
    transcript = transcription["text"]
    detected_language = transcription["language"][:2].lower()
    if detected_language not in {"ro", "en"}:
        detected_language = detect_language(transcript)
    # Răspunsul urmează limba interfeței; limba detectată este folosită doar pentru diagnostic.
    result = execute_command(transcript, user["id"], locale)
    return {"transcript": transcript, "language": detected_language, "locale": locale, "result": result}


@app.post("/api/speech")
def speech(request: SpeechRequest, user: dict[str, Any] = Depends(current_user)) -> Response:
    """Generează confirmarea audio folosind vocea TTS configurată, nu vocea browserului."""
    audio = synthesize_speech(request.text, create_openai_client(), request.locale)
    return Response(content=audio, media_type="audio/mpeg")

