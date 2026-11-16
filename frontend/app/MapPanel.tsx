"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BriefcaseBusiness, Clock3, Crosshair, Heart, Home, LocateFixed, MapPin, MapPinned, Navigation, Pause, Play, RotateCcw, Route as RouteIcon, Search, Trash2, X, XCircle } from "lucide-react";
import { useI18n } from "./i18n/context";

type Coordinates = { lat: number; lon: number };
type SearchResult = Coordinates & { display_name: string };

type Route = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
};

type SavedRoute = {
  id: string;
  name: string;
  origin: SearchResult;
  destination: SearchResult;
  route: Route;
  savedAt: string;
};

type FavoriteAddress = {
  id: string;
  label: string;
  address: SearchResult;
};

type VehicleProfile = {
  id: string;
  name: string;
  make: string;
  model: string;
  fuel_type: "petrol" | "diesel" | "hybrid";
  consumption_l_per_100km: number;
  tank_capacity_l: number;
  current_fuel_l: number;
  fuel_price_per_l: number;
};

const STORAGE_KEY = "in-car-saved-routes";
const FAVORITES_KEY = "in-car-favorite-addresses";
const VEHICLES_KEY = "in-car-vehicle-profiles";
const RECENT_ROUTES_KEY = "in-car-recent-routes";
const ACTIVE_ROUTE_KEY = "in-car-active-route";
const NAVIGATION_RUNTIME_KEY = "in-car-navigation-runtime";
const API_URL = "http://localhost:8000";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

type FavoriteLabel = "home" | "work";

function favoriteLabelFromText(value: string): FavoriteLabel | null {
  const normalized = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(acasa|home|my home|house)\b/.test(normalized)) return "home";
  if (/\b(serviciu|serviciul|work|office|workplace)\b/.test(normalized)) return "work";
  return null;
}

function routesApi(path: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, { ...options, credentials: "include" });
}

function routePayload(route: SavedRoute) {
  return {
    name: route.name,
    origin: route.origin,
    destination: route.destination,
    route: route.route,
  };
}

function routeDisplayName(route: SavedRoute) {
  return route.name.replace(/\?{3,}/g, " → ");
}

function addressPayload(item: Pick<FavoriteAddress, "label" | "address">) {
  return { label: item.label, address: item.address };
}

function vehiclePayload(item: VehicleProfile) {
  return { name: item.name, make: item.make, model: item.model, fuel_type: item.fuel_type, consumption_l_per_100km: item.consumption_l_per_100km, tank_capacity_l: item.tank_capacity_l, current_fuel_l: item.current_fuel_l, fuel_price_per_l: item.fuel_price_per_l };
}

