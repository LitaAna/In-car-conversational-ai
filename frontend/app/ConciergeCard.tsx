"use client";

import { useEffect, useState } from "react";
import { BatteryMedium, CalendarDays, Fuel, TriangleAlert, Wrench } from "lucide-react";
import { fetchVehicleStatus, VehicleStatus } from "./vehicle-status";
import { useI18n } from "./i18n/context";

const formatDistance = (km: number) => km >= 1 ? `${km.toFixed(0)} km` : `${Math.round(km * 1000)} m`;

export default function ConciergeCard({ routeDistanceMeters }: { routeDistanceMeters?: number }) {
  const { locale, formatNumber } = useI18n();
  const [status, setStatus] = useState<VehicleStatus | null>(null);

  useEffect(() => {
    void fetchVehicleStatus().then(setStatus);
  }, []);

  if (!status) return null;

  const remainingRangeKm = status.fullRangeKm * (status.batteryLevel / 100);
  const routeDistanceKm = routeDistanceMeters ? routeDistanceMeters / 1000 : null;
  const insufficientRange = routeDistanceKm !== null && routeDistanceKm > remainingRangeKm;
  const estimatedCost = routeDistanceKm !== null ? Math.round(routeDistanceKm * status.costPerKm) : null;

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-2 text-base font-semibold text-white">
          <BatteryMedium size={21} className="text-emerald-300" />
          <span>{locale === "ro" ? "Vehicul" : "Vehicle"}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300/15 bg-[#0b1823] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">{locale === "ro" ? "Autonomie" : "Range"}</p>
              <p className="text-xl font-bold text-white">{status.batteryLevel}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700/70">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${status.batteryLevel}%` }} />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-300">{formatDistance(remainingRangeKm)} <span className="font-normal text-slate-400">{locale === "ro" ? "rămași" : "remaining"}</span></p>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-[#0b1823] p-4">
            <div className="flex items-start gap-3">
              <Fuel size={20} className="mt-0.5 shrink-0 text-cyan-300" />
              <div>
                <p className="text-sm font-medium text-slate-300">{locale === "ro" ? "Încărcare recomandată în" : "Recommended charging in"}</p>
                <p className="mt-1 text-xl font-bold text-white">{formatDistance(status.recommendedStation.distanceKm)}</p>
                <p className="mt-1 text-sm text-slate-400">{status.recommendedStation.chargeTimeMin} min {locale === "ro" ? "încărcare" : "charging"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
          <span className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">{locale === "ro" ? "Consum" : "Consumption"} <strong className="ml-1 text-white">{status.consumptionPer100Km} {status.consumptionUnit}/100 km</strong></span>
          {estimatedCost !== null && <span className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">Cost <strong className="ml-1 text-white">{estimatedCost} lei</strong></span>}
          {routeDistanceKm !== null && <span className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">{locale === "ro" ? "Traseu" : "Route"} <strong className="ml-1 text-white">{formatDistance(routeDistanceKm)}</strong></span>}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Wrench size={20} className="text-cyan-300" />
          <div>
            <p className="text-sm font-medium text-cyan-200">Service</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
              <CalendarDays size={16} className="text-cyan-300" />
              {locale === "ro" ? "Următoarea revizie în" : "Next service in"} <span className="font-semibold text-white">{formatNumber(status.nextServiceKm)} km</span>
            </p>
          </div>
        </div>
        <span className="text-2xl text-slate-400">›</span>
      </div>

      {insufficientRange && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-300/30 bg-red-400/10 p-3 text-xs text-red-200">
          <TriangleAlert size={16} />
          {locale === "ro" ? "Autonomia nu este suficientă pentru acest traseu. Recomandăm o oprire de încărcare." : "The range is not sufficient for this route. We recommend a charging stop."}
        </div>
      )}
    </div>
  );
}

