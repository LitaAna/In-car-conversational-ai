import unittest

from backend.localization import auth_message, localize_result
from src.command_engine import local_interpret_command


class LocalizationContractTests(unittest.TestCase):
    def test_result_is_localized_without_changing_stable_keys(self):
        result = {
            "status": "implemented",
            "message_key": "assistant.confirm.temperature",
            "message_params": {"value": 22},
        }

        english = localize_result(dict(result), "en")
        romanian = localize_result(dict(result), "ro")

        self.assertEqual(english["message"], "Temperature set to 22°C.")
        self.assertEqual(romanian["message"], "Am setat temperatura la 22°C.")
        self.assertEqual(english["message_key"], romanian["message_key"])
        self.assertEqual(english["locale"], "en")
        self.assertEqual(romanian["locale"], "ro")

    def test_state_parameters_are_translated(self):
        result = {
            "status": "implemented",
            "message_key": "assistant.confirm.airConditioning",
            "message_params": {"state": "state.on"},
        }
        self.assertEqual(localize_result(dict(result), "en")["message"], "Air conditioning is on.")
        self.assertEqual(localize_result(dict(result), "ro")["message"], "Aerul condiționat este pornit.")

    def test_auth_messages_have_both_locales(self):
        self.assertEqual(auth_message("en", "invalid_credentials"), "Incorrect email or password.")
        self.assertEqual(auth_message("ro", "invalid_credentials"), "Emailul sau parola sunt incorecte.")

    def test_english_transcripts_are_handled_without_llm_fallback(self):
        cases = {
            "set temperature to 23": ("set_temperature", {"temperature": 23}),
            "set fan speed to level 3": ("set_fan_speed", {"fan_speed": 3}),
            "turn on air conditioning": ("set_air_conditioning", {"enabled": True}),
            "set ambient light color to red": ("set_ambient_color", {"ambient_color": "red"}),
            "play music": ("start_radio", {}),
        }
        for transcript, (action, arguments) in cases.items():
            with self.subTest(transcript=transcript):
                command = local_interpret_command(transcript)
                self.assertIsNotNone(command)
                self.assertEqual(command["action"], action)
                self.assertEqual(command["arguments"], arguments)


if __name__ == "__main__":
    unittest.main()
