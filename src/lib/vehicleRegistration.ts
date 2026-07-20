import type { CarSetup } from '../types/setup';
import type { Vehicle } from '../types/vehicle';

export interface VehicleCandidate {
  name: string;
  make: string;
  model: string;
}

export const normalizeVehicleName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const vehicleName = (vehicle: Pick<Vehicle, 'make' | 'model'>): string =>
  `${vehicle.make} ${vehicle.model}`.trim().replace(/\s+/g, ' ');

export const splitCarModel = (carModel: string): VehicleCandidate => {
  const name = carModel.trim().replace(/\s+/g, ' ');
  const [make = 'Unknown', ...modelParts] = name.split(' ');
  return {
    name,
    make,
    model: modelParts.join(' ') || 'Unknown',
  };
};

export const findVehicleByCarModel = (
  vehicles: readonly Vehicle[],
  carModel: string,
): Vehicle | undefined => {
  const key = normalizeVehicleName(carModel);
  return vehicles.find((vehicle) => normalizeVehicleName(vehicleName(vehicle)) === key);
};

/**
 * 履歴には存在するが車両コレクションには存在しない車種を返す。
 * 非アクティブ車両も「登録済み」とみなし、削除後の再生成候補には含めない。
 */
export const buildVehicleCandidates = (
  setups: readonly CarSetup[],
  allVehicles: readonly Vehicle[],
): VehicleCandidate[] => {
  const registered = new Set(allVehicles.map((vehicle) => normalizeVehicleName(vehicleName(vehicle))));
  const candidates = new Map<string, VehicleCandidate>();

  setups.forEach((setup) => {
    const candidate = splitCarModel(setup.carModel || '');
    if (!candidate.name) return;
    const key = normalizeVehicleName(candidate.name);
    if (!registered.has(key) && !candidates.has(key)) {
      candidates.set(key, candidate);
    }
  });

  return [...candidates.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
};
