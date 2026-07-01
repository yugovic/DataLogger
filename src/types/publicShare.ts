import type { PublicVehicleProfile } from '../lib/vehicleProfilePublic';

export interface PublicShareSummary {
  circuit: string;
  carModel: string;
  bestLap: string | null;
  sessionDate: Date;
  hasLoggerEvidence: boolean;
  vehicleProfileSnapshot: PublicVehicleProfile | null;
}

export interface PublicShare {
  id?: string;
  ownerId: string;
  setupId: string;
  createdAt: Date;
  summary: PublicShareSummary;
}
