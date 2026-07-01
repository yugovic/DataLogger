import { describe, expect, it } from 'vitest';
import {
  buildJournalTimeline,
  computeModImpacts,
  parseLapTimeToSeconds,
  toJournalSessions,
  type JournalSession,
} from './buildJournal';
import type { CarSetup } from '../types/setup';
import type { ModificationEntry, Vehicle } from '../types/vehicle';

let nextModificationId = 0;

const makeModification = (
  overrides: Partial<ModificationEntry> = {},
): ModificationEntry => ({
  id: `mod-${nextModificationId += 1}`,
  category: 'brake',
  partName: 'ブレーキパッド',
  maker: null,
  installedAt: new Date('2026-02-01T00:00:00'),
  removedAt: null,
  costJPY: null,
  memo: null,
  ...overrides,
});

const makeSession = (overrides: Partial<JournalSession> = {}): JournalSession => ({
  setupId: 'setup-1',
  date: new Date('2026-01-01T00:00:00'),
  circuit: '筑波サーキット',
  bestLapSeconds: 70,
  ...overrides,
});

const makeSetup = (overrides: Partial<CarSetup> = {}): CarSetup => ({
  id: 'setup-1',
  userId: 'user-1',
  driver: null,
  carModel: 'Honda S2000',
  circuit: '筑波サーキット',
  date: new Date('2026-01-01T00:00:00'),
  sessionType: 'practice',
  weather: { condition: null, airTemp: null, trackTemp: null, humidity: null, pressure: null },
  tireSettings: {
    fl: { before: null, after: null },
    fr: { before: null, after: null },
    rl: { before: null, after: null },
    rr: { before: null, after: null },
  },
  tireInfo: { brand: '', compound: '' },
  sessionInfo: { distance: null, fuel: null },
  createdAt: new Date('2026-01-01T00:00:00'),
  updatedAt: new Date('2026-01-01T00:00:00'),
  ...overrides,
});

const vehicle: Vehicle = {
  id: 'vehicle-1',
  userId: 'user-1',
  make: 'Honda',
  model: 'S2000',
  year: 2001,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00'),
  updatedAt: new Date('2026-01-01T00:00:00'),
};

describe('parseLapTimeToSeconds', () => {
  it('M:SS.mmm を秒へ変換すること', () => {
    expect(parseLapTimeToSeconds('1:08.500')).toBe(68.5);
  });

  it("M'SS.mmm を秒へ変換すること", () => {
    expect(parseLapTimeToSeconds("1'08.500")).toBe(68.5);
  });

  it('解析不能な文字列は null にすること', () => {
    expect(parseLapTimeToSeconds('abc')).toBeNull();
  });
});

describe('buildJournalTimeline', () => {
  it('時系列で並べ、installedAt が null の改造を除外し、サーキット別ベスト更新を判定すること', () => {
    const installedMod = makeModification({
      id: 'mod-dated',
      installedAt: new Date('2026-02-01T00:00:00'),
    });
    const unknownDateMod = makeModification({ id: 'mod-undated', installedAt: null });
    const sessions = [
      makeSession({ setupId: 'after-slower', date: new Date('2026-03-01T00:00:00'), bestLapSeconds: 70.5 }),
      makeSession({ setupId: 'before', date: new Date('2026-01-01T00:00:00'), bestLapSeconds: 71 }),
      makeSession({ setupId: 'after-best', date: new Date('2026-04-01T00:00:00'), bestLapSeconds: 69 }),
    ];

    const timeline = buildJournalTimeline([installedMod, unknownDateMod], sessions);

    expect(timeline.map((event) => event.kind === 'mod' ? event.modification.id : event.session.setupId))
      .toEqual(['before', 'mod-dated', 'after-slower', 'after-best']);
    expect(timeline.filter((event) => event.kind === 'mod')).toHaveLength(1);
    expect(timeline.filter((event) => event.kind === 'session').map((event) => event.isCircuitBest))
      .toEqual([true, true, true]);
  });

  it('同一サーキットで過去ベストに届かない走行はベスト更新にしないこと', () => {
    const timeline = buildJournalTimeline([], [
      makeSession({ setupId: 'best', bestLapSeconds: 68 }),
      makeSession({ setupId: 'slower', date: new Date('2026-01-02T00:00:00'), bestLapSeconds: 69 }),
    ]);

    expect(timeline.filter((event) => event.kind === 'session').map((event) => event.isCircuitBest))
      .toEqual([true, false]);
  });
});

