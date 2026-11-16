import json
import re
import unicodedata
from typing import Any

from openai import OpenAI

from . import config
from .command_schema import COMMAND_TOOLS
from .prompts import SYSTEM_PROMPT


def _fold(text: str) -> str:
    return "".join(
        char for char in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(char) != "Mn"
    )


def local_interpret_command(message: str) -> dict[str, Any] | None:
    """Rezolvă deterministic comenzile uzuale și blochează cererile periculoase."""
    text = _fold(message)
    dangerous_patterns = (
        r"\bfran", r"\bbrake\b", r"\bacceler", r"\bacceleration\b",
        r"\bdirectia (?:volanului|masinii)\b", r"\b(?:direcția|direcţia) (?:volanului|mașinii|masinii)\b",
        r"\b(?:steer|steering)\b", r"\b(?:change|alter|control) (?:the )?(?:direction|steering)\b",
        r"\b(?:direction|steering) (?:of )?(?:the )?(?:car|vehicle)\b", r"\bcar direction\b", r"\bvehicle direction\b",
        r"\bcruise control\b", r"\bpilot automat\b", r"\bschimbator\b", r"\b(?:change|shift) gear\b",
        r"\b(?:viteza masinii|viteza vehiculului)\b", r"\b(?:vehicle|car) speed\b",
    )
    if any(re.search(pattern, text) for pattern in dangerous_patterns):
        return {
            "action": "unsafe_request",
            "arguments": {},
            "assistant_message": "Nu pot executa comenzi pentru funcțiile de conducere ale autovehiculului.",
        }

    match = re.search(r"(?:temperatura|temperature|grade|degrees|°)\D{0,20}(\d{1,2})", text)
    route_match = re.search(
        r"(?:calculeaza|calculez|vreau|seteaza)?\s*(?:traseul|traseu|ruta)\s+de la\s+(.+?)\s+la\s+(.+?)(?:\s+(?:si|iar|apoi)\s+|$)",
        text,
    )
    if not route_match:
        route_match = re.search(
            r"(?:calculate|plan|set|start|find)?\s*(?:the\s+)?(?:route|trip|journey)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+(?:and|then)\s+|$)",
            text,
        )
    if route_match:
        return {
            "action": "set_navigation_route",
            "arguments": {"origin": route_match.group(1).strip(), "destination": route_match.group(2).strip()},
            "assistant_message": None,
        }

    if match and any(word in text for word in ("temper", "grade", "degree", "cald", "rece", "warm", "cool")):
        return {
            "action": "set_temperature",
            "arguments": {"temperature": int(match.group(1))},
            "assistant_message": None,
        }
    has_airflow_context = any(term in text for term in (
        "fluxul de aer", "directia aerului", "directia fluxului", "aerul spre", "aerul la",
        "airflow", "air flow", "airflow direction", "air flow direction", "air direction", "direct air", "send air", "set air", "air to",
    ))
    if has_airflow_context:
        direction_map = {
            "feet": "feet", "foot": "feet", "footwell": "feet", "feed": "feet", "picioare": "feet",
            "face": "face", "front": "face", "fata": "face",
            "windshield": "windshield", "parbriz": "windshield",
            "mixed": "mixed", "mixt": "mixed",
        }
        direction_pattern = r"\b(face|front|fata|feet|foot|footwell|feed|picioare|windshield|parbriz|mixed|mixt)\b"
        found_directions: list[str] = []
        for direction_match in re.finditer(direction_pattern, text):
            direction = direction_map[direction_match.group(1)]
            if direction not in found_directions:
                found_directions.append(direction)
        if found_directions:
            direction = "mixed" if "mixed" in found_directions else "+".join(found_directions)
            return {
                "action": "set_airflow_direction",
                "arguments": {"airflow_direction": direction},
                "assistant_message": None,
            }
    match = re.search(r"(?:ventilator|viteza aerului|fan|fan speed)\D{0,20}(?:(?:la|pe|to|level)\s*)?(\d)", text)
    if match:
        return {
            "action": "set_fan_speed",
            "arguments": {"fan_speed": int(match.group(1))},
            "assistant_message": None,
        }
    if "porneste muzica" in text or "pune muzica" in text or "start music" in text or "play music" in text:
        return {
            "action": "start_radio",
            "arguments": {},
            "assistant_message": None,
            }
    if "opreste muzica" in text or "pauza muzica" in text or "stop music" in text or "pause music" in text:
        return {"action": "set_media_playback", "arguments": {"playing": False}, "assistant_message": None}
    air_conditioning_on = re.search(
        r"\b(?:porneste|activeaza|deschide|da drumul la)\s+(?:aerul conditionat|aer conditionat|climatizarea|sistemul de climatizare|ac(?:ul|ului)?)\b"
        r"|\bturn on (?:the )?(?:air conditioning|air conditioner|ac)\b",
        text,
    )
    if air_conditioning_on:
        return {"action": "set_air_conditioning", "arguments": {"enabled": True}, "assistant_message": None}
    air_conditioning_off = re.search(
        r"\b(?:opreste|dezactiveaza|inchide)\s+(?:aerul conditionat|aer conditionat|climatizarea|sistemul de climatizare|ac(?:ul|ului)?)\b"
        r"|\bturn off (?:the )?(?:air conditioning|air conditioner|ac)\b",
        text,
    )
    if air_conditioning_off:
        return {"action": "set_air_conditioning", "arguments": {"enabled": False}, "assistant_message": None}
    if "opreste incalzirea volanului" in text or "turn off steering wheel heating" in text:
        return {"action": "set_steering_wheel_heating", "arguments": {"enabled": False}, "assistant_message": None}
    if "porneste incalzirea volanului" in text or "incalzeste volanul" in text or "turn on steering wheel heating" in text or "heat the steering wheel" in text:
        return {"action": "set_steering_wheel_heating", "arguments": {"enabled": True}, "assistant_message": None}
    ambient_lights_off = re.search(
        r"\b(?:opreste|dezactiveaza|stinge|inchide)\s+(?:lumina|luminile)\s+ambient(?:ale|a)?\b"
        r"|\b(?:turn off|switch off|disable)\s+(?:the )?ambient lights?\b",
        text,
    )
    if ambient_lights_off:
        return {"action": "set_ambient_lights", "arguments": {"enabled": False}, "assistant_message": None}
    ambient_lights_on = re.search(
        r"\b(?:porneste|activeaza|aprinde|deschide)\s+(?:lumina|luminile)\s+ambient(?:ale|a)?\b"
        r"|\b(?:turn on|switch on|enable)\s+(?:the )?ambient lights?\b",
        text,
    )
    if ambient_lights_on:
        return {"action": "set_ambient_lights", "arguments": {"enabled": True}, "assistant_message": None}
    intensity_match = re.search(r"(?:intensitatea|luminozitatea|luminoase)\D{0,20}(\d{1,3})", text)
    if intensity_match and any(word in text for word in ("lumina", "lumini", "light", "lights", "ambient", "intens", "intensity", "lumino")):
        return {
            "action": "set_ambient_intensity",
            "arguments": {"ambient_intensity": int(intensity_match.group(1))},
            "assistant_message": None,
        }
    colors = {
        "rosu": "red", "rosie": "red", "rosii": "red",
        "albastru": "blue", "albastra": "blue", "albastre": "blue",
        "verde": "green", "verzi": "green",
        "alb": "white", "alba": "white", "albe": "white",
        "mov": "purple", "violet": "purple", "galben": "yellow", "galbene": "yellow",
        "red": "red", "blue": "blue", "green": "green", "white": "white", "purple": "purple", "yellow": "yellow",
        "cyan": "cyan","turcoaz": "cyan",
    }  
    for spoken_color, color in colors.items():
        if re.search(rf"\b{re.escape(spoken_color)}\b", text) and any(word in text for word in ("lumina", "lumini", "light", "lights", "ambient", "culoare", "color", "colour")):
            return {"action": "set_ambient_color", "arguments": {"ambient_color": color}, "assistant_message": None}
    if "urmatoarea melodie" in text or "urmatoarea piesa" in text or "next track" in text or "next song" in text:
        return {"action": "next_track", "arguments": {}, "assistant_message": None}
    if "melodia anterioara" in text or "piesa anterioara" in text or "previous track" in text or "previous song" in text:
        return {"action": "previous_track", "arguments": {}, "assistant_message": None}
    if "schimba postul" in text or "schimba radioul" in text or "change station" in text or "change radio station" in text:
        return {"action": "change_radio_station", "arguments": {}, "assistant_message": None}
    if "porneste radio" in text or "deschide radio" in text or "porneste radioul" in text or "deschide radioul" in text or "start radio" in text or "turn on radio" in text:
        return {"action": "start_radio", "arguments": {}, "assistant_message": None}
    if "opreste radio" in text or "opreste radioul" in text or "stop radio" in text or "turn off radio" in text:
        return {"action": "set_media_playback", "arguments": {"playing": False}, "assistant_message": None}
    return None


