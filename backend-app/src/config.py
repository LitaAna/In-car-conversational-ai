import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PROFILES_PATH = DATA_DIR / "profiles.json"

load_dotenv(BASE_DIR / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
OPENAI_STT_MODEL = os.getenv("OPENAI_STT_MODEL", "whisper-1")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1")
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "coral")
OPENAI_TTS_VOICE_RO = os.getenv("OPENAI_TTS_VOICE_RO", OPENAI_TTS_VOICE)
OPENAI_TTS_VOICE_EN = os.getenv("OPENAI_TTS_VOICE_EN", OPENAI_TTS_VOICE)
# Local development default. Set DATABASE_URL in the environment to override it.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/in_car_ai",
)
RADIO_STATIONS = [
    {"name": "Kiss FM", "url": "https://live.kissfm.ro/kissfm.aacp", "format": "audio/aac"},
    {"name": "Magic FM", "url": "https://live.magicfm.ro/magicfm.aacp", "format": "audio/aac"},
]


def validate_environment() -> None:
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "Lipsește OPENAI_API_KEY. Creează fișierul .env și adaugă cheia API."
        )
