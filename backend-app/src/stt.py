"""Speech-to-text pentru comenzile vocale în limba română."""

import io
from typing import Literal

from openai import OpenAI

from . import config


def transcribe_audio(file_bytes: bytes, filename: str, client: OpenAI, locale: Literal["ro", "en"] | None = None) -> str:
    result = transcribe_audio_details(file_bytes, filename, client, locale)
    return result["text"]


def transcribe_audio_details(
    file_bytes: bytes, filename: str, client: OpenAI, locale: Literal["ro", "en"] | None = None
) -> dict[str, str]:
    audio_file = io.BytesIO(file_bytes)
    audio_file.name = filename or "recording.webm"
    transcription_options = {
        "model": config.OPENAI_STT_MODEL,
        "file": audio_file,
        "response_format": "verbose_json",
    }
    if locale:
        transcription_options["language"] = locale
    transcript = client.audio.transcriptions.create(
        **transcription_options,
    )
    return {
        "text": transcript.text.strip(),
        "language": getattr(transcript, "language", "") or "",
    }
