import { estimateModLevel, ModLevel } from './modLevel';
import { ModCategory, TireClass, VehicleProfile } from '../types/vehicle';

export interface PublicVehicleProfile {
  modifications: Array<{ category: ModCategory; partName: string; maker: string | null }>;
  tireClass: TireClass | null;
  powerPs: number | null;
  weightKg: number | null;
  modLevel: ModLevel;
}

export function toPublicVehicleProfile(profile: VehicleProfile): PublicVehicleProfile {
  return {
    modifications: profile.modifications
      .filter((modification) => modification.removedAt === null)
      .map((modification) => ({
        category: modification.category,
        partName: modification.partName,
        maker: modification.maker,
      })),
    tireClass: profile.tireClass,
    powerPs: profile.powerPs,
    weightKg: profile.weightKg,
    modLevel: estimateModLevel(profile.modifications),
  };
}