const carMapIcon = L.divIcon({
  className: "car-map-icon",
  html: '<div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#071019;border:2px solid #22d3ee;box-shadow:0 0 16px rgba(34,211,238,.7);font-size:20px;">🚗</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const formatDistanceValue = (meters: number, locale: "ro" | "en") =>
  meters >= 1000
    ? `${new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", { maximumFractionDigits: 1 }).format(meters / 1000)} km`
    : `${new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", { maximumFractionDigits: 0 }).format(Math.round(meters))} m`;

const formatDurationValue = (seconds: number, locale: "ro" | "en") => {
  const units = locale === "ro" ? { hour: "h", minute: "min" } : { hour: "h", minute: "min" };
  if (seconds <= 0) return `0 ${units.minute}`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} ${units.minute}`;
  return `${Math.floor(minutes / 60)} ${units.hour} ${minutes % 60} ${units.minute}`;
};

const formatArrivalTime = (seconds: number, locale: "ro" | "en") => new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(Date.now() + Math.max(0, seconds) * 1000));

async function geocode(query: string): Promise<SearchResult[]> {
  const response = await fetch(`${NOMINATIM_URL}?format=jsonv2&limit=5&countrycodes=ro&q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Adresa nu a putut fi căutată.");
  return response.json();
}

async function reverseCurrentLocation(): Promise<SearchResult | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`);
      const data = await response.json();
      resolve({ lat: coords.latitude, lon: coords.longitude, display_name: data.display_name || "Locația curentă" });
    } catch { resolve(null); }
  }, () => resolve(null)));
}

async function getRoutes(origin: Coordinates, destination: Coordinates): Promise<Route[]> {
  const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const response = await fetch(`${OSRM_URL}/${coordinates}?alternatives=true&overview=full&geometries=geojson`);
  if (!response.ok) throw new Error("Traseul nu a putut fi calculat.");
  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("Nu există un traseu disponibil între aceste locații.");
  return data.routes;
}

export default function MapPanel() {
  const { t, locale } = useI18n();
  const formatDistance = (meters: number) => formatDistanceValue(meters, locale);
  const formatDuration = (seconds: number) => formatDurationValue(seconds, locale);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const simulationMarkerRef = useRef<L.Marker | null>(null);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [origin, setOrigin] = useState<SearchResult | null>(null);
  const [destination, setDestination] = useState<SearchResult | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [recentRoutes, setRecentRoutes] = useState<SavedRoute[]>([]);
  const [favoriteAddresses, setFavoriteAddresses] = useState<FavoriteAddress[]>([]);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleDraft, setVehicleDraft] = useState<VehicleProfile | null>(null);
  const [simulationState, setSimulationState] = useState<"idle" | "running" | "paused" | "finished">("idle");
  const [simulationElapsed, setSimulationElapsed] = useState(0);
  const [simulationStartedAt, setSimulationStartedAt] = useState<number | null>(null);
  const [vehicleStatus, setVehicleStatus] = useState<"parked" | "moving">("parked");
  const [startRequested, setStartRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState("");
  const setError = (message: string) => {
    if (!message) {
      setErrorState("");
      return;
    }
    if (locale === "ro") {
      setErrorState(message);
      return;
    }
    const translations: Array<[string, string]> = [
      ["Calculează mai întâi un traseu.", "Calculate a route first."],
      ["Navigația a fost oprită.", "Navigation was stopped."],
      ["Cursa este pusă pe pauză.", "The trip is paused."],
      ["Cursa continuă.", "The trip is continuing."],
      ["Nu există o cursă activă.", "There is no active trip."],
      ["Traseul a fost calculat automat din comanda vocală.", "The route was calculated from the voice command."],
      ["Browserul nu oferă localizarea curentă.", "The browser does not provide the current location."],
      ["Locația curentă nu a putut fi identificată.", "The current location could not be identified."],
      ["Acordă permisiunea pentru locația curentă și încearcă din nou.", "Allow access to your current location and try again."],
      ["Selectează atât punctul de plecare, cât și destinația din rezultatele căutării.", "Select both the origin and destination from the search results."],
      ["Calcularea traseului a eșuat.", "Route calculation failed."],
      ["Traseul a fost eliminat din favorite.", "The route was removed from favorites."],
      ["Adresa nu a putut fi salvată.", "The address could not be saved."],
      ["Navigația nu a putut fi pornită.", "Navigation could not be started."],
      ["Cursa a fost anulată.", "The trip was cancelled."],
    ];
    const exact = translations.find(([romanian]) => message === romanian)?.[1];
    if (exact) {
      setErrorState(exact);
      return;
    }
    if (message.startsWith("Mai sunt aproximativ ")) setErrorState(message.replace("Mai sunt aproximativ ", "About ").replace(/\.$/, " remaining."));
    else if (message.startsWith("Calculez traseul vocal: ")) setErrorState(message.replace("Calculez traseul vocal: ", "Calculating voice route: "));
    else if (message.startsWith("Traseul „")) setErrorState(message.replace("Traseul „", "Route “").replace(" a fost salvat la favorite.", "” was saved to favorites."));
    else setErrorState(message);
  };
  const [suggestions, setSuggestions] = useState<{ field: "origin" | "destination"; values: SearchResult[] } | null>(null);
  const [navigationHydrated, setNavigationHydrated] = useState(false);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;
    const map = L.map(mapElement.current, { zoomControl: false }).setView([45.9432, 24.9668], 6);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    routeLayerRef.current = L.layerGroup().addTo(map);
    try {
      setSavedRoutes(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
      const storedFavorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as FavoriteAddress[];
      const migratedFavorites = storedFavorites.map((item) => ({ ...item, label: favoriteLabelFromText(item.label) ?? item.label }));
      setFavoriteAddresses(migratedFavorites);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(migratedFavorites));
      setRecentRoutes(JSON.parse(window.localStorage.getItem(RECENT_ROUTES_KEY) || "[]"));
      const activeRoute = JSON.parse(window.localStorage.getItem(ACTIVE_ROUTE_KEY) || "null") as { origin?: SearchResult; destination?: SearchResult; route?: Route } | null;
      if (activeRoute?.origin && activeRoute.destination && activeRoute.route) {
        setOrigin(activeRoute.origin);
        setDestination(activeRoute.destination);
        setOriginQuery(activeRoute.origin.display_name);
        setDestinationQuery(activeRoute.destination.display_name);
        setRoutes([activeRoute.route]);
        setSelectedRouteIndex(0);
      }
      const runtime = JSON.parse(window.localStorage.getItem(NAVIGATION_RUNTIME_KEY) || "null") as { state?: "idle" | "running" | "paused" | "finished"; elapsed?: number; startedAt?: number | null } | null;
      if (runtime?.state) {
        const elapsed = runtime.state === "running" && runtime.startedAt ? runtime.elapsed ?? 0 : runtime.elapsed ?? 0;
        setSimulationState(runtime.state);
        setSimulationElapsed(elapsed);
        setSimulationStartedAt(runtime.startedAt ?? null);
      }
    } catch {
      setSavedRoutes([]);
    }
    setNavigationHydrated(true);
    void routesApi("/api/state").then(async (response) => {
      if (!response.ok) return;
      const state = await response.json() as { vehicle_status?: "parked" | "moving" };
      if (state.vehicle_status === "parked" || state.vehicle_status === "moving") {
        setVehicleStatus(state.vehicle_status);
      }
    }).catch(() => undefined);
    void routesApi("/api/routes").then(async (response) => {
      if (!response.ok) return;
      const rows = await response.json() as Array<SavedRoute & { saved: boolean }>;
      const normalized = rows.map((row) => ({ ...row, id: String(row.id) }));
      setSavedRoutes(normalized.filter((row) => row.saved));
    }).catch(() => { /* folosim fallback-ul local până revine backend-ul */ });
    void routesApi("/api/vehicles").then(async (response) => {
      if (!response.ok) return;
      const rows = await response.json() as Array<VehicleProfile & { id: number }>;
      const normalized = rows.map((row) => ({ ...row, id: String(row.id) }));
      setVehicles(normalized);
      if (normalized[0]) setSelectedVehicleId(String(normalized[0].id));
      window.localStorage.setItem(VEHICLES_KEY, JSON.stringify(normalized));
    }).catch(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(VEHICLES_KEY) || "[]") as VehicleProfile[];
        setVehicles(stored);
        if (stored[0]) setSelectedVehicleId(stored[0].id);
      } catch { /* fără profil local */ }
    });
    void routesApi("/api/routes/recent").then(async (response) => {
      if (!response.ok) return;
      const rows = await response.json() as Array<SavedRoute & { saved: boolean }>;
      setRecentRoutes(rows.map((row) => ({ ...row, id: String(row.id) })).slice(0, 5));
    }).catch(() => { /* folosim fallback-ul local până revine backend-ul */ });
    void routesApi("/api/addresses").then(async (response) => {
      if (!response.ok) return;
      const rows = await response.json() as Array<FavoriteAddress & { id: number }>;
      setFavoriteAddresses(rows.map((row) => ({ ...row, id: String(row.id) })));
    }).catch(() => { /* folosim fallback-ul local până revine backend-ul */ });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const selectedRoute = useMemo(() => routes[selectedRouteIndex] ?? null, [routes, selectedRouteIndex]);
  const selectedVehicle = useMemo(() => vehicles.find((item) => item.id === selectedVehicleId) ?? vehicles[0] ?? null, [vehicles, selectedVehicleId]);
  const tripEstimate = selectedRoute && selectedVehicle ? {
    distanceKm: selectedRoute.distance / 1000,
    fuelNeeded: (selectedRoute.distance / 1000) * selectedVehicle.consumption_l_per_100km / 100,
    cost: (selectedRoute.distance / 1000) * selectedVehicle.consumption_l_per_100km / 100 * selectedVehicle.fuel_price_per_l,
  } : null;
  const selectedRouteRef = useRef<Route | null>(null);
  const simulationElapsedRef = useRef(0);
  const favoriteAddressesRef = useRef<FavoriteAddress[]>([]);
  const originRef = useRef<SearchResult | null>(null);
  const vehicleStatusRef = useRef<"parked" | "moving">("parked");

  useEffect(() => { selectedRouteRef.current = selectedRoute; }, [selectedRoute]);
  useEffect(() => { simulationElapsedRef.current = simulationElapsed; }, [simulationElapsed]);
  useEffect(() => { favoriteAddressesRef.current = favoriteAddresses; }, [favoriteAddresses]);
  useEffect(() => { originRef.current = origin; }, [origin]);
  useEffect(() => { vehicleStatusRef.current = vehicleStatus; }, [vehicleStatus]);

  useEffect(() => {
    if (vehicleStatus === "parked" && simulationState === "running") {
      setSimulationState("paused");
      setError(locale === "ro" ? "Navigația a fost pusă pe pauză deoarece autovehiculul este parcat." : "Navigation paused because the vehicle is parked.");
    }
  }, [vehicleStatus, simulationState, locale]);

  useEffect(() => {
    if (vehicleStatus === "moving" && startRequested && selectedRoute && simulationState !== "running" && simulationState !== "finished") {
      setStartRequested(false);
      startSimulation();
    }
  }, [vehicleStatus, startRequested, selectedRoute, simulationState]);

  useEffect(() => {
    const handleVehicleStatus = (event: Event) => {
      const status = (event as CustomEvent<"parked" | "moving">).detail;
      if (status === "parked" || status === "moving") setVehicleStatus(status);
    };
    window.addEventListener("vehicle-status-update", handleVehicleStatus);
    return () => window.removeEventListener("vehicle-status-update", handleVehicleStatus);
  }, []);

  useEffect(() => {
    const timer = simulationState === "running" ? window.setInterval(() => {
      setSimulationElapsed((value) => {
        const next = Math.min(selectedRoute?.duration ?? 0, value + 1);
        if (next >= (selectedRoute?.duration ?? 0)) setSimulationState("finished");
        return next;
      });
    }, 1000) : null;
    return () => { if (timer) window.clearInterval(timer); };
  }, [simulationState, selectedRoute]);

  useEffect(() => {
    if (!navigationHydrated) return;
    if (selectedRoute && origin && destination) {
      window.localStorage.setItem(ACTIVE_ROUTE_KEY, JSON.stringify({ origin, destination, route: selectedRoute }));
      window.localStorage.setItem(NAVIGATION_RUNTIME_KEY, JSON.stringify({ state: simulationState, elapsed: simulationElapsed, startedAt: simulationStartedAt }));
    }
  }, [navigationHydrated, selectedRoute, origin, destination, simulationState, simulationElapsed, simulationStartedAt]);

  useEffect(() => {
    if (!navigationHydrated || !selectedRoute || simulationState !== "running" || !simulationStartedAt) return;
    const elapsed = Math.floor((Date.now() - simulationStartedAt) / 1000);
    if (elapsed >= selectedRoute.duration) {
      setSimulationElapsed(selectedRoute.duration);
      setSimulationState("finished");
      return;
    }
    if (elapsed > simulationElapsed) setSimulationElapsed(elapsed);
  }, [navigationHydrated, selectedRoute, simulationState, simulationStartedAt, simulationElapsed]);

  useEffect(() => {
    if (!selectedRoute || !mapRef.current || !routeLayerRef.current) return;
    const points = selectedRoute.geometry.coordinates;
    const progress = selectedRoute.duration ? Math.min(1, simulationElapsed / selectedRoute.duration) : 0;
    const pointIndex = Math.min(points.length - 1, Math.floor(progress * (points.length - 1)));
    const [lon, lat] = points[pointIndex] ?? points[0];
    if (!simulationMarkerRef.current) {
      simulationMarkerRef.current = L.marker([lat, lon], { title: "Mașina", icon: carMapIcon }).addTo(routeLayerRef.current);
    } else {
      simulationMarkerRef.current.setLatLng([lat, lon]);
    }
    if (simulationState === "running" && mapRef.current) {
      const map = mapRef.current;
      const followZoom = Math.max(map.getZoom(), 17);
      map.setView([lat, lon], followZoom, { animate: true, duration: 0.5 });
    }
  }, [selectedRoute, simulationElapsed, simulationState]);

  useEffect(() => {
    const handleVoiceRoute = async (event: Event) => {
      const detail = (event as CustomEvent<string | { origin: string; destination: string }>).detail;
      const directRoute = typeof detail === "object" && detail ? detail : null;
      const text = typeof detail === "string" ? detail : "";
      const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const favoriteIntent = !/\b(?:de la|from)\b/.test(normalized) && favoriteLabelFromText(normalized)
        ? normalized.match(/(?:seteaza|calculeaza|porneste|navigheaza|navigate|go|take|traseul|ruta|route|trip|journey|du-ma)[^.!?]*(?:acasa|serviciu|serviciul|home|work|office|workplace)/)
        : null;
      if (favoriteIntent) {
        const favoriteLabel = favoriteLabelFromText(favoriteIntent[0]);
        if (favoriteLabel) await navigateToFavorite(favoriteLabel);
        return;
      }
      if (/porneste navigatia|incepe navigatia|start navigatia/.test(normalized)) {
        if (selectedRouteRef.current && vehicleStatusRef.current === "moving") setSimulationState("running");
        else if (selectedRouteRef.current) {
          setStartRequested(true);
          setError(locale === "ro" ? "Navigația este pregătită și va porni când autovehiculul intră în mers." : "Navigation is ready and will start when the vehicle begins moving.");
        }
        else setError("Calculează mai întâi un traseu.");
        return;
      }
      if (/opreste navigatia|termina navigatia|opreste cursa/.test(normalized)) {
        setSimulationState("idle");
        setError("Navigația a fost oprită.");
        return;
      }
      if (/pune pauza|pauza cursei|pauza navigatiei/.test(normalized)) {
        setSimulationState("paused");
        setError("Cursa este pusă pe pauză.");
        return;
      }
      if (/continua cursa|continua navigatia|reia cursa/.test(normalized)) {
        setSimulationState("running");
        setError("Cursa continuă.");
        return;
      }
      if (/care este timpul estimat|cat mai este|timpul estimat/.test(normalized)) {
        const activeRoute = selectedRouteRef.current;
        setError(activeRoute ? `Mai sunt aproximativ ${formatDuration(Math.max(0, activeRoute.duration - simulationElapsedRef.current))}.` : "Nu există o cursă activă.");
        return;
      }
      const commandWithoutExtraAction = normalized.split(/\s+(?:si|și)\s+(?=(?:porneste|opreste|calculeaza|seteaza)\b)/)[0];
      const match = ((commandWithoutExtraAction.match(/(?:traseul|ruta|traseu).*? de la (.+?) la (.+?)(?:$|[.!?])/) || commandWithoutExtraAction.match(/(?:traseul|ruta|traseu)\s+([^\s]+)\s+([^\s]+)$/)) ?? ["", "", ""]) as RegExpMatchArray;
      const routeOrigin = directRoute?.origin ?? match?.[1];
      const routeDestination = directRoute?.destination ?? match?.[2];
      if (!routeOrigin || !routeDestination) return;
      const displayOrigin = routeOrigin;
      const displayDestination = routeDestination;
      setError(`Calculez traseul vocal: ${match[1]} → ${match[2]}`);
      setLoading(true);
      try {
        let savedDestination: SearchResult | null = null;
        try {
          const storedFavorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as FavoriteAddress[];
          const favoriteLabel = favoriteLabelFromText(routeDestination);
          savedDestination = favoriteLabel
            ? storedFavorites.find((item) => item.label.toLowerCase() === favoriteLabel.toLowerCase())?.address ?? null
            : null;
        } catch { savedDestination = null; }
        const [originResult, destinationResult] = await Promise.all([geocode(routeOrigin), savedDestination ? Promise.resolve([savedDestination]) : geocode(routeDestination)]);
        if (!originResult[0] || !destinationResult[0]) throw new Error(locale === "ro" ? "Nu am găsit una dintre locațiile din comanda vocală." : "I could not find one of the locations from the voice command.");
        const nextOrigin = originResult[0];
        const nextDestination = destinationResult[0];
        const nextRoutes = await getRoutes(nextOrigin, nextDestination);
        setOrigin(nextOrigin); setDestination(nextDestination);
        setOriginQuery(nextOrigin.display_name); setDestinationQuery(nextDestination.display_name);
        setRoutes(nextRoutes); setSelectedRouteIndex(0); rememberRoute(nextOrigin, nextDestination, nextRoutes[0]); setError(locale === "ro" ? "Traseul a fost calculat automat din comanda vocală." : "The route was calculated from the voice command.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : (locale === "ro" ? "Comanda vocală pentru traseu nu a putut fi executată." : "The voice route command could not be completed."));
      } finally { setLoading(false); }
    };
    window.addEventListener("car-route-command", handleVoiceRoute);
    const pendingCommand = window.localStorage.getItem("pending-car-route-command");
    if (pendingCommand) {
      window.localStorage.removeItem("pending-car-route-command");
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("car-route-command", { detail: pendingCommand })), 0);
    }
    const pendingRoute = window.localStorage.getItem("pending-car-route-values");
    if (pendingRoute) {
      window.localStorage.removeItem("pending-car-route-values");
      try { window.setTimeout(() => window.dispatchEvent(new CustomEvent("car-route-command", { detail: JSON.parse(pendingRoute) })), 0); } catch { /* date invalide */ }
    }
    return () => window.removeEventListener("car-route-command", handleVoiceRoute);
  }, []);

  useEffect(() => {
    if (originQuery.trim().length < 3 || (origin && origin.display_name === originQuery)) return;
    const timer = window.setTimeout(async () => {
      try {
        const values = await geocode(originQuery);
        setSuggestions({ field: "origin", values });
      } catch {
        setSuggestions({ field: "origin", values: [] });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [originQuery]);

  useEffect(() => {
    if (destinationQuery.trim().length < 3 || (destination && destination.display_name === destinationQuery)) return;
    const timer = window.setTimeout(async () => {
      try {
        const values = await geocode(destinationQuery);
        setSuggestions({ field: "destination", values });
      } catch {
        setSuggestions({ field: "destination", values: [] });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [destinationQuery]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer || !selectedRoute || !origin || !destination) return;
    layer.clearLayers();
    simulationMarkerRef.current = null;
    const selectedCoordinates = selectedRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
    L.polyline(selectedCoordinates, { color: "#22d3ee", weight: 6, opacity: 0.9 }).addTo(layer);
    L.circleMarker([origin.lat, origin.lon], { radius: 9, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1 }).bindTooltip("Plecare").addTo(layer);
    L.circleMarker([destination.lat, destination.lon], { radius: 9, color: "#f97316", fillColor: "#f97316", fillOpacity: 1 }).bindTooltip("Destinație").addTo(layer);
    map.fitBounds(L.latLngBounds(selectedCoordinates), { padding: [32, 32] });
  }, [selectedRoute, origin, destination]);

  function selectSuggestion(field: "origin" | "destination", value: SearchResult) {
    if (field === "origin") {
      setOrigin(value);
      setOriginQuery(value.display_name);
    } else {
      setDestination(value);
      setDestinationQuery(value.display_name);
    }
    setSuggestions(null);
  }

  async function locateCurrentPosition(): Promise<SearchResult | null> {
    if (!navigator.geolocation) {
      setError("Browserul nu oferă localizarea curentă.");
      return null;
    }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`);
        const data = await response.json();
        const value = { lat: coords.latitude, lon: coords.longitude, display_name: data.display_name || "Locația curentă" };
        setOrigin(value);
        setOriginQuery(value.display_name);
        setError("");
      } catch {
        setError("Locația curentă nu a putut fi identificată.");
      }
    }, () => setError("Acordă permisiunea pentru locația curentă și încearcă din nou."));
    return null;
  }

  async function calculateRoute(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!originQuery.trim() || !destinationQuery.trim()) {
      setError("Selectează atât punctul de plecare, cât și destinația din rezultatele căutării.");
      return;
    }
    setLoading(true);
    try {
      let resolvedOrigin = origin;
      let resolvedDestination = destination;
      if (!resolvedOrigin) {
        const results = await geocode(originQuery.trim());
        if (!results[0]) throw new Error("Nu am găsit punctul de plecare.");
        resolvedOrigin = results[0];
        setOrigin(resolvedOrigin);
        setOriginQuery(resolvedOrigin.display_name);
      }
      if (!resolvedDestination) {
        const results = await geocode(destinationQuery.trim());
        if (!results[0]) throw new Error("Nu am găsit destinația.");
        resolvedDestination = results[0];
        setDestination(resolvedDestination);
        setDestinationQuery(resolvedDestination.display_name);
      }
      const nextRoutes = await getRoutes(resolvedOrigin, resolvedDestination);
      setRoutes(nextRoutes);
      setSelectedRouteIndex(0);
      rememberRoute(resolvedOrigin, resolvedDestination, nextRoutes[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Calcularea traseului a eșuat.");
    } finally {
      setLoading(false);
    }
  }

  async function generateAlternative() {
    if (!origin || !destination) {
      setError("Selectează punctul de plecare și destinația înainte de a cere o rută alternativă.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const nextRoutes = await getRoutes(origin, destination);
      if (nextRoutes.length < 2) {
        setError("Pentru acest traseu, serviciul de rutare nu a găsit o variantă alternativă.");
        return;
      }
      setRoutes(nextRoutes);
      setSelectedRouteIndex((selectedRouteIndex + 1) % nextRoutes.length);
      rememberRoute(origin, destination, nextRoutes[(selectedRouteIndex + 1) % nextRoutes.length]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ruta alternativă nu a putut fi calculată.");
    } finally {
      setLoading(false);
    }
  }

  function saveRoute() {
    if (!selectedRoute || !origin || !destination) return;
    const name = window.prompt(locale === "ro" ? "Numele traseului" : "Route name", `${origin.display_name.split(",")[0]} -> ${destination.display_name.split(",")[0]}`);
    if (!name?.trim()) return;
    const saved = { id: crypto.randomUUID(), name: name.trim(), origin, destination, route: selectedRoute, savedAt: new Date().toISOString() };
    const next = [saved, ...savedRoutes.filter((item) => item.origin.display_name !== origin.display_name || item.destination.display_name !== destination.display_name)].slice(0, 10);
    setSavedRoutes(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    void routesApi("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(routePayload(saved)) }).then(async (response) => { if (!response.ok) return; const row = await response.json() as { id: number }; setSavedRoutes((current) => current.map((item) => item.id === saved.id ? { ...item, id: String(row.id) } : item)); }).catch(() => { /* fallback local */ });
  }

  function removeSavedRoute(id: string) {
    const next = savedRoutes.filter((route) => route.id !== id);
    setSavedRoutes(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (/^\d+$/.test(id)) void routesApi(`/api/routes/${id}`, { method: "DELETE" }).catch(() => { /* fallback local */ });
    setError(locale === "ro" ? "Traseul a fost eliminat din favorite." : "The route was removed from favorites.");
  }

  function removeRecentRoute(id: string) {
    setRecentRoutes((current) => current.filter((route) => route.id !== id));
    try { window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(recentRoutes.filter((route) => route.id !== id))); } catch { /* fallback local */ }
    if (/^\d+$/.test(id)) void routesApi(`/api/routes/recent/${id}`, { method: "DELETE" }).catch(() => undefined);
  }

  function saveRecentRoute(recent: SavedRoute) {
    const name = window.prompt(locale === "ro" ? "Salvează traseul la favorite" : "Save route to favorites", recent.name);
    if (!name?.trim()) return;
    const saved = { ...recent, id: crypto.randomUUID(), name: name.trim(), savedAt: new Date().toISOString() };
    const next = [saved, ...savedRoutes.filter((item) => item.origin.display_name !== recent.origin.display_name || item.destination.display_name !== recent.destination.display_name)].slice(0, 10);
    setSavedRoutes(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    void routesApi("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(routePayload(saved)) }).catch(() => { /* fallback local */ });
    setError(locale === "ro" ? `Traseul „${name.trim()}” a fost salvat la favorite.` : `Route “${name.trim()}” was saved to favorites.`);
  }

  function rememberRoute(nextOrigin: SearchResult, nextDestination: SearchResult, nextRoute: Route) {
    const item = { id: crypto.randomUUID(), name: `${nextOrigin.display_name.split(",")[0]} → ${nextDestination.display_name.split(",")[0]}`, origin: nextOrigin, destination: nextDestination, route: nextRoute, savedAt: new Date().toISOString() };
    const next = [item, ...recentRoutes.filter((saved) => saved.origin.display_name !== nextOrigin.display_name || saved.destination.display_name !== nextDestination.display_name)].slice(0, 5);
    setRecentRoutes(next);
    window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));
    void routesApi("/api/routes/recent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(routePayload(item)) }).then(async (response) => {
      if (!response.ok) return;
      const row = await response.json() as { id: number };
      setRecentRoutes((current) => current.map((value) => value.id === item.id ? { ...value, id: String(row.id) } : value));
    }).catch(() => { /* fallback local */ });
  }

  function loadRoute(saved: SavedRoute) {
    setOrigin(saved.origin);
    setDestination(saved.destination);
    setOriginQuery(saved.origin.display_name);
    setDestinationQuery(saved.destination.display_name);
    setRoutes([saved.route]);
    setSelectedRouteIndex(0);
  }

  async function chooseFavorite(label: FavoriteLabel, forceAdd = false) {
    const displayLabel = label === "home" ? t("maps.home") : t("maps.work");
    let favorite = favoriteAddresses.find((item) => item.label.toLowerCase() === label.toLowerCase());
    if (forceAdd) favorite = undefined;
    if (!favorite) {
      const query = window.prompt(locale === "ro" ? `Introdu adresa pentru ${displayLabel}` : `Enter the address for ${displayLabel}`);
      if (!query?.trim()) return;
      setLoading(true);
      try {
        const results = await geocode(query.trim());
        if (!results[0]) throw new Error("Adresa nu a fost găsită.");
        favorite = { id: crypto.randomUUID(), label, address: results[0] };
        const next = [favorite, ...favoriteAddresses].slice(0, 20);
        setFavoriteAddresses(next);
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
        void routesApi("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addressPayload(favorite)) }).then(async (response) => {
          if (!response.ok) return;
          const row = await response.json() as { id: number };
          setFavoriteAddresses((current) => current.map((item) => item.id === favorite?.id ? { ...item, id: String(row.id) } : item));
        }).catch(() => undefined);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Adresa nu a putut fi salvată.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setSuggestions(null);
    setDestination(favorite.address);
    setDestinationQuery(favorite.address.display_name);
    void locateCurrentPosition();
    setError(locale === "ro" ? `Destinația ${displayLabel} este pregătită. Apasă „Calculează traseul”.` : `${displayLabel} is ready. Press “Calculate route”.`);
  }

  async function editFavorite(item: FavoriteAddress) {
    const query = window.prompt(locale === "ro" ? "Modifică adresa" : "Edit address", item.address.display_name);
    if (!query?.trim()) return;
    setLoading(true);
    try {
      const results = await geocode(query.trim());
      if (!results[0]) throw new Error("Adresa nu a fost găsită.");
      const updated = { ...item, address: results[0] };
      setFavoriteAddresses((current) => current.map((value) => value.id === item.id ? updated : value));
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteAddresses.map((value) => value.id === item.id ? updated : value)));
      if (/^\d+$/.test(item.id)) void routesApi(`/api/addresses/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addressPayload(updated)) }).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Adresa nu a putut fi modificată.");
    } finally { setLoading(false); }
  }

  function deleteFavorite(item: FavoriteAddress) {
    const next = favoriteAddresses.filter((value) => value.id !== item.id);
    setFavoriteAddresses(next);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    if (/^\d+$/.test(item.id)) void routesApi(`/api/addresses/${item.id}`, { method: "DELETE" }).catch(() => undefined);
  }

  async function addVehicle() {
    const make = window.prompt(locale === "ro" ? "Ce marcă este mașina?" : "What is the make?", "Dacia");
    if (!make?.trim()) return;
    const model = window.prompt(locale === "ro" ? "Ce model este?" : "What is the model?", "Logan");
    if (!model?.trim()) return;
    const yearText = window.prompt(locale === "ro" ? "Anul mașinii (opțional)" : "Car year (optional)", "");
    let lookupResponse: Response;
    try {
      lookupResponse = await routesApi("/api/vehicles/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ make: make.trim(), model: model.trim(), year: yearText ? Number(yearText) : null }) });
    } catch {
      setError(locale === "ro" ? "Backend-ul nu este disponibil pe localhost:8000. Pornește containerul backend și încearcă din nou." : "The backend is not available on localhost:8000. Start the backend container and try again.");
      return;
    }
    if (!lookupResponse.ok) {
      const result = await lookupResponse.json().catch(() => ({})) as { detail?: string };
      setError(result.detail || (locale === "ro" ? "AI-ul nu a putut identifica mașina." : "AI could not identify this car."));
      return;
    }
    const specs = await lookupResponse.json() as Omit<VehicleProfile, "id" | "name" | "current_fuel_l">;
    const vehicle: VehicleProfile = { id: crypto.randomUUID(), name: `${make.trim()} ${model.trim()}`, make: make.trim(), model: model.trim(), fuel_type: specs.fuel_type, consumption_l_per_100km: specs.consumption_l_per_100km, tank_capacity_l: specs.tank_capacity_l, current_fuel_l: specs.tank_capacity_l, fuel_price_per_l: specs.fuel_price_per_l };
    const response = await routesApi("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vehiclePayload(vehicle)) });
    if (response.ok) {
      const row = await response.json() as VehicleProfile & { id: number };
      vehicle.id = String(row.id);
    }
    const next = [vehicle, ...vehicles.filter((item) => item.name.toLowerCase() !== vehicle.name.toLowerCase())];
    setVehicles(next); setSelectedVehicleId(vehicle.id); window.localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
  }

  function editVehicle(vehicle: VehicleProfile) {
    setEditingVehicleId(vehicle.id);
    setVehicleDraft({ ...vehicle });
  }

  async function saveEditedVehicle() {
    if (!vehicleDraft) return;
    let response: Response;
    try {
      response = await routesApi(`/api/vehicles/${vehicleDraft.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vehiclePayload(vehicleDraft)) });
    } catch {
      setError(locale === "ro" ? "Backend-ul nu este disponibil. Modificările nu au fost salvate." : "The backend is unavailable. Changes were not saved.");
      return;
    }
    if (!response.ok) {
      setError(locale === "ro" ? "Profilul mașinii nu a putut fi salvat." : "The car profile could not be saved.");
      return;
    }
    const next = vehicles.map((item) => item.id === vehicleDraft.id ? vehicleDraft : item);
    setVehicles(next); window.localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
    setEditingVehicleId(null); setVehicleDraft(null);
  }

  function cancelEditVehicle() {
    setEditingVehicleId(null);
    setVehicleDraft(null);
  }

  function deleteVehicle(vehicle: VehicleProfile) {
    const next = vehicles.filter((item) => item.id !== vehicle.id);
    setVehicles(next); setSelectedVehicleId(next[0]?.id || ""); window.localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
    if (/^\d+$/.test(vehicle.id)) void routesApi(`/api/vehicles/${vehicle.id}`, { method: "DELETE" }).catch(() => undefined);
  }

  async function navigateToFavorite(label: FavoriteLabel) {
    const displayLabel = label === "home" ? t("maps.home") : t("maps.work");
    let favorite = favoriteAddressesRef.current.find((item) => item.label.toLowerCase() === label.toLowerCase());
    try {
      const storedFavorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as FavoriteAddress[];
      favorite = storedFavorites.find((item) => item.label.toLowerCase() === label.toLowerCase()) ?? favorite;
    } catch { /* folosim starea deja încărcată */ }
    if (!favorite) {
      setError(locale === "ro" ? `Nu există încă o adresă salvată pentru ${displayLabel}. Apasă butonul ${displayLabel} pentru a o adăuga.` : `No saved address exists for ${displayLabel}. Press the ${displayLabel} button to add one.`);
      return;
    }
    setLoading(true);
    try {
      const current = originRef.current ?? await reverseCurrentLocation();
      if (!current) throw new Error("Nu pot determina locația curentă pentru plecare.");
      const nextRoutes = await getRoutes(current, favorite.address);
      setOrigin(current); setOriginQuery(current.display_name);
      setDestination(favorite.address); setDestinationQuery(favorite.address.display_name);
      setRoutes(nextRoutes); setSelectedRouteIndex(0); rememberRoute(current, favorite.address, nextRoutes[0]); setSimulationState("idle"); setSimulationElapsed(0);
      setError(locale === "ro" ? `Traseul către ${displayLabel} este pregătit. Apasă „Pornește călătoria”.` : `The route to ${displayLabel} is ready. Press “Start trip”.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Navigația nu a putut fi pornită.");
    } finally { setLoading(false); }
  }

  function startSimulation() {
    if (!selectedRoute) return;
    if (vehicleStatus !== "moving") {
      setStartRequested(true);
      setError(locale === "ro" ? "Navigația este pregătită și va porni când autovehiculul intră în mers." : "Navigation is ready and will start when the vehicle begins moving.");
      return;
    }
    setStartRequested(false);
    const nextElapsed = simulationState === "finished" ? 0 : simulationElapsed;
    setSimulationElapsed(nextElapsed);
    setSimulationStartedAt(Date.now() - nextElapsed * 1000);
    if (mapRef.current) {
      const carPosition = simulationMarkerRef.current?.getLatLng();
      const startPosition = carPosition ?? (origin ? L.latLng(origin.lat, origin.lon) : null);
      if (startPosition) mapRef.current.setView(startPosition, 17, { animate: true });
    }
    setSimulationState("running");
  }

  function resetSimulation() {
    setStartRequested(false);
    setSimulationState("idle");
    setSimulationElapsed(0);
    setSimulationStartedAt(null);
  }

  function cancelSimulation() {
    setStartRequested(false);
    setSimulationState("idle");
    setSimulationElapsed(0);
    setSimulationStartedAt(null);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setOrigin(null);
    setDestination(null);
    setOriginQuery("");
    setDestinationQuery("");
    routeLayerRef.current?.clearLayers();
    simulationMarkerRef.current?.remove();
    simulationMarkerRef.current = null;
    window.localStorage.removeItem(ACTIVE_ROUTE_KEY);
    window.localStorage.removeItem(NAVIGATION_RUNTIME_KEY);
    setError("Cursa a fost anulată.");
  }

  function recenterMap() {
    const map = mapRef.current;
    if (!map) return;
    if (simulationMarkerRef.current) {
      const position = simulationMarkerRef.current.getLatLng();
      map.setView(position, 17, { animate: true });
      return;
    }
    if (selectedRoute) {
      const coordinates = selectedRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      map.fitBounds(L.latLngBounds(coordinates), { padding: [32, 32], maxZoom: 14, animate: true });
    }
  }

  const remainingSeconds = selectedRoute ? Math.max(0, selectedRoute.duration - simulationElapsed) : 0;
  const travelledDistance = selectedRoute ? selectedRoute.distance * (selectedRoute.duration ? simulationElapsed / selectedRoute.duration : 0) : 0;
  const navigationStatus = locale === "ro"
    ? (simulationState === "running" ? "Navigație activă" : simulationState === "paused" ? "Navigație pe pauză" : simulationState === "finished" ? "Cursă finalizată" : "Traseu pregătit")
    : (simulationState === "running" ? "Navigation active" : simulationState === "paused" ? "Navigation paused" : simulationState === "finished" ? "Trip finished" : "Route ready");

  useEffect(() => {
    const storageKey = "in-car-navigation-preview";
    if (!navigationHydrated) return;
    if (!selectedRoute || !origin || !destination) {
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event("car-navigation-update"));
      return;
    }
    const preview = {
      active: true,
      destination: destination.display_name.split(",")[0],
      distanceKm: selectedRoute.distance / 1000,
      remainingKm: Math.max(0, selectedRoute.distance - travelledDistance) / 1000,
      totalDuration: formatDuration(selectedRoute.duration),
      status: navigationStatus,
      remainingTime: formatDuration(remainingSeconds),
      durationSeconds: selectedRoute.duration,
      startedAt: simulationStartedAt,
      simulationState,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(preview));
    window.dispatchEvent(new Event("car-navigation-update"));
  }, [navigationHydrated, selectedRoute, origin, destination, travelledDistance, remainingSeconds, navigationStatus, simulationStartedAt, simulationState]);

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden pb-0 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="relative min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1823] shadow-2xl">
        <div ref={mapElement} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#071019]/20 via-transparent to-[#071019]/30" />
        <div className="absolute left-5 top-5 z-[500] hidden items-center gap-2 rounded-2xl border border-white/15 bg-[#071019]/85 px-4 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur md:flex">
          <MapPinned size={18} className="text-cyan-300" /> România
        </div>
        {selectedRoute && <button type="button" onClick={recenterMap} title="Recentrează pe mașină" className="absolute bottom-5 right-5 z-[500] flex items-center gap-2 rounded-xl border border-white/20 bg-[#071019]/90 px-3 py-2 text-xs font-medium text-white shadow-xl backdrop-blur transition hover:border-cyan-300/70 hover:text-cyan-200">
          <Crosshair size={15} /> Recentrează
        </button>}
        <div className="absolute bottom-5 left-5 z-[500] hidden rounded-xl border border-white/10 bg-[#071019]/80 px-3 py-2 text-[10px] text-slate-400 backdrop-blur md:block">OpenStreetMap · OSRM</div>
      </div>

      <div className="no-scrollbar min-h-0 space-y-3 overflow-y-auto pr-0.5">
        <form onSubmit={calculateRoute} className="rounded-3xl border border-white/15 bg-[#081522]/95 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div><div className="flex items-center gap-2 text-cyan-300"><MapPinned size={20} /><p className="font-heading text-base text-white">{t("maps.title")}</p></div><p className="mt-1 text-xs text-slate-400">{locale === "ro" ? "Alege punctul de plecare și destinația." : "Choose the origin and destination."}</p></div>
            <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium text-cyan-200">{locale === "ro" ? "2 pași" : "2 steps"}</span>
          </div>
          <div className="mt-5 space-y-3">
            <div className="relative"><label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{locale === "ro" ? "De unde pleci?" : "Where from?"}</label><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1823] px-3 focus-within:border-cyan-300/60"><Search size={16} className="shrink-0 text-cyan-300" /><input value={originQuery} onChange={(event) => { setOriginQuery(event.target.value); setOrigin(null); setSuggestions(null); }} placeholder={locale === "ro" ? "Locația curentă" : "Current location"} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />{originQuery && <button type="button" aria-label={locale === "ro" ? "Șterge plecarea" : "Clear origin"} onClick={() => { setOriginQuery(""); setOrigin(null); }}><X size={15} className="text-slate-500 hover:text-white" /></button>}</div><button type="button" onClick={() => void locateCurrentPosition()} className="mt-1.5 flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200"><LocateFixed size={13} /> {locale === "ro" ? "Folosește locația curentă" : "Use current location"}</button>{suggestions?.field === "origin" && <SuggestionList locale={locale} values={suggestions.values} onSelect={(value) => selectSuggestion("origin", value)} />}</div>
            <div className="relative"><label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{locale === "ro" ? "Unde mergi?" : "Where to?"}</label><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1823] px-3 focus-within:border-cyan-300/60"><MapPinned size={16} className="shrink-0 text-rose-300" /><input value={destinationQuery} onChange={(event) => { setDestinationQuery(event.target.value); setDestination(null); setSuggestions(null); }} placeholder={locale === "ro" ? "Caută o destinație" : "Search for a destination"} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />{destinationQuery && <button type="button" aria-label={locale === "ro" ? "Șterge destinația" : "Clear destination"} onClick={() => { setDestinationQuery(""); setDestination(null); }}><X size={15} className="text-slate-500 hover:text-white" /></button>}</div>{suggestions?.field === "destination" && <SuggestionList locale={locale} values={suggestions.values} onSelect={(value) => selectSuggestion("destination", value)} />}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void chooseFavorite("home")} className="flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2.5 text-left text-xs font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-400/20"><Home size={15} className="text-cyan-300" />{t("maps.home")}<span className="ml-auto text-[10px] text-cyan-300/70">{favoriteAddresses.some((item) => item.label === "home") ? t("maps.use") : t("maps.add")}</span></button><button type="button" onClick={() => void chooseFavorite("work")} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:border-cyan-300/50"><BriefcaseBusiness size={15} className="text-cyan-300" />{t("maps.work")}<span className="ml-auto text-[10px] text-slate-500">{favoriteAddresses.some((item) => item.label === "work") ? t("maps.use") : t("maps.add")}</span></button></div>
          {favoriteAddresses.length > 0 && <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between"><p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{locale === "ro" ? "Adresele mele" : "My addresses"}</p><div className="flex items-center gap-2"><button type="button" onClick={() => void chooseFavorite("home", true)} className="text-[10px] text-cyan-300 hover:text-white">+ {t("maps.home")}</button><button type="button" onClick={() => void chooseFavorite("work", true)} className="text-[10px] text-cyan-300 hover:text-white">+ {t("maps.work")}</button><span className="text-[10px] text-slate-500">{favoriteAddresses.length}</span></div></div>{favoriteAddresses.map((item) => <div key={item.id} className="flex items-center gap-2 text-xs"><button type="button" onClick={() => { setDestination(item.address); setDestinationQuery(item.address.display_name); }} className="min-w-0 flex-1 text-left"><p className="text-cyan-200">{item.label === "home" ? t("maps.home") : item.label === "work" ? t("maps.work") : item.label}</p><p className="truncate text-[10px] text-slate-500">{item.address.display_name}</p></button><button type="button" onClick={() => void editFavorite(item)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:text-cyan-200">{locale === "ro" ? "Modifică" : "Edit"}</button><button type="button" onClick={() => deleteFavorite(item)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-red-300" aria-label={locale === "ro" ? "Șterge adresa" : "Delete address"}><Trash2 size={13} /></button></div>)}</div>}
          <button disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 py-3 text-sm font-semibold text-[#071019] shadow-lg shadow-cyan-400/10 disabled:opacity-50"><Search size={16} />{loading ? (locale === "ro" ? "Se calculează..." : "Calculating...") : (locale === "ro" ? "Calculează traseul" : "Calculate route")}</button>
          {error && <p className="mt-3 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-200">{error}</p>}
        </form>

        {selectedRoute && <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/5 p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="font-heading text-sm text-white">{locale === "ro" ? "Traseu calculat" : "Calculated route"}</p><p className="mt-1 text-xs text-slate-400">{formatDistance(selectedRoute.distance)} · {formatDuration(selectedRoute.duration)}</p></div><div className="flex items-center gap-2"><button onClick={saveRoute} className="rounded-xl border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10">{t("common.save")}</button></div></div>
          <button onClick={() => void generateAlternative()} disabled={loading} className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">{locale === "ro" ? "Generează rută alternativă" : "Generate alternative route"}</button>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1823] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${simulationState === "running" ? "border-emerald-300 bg-emerald-400/10 text-emerald-300" : "border-cyan-300/50 bg-cyan-400/10 text-cyan-200"}`}><Navigation size={20} /></div><div className="min-w-0"><p className="text-sm font-semibold text-cyan-200">{navigationStatus}</p><p className="mt-1 truncate text-xs text-slate-400">{simulationState === "running" ? (locale === "ro" ? "Mergi către destinație" : "Driving to destination") : (locale === "ro" ? "Pornește simularea pentru navigație" : "Start the navigation simulation")}</p></div></div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${selectedRoute.duration ? Math.min(100, simulationElapsed / selectedRoute.duration * 100) : 0}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs lg:grid-cols-3">
              <div className="min-h-[72px] rounded-xl bg-white/5 p-3"><div className="flex items-center gap-1.5 text-slate-400"><RouteIcon size={15} className="text-cyan-300" /><p>{locale === "ro" ? "Parcurs" : "Travelled"}</p></div><p className="mt-2 font-medium text-white">{formatDistance(travelledDistance)}</p></div>
              <div className="min-h-[72px] rounded-xl bg-white/5 p-3"><div className="flex items-center gap-1.5 text-slate-400"><MapPin size={15} className="text-cyan-300" /><p>{locale === "ro" ? "Rămas" : "Remaining"}</p></div><p className="mt-2 font-medium text-white">{formatDistance(Math.max(0, selectedRoute.distance - travelledDistance))}</p></div>
              <div className="min-h-[72px] rounded-xl bg-white/5 p-3"><div className="flex items-center gap-1.5 text-slate-400"><Clock3 size={15} className="text-cyan-300" /><p>{locale === "ro" ? "Sosire" : "Arrival"}</p></div><p className="mt-2 font-medium text-white">{formatArrivalTime(remainingSeconds, locale)}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={startSimulation} disabled={simulationState === "running" || simulationState === "finished"} className="col-span-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 py-3 text-xs font-semibold text-[#071019] disabled:opacity-40"><Play size={14} />{simulationState === "finished" ? (locale === "ro" ? "Cursă finalizată" : "Trip finished") : vehicleStatus !== "moving" ? (startRequested ? (locale === "ro" ? "În așteptarea pornirii" : "Waiting to start") : (locale === "ro" ? "Pregătește navigația" : "Prepare navigation")) : simulationState === "paused" ? (locale === "ro" ? "Continuă călătoria" : "Resume trip") : (locale === "ro" ? "Pornește călătoria" : "Start trip")}</button>
              <button onClick={() => setSimulationState("paused")} disabled={simulationState !== "running"} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-slate-300 disabled:opacity-40"><Pause size={14} /><span>{locale === "ro" ? "Pauză" : "Pause"}</span></button>
              <button onClick={cancelSimulation} disabled={simulationState !== "running" && simulationState !== "paused"} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-300/40 px-3 py-2 text-red-300 transition hover:border-red-300/60 hover:bg-red-400/10 disabled:opacity-40" title={locale === "ro" ? "Oprește cursa" : "Stop trip"}><XCircle size={14} /><span>{locale === "ro" ? "Oprește" : "Stop"}</span></button>
              <button onClick={resetSimulation} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-slate-300" title={locale === "ro" ? "Resetează cursa" : "Reset trip"}><RotateCcw size={14} /><span>{locale === "ro" ? "Reset" : "Reset"}</span></button>
            </div>
          </div>
        </div>}

        {selectedRoute && <div className="rounded-3xl border border-amber-300/20 bg-amber-400/5 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">{locale === "ro" ? "Estimare pentru mașină" : "Car estimate"}</p><p className="mt-1 text-xs text-slate-400">{locale === "ro" ? "Alege profilul mașinii pentru consum și cost." : "Choose a car profile for fuel and cost estimates."}</p></div><button type="button" onClick={() => void addVehicle()} className="rounded-xl border border-amber-300/30 px-3 py-2 text-xs text-amber-200 hover:bg-amber-400/10">+ {locale === "ro" ? "Mașină" : "Car"}</button></div>
          {selectedVehicle ? <>
            {editingVehicleId === selectedVehicle.id && vehicleDraft ? <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-[#0b1823] p-3"><div className="grid grid-cols-2 gap-2 text-xs"><label className="text-slate-400">{locale === "ro" ? "Combustibil" : "Fuel"}<select value={vehicleDraft.fuel_type} onChange={(event) => setVehicleDraft({ ...vehicleDraft, fuel_type: event.target.value as VehicleProfile["fuel_type"] })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#071019] px-2 py-2 text-white"><option value="petrol">Benzină</option><option value="diesel">Motorină</option><option value="hybrid">Hybrid</option></select></label><label className="text-slate-400">{locale === "ro" ? "Consum L/100 km" : "Consumption L/100 km"}<input type="number" step="0.1" min="0.1" value={vehicleDraft.consumption_l_per_100km} onChange={(event) => setVehicleDraft({ ...vehicleDraft, consumption_l_per_100km: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#071019] px-2 py-2 text-white" /></label><label className="text-slate-400">{locale === "ro" ? "Rezervor L" : "Tank L"}<input type="number" step="0.1" min="1" value={vehicleDraft.tank_capacity_l} onChange={(event) => setVehicleDraft({ ...vehicleDraft, tank_capacity_l: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#071019] px-2 py-2 text-white" /></label><label className="text-slate-400">{locale === "ro" ? "Litri actuali" : "Current litres"}<input type="number" step="0.1" min="0" value={vehicleDraft.current_fuel_l} onChange={(event) => setVehicleDraft({ ...vehicleDraft, current_fuel_l: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#071019] px-2 py-2 text-white" /></label><label className="col-span-2 text-slate-400">{locale === "ro" ? "Preț lei/L" : "Price lei/L"}<input type="number" step="0.01" min="0" value={vehicleDraft.fuel_price_per_l} onChange={(event) => setVehicleDraft({ ...vehicleDraft, fuel_price_per_l: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#071019] px-2 py-2 text-white" /></label></div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={cancelEditVehicle} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">{locale === "ro" ? "Anulează" : "Cancel"}</button><button type="button" onClick={() => void saveEditedVehicle()} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-[#071019]">{locale === "ro" ? "Salvează" : "Save"}</button></div></div> : <div className="mt-3 flex items-center gap-2"><select value={selectedVehicle.id} onChange={(event) => setSelectedVehicleId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1823] px-3 py-2 text-xs text-white outline-none">{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select><button type="button" onClick={() => editVehicle(selectedVehicle)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">{locale === "ro" ? "Modifică" : "Edit"}</button><button type="button" onClick={() => deleteVehicle(selectedVehicle)} className="rounded-xl border border-red-300/20 px-3 py-2 text-xs text-red-300">{locale === "ro" ? "Șterge" : "Delete"}</button></div>}
            {tripEstimate && <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500">{locale === "ro" ? "Distanță" : "Distance"}</p><p className="mt-1 font-semibold text-white">{tripEstimate.distanceKm.toFixed(0)} km</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500">{locale === "ro" ? "Consum" : "Fuel needed"}</p><p className="mt-1 font-semibold text-white">{tripEstimate.fuelNeeded.toFixed(1)} L</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500">{locale === "ro" ? "Cost estimat" : "Estimated cost"}</p><p className="mt-1 font-semibold text-white">{tripEstimate.cost.toFixed(0)} lei</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500">{locale === "ro" ? "Alimentare" : "Refuel"}</p><p className={`mt-1 font-semibold ${selectedVehicle.current_fuel_l < tripEstimate.fuelNeeded ? "text-rose-300" : "text-emerald-300"}`}>{selectedVehicle.current_fuel_l < tripEstimate.fuelNeeded ? (locale === "ro" ? `Da, lipsesc ${(tripEstimate.fuelNeeded - selectedVehicle.current_fuel_l).toFixed(1)} L` : `Yes, add ${(tripEstimate.fuelNeeded - selectedVehicle.current_fuel_l).toFixed(1)} L`) : (locale === "ro" ? "Nu este necesară" : "Not needed")}</p></div></div>}
            <p className="mt-3 text-[11px] text-slate-500">{locale === "ro" ? `Valorile au fost identificate de AI și pot fi modificate. Consum: ${selectedVehicle.consumption_l_per_100km} L/100 km · ${selectedVehicle.fuel_price_per_l.toFixed(2)} lei/L · rezervor curent: ${selectedVehicle.current_fuel_l.toFixed(1)} L.` : `Values identified by AI and editable. Consumption: ${selectedVehicle.consumption_l_per_100km} L/100 km · ${selectedVehicle.fuel_price_per_l.toFixed(2)} lei/L · current tank: ${selectedVehicle.current_fuel_l.toFixed(1)} L.`}</p>
          </> : <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-slate-400">{locale === "ro" ? "Spune-mi ce mașină conduci și salvează primul profil pentru a calcula consumul." : "Add your car profile to calculate fuel usage."}</p>}
        </div>}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium text-white">{locale === "ro" ? "Trasee salvate" : "Saved routes"}</p><span className="text-[10px] text-slate-500">{savedRoutes.length}</span></div><div className="mt-3 space-y-2">{savedRoutes.length ? savedRoutes.map((saved) => <div key={saved.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition hover:border-cyan-300/50"><button onClick={() => loadRoute(saved)} className="min-w-0 flex-1 text-left text-xs"><p className="truncate text-slate-200">{routeDisplayName(saved)}</p><p className="mt-1 text-[10px] text-slate-500">{formatDistance(saved.route.distance)} · {formatDuration(saved.route.duration)}</p></button><button type="button" onClick={() => removeSavedRoute(saved.id)} aria-label={locale === "ro" ? `Elimină ${routeDisplayName(saved)} din favorite` : `Remove ${routeDisplayName(saved)} from favorites`} title={locale === "ro" ? "Elimină din favorite" : "Remove from favorites"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-300/50 hover:text-red-300"><Trash2 size={14} /></button></div>) : <p className="text-xs text-slate-500">{locale === "ro" ? "Traseele salvate vor apărea aici." : "Saved routes will appear here."}</p>}</div></div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium text-white">{locale === "ro" ? "Trasee recente" : "Recent routes"}</p><span className="text-[10px] text-slate-500">{recentRoutes.length}</span></div><div className="mt-3 space-y-2">{recentRoutes.length ? recentRoutes.map((recent) => <div key={recent.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition hover:border-cyan-300/50"><button onClick={() => loadRoute(recent)} className="min-w-0 flex-1 text-left text-xs"><p className="truncate text-slate-200">{recent.name}</p><p className="mt-1 text-[10px] text-slate-500">{formatDistance(recent.route.distance)} · {formatDuration(recent.route.duration)}</p></button><button type="button" onClick={() => saveRecentRoute(recent)} aria-label={locale === "ro" ? "Salvează traseul la favorite" : "Save route to favorites"} title={locale === "ro" ? "Salvează la favorite" : "Save to favorites"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-rose-300/50 hover:text-rose-300"><Heart size={15} /></button><button type="button" onClick={() => removeRecentRoute(recent.id)} aria-label={locale === "ro" ? "Șterge traseul recent" : "Delete recent route"} title={locale === "ro" ? "Șterge traseul" : "Delete route"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-300/50 hover:text-red-300"><Trash2 size={14} /></button></div>) : <p className="text-xs text-slate-500">{locale === "ro" ? "Nu există trasee recente." : "There are no recent routes."}</p>}</div></div>
      </div>
    </section>
  );
}

function SuggestionList({ values, locale, onSelect }: { values: SearchResult[]; locale: "ro" | "en"; onSelect: (value: SearchResult) => void }) {
  return <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#101c28] shadow-xl">{values.length ? values.map((value) => <button type="button" key={`${value.lat}-${value.lon}`} onMouseDown={() => onSelect(value)} className="block w-full border-b border-white/5 px-3 py-3 text-left text-xs text-slate-300 last:border-0 hover:bg-cyan-400/10">{value.display_name}</button>) : <p className="px-3 py-3 text-xs text-slate-500">{locale === "ro" ? "Nicio locație găsită." : "No locations found."}</p>}</div>;
}

