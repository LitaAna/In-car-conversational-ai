export type VehicleStatus = {
  batteryLevel: number;
  fullRangeKm: number;
  consumptionPer100Km: number;
  consumptionUnit: string;
  costPerKm: number;
  nextServiceKm: number;
  recommendedStation: {
    name: string;
    distanceKm: number;
    chargeTimeMin: number;
  };
};

export async function fetchVehicleStatus(): Promise<VehicleStatus> {
  return {
    batteryLevel: 62,
    fullRangeKm: 420,
    consumptionPer100Km: 18.4,
    consumptionUnit: "kWh",
    costPerKm: 0.48,
    nextServiceKm: 1200,
    recommendedStation: {
      name: "Stație MPGE Otopeni",
      distanceKm: 74,
      chargeTimeMin: 35,
    },
  };
}