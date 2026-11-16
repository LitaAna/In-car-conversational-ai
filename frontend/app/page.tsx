"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "./i18n/context";
import {
  Armchair,
  ArrowDown,
  ArrowUp,
  CarFront,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Clock3,
  Fan,
  Lightbulb,
  Mic,
  Moon,
  Music2,
  Pause,
  Play,
  Radio,
  Settings2,
  Shuffle,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Sun,
  Thermometer,
  UserRound,
  Volume2,
  Wind,
  Power,
  Plus,
  Minus,
  SkipBack,
  SkipForward,
  ShipWheel,
  MapPinned,
} from "lucide-react";
const MapPanel = dynamic(() => import("./MapPanel"), { ssr: false });

type Activity = {
  icon: ReactNode;
  text: string;
  time: string;
  kind?: "volume";
};

type Profile = {
  profile_name: string;
  preset: {
    temperature: number;
    fan_speed: number;
    airflow_direction: string;
    ambient_color: string;
    ambient_intensity: number;
    audio_volume: number;
  };
};

type NavigationPreview = {
  active: boolean;
  destination: string;
  distanceKm: number;
  remainingKm: number;
  totalDuration: string;
  status: string;
  remainingTime: string;
  durationSeconds?: number;
  startedAt?: number | null;
  simulationState?: "idle" | "running" | "paused" | "finished";
};

const colors = [
  { name: "cyan", className: "bg-cyan-400" },
  { name: "blue", className: "bg-blue-500" },
  { name: "purple", className: "bg-purple-500" },
  { name: "green", className: "bg-emerald-400" },
  { name: "yellow", className: "bg-yellow-300" },
];

const radioStations = [
  { name: "Kiss FM", url: "https://live.kissfm.ro/kissfm.aacp" },
  { name: "Magic FM", url: "https://live.magicfm.ro/magicfm.aacp" },
];

const ambientThemes: Record<
  string,
  { accent: string; soft: string; glow: string }
> = {
  red: {
    accent: "#ef4444",
    soft: "rgba(239, 68, 68, 0.12)",
    glow: "rgba(239, 68, 68, 0.35)",
  },
  blue: {
    accent: "#3b82f6",
    soft: "rgba(59, 130, 246, 0.12)",
    glow: "rgba(59, 130, 246, 0.35)",
  },
  purple: {
    accent: "#a855f7",
    soft: "rgba(168, 85, 247, 0.12)",
    glow: "rgba(168, 85, 247, 0.35)",
  },
  green: {
    accent: "#10b981",
    soft: "rgba(16, 185, 129, 0.12)",
    glow: "rgba(16, 185, 129, 0.35)",
  },
  yellow: {
    accent: "#facc15",
    soft: "rgba(250, 204, 21, 0.12)",
    glow: "rgba(250, 204, 21, 0.35)",
  },
  white: {
    accent: "#e2e8f0",
    soft: "rgba(226, 232, 240, 0.12)",
    glow: "rgba(226, 232, 240, 0.3)",
  },
  cyan: {
  accent: "#22d3ee",
  soft: "rgba(34, 211, 238, 0.12)",
  glow: "rgba(34, 211, 238, 0.35)",
},
};

const API_URL = "http://localhost:8000";

function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, { ...options, credentials: "include" });
}

function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        {icon}
        {title}
      </div>
      {action && <span className="text-xs text-slate-500">{action}</span>}
    </div>
  );
}

function SmallButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-cyan-300"
    >
      {children}
    </button>
  );
}

function CarSeatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <path d="M24 9c-4 0-7 3-7 7v18c0 5 3 8 8 8h13l6 11h8L43 37V17c0-5-3-8-8-8H24Z" fill="currentColor" opacity=".22" />
      <path d="M24 9c-4 0-7 3-7 7v18c0 5 3 8 8 8h13l6 11h8L43 37V17c0-5-3-8-8-8H24Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 35h21c4 0 7 2 9 6l5 12H20c-6 0-9-4-9-9 0-5 2-9 7-9Z" fill="currentColor" opacity=".14" />
      <path d="M18 35h21c4 0 7 2 9 6l5 12H20c-6 0-9-4-9-9 0-5 2-9 7-9Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M13 53h45M24 13v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SteeringWheelIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="32" r="7" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 29c7-4 13-6 20-6s13 2 20 6M32 25v7M19 45l9-11M45 45l-9-11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 22l-4-4M51 22l4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function HeatingIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M7 4c3 3-2 5 1 8s-2 5 1 8M12 4c3 3-2 5 1 8s-2 5 1 8M17 4c3 3-2 5 1 8s-2 5 1 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function VentilationIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 12c0-4 2-7 5-7 2 0 3 1 3 3 0 3-4 4-8 4ZM12 12c4 0 7 2 7 5 0 2-1 3-3 3-3 0-4-4-4-8ZM12 12c0 4-2 7-5 7-2 0-3-1-3-3 0-3 4-4 8-4ZM12 12c-4 0-7-2-7-5 0-2 1-3 3-3 3 0 4 4 4 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function Dashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { locale, t, setLocale, formatTime, formatDate } = useI18n();
  const [temperature, setTemperature] = useState(22);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [airflowDirection, setAirflowDirection] = useState("face");
  const [airRecirculationEnabled, setAirRecirculationEnabled] = useState(false);
  const [ambientIntensity, setAmbientIntensity] = useState(70);
  const [ambientLightsOn, setAmbientLightsOn] = useState(true);
  const [volume, setVolume] = useState(40);
  const [isPlaying, setIsPlaying] = useState(false);
  const [airConditioning, setAirConditioning] = useState(true);
  const [steeringWheelHeating, setSteeringWheelHeating] = useState(false);
  const [seatHeating, setSeatHeating] = useState<Record<string, number>>({});
  const [seatVentilation, setSeatVentilation] = useState<Record<string, boolean>>({});
  const [seatVentilationLevel, setSeatVentilationLevel] = useState<Record<string, number>>({});
  const [vehicleStatus, setVehicleStatus] = useState<"parked" | "moving">("parked");
  const [listening, setListening] = useState(false);
  const [command, setCommand] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [ambientColor, setAmbientColor] = useState("blue");
  const [ambientZones, setAmbientZones] = useState<Record<string, { color: string; intensity: number }>>({});
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(true);
  const [colorTheme, setColorTheme] = useState<"dark" | "light">("dark");
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [radioStation, setRadioStation] = useState(radioStations[0]);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState<Profile["preset"]>({
    temperature: 22,
    fan_speed: 2,
    airflow_direction: "face",
    ambient_color: "white",
    ambient_intensity: 50,
    audio_volume: 30,
  });
  const [profileName, setProfileName] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [navigationPreview, setNavigationPreview] = useState<NavigationPreview | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const speechAudioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cancelRecordingRef = useRef(false);
  const volumeUpdateTimerRef = useRef<number | null>(null);
  
  const theme =
  ambientThemes[ambientColor] ?? ambientThemes.blue;
  const tabVisible = (tab: string) => activeTab === "home" || activeTab === tab;

  useEffect(() => {
    const savedPreference = window.localStorage.getItem("voiceAssistantEnabled");
    if (savedPreference !== null) {
      setVoiceAssistantEnabled(savedPreference === "true");
    }
  }, []);

  useEffect(() => {
    const readNavigationPreview = () => {
      try {
        const stored = window.localStorage.getItem("in-car-navigation-preview");
        const parsed = stored ? JSON.parse(stored) as NavigationPreview : null;
        if (parsed?.simulationState === "running" && parsed.startedAt && parsed.durationSeconds) {
          const elapsedSeconds = Math.floor((Date.now() - parsed.startedAt) / 1000);
          parsed.remainingKm = parsed.distanceKm * Math.max(0, 1 - elapsedSeconds / parsed.durationSeconds);
          if (elapsedSeconds >= parsed.durationSeconds) parsed.status = "Cursă finalizată";
        }
        setNavigationPreview(parsed);
      } catch {
        setNavigationPreview(null);
      }
    };
    readNavigationPreview();
    window.addEventListener("car-navigation-update", readNavigationPreview);
    const timer = window.setInterval(readNavigationPreview, 1000);
    return () => {
      window.removeEventListener("car-navigation-update", readNavigationPreview);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("colorTheme");
    if (savedTheme === "light" || savedTheme === "dark") setColorTheme(savedTheme);
  }, []);

  function changeColorTheme(nextTheme: "dark" | "light") {
    setColorTheme(nextTheme);
    window.localStorage.setItem("colorTheme", nextTheme);
  }

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(formatTime(now, { hour: "2-digit", minute: "2-digit" }));
      setCurrentDate(formatDate(now, { weekday: "short", day: "2-digit", month: "short" }));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [formatDate, formatTime]);

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const response = await apiFetch("/api/profiles");
      if (response.ok) setProfiles(await response.json());
    } catch (error) {
      console.error("Nu pot încărca profilurile:", error);
    }
  }

  function openProfilePanel() {
    setProfilePanelOpen((open) => !open);
    void loadProfiles();
  }

  function startNewProfile() {
    setEditingProfile(null);
    setProfileFormOpen(true);
    setProfileName("");
    setProfileForm({ temperature, fan_speed: fanSpeed, airflow_direction: "face", ambient_color: ambientColor, ambient_intensity: ambientIntensity, audio_volume: volume });
  }

  function editProfile(profile: Profile) {
    setEditingProfile(profile);
    setProfileFormOpen(true);
    setProfileName(profile.profile_name);
    setProfileForm(profile.preset);
  }

  async function saveProfile() {
    if (!profileName.trim()) return;
    const url = editingProfile
      ? `http://localhost:8000/api/profiles/${encodeURIComponent(editingProfile.profile_name)}`
      : "http://localhost:8000/api/profiles";
    const response = await apiFetch(url.replace(API_URL, ""), {
      method: editingProfile ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_name: profileName, preset: profileForm }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || result.message || "Profilul nu a putut fi salvat.");
    applyCabinState(result.cabin_state);
    setActiveProfile(result.active_profile);
    addActivity(result.message, <UserRound size={15} />);
    setEditingProfile(null);
    setProfileFormOpen(false);
    await loadProfiles();
  }

  function playConfirmationSound() {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
    oscillator.addEventListener("ended", () => void context.close());
  }

  function detectLanguage(text: string): "ro" | "en" {
    const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const romanianWords = normalized.match(/\b(seteaza|temperatura|grade|porneste|opreste|lumini|ventilator|aerul|culoarea|intensitatea|muzica|radioul|scaun|sofer|pasager|flux|directia|fata|picioare|parbriz|mixt|la|schimba|limba|romana|engleza)\b/g) ?? [];
    const englishWords = normalized.match(/\b(set|turn|switch|change|language|english|romanian|temperature|degrees|fan|air|conditioning|airflow|flow|direction|face|feet|windshield|mixed|lights|light|color|colour|intensity|music|radio|start|stop|volume|seat|driver|passenger|to|the)\b/g) ?? [];
    return englishWords.length > romanianWords.length ? "en" : "ro";
  }

  function isLanguageCommand(text: string): boolean {
    const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /\b(?:schimba|change|switch)\b.*\b(?:limba|language)\b|\b(?:limba|language)\b.*\b(?:romana|romanian|engleza|english)\b/.test(normalized);
  }

  function confirmationText(result: any, language: "ro" | "en" = locale): string {
    if (result?.last_command?.action === "unsafe_request") return result.message;
    if (Array.isArray(result?.executed_commands) && result.executed_commands.length > 1) {
      return result.message || result.messages?.join(" ") || (language === "en" ? "Commands executed." : "Comenzile au fost executate.");
    }
    const action = result?.last_command?.action;
    const values = result?.last_command?.actual_values ?? {};
    const state = result?.cabin_state ?? {};

    if (language === "en") {
      switch (action) {
        case "set_temperature":
          return `I set the temperature to ${values.temperature ?? state.temperature} degrees Celsius.`;
        case "set_fan_speed":
          return `I set the fan to level ${values.fan_speed ?? state.fan_speed}.`;
        case "set_airflow_direction":
          return `I directed the airflow to ${values.airflow_direction ?? state.airflow_direction}.`;
        case "set_air_conditioning":
          return `I ${values.enabled ?? state.air_conditioning ? "turned on" : "turned off"} the air conditioning.`;
        case "set_ambient_color":
          return `I set the ambient lights to ${values.ambient_color ?? state.ambient_color}.`;
        case "set_ambient_lights":
          return `I ${values.enabled ?? state.ambient_lights_on ? "turned on" : "turned off"} the ambient lights.`;
        case "set_ambient_intensity":
          return `I set the ambient light intensity to ${values.ambient_intensity ?? state.ambient_intensity} percent.`;
        case "set_audio_volume":
          return `I set the volume to ${values.audio_volume ?? state.audio_volume} percent.`;
        case "start_radio":
          return "I turned on the radio.";
        case "set_media_playback":
          return values.playing ? "I started the music." : "I stopped the music.";
        case "change_radio_station":
          return `I changed the station to ${values.radio_station ?? state.radio_station}.`;
        default:
          return "I completed the requested action.";
      }
    }

    switch (action) {
      case "set_temperature":
        return `Am setat temperatura la ${values.temperature ?? state.temperature} grade Celsius.`;
      case "set_fan_speed":
        return `Am setat ventilatorul la nivelul ${values.fan_speed ?? state.fan_speed}.`;
      case "set_airflow_direction":
        return `Am direcționat aerul către ${values.airflow_direction ?? state.airflow_direction}.`;
      case "set_air_conditioning":
        return `Am ${values.enabled ?? state.air_conditioning ? "pornit" : "oprit"} aerul condiționat.`;
      case "set_ambient_color":
        return `Am setat luminile ambientale pe ${values.ambient_color ?? state.ambient_color}.`;
      case "set_ambient_lights":
        return `Am ${values.enabled ?? state.ambient_lights_on ? "aprins" : "oprit"} luminile ambientale.`;
      case "set_ambient_intensity":
        return `Am setat intensitatea luminilor la ${values.ambient_intensity ?? state.ambient_intensity} la sută.`;
      case "set_audio_volume":
        return `Am setat volumul la ${values.audio_volume ?? state.audio_volume} la sută.`;
      case "start_radio":
        return `Am pornit radioul${values.radio_station ? ` pe postul ${values.radio_station}` : ""}.`;
      case "set_media_playback":
        return values.playing ? "Am pornit muzica." : "Am oprit muzica.";
      case "change_radio_station":
        return `Am schimbat postul pe ${values.radio_station ?? state.radio_station}.`;
      default:
        return result?.message || "Am realizat acțiunea solicitată.";
    }
  }

  async function announceResult(result: any, language: "ro" | "en" = locale) {
    if (result?.status !== "implemented" && result?.last_command?.action !== "unsafe_request") return;
    const text = confirmationText(result, language);
    const isSafetyRefusal = result?.last_command?.action === "unsafe_request";

    // Oprește imediat un răspuns anterior, ca două limbi/audio-uri să nu se audă simultan.
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current.currentTime = 0;
    }

    if (!voiceAssistantEnabled && !isSafetyRefusal) {
      playConfirmationSound();
      return;
    }

    try {
      const response = await apiFetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale: language }),
      });
      if (!response.ok) throw new Error("TTS indisponibil");

      const audioUrl = URL.createObjectURL(await response.blob());
      if (speechAudioRef.current) {
        speechAudioRef.current.pause();
        speechAudioRef.current.src = audioUrl;
        speechAudioRef.current.onended = () => URL.revokeObjectURL(audioUrl);
        await speechAudioRef.current.play();
      }
    } catch (error) {
      console.error("Răspunsul vocal nu poate fi redat:", error);
      playConfirmationSound();
    }
  }

  useEffect(() => {
  apiFetch("/api/state")
    .then((response) => response.json())
    .then((data) => {
      applyCabinState(data);
    })
    .catch((error) => {
      console.error("Backend indisponibil:", error);
    });
}, []);

useEffect(() => {
  if (audioRef.current) {
    audioRef.current.volume = volume / 100;
  }
}, [volume]);

useEffect(() => {
  if (!audioRef.current) return;
  if (isPlaying) {
    audioRef.current.play().catch((error) => {
      console.error("Radioul nu poate fi redat:", error);
    });
  } else {
    audioRef.current.pause();
  }
}, [isPlaying, radioStation]);