def interpret_commands(message: str, client: OpenAI | None = None, locale: str = "ro") -> list[dict[str, Any]]:
    """Interpretează fiecare comandă dintr-o frază, păstrând execuția independentă."""
    # Păstrează listele de direcții precum „față și picioare” într-o singură comandă.
    parts = re.split(
        r"\s+(?:\u0219i|\u021bi|iar|apoi|and|then)\s+(?!(?:face|front|fata|feet|foot|footwell|feed|picioare|windshield|parbriz|mixed|mixt)\b)"
        r"|[,;]\s*(?=(?:seteaza|set|porneste|opreste|activeaza|dezactiveaza|turn|switch|start|stop|play|pause|change|increase|decrease)\b)",
        message,
        flags=re.IGNORECASE,
    )
    results = []
    for part in (item.strip() for item in parts if item.strip()):
        results.append(interpret_command(part, client=client, locale=locale))
    return results or [{"action": "no_action", "arguments": {}, "assistant_message": None}]


def create_openai_client() -> OpenAI:
    config.validate_environment()
    return OpenAI(api_key=config.OPENAI_API_KEY)


def interpret_command(message: str, client: OpenAI | None = None, locale: str = "ro") -> dict[str, Any]:
    local_result = local_interpret_command(message)
    if local_result:
        return local_result
    client = client or create_openai_client()
    response = client.chat.completions.create(
        model=config.OPENAI_CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT + ("\nThe user's command may be in English. Interpret it naturally and use the available function tools; do not translate the command literally." if locale == "en" else "")},
            {"role": "user", "content": message},
        ],
        tools=COMMAND_TOOLS,
        tool_choice="required",
        temperature=0,
    )

    assistant_message = response.choices[0].message
    if not assistant_message.tool_calls:
        return {
            "action": "no_action",
            "arguments": {},
            "assistant_message": assistant_message.content or "Nu am înțeles comanda.",
        }

    tool_call = assistant_message.tool_calls[0]
    action = tool_call.function.name
    arguments = json.loads(tool_call.function.arguments or "{}")
    # „pasageri/pasagerilor” este o țintă colectivă: față și toate locurile din spate.
    folded_message = _fold(message)
    if action in {"set_seat_heating", "set_seat_ventilation"} and re.search(r"\bpasager(?:i|ilor)\b", folded_message):
        arguments["seat"] = "all_passengers"
    return {
        "action": action,
        "arguments": arguments,
        "assistant_message": None,
    }

