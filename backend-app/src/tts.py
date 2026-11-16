"""Răspunsuri audio scurte pentru comenzile asistentului."""

from openai import OpenAI
from typing import Literal

from . import config


def synthesize_speech(text: str, client: OpenAI, locale: Literal["ro", "en"] = "ro") -> bytes:
    response = client.audio.speech.create(
        model=config.OPENAI_TTS_MODEL,
        voice=config.OPENAI_TTS_VOICE_RO if locale == "ro" else config.OPENAI_TTS_VOICE_EN,
        input=text[:500],
        response_format="mp3",
    )
    return response.read() if hasattr(response, "read") else response.content
