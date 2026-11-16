from typing import Any, Literal

Locale = Literal["ro", "en"]

MESSAGES: dict[Locale, dict[str, str]] = {
    "ro": {
        "assistant.confirm.temperature": "Am setat temperatura la {value}°C.",
        "assistant.confirm.fan": "Am setat ventilatorul la nivelul {value}.",
        "assistant.confirm.airflow": "Am setat direcția aerului către {value}.",
        "assistant.confirm.airConditioning": "Aerul condiționat este {state}.",
        "assistant.confirm.ambientColor": "Am schimbat culoarea iluminării ambientale în {value}.",
        "assistant.confirm.ambientLights": "Luminile ambientale sunt {state}.",
        "assistant.confirm.ambientIntensity": "Intensitatea iluminării ambientale este {value}%.",
        "assistant.confirm.volume": "Am setat volumul la {value}%.",
        "assistant.confirm.radio": "Postul radio {value} este pornit.",
        "assistant.confirm.playback": "Redarea este {state}.",
        "assistant.confirm.station": "Am schimbat postul radio la {value}.",
        "assistant.confirm.generic": "Comanda a fost executată.",
        "state.on": "pornit",
        "state.off": "oprit",
        "state.playing": "pornită",
        "state.paused": "oprită",
    },
    "en": {
        "assistant.confirm.temperature": "Temperature set to {value}°C.",
        "assistant.confirm.fan": "Fan speed set to level {value}.",
        "assistant.confirm.airflow": "Airflow directed to {value}.",
        "assistant.confirm.airConditioning": "Air conditioning is {state}.",
        "assistant.confirm.ambientColor": "Ambient lighting color changed to {value}.",
        "assistant.confirm.ambientLights": "Ambient lights are {state}.",
        "assistant.confirm.ambientIntensity": "Ambient lighting intensity is {value}%.",
        "assistant.confirm.volume": "Volume set to {value}%.",
        "assistant.confirm.radio": "Radio station {value} is playing.",
        "assistant.confirm.playback": "Playback is {state}.",
        "assistant.confirm.station": "Radio station changed to {value}.",
        "assistant.confirm.generic": "Command executed.",
        "state.on": "on",
        "state.off": "off",
        "state.playing": "playing",
        "state.paused": "paused",
    },
}

AUTH_MESSAGES: dict[Locale, dict[str, str]] = {
    "ro": {
        "invalid_email": "Introdu o adresă de email validă.",
        "short_password": "Parola trebuie să aibă cel puțin 8 caractere.",
        "password_mismatch": "Parolele nu coincid.",
        "duplicate_email": "Există deja un cont cu acest email.",
        "invalid_credentials": "Emailul sau parola sunt incorecte.",
        "unauthorized": "Autentificarea este necesară.",
    },
    "en": {
        "invalid_email": "Enter a valid email address.",
        "short_password": "Password must contain at least 8 characters.",
        "password_mismatch": "Passwords do not match.",
        "duplicate_email": "An account with this email already exists.",
        "invalid_credentials": "Incorrect email or password.",
        "unauthorized": "Authentication is required.",
    },
}


def auth_message(locale: Locale, key: str) -> str:
    return AUTH_MESSAGES[locale].get(key, AUTH_MESSAGES["ro"][key])


def localize_result(result: dict[str, Any], locale: Locale) -> dict[str, Any]:
    key = str(result.get("message_key") or "assistant.confirm.generic")
    if result.get("status") != "implemented":
        key = "assistant.confirm.generic"
    params = dict(result.get("message_params") or {})
    for name in ("state",):
        value = params.get(name)
        if isinstance(value, str) and value in MESSAGES[locale]:
            params[name] = MESSAGES[locale][value]
    template = MESSAGES[locale].get(key, MESSAGES["ro"]["assistant.confirm.generic"])
    safe_params = {name: str(value) for name, value in params.items()}
    result["message"] = template.format_map(DefaultFormatMap(safe_params))
    result["locale"] = locale
    return result


class DefaultFormatMap(dict[str, str]):
    def __missing__(self, key: str) -> str:
        return ""
