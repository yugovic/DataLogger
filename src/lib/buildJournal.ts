import type { CarSetup } from '../types/setup';
import type { ModificationEntry, Vehicle } from '../types/vehicle';
import { lapTimeToMs } from './setupFields';

// セットアップから抽出する走行セッション（呼び出し側で整形して渡す）
export interface JournalSession {
  setupId: string;
  date: Date;
  circuit: string;
  bestLapSeconds: number | null;
}

// タイムライン上のイベント（改造と走行を時系列マージ）
export type JournalEvent =
  | { kind: 'mod'; date: Date; modification: ModificationEntry }
  | { kind: 'session'; date: Date; session: JournalSession; isCircuitBest: boolean };

// 改造前後のタイム変化注釈
export interface ModImpact {
  modificationId: string;
  circuit: string;
  beforeBestSeconds: number;
  afterBestSeconds: number;
  deltaSeconds: number;
  costJPY: number | null;
  yenPerSecond: number | null;
}

type SessionWithLap = JournalSession & { bestLapSeconds: number };

const isFiniteLapSession = (session: JournalSession): session is SessionWithLap =>
  typeof session.bestLapSeconds === 'number' && Number.isFinite(session.bestLapSeconds);

const byDateAsc = <T extends { date: Date }>(a: T, b: T): number =>
  a.date.getTime() - b.date.getTime();

const eventPriority = (event: JournalEvent): number => (event.kind === 'session' ? 0 : 1);

/** 既存の lapTimeToMs を再利用して、表示用ラップタイム文字列を秒へ変換する。 */
export function parseLapTimeToSeconds(lapTime: string): number | null {
  const ms = lapTimeToMs(lapTime);
  return ms === null ? null : ms / 1000;
}

export function toJournalSessions(setups: CarSetup[], vehicle: Vehicle): JournalSession[] {
  const targetCarModel = `${vehicle.make} ${vehicle.model}`;

  return setups
    // vehicleId で紐付いたセットアップを優先し、未紐付けの旧データは車種名の一致で対応付ける
    .filter((setup) => (setup.vehicleId ? setup.vehicleId === vehicle.id : setup.carModel === targetCarModel))
    .map((setup) => ({
      setupId: setup.id ?? '',
      date: setup.date,
      circuit: setup.circuit,
      bestLapSeconds: setup.lapTimeData?.bestLap
        ? parseLapTimeToSeconds(setup.lapTimeData.bestLap)
        : null,
    }))
    .sort(byDateAsc);
}

export function buildJournalTimeline(
  modifications: ModificationEntry[],
  sessions: JournalSession[],
): JournalEvent[] {
  const bestByCircuit = new Map<string, number>();
  const bestUpdateBySessionIndex = new Map<number, boolean>();

  sessions
    .map((session, index) => ({ session, index }))
    .sort((a, b) => byDateAsc(a.session, b.session) || a.index - b.index)
    .forEach(({ session, index }) => {
      if (!isFiniteLapSession(session)) {
        bestUpdateBySessionIndex.set(index, false);
        return;
      }

      const previousBest = bestByCircuit.get(session.circuit);
      const isCircuitBest = previousBest === undefined || session.bestLapSeconds < previousBest;
      bestUpdateBySessionIndex.set(index, isCircuitBest);

      if (isCircuitBest) {
        bestByCircuit.set(session.circuit, session.bestLapSeconds);
      }
    });

  const modEvents: JournalEvent[] = modifications
    .filter((modification) => modification.installedAt !== null)
    .map((modification) => ({
      kind: 'mod',
      date: modification.installedAt as Date,
      modification,
    }));

  const sessionEvents: JournalEvent[] = sessions.map((session, index) => ({
    kind: 'session',
    date: session.date,
    session,
    isCircuitBest: bestUpdateBySessionIndex.get(index) ?? false,
  }));

  return [...modEvents, ...sessionEvents].sort(
    (a, b) => byDateAsc(a, b) || eventPriority(a) - eventPriority(b),
  );
}

export function computeModImpacts(
  modifications: ModificationEntry[],
  sessions: JournalSession[],
): ModImpact[] {
  const sessionsWithLap = sessions.filter(isFiniteLapSession);
  const circuits = Array.from(new Set(sessionsWithLap.map((session) => session.circuit)))
    .sort((a, b) => a.localeCompare(b, 'ja'));
  const installedModifications = modifications
    .filter((modification): modification is ModificationEntry & { installedAt: Date } =>
      modification.installedAt !== null,
    )
    .sort((a, b) => a.installedAt.getTime() - b.installedAt.getTime());

  return installedModifications.flatMap((modification) => {
    const installedAt = modification.installedAt.getTime();

    return circuits.flatMap((circuit) => {
      const sameCircuitSessions = sessionsWithLap.filter((session) => session.circuit === circuit);
      const before = sameCircuitSessions
        .filter((session) => session.date.getTime() <= installedAt)
        .map((session) => session.bestLapSeconds);
      const after = sameCircuitSessions
        .filter((session) => session.date.getTime() > installedAt)
        .map((session) => session.bestLapSeconds);

      if (before.length === 0 || after.length === 0) return [];

      const beforeBestSeconds = Math.min(...before);
      const afterBestSeconds = Math.min(...after);
      const deltaSeconds = afterBestSeconds - beforeBestSeconds;
      const yenPerSecond = deltaSeconds < 0 && modification.costJPY !== null
        ? Math.round(modification.costJPY / Math.abs(deltaSeconds))
        : null;

      return [{
        modificationId: modification.id,
        circuit,
        beforeBestSeconds,
        afterBestSeconds,
        deltaSeconds,
        costJPY: modification.costJPY,
        yenPerSecond,
      }];
    });
  });
}