function changeRadioStation(direction: 1 | -1) {
  audioRef.current?.pause();
  const currentIndex = radioStations.findIndex((station) => station.name === radioStation.name);
  const nextIndex = (currentIndex + direction + radioStations.length) % radioStations.length;
  setRadioStation(radioStations[nextIndex]);
  setIsPlaying(true);
  void sendAction("set_media_source", { media_source: "radio" });
}

  const [activity, setActivity] = useState<Activity[]>([
    {
      icon: <Thermometer size={15} />,
      text: locale === "ro" ? "Temperatura setată la 22°C" : "Temperature set to 22°C",
      time: "17:22",
    },
    {
      icon: <Lightbulb size={15} />,
      text: locale === "ro" ? "Lumini ambientale pornite" : "Ambient lights turned on",
      time: "17:18",
    },
    {
      icon: <Fan size={15} />,
      text: locale === "ro" ? "Ventilatorul setat la nivelul 2" : "Fan set to level 2",
      time: "17:16",
    },
  ]);

  useEffect(() => {
    setActivity((items) => items.map((item) => {
      const text = locale === "ro"
        ? {
            "Temperature set to 22°C": "Temperatura setată la 22°C",
            "Ambient lights turned on": "Lumini ambientale pornite",
            "Fan set to level 2": "Ventilatorul setat la nivelul 2",
          }[item.text] ?? item.text
        : {
            "Temperatura setată la 22°C": "Temperature set to 22°C",
            "Lumini ambientale pornite": "Ambient lights turned on",
            "Ventilatorul setat la nivelul 2": "Fan set to level 2",
          }[item.text] ?? item.text;
      return { ...item, text, time: item.time === "acum" || item.time === "now" ? (locale === "ro" ? "acum" : "now") : item.time };
    }));
  }, [locale]);

  function addActivity(text: string, icon: ReactNode = <Sparkles size={15} />) {
    setActivity((items) => [{ icon, text, time: "acum" }, ...items].slice(0, 5));
  }

  function isMediaStartCommand(result: any): boolean {
    const commands = Array.isArray(result?.executed_commands)
      ? result.executed_commands
      : [result?.last_command];
    return commands.some((command: any) =>
      command?.action === "start_radio" ||
      (command?.action === "set_media_playback" && command?.actual_values?.playing === true)
    );
  }

  function isMediaStartMessage(message: string): boolean {
    const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /\b(?:porneste|aprinde|start|play|turn on|put on)\b.*\b(?:radio|radioul|muzica|music)\b/.test(normalized);
  }

  function addVolumeActivity(result: any) {
    const text = confirmationText(result, locale);
    setActivity((items) => [
      { icon: <Volume2 size={15} />, text, time: "acum", kind: "volume" as const },
      ...items.filter((item) => item.kind !== "volume"),
    ].slice(0, 5));
  }

  function applyCabinState(state: any) {
    if (!state) return;
    setTemperature(state.temperature);
    setFanSpeed(state.fan_speed);
    setAirflowDirection(state.airflow_direction ?? "face");
    setAmbientIntensity(state.ambient_intensity);
    setAmbientLightsOn(state.ambient_lights_on ?? true);
    setVolume(state.audio_volume);
    setIsPlaying(state.media_playing);
    setAirConditioning(state.air_conditioning);
    setSteeringWheelHeating(state.steering_wheel_heating);
    setAmbientColor(state.ambient_color);
    setAmbientZones(state.ambient_zones ?? {});
    setSeatHeating(state.seat_heating ?? {});
    setSeatVentilation(state.seat_ventilation ?? {});
    setSeatVentilationLevel(state.seat_ventilation_level ?? {});
    if (state.vehicle_status === "parked" || state.vehicle_status === "moving") {
      setVehicleStatus(state.vehicle_status);
      window.dispatchEvent(new CustomEvent("vehicle-status-update", { detail: state.vehicle_status }));
    }
  }

  function changeVehicleStatus(status: "parked" | "moving") {
    void sendAction("set_vehicle_status", { status });
  }

  function getSeatStatus(index: number): string {
    const seatKeys = index === 0
      ? ["driver"]
      : index === 1
        ? ["front_passenger"]
        : ["rear_left_passenger", "rear_right_passenger"];
    const heatingLevel = Math.max(
      ...seatKeys.map((seatKey) => seatHeating[seatKey] ?? 0)
    );
    const ventilationOn = seatKeys.some(
      (seatKey) => seatVentilation[seatKey] === true
    );
    const status = [
      heatingLevel > 0 ? `${locale === "ro" ? "Încălzire nivel" : "Heating level"} ${heatingLevel}` : "",
      ventilationOn ? (locale === "ro" ? "Ventilație pornită" : "Ventilation on") : "",
    ].filter(Boolean);
    return status.length > 0 ? status.join(" · ") : (locale === "ro" ? "Disponibil" : "Available");
  }

  function getSeatStatusColor(index: number, fallback: string): string {
    const seatKeys = index === 0
      ? ["driver"]
      : index === 1
        ? ["front_passenger"]
        : ["rear_left_passenger", "rear_right_passenger"];
    if (seatKeys.some((seatKey) => seatVentilation[seatKey] === true)) {
      return "text-blue-300";
    }
    if (seatKeys.some((seatKey) => (seatHeating[seatKey] ?? 0) > 0)) {
      return "text-orange-300";
    }
    return fallback;
  }

  function toggleSeatVentilation(seat: string) {
    void sendAction("set_seat_ventilation", {
      seat,
      enabled: !(seatVentilation[seat] ?? false),
    });
  }

  function changeSeatVentilationLevel(seat: string, level: number) {
    void sendAction("set_seat_ventilation_level", {
      seat,
      level: Math.max(0, Math.min(5, level)),
    });
  }

  function changeSeatHeatingLevel(seat: string, level: number) {
    void sendAction("set_seat_heating", {
      seat,
      level: Math.max(0, Math.min(3, level)),
    });
  }

  function turnOffAllSeatComfort() {
    ["driver", "front_passenger", "rear_left_passenger", "rear_right_passenger"].forEach((seat) => {
      void sendAction("set_seat_heating", { seat, level: 0 });
      void sendAction("set_seat_ventilation_level", { seat, level: 0 });
    });
  }

  function toggleSteeringWheelHeating() {
    void sendAction("set_steering_wheel_heating", {
      enabled: !steeringWheelHeating,
    });
  }

  function changeAirflowDirection(direction: string) {
    const current = airflowDirection.split("+").filter(Boolean);
    const allDirections = ["face", "feet", "windshield"];
    const allSelected = allDirections.every((item) => current.includes(item));
    const selected = direction === "mixed"
      ? (allSelected ? [] : allDirections)
      : current.includes(direction)
        ? current.filter((item) => item !== direction)
        : [...current, direction];
    const value = selected.join("+");
    setAirflowDirection(value);
    void sendAction("set_airflow_direction", { airflow_direction: value });
  }

  function airflowDisplayName(value: string) {
    const labels: Record<string, string> = locale === "ro"
      ? { face: "Față", feet: "Picioare", windshield: "Parbriz" }
      : { face: "Face", feet: "Feet", windshield: "Windshield" };
    const selected = value === "mixed" ? ["face", "feet", "windshield"] : value.split("+").filter(Boolean);
    if (["face", "feet", "windshield"].every((item) => selected.includes(item))) return locale === "ro" ? "Mixt" : "Mixed";
    return selected.map((item) => labels[item]).join(" + ") || (locale === "ro" ? "Oprit" : "Off");
  }

  function updateAmbientZone(zone: string, values: Record<string, unknown>) {
    void sendAction(`set_ambient_zone_${values.ambient_color ? "color" : "intensity"}`, {
      zone,
      ...values,
    });
  }

async function runCommand(message: string, announce = true) {
  if (!message.trim()) return;

  setCommand("");
  const commandLocale = detectLanguage(message);
  const requestLocale = isLanguageCommand(message) ? commandLocale : locale;

  try {
    const response = await apiFetch("/api/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, locale: requestLocale }),
    });

    const result = await response.json();

    if (!response.ok || result.status === "rejected") {
      if (result.last_command?.action === "unsafe_request") {
        addActivity(result.message, <ShieldCheck size={15} />);
        if (announce) announceResult(result, requestLocale);
        return;
      }
      if (isLanguageCommand(message)) setLocale(commandLocale);
      throw new Error(result.message || "Comanda a fost respinsă.");
    }

    if (isLanguageCommand(message)) {
      setLocale(result.locale === "en" || result.locale === "ro" ? result.locale : commandLocale);
    }

    if (result.last_command?.action === "set_navigation_route") {
      setActiveTab("maps");
      const routeValues = result.last_command.requested_values;
      window.localStorage.setItem("pending-car-route-values", JSON.stringify(routeValues));
      window.dispatchEvent(new CustomEvent("car-route-command", { detail: routeValues }));
    }

    if (result.last_command?.action !== "set_navigation_route") {
      const normalizedRouteCommand = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (
        /(?:acasa|serviciu|home|work|office|workplace)/.test(normalizedRouteCommand) &&
        /(?:traseu|ruta|route|trip|journey|naviga|navigate|go|take|du-ma|destination|destinatia)/.test(normalizedRouteCommand)
      ) {
        setActiveTab("maps");
        window.localStorage.setItem("pending-car-route-command", message);
        window.dispatchEvent(new CustomEvent("car-route-command", { detail: message }));
      }
    }

    const mediaStarted = isMediaStartCommand(result) || isMediaStartMessage(message);
    const state = result.cabin_state;

    applyCabinState(state);
    if (mediaStarted) setIsPlaying(true);
    setActiveProfile(result.active_profile);

    addActivity(confirmationText(result, locale), <Sparkles size={15} />);
    if (announce && !mediaStarted) announceResult(result, locale);
  } catch (error) {
    console.error("Eroare la comandă:", error);
  }
}

function submitCommand() {
  void runCommand(command);
}

  async function sendAction(
  action: string,
  argumentsData: Record<string, unknown>,
  shouldAnnounce = false
) {
  try {
    const response = await apiFetch("/api/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        arguments: argumentsData,
        locale,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.status === "rejected") {
      throw new Error(result.message || "Acțiunea a fost respinsă.");
    }

    const state = result.cabin_state;

    applyCabinState(state);
    setActiveProfile(result.active_profile);

    if (action === "set_audio_volume") addVolumeActivity(result);
    else addActivity(confirmationText(result), <Sparkles size={15} />);
    if (shouldAnnounce) announceResult(result);
  } catch (error) {
    console.error("Eroare la acțiune:", error);
  }
}

