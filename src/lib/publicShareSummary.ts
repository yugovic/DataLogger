import type { CarSetup } from '../types/setup';
import type { PublicShareSummary } from '../types/publicShare';

const PUBLIC_SHARE_ID_BYTES = 16;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export function generatePublicShareId(): string {
  const cryptoSource = globalThis.crypto;
  if (cryptoSource?.randomUUID) {
    return cryptoSource.randomUUID().replace(/-/g, '');
  }

  if (!cryptoSource?.getRandomValues) {
    throw new Error('Secure random generator is not available');
  }

  const bytes = new Uint8Array(PUBLIC_SHARE_ID_BYTES);
  cryptoSource.getRandomValues(bytes);
  return toHex(bytes);
}

export function buildShareSummary(setup: CarSetup): PublicShareSummary {
  const bestLap = setup.lapTimeData?.bestLap?.trim() || null;

  return {
    circuit: setup.circuit,
    carModel: setup.carModel,
    bestLap,
    sessionDate: new Date(setup.date.getTime()),
    hasLoggerEvidence: Boolean(setup.lapTimeData?.evidence),
    vehicleProfileSnapshot: setup.vehicleProfileSnapshot ?? null,
  };
}
