COMMAND_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "set_navigation_route",
            "description": "Calculează o rută între două locații. Folosește această funcție pentru orice comandă de tip traseu/rută, înaintea comenzilor media din aceeași frază.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string"},
                    "destination": {"type": "string"},
                },
                "required": ["origin", "destination"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_temperature",
            "description": "Setează temperatura cabinei în grade Celsius.",
            "parameters": {
                "type": "object",
                "properties": {"temperature": {"type": "integer"}},
                "required": ["temperature"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_fan_speed",
            "description": "Setează viteza ventilatorului între 0 și 5.",
            "parameters": {
                "type": "object",
                "properties": {"fan_speed": {"type": "integer"}},
                "required": ["fan_speed"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_airflow_direction",
            "description": "Setează direcția fluxului de aer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "airflow_direction": {
                        "type": "string",
                        "enum": ["face", "feet", "windshield", "mixed"],
                    }
                },
                "required": ["airflow_direction"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_air_conditioning",
            "description": "Pornește sau oprește aerul condiționat.",
            "parameters": {
                "type": "object",
                "properties": {"enabled": {"type": "boolean"}},
                "required": ["enabled"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_steering_wheel_heating",
            "description": "Pornește sau oprește încălzirea volanului; nu controlează direcția volanului.",
            "parameters": {
                "type": "object",
                "properties": {"enabled": {"type": "boolean"}},
                "required": ["enabled"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_seat_heating",
            "description": "Setează încălzirea scaunului pe un nivel între 0 și 3.",
            "parameters": {
                "type": "object",
                "properties": {
                    "seat": {
                        "type": "string",
                        "enum": ["driver", "front_passenger", "rear_left_passenger", "rear_right_passenger", "all_passengers"],
                    },
                    "level": {"type": "integer"},
                },
                "required": ["seat", "level"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_seat_ventilation",
            "description": "Pornește sau oprește ventilația scaunului.",
            "parameters": {
                "type": "object",
                "properties": {
                    "seat": {
                        "type": "string",
                        "enum": ["driver", "front_passenger", "rear_left_passenger", "rear_right_passenger", "all_passengers"],
                    },
                    "enabled": {"type": "boolean"},
                },
                "required": ["seat", "enabled"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_seat_ventilation_level",
            "description": "Setează nivelul ventilației scaunului între 0 și 3.",
            "parameters": {
                "type": "object",
                "properties": {
                    "seat": {
                        "type": "string",
                        "enum": ["driver", "front_passenger", "rear_left_passenger", "rear_right_passenger", "all_passengers"],
                    },
                    "level": {"type": "integer"},
                },
                "required": ["seat", "level"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_ambient_color",
            "description": "Setează culoarea luminilor ambientale.",
            "parameters": {
                "type": "object",
                "properties": {"ambient_color": {"type": "string"}},
                "required": ["ambient_color"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_ambient_lights",
            "description": "Pornește sau oprește luminile ambientale fără să modifice intensitatea memorată.",
            "parameters": {
                "type": "object",
                "properties": {"enabled": {"type": "boolean"}},
                "required": ["enabled"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_ambient_intensity",
            "description": "Setează intensitatea luminilor ambientale între 0 și 100.",
            "parameters": {
                "type": "object",
                "properties": {"ambient_intensity": {"type": "integer"}},
                "required": ["ambient_intensity"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_ambient_zone_color",
            "description": "Setează culoarea luminilor ambientale pentru o zonă.",
            "parameters": {
                "type": "object",
                "properties": {
                    "zone": {"type": "string", "enum": ["driver", "front_passenger", "rear"]},
                    "ambient_color": {"type": "string"},
                },
                "required": ["zone", "ambient_color"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_ambient_zone_intensity",
            "description": "Setează intensitatea luminilor ambientale pentru o zonă între 0 și 100.",
            "parameters": {
                "type": "object",
                "properties": {
                    "zone": {"type": "string", "enum": ["driver", "front_passenger", "rear"]},
                    "ambient_intensity": {"type": "integer"},
                },
                "required": ["zone", "ambient_intensity"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_audio_volume",
            "description": "Setează volumul audio între 0 și 100 fără a porni muzica.",
            "parameters": {
                "type": "object",
                "properties": {"audio_volume": {"type": "integer"}},
                "required": ["audio_volume"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_media_source",
            "description": "Selectează sursa media fără a porni redarea.",
            "parameters": {
                "type": "object",
                "properties": {
                    "media_source": {
                        "type": "string",
                        "enum": ["none", "radio", "bluetooth", "local"],
                    }
                },
                "required": ["media_source"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_media_playback",
            "description": "Pornește sau oprește redarea media.",
            "parameters": {
                "type": "object",
                "properties": {"playing": {"type": "boolean"}},
                "required": ["playing"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "next_track",
            "description": "Trece la următoarea piesă din playerul local demonstrativ.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "previous_track",
            "description": "Revine la piesa anterioară din playerul local demonstrativ.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "start_radio",
            "description": "Pornește postul de radio demonstrativ local.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "change_radio_station",
            "description": "Schimba postul de radio la urmatorul post configurat.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "identify_profile",
            "description": "Identifică un profil după numele rostit de utilizator.",
            "parameters": {
                "type": "object",
                "properties": {"profile_name": {"type": "string"}},
                "required": ["profile_name"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_profile",
            "description": "Creează un profil nou folosind valorile curente ale cabinei.",
            "parameters": {
                "type": "object",
                "properties": {"profile_name": {"type": "string"}},
                "required": ["profile_name"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_profile_preset",
            "description": "Actualizează una sau mai multe preferințe memorate ale unui profil.",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile_name": {"type": "string"},
                    "temperature": {"type": ["integer", "null"]},
                    "fan_speed": {"type": ["integer", "null"]},
                    "airflow_direction": {"type": ["string", "null"]},
                    "ambient_color": {"type": ["string", "null"]},
                    "ambient_intensity": {"type": ["integer", "null"]},
                    "audio_volume": {"type": ["integer", "null"]},
                },
                "required": [
                    "profile_name",
                    "temperature",
                    "fan_speed",
                    "airflow_direction",
                    "ambient_color",
                    "ambient_intensity",
                    "audio_volume",
                ],
                "additionalProperties": False,
            },
        },
    },
]