function toggleAudio() {
  const nextPlaying = !isPlaying;

  if (listening) {
    cancelRecordingRef.current = true;
    mediaRecorderRef.current?.stop();
  }

  if (nextPlaying) {
    audioRef.current?.play().catch((error) => {
      console.error("Radioul nu poate fi redat:", error);
    });
  } else {
    audioRef.current?.pause();
  }

  void sendAction("set_media_playback", {
    playing: nextPlaying,
  });
}

async function recordVoiceCommand() {
  if (listening) {
    mediaRecorderRef.current?.stop();
    return;
  }

  try {
    // Oprim radioul înainte de înregistrare
    if (isPlaying) {
      audioRef.current?.pause();

      void sendAction("set_media_playback", {
        playing: false,
      });
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop());
    setListening(false);

  if (cancelRecordingRef.current) {
    cancelRecordingRef.current = false;
    return;
  }
      const audioBlob = new Blob(chunks, {
        type: recorder.mimeType || "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
        formData.append("locale", locale);

      try {
        const response = await apiFetch("/api/voice", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        const commandLocale = data.locale === "en" || data.locale === "ro" ? data.locale : locale;
        const detectedCommandLocale = detectLanguage(data.transcript);
        if (isLanguageCommand(data.transcript)) setLocale(detectedCommandLocale);
        addActivity(commandLocale === "en" ? `Heard: ${data.transcript}` : `Am auzit: ${data.transcript}`, <Mic size={15} />);
        const normalizedVoiceCommand = data.transcript.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const voiceRouteMatch = normalizedVoiceCommand.match(/\b(?:traseul|traseu|ruta)\b\s+de la\s+(.+?)\s+la\s+(.+?)(?:\s+(?:si|iar|apoi)\s+|[.!?]|$)/);
        const backendRouteValues = data.result?.last_command?.action === "set_navigation_route" ? data.result.last_command.requested_values : null;
        const directRouteValues = backendRouteValues ?? (voiceRouteMatch ? { origin: voiceRouteMatch[1].trim(), destination: voiceRouteMatch[2].trim() } : null);
        if (directRouteValues?.origin && directRouteValues?.destination) {
          setActiveTab("maps");
          window.localStorage.setItem("pending-car-route-values", JSON.stringify(directRouteValues));
          window.dispatchEvent(new CustomEvent("car-route-command", { detail: directRouteValues }));
        } else if (/\b(traseul|traseu|ruta)\b/.test(normalizedVoiceCommand) && /\bde la\b/.test(normalizedVoiceCommand) && /\bla\b/.test(normalizedVoiceCommand)) {
          setActiveTab("maps");
        } else if (/(?:acasa|serviciu|home|work|office|workplace)/.test(normalizedVoiceCommand) && /(?:traseu|ruta|route|trip|journey|naviga|navigate|go|take|du-ma|destination|destinatia)/.test(normalizedVoiceCommand)) {
          setActiveTab("maps");
        }
        if (!directRouteValues) {
          window.localStorage.setItem("pending-car-route-command", data.transcript);
          window.dispatchEvent(new CustomEvent("car-route-command", { detail: data.transcript }));
        }

        const state = data.result.cabin_state;

        const mediaStarted = isMediaStartCommand(data.result) || isMediaStartMessage(data.transcript);
        applyCabinState(state);
        if (mediaStarted) setIsPlaying(true);
        setActiveProfile(data.result.active_profile);
        addActivity(confirmationText(data.result, commandLocale), <Sparkles size={15} />);
        if (!mediaStarted) announceResult(data.result, commandLocale);
      } catch (error) {
        console.error("Eroare la procesarea vocii:", error);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setListening(true);
  } catch (error) {
    console.error("Nu pot accesa microfonul:", error);
  }
}

  const navItems = [
    { id: "home", label: t("nav.home"), icon: <CarFront size={18} /> },
    { id: "maps", label: t("nav.maps"), icon: <MapPinned size={18} /> },
    { id: "climate", label: t("nav.climate"), icon: <Snowflake size={18} /> },
    { id: "seats", label: t("nav.seats"), icon: <CarSeatIcon className="h-[18px] w-[18px]" /> },
    { id: "lights", label: t("nav.lights"), icon: <Lightbulb size={18} /> },
    { id: "media", label: t("nav.media"), icon: <Music2 size={18} /> },
  ];

  return (
    <main
  style={{
    background: colorTheme === "light" ? "#f4f7fb" : "#071019",
  }}
  data-color-theme={colorTheme}
  className={`flex h-screen flex-col overflow-hidden text-white transition-colors duration-500 ${colorTheme === "light" ? "theme-light" : ""}`}
>
    <audio ref={speechAudioRef} className="hidden" />
    <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-2 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <CarFront size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold">In-Car AI</p>
              
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-300 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {locale === "ro" ? "Sistem online" : "System online"}
            </div>
            <div className="flex min-w-[78px] flex-col items-end border-l border-white/10 pl-4 leading-none">
              <div className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-100">
                <Clock3 size={17} className="text-cyan-300" />
                {currentTime || "--:--"}
              </div>
              <span className="mt-1 text-xs capitalize text-slate-500">{currentDate || "--"}</span>
            </div>
          </div>

          <div className="relative">
          <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-xs text-slate-400 md:block">{email}</span>
          <button
            type="button"
            onClick={() => setLocale(locale === "ro" ? "en" : "ro")}
            aria-label={t("language.switchTo", { language: locale === "ro" ? t("language.english") : t("language.romanian") })}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200"
          >
            {locale.toUpperCase()}
          </button>
          <button onClick={() => { if (window.confirm(locale === "ro" ? "Ești sigur că vrei să ieși din cont?" : "Are you sure you want to sign out?")) onLogout(); }} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:border-red-300/40 hover:text-red-200">{locale === "ro" ? "Ieșire" : "Sign out"}</button>
          <button
            onClick={openProfilePanel}
                    aria-label={locale === "ro" ? "Profiluri" : "Profiles"}
            className={`rounded-xl border p-2 transition ${profilePanelOpen ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-400 hover:text-white"}`}
          >
            <UserRound size={19} />
          </button>
          <button
            onClick={() => setVoiceSettingsOpen((open) => !open)}
                    aria-label={locale === "ro" ? "Setări asistent vocal" : "Voice assistant settings"}
            className={`rounded-xl border p-2 transition ${
              voiceAssistantEnabled
                ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-200"
                : "border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <Settings2 size={19} />
          </button>
          {voiceSettingsOpen && (
            <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-white/10 bg-[#101c28] p-4 shadow-2xl">
              <p className="text-sm font-medium text-white">{locale === "ro" ? "Răspuns asistent" : "Assistant response"}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {locale === "ro" ? "Alege dacă asistentul citește confirmarea sau redă doar un bing." : "Choose whether the assistant reads the confirmation or plays only a chime."}
              </p>
              <button
                onClick={() => {
                  const nextValue = !voiceAssistantEnabled;
                  setVoiceAssistantEnabled(nextValue);
                  window.localStorage.setItem("voiceAssistantEnabled", String(nextValue));
                  setVoiceSettingsOpen(false);
                }}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-xs text-slate-300">
                  {locale === "ro" ? "Voce" : "Voice"} {voiceAssistantEnabled ? (locale === "ro" ? "activată" : "enabled") : (locale === "ro" ? "dezactivată" : "disabled")}
                </span>
                <span className={`h-5 w-9 rounded-full p-1 ${voiceAssistantEnabled ? "bg-cyan-400" : "bg-slate-700"}`}>
                  <span className={`block h-3 w-3 rounded-full bg-white transition ${voiceAssistantEnabled ? "ml-4" : ""}`} />
                </span>
              </button>
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400">{locale === "ro" ? "Temă interfață" : "Interface theme"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { changeColorTheme("dark"); setVoiceSettingsOpen(false); }} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${colorTheme === "dark" ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-400"}`}><Moon size={14} />{t("dashboard.dark")}</button>
                  <button type="button" onClick={() => { changeColorTheme("light"); setVoiceSettingsOpen(false); }} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${colorTheme === "light" ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-400"}`}><Sun size={14} />{t("dashboard.light")}</button>
                </div>
              </div>
              </div>
          )}
          {profilePanelOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setProfilePanelOpen(false)}>
              <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#101c28] p-6 shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-white">{t("profile.manage")}</p><p className="mt-1 text-xs text-slate-500">{locale === "ro" ? "Alege sau personalizează un profil." : "Choose or customize a profile."}</p></div>
                <button onClick={startNewProfile} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-[#071019]">{t("profile.new")}</button>
              </div>
              <div className="mt-3 space-y-2">
                {profiles.length === 0 && <p className="text-xs text-slate-500">{locale === "ro" ? "Nu există profiluri salvate." : "No saved profiles."}</p>}
                {profiles.map((profile) => (
                  <div key={profile.profile_name} role="button" tabIndex={0} onClick={() => { void sendAction("identify_profile", { profile_name: profile.profile_name }); setProfilePanelOpen(false); }} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-300/50 hover:bg-cyan-400/10">
                    <button onClick={() => { void sendAction("identify_profile", { profile_name: profile.profile_name }); setProfilePanelOpen(false); }} className="text-left text-sm text-slate-200 hover:text-cyan-200">{profile.profile_name}{activeProfile === profile.profile_name && <span className="ml-2 text-xs text-cyan-300">{locale === "ro" ? "activ" : "active"}</span>}</button>
                    <button onClick={(event) => { event.stopPropagation(); editProfile(profile); }} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white">{t("profile.edit")}</button>
                  </div>
                ))}
              </div>
              {profileFormOpen && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={locale === "ro" ? "Numele profilului" : "Profile name"} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-400">{t("dashboard.temperature")}<input type="number" value={profileForm.temperature} onChange={(event) => setProfileForm({ ...profileForm, temperature: Number(event.target.value) })} className="mt-1 w-full rounded-lg bg-[#0b1823] px-2 py-2 text-white" /></label>
                    <label className="text-xs text-slate-400">{t("dashboard.fan")}<input type="number" min="0" max="5" value={profileForm.fan_speed} onChange={(event) => setProfileForm({ ...profileForm, fan_speed: Number(event.target.value) })} className="mt-1 w-full rounded-lg bg-[#0b1823] px-2 py-2 text-white" /></label>
                    <div className="col-span-2 text-xs text-slate-400">{locale === "ro" ? "Culoarea luminilor" : "Light color"}<div className="mt-2 flex flex-wrap gap-3">{colors.map((color) => <button key={color.name} type="button" title={color.name} onClick={() => setProfileForm({ ...profileForm, ambient_color: color.name })} className={`h-9 w-9 rounded-full border-2 transition ${color.className} ${profileForm.ambient_color === color.name ? "scale-110 border-white ring-2 ring-cyan-300/60" : "border-white/20 opacity-70 hover:opacity-100"}`} />)}</div></div>
                    <label className="text-xs text-slate-400">{t("climate.intensity")}<input type="number" min="0" max="100" value={profileForm.ambient_intensity} onChange={(event) => setProfileForm({ ...profileForm, ambient_intensity: Number(event.target.value) })} className="mt-1 w-full rounded-lg bg-[#0b1823] px-2 py-2 text-white" /></label>
                    <label className="text-xs text-slate-400">{t("dashboard.volume")}<input type="number" min="0" max="100" value={profileForm.audio_volume} onChange={(event) => setProfileForm({ ...profileForm, audio_volume: Number(event.target.value) })} className="mt-1 w-full rounded-lg bg-[#0b1823] px-2 py-2 text-white" /></label>
                    <label className="text-xs text-slate-400">{t("climate.airflow")}<select value={profileForm.airflow_direction} onChange={(event) => setProfileForm({ ...profileForm, airflow_direction: event.target.value })} className="mt-1 w-full rounded-lg bg-[#0b1823] px-2 py-2 text-white"><option value="face">{locale === "ro" ? "Față" : "Face"}</option><option value="feet">{locale === "ro" ? "Picioare" : "Feet"}</option><option value="windshield">{locale === "ro" ? "Parbriz" : "Windshield"}</option></select></label>
                  </div>
                  <button onClick={() => void saveProfile()} className="mt-3 w-full rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-[#071019]">{t("profile.save")}</button>
                </div>
              )}
              </div>
            </div>
          )}
          </div>
          </div>
        </header>

      <div className={`grid min-h-0 flex-1 gap-2 overflow-hidden px-3 py-2 md:px-4 ${activeTab === "home" ? "lg:grid-cols-[230px_minmax(0,1fr)_270px]" : "lg:grid-cols-1"}`}>
        {activeTab === "maps" ? <MapPanel /> : <>
          <aside className="no-scrollbar min-h-0 space-y-3 overflow-y-auto pr-1">
            <div className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 ${tabVisible("climate") ? "" : "hidden"}`}>
              <SectionTitle
                icon={<Snowflake size={17} className="text-cyan-300" />}
                title={t("climate.title")}
                action={locale === "ro" ? "Cabină" : "Cabin"}
              />

              <div className={`grid gap-2 ${activeTab === "home" ? "grid-cols-1" : "lg:grid-cols-2"}`}>
                <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-4">
                  <div className="flex items-center gap-2 text-xs text-cyan-300"><Thermometer size={17} />{t("dashboard.temperature")}</div>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <SmallButton onClick={() => void sendAction("set_temperature", { temperature: Math.max(16, temperature - 1) })}><Minus size={17} /></SmallButton>
                    <div className="text-center"><p className={`${activeTab === "home" ? "text-3xl" : "text-5xl"} font-semibold tracking-tight text-white`}>{temperature}°</p><p className="mt-1 text-xs text-slate-400">°C</p></div>
                    <SmallButton onClick={() => void sendAction("set_temperature", { temperature: Math.min(30, temperature + 1) })}><Plus size={17} /></SmallButton>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs text-cyan-300"><Fan size={17} />{t("dashboard.fan")}</div><span className="text-lg font-semibold text-white">{locale === "ro" ? "Nivel" : "Level"} {fanSpeed}</span></div>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <SmallButton onClick={() => void sendAction("set_fan_speed", { fan_speed: Math.max(0, fanSpeed - 1) })}><ChevronDown size={17} /></SmallButton>
                    <div className="flex items-end gap-1.5">{[1, 2, 3, 4, 5].map((level) => <span key={level} className={`${activeTab === "home" ? "h-6 w-1.5" : "h-8 w-2"} rounded-full ${level <= fanSpeed ? "bg-blue-300" : "bg-white/10"}`} />)}</div>
                    <SmallButton onClick={() => void sendAction("set_fan_speed", { fan_speed: Math.min(5, fanSpeed + 1) })}><ChevronUp size={17} /></SmallButton>
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1823] p-4">
                <div className="flex items-center gap-2"><Wind size={18} className="text-cyan-300" /><div><p className="text-xs text-cyan-300">{t("climate.airflow")}</p><p className="mt-1 text-sm font-medium text-white">{airflowDisplayName(airflowDirection)}</p></div></div>
                <div className={`mt-3 grid gap-2 ${activeTab === "home" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {[{ key: "face", label: locale === "ro" ? "Față" : "Face", icon: <Wind size={17} /> }, { key: "feet", label: locale === "ro" ? "Picioare" : "Feet", icon: <ArrowDown size={17} /> }, { key: "windshield", label: locale === "ro" ? "Parbriz" : "Windshield", icon: <ArrowUp size={17} /> }, { key: "mixed", label: locale === "ro" ? "Mixt" : "Mixed", icon: <Shuffle size={17} /> }].map((option) => { const directions = ["face", "feet", "windshield"]; const selected = airflowDirection === "mixed" ? directions : airflowDirection.split("+").filter(Boolean); const allSelected = directions.every((item) => selected.includes(item)); const isActive = option.key === "mixed" ? allSelected : !allSelected && selected.includes(option.key); return <button key={option.key} type="button" onClick={() => changeAirflowDirection(option.key)} className={`flex items-center justify-center gap-1 rounded-xl border px-1 py-2.5 ${activeTab === "home" ? "text-[10px]" : "text-xs"} whitespace-nowrap transition ${isActive ? "border-cyan-300/70 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>{option.icon}{option.label}</button>; })}
                </div>
              </div>

              <button type="button" onClick={() => void sendAction("set_air_conditioning", { enabled: !airConditioning })} className={`mt-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#0b1823] ${activeTab === "home" ? "gap-1 p-3" : "p-4"}`}>
                <span className={`flex items-center gap-1.5 whitespace-nowrap text-slate-200 ${activeTab === "home" ? "text-[11px]" : "text-sm"}`}><Snowflake size={16} className="shrink-0 text-cyan-300" />{t("dashboard.airConditioning")}</span>
                <span className="flex shrink-0 items-center gap-1.5"><span className="text-[11px] text-cyan-300">{airConditioning ? (locale === "ro" ? "Pornit" : "On") : (locale === "ro" ? "Oprit" : "Off")}</span><span className={`h-6 w-10 rounded-full p-1 ${airConditioning ? "bg-cyan-400" : "bg-slate-700"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${airConditioning ? "ml-4" : ""}`} /></span></span>
              </button>

              <div className={`mt-2 ${activeTab === "home" ? "hidden" : ""}`}>
                <button type="button" onClick={() => setAirRecirculationEnabled((enabled) => !enabled)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#0b1823] p-3 text-left"><span className="flex items-center gap-2 text-xs text-slate-300"><Wind size={16} className="text-cyan-300" />{locale === "ro" ? "Recirculare aer" : "Air recirculation"}</span><span className="flex items-center gap-2 text-xs text-slate-500">{airRecirculationEnabled ? (locale === "ro" ? "Pornit" : "On") : (locale === "ro" ? "Oprit" : "Off")}<span className={`h-5 w-9 rounded-full p-1 ${airRecirculationEnabled ? "bg-cyan-400" : "bg-slate-700"}`}><span className={`block h-3 w-3 rounded-full bg-white transition ${airRecirculationEnabled ? "ml-4" : ""}`} /></span></span></button>
              </div>
            </div>

            <div className={`flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${tabVisible("climate") ? "" : "hidden"}`}>
              <div className="flex items-center gap-3">
                <SteeringWheelIcon className={`h-6 w-6 ${steeringWheelHeating ? "text-orange-300" : "text-slate-400"}`} />
                <div><p className="text-sm font-medium text-slate-200">{locale === "ro" ? "Încălzire volan" : "Steering wheel heating"}</p><p className="mt-1 text-xs text-slate-500">{steeringWheelHeating ? (locale === "ro" ? "Pornită" : "On") : (locale === "ro" ? "Oprită" : "Off")}</p></div>
              </div>
              <button onClick={toggleSteeringWheelHeating} aria-pressed={steeringWheelHeating} className={`h-6 w-11 rounded-full p-1 transition ${steeringWheelHeating ? "bg-orange-400" : "bg-slate-700"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${steeringWheelHeating ? "ml-5" : ""}`} /></button>
            </div>

            <div className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 ${tabVisible("lights") ? "" : "hidden"}`}>
              <SectionTitle
                icon={<Lightbulb size={17} className="text-purple-300" />}
                title={t("lights.title")}
                action={ambientLightsOn ? (locale === "ro" ? "Pornite" : "On") : (locale === "ro" ? "Oprite" : "Off")}
              />

              <button
                type="button"
                onClick={() => {
                  const enabled = !ambientLightsOn;
                  setAmbientLightsOn(enabled);
                  void sendAction("set_ambient_lights", { enabled });
                }}
                aria-pressed={ambientLightsOn}
                className={`mb-4 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${ambientLightsOn ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/[0.03] text-slate-400"}`}
              >
                <span>{ambientLightsOn ? (locale === "ro" ? "Lumini pornite" : "Lights on") : (locale === "ro" ? "Lumini oprite" : "Lights off")}</span>
                <span className={`h-5 w-9 rounded-full p-1 ${ambientLightsOn ? "bg-cyan-400" : "bg-slate-700"}`}><span className={`block h-3 w-3 rounded-full bg-white transition ${ambientLightsOn ? "ml-4" : ""}`} /></span>
              </button>

              <div className="mb-4 flex gap-3">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => {
                    setAmbientColor(color.name);
                    void sendAction("set_ambient_color", {
                    ambient_color: color.name,
                    });
                    }}
                    className={`h-7 w-7 rounded-full ${color.className} ${
                      ambientColor === color.name
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#101923]"
                        : ""
                    }`}
                  />
                ))}
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={ambientIntensity}
                disabled={!ambientLightsOn}
                onChange={(event) => {
                const value = Number(event.target.value);
                setAmbientIntensity(value);
 
                void sendAction("set_ambient_intensity", {
                ambient_intensity: value,
                 });
                }}
                className="w-full accent-cyan-400"
              />
              <div className="mt-1 text-right text-xs text-slate-400">{ambientIntensity}%</div>
              <div className={`mt-5 border-t border-white/10 pt-4 ${activeTab === "lights" ? "" : "hidden"}`}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{locale === "ro" ? "Zone individuale" : "Individual zones"}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[{ key: "driver", label: locale === "ro" ? "Șofer" : "Driver" }, { key: "front_passenger", label: locale === "ro" ? "Pasager față" : "Front passenger" }, { key: "rear", label: locale === "ro" ? "Spate" : "Rear" }].map((zone) => {
                    const zoneState = ambientZones[zone.key] ?? { color: ambientColor, intensity: ambientIntensity };
                    return (
                      <div key={zone.key} className="rounded-2xl border border-white/10 bg-[#0b1823] p-3">
                        <div className="flex items-center justify-between"><span className="text-sm text-slate-200">{zone.label}</span><span className="text-xs text-slate-500">{zoneState.intensity}%</span></div>
                        <div className="mt-3 flex gap-2">{colors.map((color) => <button key={color.name} type="button" title={color.name} onClick={() => updateAmbientZone(zone.key, { ambient_color: color.name })} className={`h-5 w-5 rounded-full ${color.className} ${zoneState.color === color.name ? "ring-2 ring-white ring-offset-1 ring-offset-[#0b1823]" : "opacity-60"}`} />)}</div>
                        <input type="range" min="0" max="100" value={zoneState.intensity} onChange={(event) => updateAmbientZone(zone.key, { ambient_intensity: Number(event.target.value) })} className="mt-3 w-full accent-cyan-400" aria-label={`Intensitate lumini ${zone.label}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <section className="no-scrollbar min-h-0 space-y-3 overflow-y-auto px-1">
            <div 
            style={{
            borderColor: theme.accent,
           boxShadow: `0 0 45px ${theme.glow}`,
            }}
            className={`relative overflow-hidden rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-[#132c3e] via-[#0c1d2a] to-[#081018] p-3 ${activeTab === "home" ? "" : "hidden"}`}>
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                    {locale === "ro" ? "Profil activ" : "Active profile"}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold">{activeProfile ?? (locale === "ro" ? "Fără profil" : "No profile")}</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    {locale === "ro" ? "Preferințele tale sunt încărcate" : "Your preferences are loaded"}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                  <p className="text-xs text-emerald-300">{locale === "ro" ? "Autovehicul" : "Vehicle"}</p>
                  <button
                    type="button"
                    onClick={() => changeVehicleStatus(vehicleStatus === "parked" ? "moving" : "parked")}
                    aria-label={locale === "ro" ? "Schimbă starea autovehiculului" : "Change vehicle status"}
                    title={locale === "ro" ? "Click pentru a schimba starea" : "Click to change status"}
                    className={`mt-1 rounded-full border px-3 py-1 text-[10px] font-medium transition ${vehicleStatus === "moving" ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25" : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"}`}
                  >
                    {vehicleStatus === "moving" ? (locale === "ro" ? "În mers" : "Moving") : (locale === "ro" ? "Parcat" : "Parked")}
                  </button>
                </div>
              </div>

              <div className="flex min-h-[105px] -translate-y-2 flex-col items-center justify-center">
                <button
                onClick={() => void recordVoiceCommand()}
                 style={{
                 borderColor: theme.accent,
                 backgroundColor: theme.soft,
                 boxShadow: `0 0 70px ${theme.glow}`,
                }}
               className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-500"
>
                  <div className="absolute inset-4 rounded-full border border-cyan-300/30" />
                  <Mic size={32} className="text-cyan-200" />
                </button>

                <p className="mt-1 text-center text-sm font-medium">
                  {listening
                    ? t("dashboard.listening")
                    : (locale === "ro" ? "Spune-mi ce vrei să schimb" : "Tell me what you want to change")}
                </p>
                <p className="mt-1 text-center text-xs text-slate-500">
                  {locale === "ro" ? "Controlează cabina natural, fără distrageri" : "Control the cabin naturally, without distractions"}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {(locale === "ro" ? ["Setează 20 de grade", "Pornește muzica", "Aprinde luminile"] : ["Set temperature to 20 degrees", "Play music", "Turn on the lights"]).map(
                  (item) => (
                    <button
                      key={item}
                      onClick={() => {
                      if (item === "Aprinde luminile") {
                      void sendAction("set_ambient_intensity", {
                       ambient_intensity: 70,
                       });
                       } else {
                       void runCommand(item, false);
                        }
                       }}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className={`rounded-2xl border border-white/10 bg-[#101923] ${activeTab === "home" ? "p-3" : "p-5"} ${tabVisible("seats") ? "" : "hidden"}`}>
              <SectionTitle
                icon={<CarSeatIcon className="h-5 w-5 text-orange-300" />}
                title={locale === "ro" ? "Confort scaune" : "Seat comfort"}
                action={locale === "ro" ? "Toate locurile" : "All seats"}
              />

              <div className={`mb-4 flex justify-end gap-2 ${activeTab === "home" ? "hidden" : ""}`}>
                <button type="button" onClick={turnOffAllSeatComfort} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-300 transition hover:border-cyan-300/40 hover:text-white">
                  {locale === "ro" ? "Oprește toate" : "All seats off"}
                </button>
              </div>

              <div className={`grid ${activeTab === "home" ? "grid-cols-2 gap-3 lg:grid-cols-4" : "gap-4 sm:grid-cols-2 xl:grid-cols-4"}`}>
                {[
                  { key: "driver", label: locale === "ro" ? "Șofer" : "Driver", accent: "text-orange-300" },
                  { key: "front_passenger", label: locale === "ro" ? "Pasager dreapta" : "Front passenger", accent: "text-blue-300" },
                  { key: "rear_left_passenger", label: locale === "ro" ? "Spate stânga" : "Rear left", accent: "text-slate-300" },
                  { key: "rear_right_passenger", label: locale === "ro" ? "Spate dreapta" : "Rear right", accent: "text-slate-300" },
                ].map((seat) => {
                  const heatingLevel = seatHeating[seat.key] ?? 0;
                  const ventilationLevel = seatVentilationLevel[seat.key] ?? (seatVentilation[seat.key] ? 1 : 0);
                  const ventilationOn = ventilationLevel > 0;
                  return (
                    <div key={seat.key} className={`${activeTab === "home" ? "rounded-2xl p-3" : "min-h-[245px] rounded-2xl p-4"} border transition ${ventilationOn || heatingLevel > 0 ? "border-cyan-300/30 bg-[#092335]" : "border-white/10 bg-[#0b1823]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <CarSeatIcon className={`${activeTab === "home" ? "h-7 w-7" : "h-9 w-9"} ${ventilationOn || heatingLevel > 0 ? "text-cyan-300" : seat.accent}`} />
                          <div className="min-w-0">
                            <p className={`truncate ${activeTab === "home" ? "text-xs" : "text-sm"} font-semibold text-slate-100`}>{seat.label}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{heatingLevel > 0 ? (locale === "ro" ? "Încălzire pornită" : "Heating on") : (locale === "ro" ? "Încălzire oprită" : "Heating off")}</p>
                            <p className="text-[10px] text-slate-400">{ventilationOn ? (locale === "ro" ? "Ventilație pornită" : "Ventilation on") : (locale === "ro" ? "Ventilație oprită" : "Ventilation off")}</p>
                          </div>
                        </div>
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${ventilationOn || heatingLevel > 0 ? "bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]" : "bg-slate-700"}`} />
                      </div>
                      {activeTab === "home" && <button
                        type="button"
                        onClick={() => changeSeatVentilationLevel(seat.key, ventilationOn ? 0 : 1)}
                        aria-pressed={ventilationOn}
                        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] transition ${ventilationOn ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200"}`}
                      >
                        <Wind size={13} />
                        {ventilationOn ? (locale === "ro" ? "Oprește ventilația" : "Turn ventilation off") : (locale === "ro" ? "Pornește ventilația" : "Turn ventilation on")}
                      </button>}
                      <div className={`mt-2 space-y-1.5 ${activeTab === "seats" ? "" : "hidden"}`}>
                        <div className="rounded-xl border border-orange-300/10 bg-orange-400/5 px-2.5 py-2">
                          <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-300"><span className="flex items-center gap-1 text-orange-200"><HeatingIcon className="h-4 w-4" />{locale === "ro" ? "Încălzire" : "Heating"}</span><span>{heatingLevel} / 3</span></div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => changeSeatHeatingLevel(seat.key, heatingLevel - 1)} aria-label={`${locale === "ro" ? "Scade încălzirea pentru" : "Decrease heating for"} ${seat.label}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:border-orange-300/50 hover:text-orange-200"><Minus size={12} /></button>
                            <div className="flex flex-1 items-end justify-center gap-1" aria-label={`${locale === "ro" ? "Încălzire nivel" : "Heating level"} ${heatingLevel}`}>
                              {[1, 2, 3].map((level) => <span key={level} className={`h-3 flex-1 rounded-sm ${level <= heatingLevel ? "bg-orange-300" : "bg-white/10"}`} />)}
                            </div>
                            <button onClick={() => changeSeatHeatingLevel(seat.key, heatingLevel + 1)} aria-label={`${locale === "ro" ? "Crește încălzirea pentru" : "Increase heating for"} ${seat.label}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:border-orange-300/50 hover:text-orange-200"><Plus size={12} /></button>
                          </div>
                        </div>
                        <div className="rounded-xl border border-cyan-300/10 bg-cyan-400/5 px-2.5 py-2">
                          <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-300"><span className="flex items-center gap-1 text-cyan-200"><VentilationIcon className="h-4 w-4" />{locale === "ro" ? "Ventilație" : "Ventilation"}</span><span>{ventilationLevel} / 5</span></div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => changeSeatVentilationLevel(seat.key, ventilationLevel - 1)} aria-label={`${locale === "ro" ? "Scade ventilația pentru" : "Decrease ventilation for"} ${seat.label}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"><Minus size={12} /></button>
                            <div className="flex flex-1 items-end justify-center gap-1" aria-label={`${locale === "ro" ? "Ventilație nivel" : "Ventilation level"} ${ventilationLevel}`}>
                              {[1, 2, 3, 4, 5].map((level) => <span key={level} className={`h-3 flex-1 rounded-sm ${level <= ventilationLevel ? "bg-cyan-300" : "bg-white/10"}`} />)}
                            </div>
                            <button onClick={() => changeSeatVentilationLevel(seat.key, ventilationLevel + 1)} aria-label={`${locale === "ro" ? "Crește ventilația pentru" : "Increase ventilation for"} ${seat.label}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"><Plus size={12} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden">
                {[
                  [locale === "ro" ? "Șofer" : "Driver", locale === "ro" ? "Încălzire nivel 1" : "Heating level 1", "orange"],
                  [locale === "ro" ? "Pasager față" : "Front passenger", locale === "ro" ? "Ventilație oprită" : "Ventilation off", "blue"],
                  [locale === "ro" ? "Pasageri spate" : "Rear passengers", locale === "ro" ? "Disponibil" : "Available", "slate"],
                ].map(([seat, status, color], index) => (
                  <div
                    key={seat}
                    className="rounded-2xl border border-white/10 bg-[#0b1823] p-4"
                  >
                    <Armchair
                      size={22}
                      className={getSeatStatusColor(index, color === "orange" ? "text-orange-300" : color === "blue" ? "text-blue-300" : "text-slate-500")}
                    />
                    <p className="mt-3 text-sm font-medium">{seat}</p>
                    <p className="mt-1 text-xs text-slate-300">{getSeatStatus(index)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 ${tabVisible("media") ? "" : "hidden"}`}>
              <SectionTitle
                icon={<Music2 size={17} className="text-green-300" />}
                title="Media"
                action={isPlaying ? (locale === "ro" ? "Redare activă" : "Playing") : (locale === "ro" ? "Oprit" : "Off")}
              />

              <div className="flex items-center gap-4 rounded-2xl bg-[#0b1823] p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/30 to-purple-400/20">
                  <Music2 className="text-cyan-200" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{locale === "ro" ? "Radio live" : "Live radio"}</p>
                  <p className="mt-1 font-medium text-white">{radioStation.name}</p>
                  <audio
                    ref={audioRef}
                    src={radioStation.url}
                    onError={() => {
                      setIsPlaying(false);
                    }}
                    className="hidden"
                  />
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => changeRadioStation(-1)} aria-label={locale === "ro" ? "Postul anterior" : "Previous station"} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-400/10 hover:text-cyan-200"><SkipBack size={16} /></button>
                    <button onClick={() => changeRadioStation(1)} aria-label={locale === "ro" ? "Postul următor" : "Next station"} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-400/10 hover:text-cyan-200"><SkipForward size={16} /></button>
                  </div>
                </div>
                <button
                  onClick={toggleAudio}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400 text-[#071019]"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Volume2 size={16} className="text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(event) => {
                  const value = Number(event.target.value);
                  setVolume(value);
                  if (volumeUpdateTimerRef.current) window.clearTimeout(volumeUpdateTimerRef.current);
                  volumeUpdateTimerRef.current = window.setTimeout(() => {
                    void sendAction("set_audio_volume", { audio_volume: value }, false);
                  }, 180);
                   }}
                  className="flex-1 accent-cyan-400"
                />
                <span className="w-10 text-right text-xs text-slate-400">
                  {volume}%
                </span>
              </div>
            </div>
            <div className={`rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#102b3c] via-[#0b1d2a] to-[#081018] p-4 shadow-[0_0_28px_rgba(34,211,238,0.08)] ${activeTab === "home" ? "" : "hidden"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><MapPinned size={18} className="text-cyan-300" /><div><p className="font-heading text-base text-white">{t("maps.title")}</p><p className="text-xs text-cyan-300">{locale === "ro" ? "Planifică o călătorie" : "Plan a trip"}</p></div></div>
                <button type="button" onClick={() => setActiveTab("maps")} className="flex items-center gap-1 text-xs text-cyan-200 hover:text-white">{t("maps.title")} <ChevronRight size={15} /></button>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[0.75fr_1.75fr]">
                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0b1823] p-3">
                  <div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{t("maps.destination")}</p><div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><MapPinned size={15} className="shrink-0 text-cyan-300" /><p className="min-w-0 truncate text-sm font-semibold text-white">{navigationPreview?.destination ?? (locale === "ro" ? "Alege o destinație" : "Choose a destination")}</p>{navigationPreview && <span className="ml-auto text-slate-500">×</span>}</div><div className="mt-3 flex items-baseline gap-2 text-cyan-300"><span className="text-lg font-bold">{navigationPreview?.totalDuration ?? "--"}</span><span className="text-lg font-bold">·</span><span className="text-lg font-bold">{navigationPreview ? `${navigationPreview.distanceKm.toFixed(0)} km` : "-- km"}</span></div></div>
                  <button type="button" onClick={() => setActiveTab("maps")} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 py-2.5 text-xs font-semibold text-[#071019]"><MapPinned size={14} /> {navigationPreview ? t("maps.route") : t("maps.startNavigation")}</button>
                </div>
                <div className="relative min-h-[150px] overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071923]">
                  <svg viewBox="0 0 360 160" className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <path d="M0 28 C45 42 63 12 105 25 S165 45 205 28 S280 20 360 40 L360 0 L0 0Z" fill="#123244" opacity=".7" />
                    <path d="M0 160 C48 130 78 148 115 126 S185 112 220 135 S295 120 360 140 L360 160Z" fill="#123244" opacity=".72" />
                    <path d="M-10 118 C55 98 76 112 122 94 S195 80 230 95 S300 87 370 62" fill="none" stroke="#1c7180" strokeWidth="10" opacity=".55" />
                    <path d="M-10 118 C55 98 76 112 122 94 S195 80 230 95 S300 87 370 62" fill="none" stroke="#4cabb0" strokeWidth="2" opacity=".7" />
                    <path d="M5 38 C48 66 75 60 115 75 S175 98 214 77 S280 52 360 83" fill="none" stroke="#526d73" strokeWidth="2" opacity=".65" />
                    <path d="M36 155 C65 116 92 103 112 78 S140 35 178 5" fill="none" stroke="#7a8a78" strokeWidth="2" opacity=".7" />
                    <path d="M220 160 C222 120 246 96 258 68 S278 35 332 7" fill="none" stroke="#7a8a78" strokeWidth="2" opacity=".65" />
                    {navigationPreview && <>
                      <path d="M55 128 C105 110 112 85 150 88 S205 68 228 54 S278 42 315 25" fill="none" stroke="#071019" strokeWidth="11" strokeLinecap="round" opacity=".75" />
                      <path d="M55 128 C105 110 112 85 150 88 S205 68 228 54 S278 42 315 25" fill="none" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
                      <path d="M55 128 C105 110 112 85 150 88 S205 68 228 54 S278 42 315 25" fill="none" stroke="#b6f7ff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 7" />
                      <circle cx="55" cy="128" r="8" fill="#071019" stroke="#22d3ee" strokeWidth="4" /><circle cx="315" cy="25" r="8" fill="#ef4444" stroke="#fff" strokeWidth="3" />
                    </>}
                    <text x="80" y="38" fill="#8ba4aa" fontSize="9">România</text><text x="250" y="118" fill="#8ba4aa" fontSize="8">E85</text>
                  </svg>
                  <span className="absolute bottom-3 left-3 rounded-lg bg-[#071019]/85 px-2 py-1 text-[10px] text-slate-300">{locale === "ro" ? "Locația curentă" : "Current location"}</span>{navigationPreview && <span className="absolute right-3 top-3 max-w-[45%] truncate rounded-lg bg-[#071019]/85 px-2 py-1 text-[10px] text-slate-300">{navigationPreview.destination}</span>}
                </div>
              </div>
            </div>
          </section>

          <aside className={`no-scrollbar min-h-0 space-y-3 overflow-y-auto pl-1 ${activeTab === "home" ? "" : "hidden"}`}>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <SectionTitle
                icon={<Clock3 size={17} className="text-cyan-300" />}
                title={t("dashboard.recentActivity")}
              />

              <div className="space-y-4">
                {activity.map((item, index) => (
                  <div key={`${item.time}-${index}`} className="flex gap-3">
                    <div className="mt-0.5 text-cyan-300">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-5 text-slate-300">
                        {item.text}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <SectionTitle
                icon={<Sparkles size={17} className="text-yellow-300" />}
                title={locale === "ro" ? "Acțiuni rapide" : "Quick actions"}
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                 onClick={() =>
                 void sendAction("set_temperature", {
                  temperature: Math.min(30, temperature + 1),
                  })
                  } 
                  className="rounded-2xl bg-cyan-400/10 p-4 text-left transition hover:bg-cyan-400/20"
                >
                  <Sun size={19} className="text-cyan-300" />
                  <p className="mt-3 text-xs font-medium">{locale === "ro" ? "Mai cald" : "Warmer"}</p>
                </button>

                <button
                  onClick={() =>
                 void sendAction("set_temperature", {
                 temperature: Math.max(16, temperature - 1),
                 })
                }
                  className="rounded-2xl bg-blue-400/10 p-4 text-left transition hover:bg-blue-400/20"
                >
                  <Snowflake size={19} className="text-blue-300" />
                  <p className="mt-3 text-xs font-medium">{locale === "ro" ? "Mai rece" : "Cooler"}</p>
                </button>

                <button
                  onClick={() =>
                  void sendAction("set_fan_speed", {
                  fan_speed: Math.min(5, fanSpeed + 1),
                  })
                 }
                  className="rounded-2xl bg-purple-400/10 p-4 text-left transition hover:bg-purple-400/20"
                >
                  <Wind size={19} className="text-purple-300" />
                  <p className="mt-3 text-xs font-medium">{t("dashboard.fan")}</p>
                </button>

                <button
                  onClick={toggleAudio}
                  className="rounded-2xl bg-green-400/10 p-4 text-left transition hover:bg-green-400/20"
                >
                  <Radio size={19} className="text-green-300" />
                  <p className="mt-3 text-xs font-medium">{t("dashboard.radio")}</p>
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-300" />
                <div>
                  <p className="text-sm font-medium">{locale === "ro" ? "Mod sigur" : "Safe mode"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {locale === "ro" ? "Funcțiile de conducere sunt blocate" : "Driving functions are locked"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </>}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitCommand();
          }}
          className="mx-auto mb-20 mt-2 flex w-full max-w-2xl shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-[#101c28] p-2 shadow-2xl"
        >
          <Mic size={18} className="ml-3 text-cyan-300" />
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={t("dashboard.commandPlaceholder")}
            className="flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-slate-600"
          />
          <button className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#071019]">
            {t("dashboard.send")}
          </button>
        </form>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#08131d]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl justify-around px-2 py-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === "profile") setProfilePanelOpen(true);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-[10px] transition ${activeTab === item.id ? "text-cyan-300" : "text-slate-500 hover:text-slate-200"}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </nav>

      </div>
    </main>
  );
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const { locale, t, setLocale } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password, locale } : { email, password, password_confirmation: confirmation, locale }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Nu am putut finaliza autentificarea.");
      onAuthenticated(result.email);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071019] px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><CarFront size={24} /></div>
          <div><p className="font-semibold">In-Car AI</p><p className="text-xs text-slate-500">{locale === "ro" ? "Cabina ta, sincronizată în siguranță" : "Your cabin, safely synchronized"}</p></div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{mode === "login" ? t("auth.welcome") : t("auth.createAccount")}</h1>
          <button type="button" onClick={() => setLocale(locale === "ro" ? "en" : "ro")} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400">{locale.toUpperCase()}</button>
        </div>
        <p className="mt-2 text-sm text-slate-400">{mode === "login" ? t("auth.login") : t("auth.register")}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("auth.email")} className="w-full rounded-xl border border-white/10 bg-[#0b1823] px-4 py-3 text-sm outline-none transition focus:border-cyan-300/60" />
          <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("auth.password")} className="w-full rounded-xl border border-white/10 bg-[#0b1823] px-4 py-3 text-sm outline-none transition focus:border-cyan-300/60" />
          {mode === "register" && <input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={t("auth.confirmPassword")} className="w-full rounded-xl border border-white/10 bg-[#0b1823] px-4 py-3 text-sm outline-none transition focus:border-cyan-300/60" />}
          {error && <p className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#071019] transition hover:bg-cyan-300 disabled:opacity-50">{busy ? t("common.loading") : mode === "login" ? t("auth.loginButton") : t("auth.registerButton")}</button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="mt-5 w-full text-center text-sm text-slate-400 hover:text-cyan-200">{mode === "login" ? `${t("auth.noAccount")} ${t("auth.registerHere")}` : `${t("auth.hasAccount")} ${t("auth.loginHere")}`}</button>
      </div>
    </main>
  );
}

export default function Home() {
  const { t } = useI18n();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiFetch("/api/auth/me").then(async (response) => {
      if (response.ok) setEmail((await response.json()).email);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#071019] text-sm text-slate-400">{t("common.loading")}</main>;
  if (!email) return <AuthPage onAuthenticated={setEmail} />;
  return <Dashboard email={email} onLogout={() => { void apiFetch("/api/auth/logout", { method: "POST" }).then(() => setEmail(null)); }} />;
}

