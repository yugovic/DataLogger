export type TireSetStatus = 'active' | 'stored' | 'retired';

/** ユーザーが所有する物理的なタイヤセット。走行実績はセットアップ記録から集計する。 */
export interface TireSet {
  id?: string;
  userId: string;
  code: string;
  manufacturer: string;
  productName: string;
  compound: string;
  frontSize: string;
  rearSize: string;
  primaryVehicleId: string | null;
  status: TireSetStatus;
  startedAt: Date | null;
  initialDistanceKm: number;
  initialLaps: number;
  initialHeatCycles: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TireSetInput = Omit<TireSet, 'id' | 'createdAt' | 'updatedAt'>;

export interface TireSetUsageSummary {
  distanceKm: number;
  laps: number;
  heatCycles: number;
  sessionCount: number;
}