describe('computeModImpacts', () => {
  it('前後にセッションがあるサーキットのみ注釈を生成すること', () => {
    const impacts = computeModImpacts(
      [makeModification({ id: 'mod-1', costJPY: 90000 })],
      [
        makeSession({ circuit: '筑波サーキット', date: new Date('2026-01-01T00:00:00'), bestLapSeconds: 70 }),
        makeSession({ circuit: '筑波サーキット', date: new Date('2026-03-01T00:00:00'), bestLapSeconds: 68.5 }),
        makeSession({ circuit: '鈴鹿サーキット', date: new Date('2026-03-01T00:00:00'), bestLapSeconds: 142 }),
      ],
    );

    expect(impacts).toEqual([
      {
        modificationId: 'mod-1',
        circuit: '筑波サーキット',
        beforeBestSeconds: 70,
        afterBestSeconds: 68.5,
        deltaSeconds: -1.5,
        costJPY: 90000,
        yenPerSecond: 60000,
      },
    ]);
  });

  it('片側のみのサーキットは注釈を生成しないこと', () => {
    const impacts = computeModImpacts(
      [makeModification()],
      [makeSession({ date: new Date('2026-01-01T00:00:00'), bestLapSeconds: 70 })],
    );

    expect(impacts).toEqual([]);
  });

  it('costJPY が null の場合は yenPerSecond を null にすること', () => {
    const impacts = computeModImpacts(
      [makeModification({ id: 'mod-free', costJPY: null })],
      [
        makeSession({ date: new Date('2026-01-01T00:00:00'), bestLapSeconds: 70 }),
        makeSession({ date: new Date('2026-03-01T00:00:00'), bestLapSeconds: 68 }),
      ],
    );

    expect(impacts[0].yenPerSecond).toBeNull();
  });

  it('タイム悪化では yenPerSecond を null にし、delta は正の値で保持すること', () => {
    const impacts = computeModImpacts(
      [makeModification({ id: 'mod-slower', costJPY: 50000 })],
      [
        makeSession({ date: new Date('2026-01-01T00:00:00'), bestLapSeconds: 68 }),
        makeSession({ date: new Date('2026-03-01T00:00:00'), bestLapSeconds: 69 }),
      ],
    );

    expect(impacts[0].deltaSeconds).toBe(1);
    expect(impacts[0].yenPerSecond).toBeNull();
  });

  it('条件を満たす複数サーキットでサーキットごとに注釈を生成すること', () => {
    const impacts = computeModImpacts(
      [makeModification({ id: 'mod-multi', costJPY: 120000 })],
      [
        makeSession({ circuit: '筑波サーキット', date: new Date('2026-01-01T00:00:00'), bestLapSeconds: 70 }),
        makeSession({ circuit: '筑波サーキット', date: new Date('2026-03-01T00:00:00'), bestLapSeconds: 69 }),
        makeSession({ circuit: '鈴鹿サーキット', date: new Date('2026-01-02T00:00:00'), bestLapSeconds: 142 }),
        makeSession({ circuit: '鈴鹿サーキット', date: new Date('2026-03-02T00:00:00'), bestLapSeconds: 141.5 }),
      ],
    );

    expect(impacts.map((impact) => impact.circuit).sort()).toEqual(['筑波サーキット', '鈴鹿サーキット'].sort());
  });
});

describe('toJournalSessions', () => {
  it('vehicleId が紐付いたセットアップは vehicleId の一致で対応付けること', () => {
    const sessions = toJournalSessions(
      [
        // vehicleId一致: carModel表記が違っても対象になる
        makeSetup({ id: 'linked', carModel: 'S2000 (AP1)', vehicleId: 'vehicle-1', lapTimeData: { bestLap: '1:08.500' } }),
        // vehicleId不一致: carModelが同じでも別車両として除外する
        makeSetup({ id: 'other-vehicle', vehicleId: 'vehicle-2', lapTimeData: { bestLap: '1:07.000' } }),
        // 未紐付けの旧データ: carModel一致でフォールバック
        makeSetup({ id: 'legacy', date: new Date('2026-01-02T00:00:00'), lapTimeData: undefined }),
      ],
      vehicle,
    );

    expect(sessions.map((session) => session.setupId)).toEqual(['linked', 'legacy']);
  });

  it('carModel の文字列一致のみで抽出し、bestLap が無い場合は null にすること', () => {
    const sessions = toJournalSessions(
      [
        makeSetup({ id: 'match-with-lap', lapTimeData: { bestLap: '1:08.500' } }),
        makeSetup({ id: 'match-no-lap', date: new Date('2026-01-02T00:00:00'), lapTimeData: undefined }),
        makeSetup({
          id: 'other-car',
          carModel: 'Mazda RX-7',
          lapTimeData: { bestLap: '1:05.000' },
        }),
      ],
      vehicle,
    );

    expect(sessions).toEqual([
      {
        setupId: 'match-with-lap',
        date: new Date('2026-01-01T00:00:00'),
        circuit: '筑波サーキット',
        bestLapSeconds: 68.5,
      },
      {
        setupId: 'match-no-lap',
        date: new Date('2026-01-02T00:00:00'),
        circuit: '筑波サーキット',
        bestLapSeconds: null,
      },
    ]);
  });
});
