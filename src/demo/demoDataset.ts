// デモデータセット定義 — Emulator 上のデモアカウントへ投入する一式
//
// 用途:
// - ショーケース撮影（.claude/skills/showcase）で全画面が空状態にならないようにする
// - 新機能の手動確認を「毎回手入力し直す」手間なく再現可能にする
//
// 原則（BUSINESS_PLAN / CLAUDE.md の「偽データ混入ゼロ」に従う）:
// - **本番Firestoreへは投入しない**。投入経路は Emulator 限定（scripts/seed-demo-data.mjs のガード）
// - 未入力は null のまま。全項目を埋め尽くさず、記録が粗いセッションも混ぜる
//   （現実のユーザーデータは歯抜けであり、UI はその状態で確認されるべき）
// - ドライバー名・共有データはデモと分かる表記にする（実在ドライバーを騙らない）
// - 走行ログは合成であることを meta に明示（src/demo/demoTelemetry.ts）

import { lapTimeToMs } from '../lib/setupFields';
import { buildShareSummary } from '../lib/publicShareSummary';
import { toPublicVehicleProfile } from '../lib/vehicleProfilePublic';
import type { SupportedLocale } from '../i18n/locale';
import type { PublicShareSummary } from '../types/publicShare';
import type { TelemetryTraceInput } from '../types/telemetryTrace';
import type {
  CarSetup,
  DrivingFeedback,
  LapTimeData,
  LapTime,
  SetupAdjustmentValue,
  TireSettings,
} from '../types/setup';
import type { SetupAdjustmentDefinition, Vehicle } from '../types/vehicle';
import type { TireSet } from '../types/tire';
import { buildDemoTrace, formatLapTime, type DemoCarPerformance } from './demoTelemetry';

// ─── 公開型 ──────────────────────────────────────────────────

export type DemoOwnerKey = 'owner' | 'rival';

export interface DemoAccount {
  key: DemoOwnerKey;
  email: string;
  password: string;
  displayName: string;
  locale: SupportedLocale;
  /** users/{uid}.onboardingData 相当。オンボーディング済みの状態で投入する */
  onboarding: {
    homeCircuit: string | null;
    goalType: 'laptime' | 'consistency' | 'record';
    targetLapTime: string | null;
  };
}

export interface DemoDoc<T> {
  /** Firestore のドキュメントID。固定値なので再投入は上書きになる */
  id: string;
  owner: DemoOwnerKey;
  data: T;
}

export type DemoVehicleData = Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type DemoTireSetData = Omit<TireSet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type DemoSetupData = Omit<CarSetup, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type DemoTraceData = Omit<TelemetryTraceInput, 'ownerId'>;

export interface DemoPublicShare {
  id: string;
  owner: DemoOwnerKey;
  setupId: string;
  summary: PublicShareSummary;
}

export interface DemoDataset {
  accounts: DemoAccount[];
  vehicles: DemoDoc<DemoVehicleData>[];
  tireSets: DemoDoc<DemoTireSetData>[];
  setups: DemoDoc<DemoSetupData>[];
  telemetryTraces: DemoDoc<DemoTraceData>[];
  publicShares: DemoPublicShare[];
  /** Give-to-Get の権利証明に使う代表 shared セットアップ */
  entitlements: { owner: DemoOwnerKey; setupId: string }[];
}

// ─── 共通ヘルパー ────────────────────────────────────────────

/** JST の壁時計で日時を作る（走行は日本のサーキット前提） */
const jst = (iso: string): Date => new Date(`${iso}+09:00`);

/** 4輪の冷間/温間圧（kPa）。片方しか測っていない場合は null を渡す */
const pressures = (
  before: [number | null, number | null, number | null, number | null],
  after: [number | null, number | null, number | null, number | null],
): TireSettings => ({
  fl: { before: before[0], after: after[0] },
  fr: { before: before[1], after: after[1] },
  rl: { before: before[2], after: after[2] },
  rr: { before: before[3], after: after[3] },
});

const EMPTY_FEEDBACK: DrivingFeedback = {
  lowSpeedEntry: null,
  lowSpeedMiddle: null,
  lowSpeedExit: null,
  highSpeedEntry: null,
  highSpeedMiddle: null,
  highSpeedExit: null,
  brakeInitial: null,
  brakeMiddle: null,
  brakeStability: null,
  accelResponse: null,
  accelTraction: null,
  balance: null,
  confidence: null,
};

/** 評価は「触った項目だけ number」。未評価は null のままにする */
const feedback = (partial: Partial<DrivingFeedback>): DrivingFeedback => ({
  ...EMPTY_FEEDBACK,
  ...partial,
});

/**
 * 手入力ラップの組み立て。先頭を OUT、末尾を IN、中間を NORMAL として扱い、
 * ベストは NORMAL の最速を採る（アプリ内の集計と同じ考え方）。
 */
const manualLaps = (times: readonly string[]): LapTimeData => {
  const laps: LapTime[] = times.map((time, index) => ({
    lapNumber: index + 1,
    time,
    type: index === 0 ? 'OUT' : index === times.length - 1 ? 'IN' : 'NORMAL',
  }));

  const best = laps
    .filter((lap) => lap.type === 'NORMAL')
    .reduce<{ time: string; ms: number } | null>((acc, lap) => {
      const ms = lapTimeToMs(lap.time);
      if (ms === null) return acc;
      return acc === null || ms < acc.ms ? { time: lap.time, ms } : acc;
    }, null);

  return {
    bestLap: best?.time ?? null,
    totalLaps: laps.length,
    laps,
    source: 'manual',
    evidence: null,
  };
};

const adjustmentValue = (
  definition: SetupAdjustmentDefinition,
  value: number | string | boolean | null,
): SetupAdjustmentValue => ({
  definitionId: definition.id,
  group: definition.group,
  label: definition.label,
  position: definition.position,
  valueType: definition.valueType,
  ...(definition.unit ? { unit: definition.unit } : {}),
  value,
});

const definition = (
  input: Omit<SetupAdjustmentDefinition, 'enabled' | 'order'> & Partial<Pick<SetupAdjustmentDefinition, 'enabled' | 'order'>>,
  order: number,
): SetupAdjustmentDefinition => ({
  enabled: true,
  order,
  ...input,
});

// ─── 車両 ────────────────────────────────────────────────────

const Z34_ADJUSTMENTS: SetupAdjustmentDefinition[] = [
  definition({ id: 'z34-damper-front', group: 'damper', label: '減衰（フロント）', position: 'front', valueType: 'number', unit: 'クリック', min: 0, max: 30, step: 1 }, 0),
  definition({ id: 'z34-damper-rear', group: 'damper', label: '減衰（リア）', position: 'rear', valueType: 'number', unit: 'クリック', min: 0, max: 30, step: 1 }, 1),
  definition({ id: 'z34-height-front', group: 'ride_height', label: '車高（フロント）', position: 'front', valueType: 'number', unit: 'mm', min: 90, max: 150, step: 1 }, 2),
  definition({ id: 'z34-height-rear', group: 'ride_height', label: '車高（リア）', position: 'rear', valueType: 'number', unit: 'mm', min: 90, max: 150, step: 1 }, 3),
  definition({ id: 'z34-camber-front', group: 'alignment', label: 'キャンバー（フロント）', position: 'front', valueType: 'number', unit: '°', min: -5, max: 0, step: 0.1 }, 4),
  definition({ id: 'z34-arb-front', group: 'anti_roll_bar', label: 'スタビ（フロント）', position: 'front', valueType: 'select', options: ['ソフト', 'ミドル', 'ハード'] }, 5),
  definition({ id: 'z34-wing-angle', group: 'aero', label: 'GTウイング角度', position: 'rear', valueType: 'number', unit: '°', min: 0, max: 15, step: 1, helpText: '取付ステーの刻印基準' }, 6),
];

const S2000_ADJUSTMENTS: SetupAdjustmentDefinition[] = [
  definition({ id: 's2k-damper-front', group: 'damper', label: '減衰（フロント）', position: 'front', valueType: 'number', unit: 'クリック', min: 0, max: 20, step: 1 }, 0),
  definition({ id: 's2k-damper-rear', group: 'damper', label: '減衰（リア）', position: 'rear', valueType: 'number', unit: 'クリック', min: 0, max: 20, step: 1 }, 1),
  definition({ id: 's2k-toe-rear', group: 'alignment', label: 'トー（リア）', position: 'rear', valueType: 'number', unit: 'mm', min: -10, max: 10, step: 0.5 }, 2),
];

const GR86_ADJUSTMENTS: SetupAdjustmentDefinition[] = [
  definition({ id: 'gr86-damper-front', group: 'damper', label: '減衰（フロント）', position: 'front', valueType: 'number', unit: 'クリック', min: 0, max: 16, step: 1 }, 0),
  definition({ id: 'gr86-tire-pressure-note', group: 'tire', label: '内圧調整メモ', position: 'vehicle', valueType: 'text' }, 1),
];

const VEHICLE_Z34: DemoDoc<DemoVehicleData> = {
  id: 'demo-vehicle-z34',
  owner: 'owner',
  data: {
    make: 'Nissan',
    model: 'Fairlady Z (Z34)',
    year: 2010,
    grade: 'Version S',
    color: 'ブリリアントホワイトパール',
    mileage: 68400,
    engineType: 'VQ37VHR',
    transmission: '6MT',
    drivetrain: 'FR',
    notes: 'デモ車両。サーキット専用ではなく自走参戦。',
    isActive: true,
    profile: {
      tireClass: 'S_TIRE',
      powerPs: 336,
      weightKg: 1520,
      modifications: [
        { id: 'z34-mod-suspension', category: 'suspension', partName: '車高調キット', maker: 'オーリンズ', installedAt: jst('2025-06-14T00:00:00'), removedAt: null, costJPY: 385000, memo: 'バネレート F10kg/mm R8kg/mm' },
        { id: 'z34-mod-exhaust', category: 'intake_exhaust', partName: 'スポーツマフラー', maker: '藤壺技研', installedAt: jst('2025-07-20T00:00:00'), removedAt: null, costJPY: 132000, memo: null },
        { id: 'z34-mod-pad-old', category: 'brake', partName: 'ストリート用パッド', maker: 'DIXCEL', installedAt: jst('2025-05-02T00:00:00'), removedAt: jst('2025-09-05T00:00:00'), costJPY: 28000, memo: '連続周回でフェード。サーキット用へ交換' },
        { id: 'z34-mod-brake', category: 'brake', partName: 'レーシングパッド＋スリットローター', maker: 'プロジェクトμ', installedAt: jst('2025-09-05T00:00:00'), removedAt: null, costJPY: 168000, memo: null },
        { id: 'z34-mod-aero', category: 'aero', partName: 'GTウイング 1400mm', maker: 'VOLTEX', installedAt: jst('2026-02-11T00:00:00'), removedAt: null, costJPY: 246000, memo: '高速コーナーの安定重視' },
        { id: 'z34-mod-wheel', category: 'tire_wheel', partName: '鍛造ホイール 19inch', maker: 'RAYS', installedAt: jst('2026-03-01T00:00:00'), removedAt: null, costJPY: 298000, memo: null },
        { id: 'z34-mod-lsd', category: 'drivetrain', partName: '機械式LSD 1.5way', maker: 'NISMO', installedAt: jst('2026-04-18T00:00:00'), removedAt: null, costJPY: 214000, memo: null },
      ],
    },
    setupConfig: {
      adjustmentDefinitions: Z34_ADJUSTMENTS,
      suspension: {
        damperAdjustable: true,
        damperClicksFront: 30,
        damperClicksRear: 30,
        heightAdjustable: true,
        heightRangeFront: { min: 90, max: 150 },
        heightRangeRear: { min: 90, max: 150 },
        springRateChangeable: true,
        antiRollBarAdjustable: true,
      },
      alignment: {
        camberAdjustable: true,
        camberRangeFront: { min: -5, max: 0 },
        camberRangeRear: { min: -4, max: 0 },
        toeAdjustable: true,
        toeRangeFront: { min: -10, max: 10 },
        toeRangeRear: { min: -10, max: 10 },
        casterAdjustable: false,
      },
      tire: {
        tireSetManagementEnabled: true,
        frontSize: ['245/40R19'],
        rearSize: ['275/35R19'],
        recommendedPressure: { frontMin: 170, frontMax: 200, rearMin: 165, rearMax: 195 },
      },
      brake: {
        padTypes: ['プロジェクトμ HC+', 'DIXCEL Z'],
        rotorTypes: ['純正スリット加工'],
        balanceAdjustable: false,
      },
      aero: { frontAdjustable: false, rearAdjustable: true },
      engine: { ecuTunable: false },
    },
  },
};

const VEHICLE_S2000: DemoDoc<DemoVehicleData> = {
  id: 'demo-vehicle-s2000',
  owner: 'owner',
  data: {
    make: 'Honda',
    model: 'S2000 (AP2)',
    year: 2006,
    grade: 'Type S',
    color: 'ムーンロックパール',
    mileage: 112300,
    engineType: 'F22C',
    transmission: '6MT',
    drivetrain: 'FR',
    notes: 'ミニサーキット用のセカンドカー。記録は粗め。',
    isActive: true,
    profile: {
      tireClass: 'HIGH_GRIP_RADIAL',
      powerPs: 242,
      weightKg: 1270,
      modifications: [
        { id: 's2k-mod-suspension', category: 'suspension', partName: '車高調キット', maker: 'HKS', installedAt: jst('2024-11-09T00:00:00'), removedAt: null, costJPY: 268000, memo: null },
        { id: 's2k-mod-seat', category: 'weight_reduction', partName: 'フルバケットシート', maker: 'BRIDE', installedAt: jst('2025-02-15T00:00:00'), removedAt: null, costJPY: 96000, memo: null },
      ],
    },
    setupConfig: {
      adjustmentDefinitions: S2000_ADJUSTMENTS,
      suspension: {
        damperAdjustable: true,
        damperClicksFront: 20,
        damperClicksRear: 20,
        heightAdjustable: true,
        springRateChangeable: false,
        antiRollBarAdjustable: false,
      },
      alignment: {
        camberAdjustable: true,
        toeAdjustable: true,
        casterAdjustable: false,
      },
      tire: {
        tireSetManagementEnabled: true,
        frontSize: ['235/40R17'],
        rearSize: ['255/40R17'],
      },
      brake: { padTypes: ['ENDLESS MX72'], balanceAdjustable: false },
    },
  },
};

const VEHICLE_GR86: DemoDoc<DemoVehicleData> = {
  id: 'demo-vehicle-gr86',
  owner: 'rival',
  data: {
    make: 'Toyota',
    model: 'GR86 (ZN8)',
    year: 2023,
    grade: 'RZ',
    drivetrain: 'FR',
    transmission: '6MT',
    engineType: 'FA24',
    isActive: true,
    notes: '共有ブラウズ確認用のデモ車両。',
    profile: {
      tireClass: 'HIGH_GRIP_RADIAL',
      powerPs: 235,
      weightKg: 1290,
      modifications: [
        { id: 'gr86-mod-suspension', category: 'suspension', partName: '車高調キット', maker: 'TEIN', installedAt: jst('2025-09-13T00:00:00'), removedAt: null, costJPY: 198000, memo: null },
        { id: 'gr86-mod-brake', category: 'brake', partName: 'サーキット用パッド', maker: 'ENDLESS', installedAt: jst('2025-10-04T00:00:00'), removedAt: null, costJPY: 42000, memo: null },
      ],
    },
    setupConfig: {
      adjustmentDefinitions: GR86_ADJUSTMENTS,
      suspension: {
        damperAdjustable: true,
        damperClicksFront: 16,
        damperClicksRear: 16,
        heightAdjustable: true,
        springRateChangeable: false,
        antiRollBarAdjustable: false,
      },
      alignment: { camberAdjustable: true, toeAdjustable: false, casterAdjustable: false },
      tire: { tireSetManagementEnabled: false, frontSize: ['225/40R18'], rearSize: ['225/40R18'] },
      brake: { padTypes: ['ENDLESS MX72 PLUS'] },
    },
  },
};

const VEHICLES: DemoDoc<DemoVehicleData>[] = [VEHICLE_Z34, VEHICLE_S2000, VEHICLE_GR86];

const Z34_SNAPSHOT = toPublicVehicleProfile(VEHICLE_Z34.data.profile!);
const S2000_SNAPSHOT = toPublicVehicleProfile(VEHICLE_S2000.data.profile!);
const GR86_SNAPSHOT = toPublicVehicleProfile(VEHICLE_GR86.data.profile!);

// ─── タイヤセット ────────────────────────────────────────────

const TIRE_SETS: DemoDoc<DemoTireSetData>[] = [
  {
    id: 'demo-tireset-a050',
    owner: 'owner',
    data: {
      code: 'TS-01',
      manufacturer: '横浜ゴム',
      productName: 'ADVAN A050',
      compound: 'G/S',
      frontSize: '245/40R19',
      rearSize: '275/35R19',
      primaryVehicleId: VEHICLE_Z34.id,
      status: 'active',
      startedAt: jst('2026-03-07T00:00:00'),
      initialDistanceKm: 0,
      initialLaps: 0,
      initialHeatCycles: 0,
      notes: '2026シーズンのメインセット。',
    },
  },
  {
    id: 'demo-tireset-re71rs',
    owner: 'owner',
    data: {
      code: 'TS-02',
      manufacturer: 'ブリヂストン',
      productName: 'POTENZA RE-71RS',
      compound: '—',
      frontSize: '245/40R19',
      rearSize: '275/35R19',
      primaryVehicleId: VEHICLE_Z34.id,
      status: 'stored',
      startedAt: jst('2025-10-12T00:00:00'),
      initialDistanceKm: 312,
      initialLaps: 46,
      initialHeatCycles: 9,
      notes: '前シーズンの持ち越し。雨天とスポーツ走行会用に保管。',
    },
  },
  {
    id: 'demo-tireset-03g',
    owner: 'owner',
    data: {
      code: 'TS-03',
      manufacturer: 'ダンロップ',
      productName: 'DIREZZA 03G',
      compound: 'ミディアム',
      frontSize: '235/40R17',
      rearSize: '255/40R17',
      primaryVehicleId: VEHICLE_S2000.id,
      status: 'retired',
      startedAt: jst('2025-04-05T00:00:00'),
      initialDistanceKm: 604,
      initialLaps: 92,
      initialHeatCycles: 21,
      notes: 'フロント内減りで終了。次は空気圧を5kPa下げて様子を見る。',
    },
  },
];

// ─── 走行記録（手入力ラップ） ────────────────────────────────

const Z34_TIRE_INFO_A050 = {
  brand: '横浜ゴム',
  manufacturer: '横浜ゴム',
  productName: 'ADVAN A050',
  compound: 'G/S',
  frontSize: '245/40R19',
  rearSize: '275/35R19',
  tireSetId: 'demo-tireset-a050',
  tireSetCode: 'TS-01',
};

const Z34_TIRE_INFO_RE71RS = {
  brand: 'ブリヂストン',
  manufacturer: 'ブリヂストン',
  productName: 'POTENZA RE-71RS',
  compound: '—',
  frontSize: '245/40R19',
  rearSize: '275/35R19',
  tireSetId: 'demo-tireset-re71rs',
  tireSetCode: 'TS-02',
};

const S2000_TIRE_INFO_03G = {
  brand: 'ダンロップ',
  manufacturer: 'ダンロップ',
  productName: 'DIREZZA 03G',
  compound: 'ミディアム',
  frontSize: '235/40R17',
  rearSize: '255/40R17',
  tireSetId: 'demo-tireset-03g',
  tireSetCode: 'TS-03',
};

const DRIVER_OWNER = 'DEMO ドライバー';
const DRIVER_RIVAL = 'DEMO ライバル';

const Z34_CAR_MODEL = `${VEHICLE_Z34.data.make} ${VEHICLE_Z34.data.model}`;
const S2000_CAR_MODEL = `${VEHICLE_S2000.data.make} ${VEHICLE_S2000.data.model}`;
const GR86_CAR_MODEL = `${VEHICLE_GR86.data.make} ${VEHICLE_GR86.data.model}`;

const TSUKUBA = '筑波サーキット コース2000';
const FUJI = '富士スピードウェイ（本コース）';
const SUZUKA = '鈴鹿サーキット（国際レーシングコース）';
const SODEGAURA = '袖ヶ浦フォレストレースウェイ';
const NIKKO = '日光サーキット';

const manualSetups: DemoDoc<DemoSetupData>[] = [
  {
    id: 'demo-setup-20251108-tsukuba',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: Z34_CAR_MODEL,
      vehicleId: VEHICLE_Z34.id,
      vehicleProfileSnapshot: Z34_SNAPSHOT,
      circuit: TSUKUBA,
      date: jst('2025-11-08T09:30:00'),
      sessionType: 'practice',
      // 旧データ互換の日本語天候値。読み取り互換の確認用に1件だけ残している
      weather: { condition: '晴れ', airTemp: 18, trackTemp: 24, humidity: 45, pressure: 1014 },
      tireSettings: pressures([175, 175, 170, 170], [212, 215, 205, 208]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_RE71RS,
      tireUsage: { heatCyclesAdded: 2 },
      sessionInfo: { distance: 32, fuel: 28 },
      suspensionSettings: {
        frontDamper: { compression: 14, rebound: 14 },
        rearDamper: { compression: 12, rebound: 12 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 118, rear: 122 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -2.5, rear: -1.8 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'DIXCEL Z', rearPad: 'DIXCEL Z', frontRotor: '純正', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 14),
        adjustmentValue(Z34_ADJUSTMENTS[1], 12),
        adjustmentValue(Z34_ADJUSTMENTS[2], 118),
        adjustmentValue(Z34_ADJUSTMENTS[3], 122),
        adjustmentValue(Z34_ADJUSTMENTS[4], -2.5),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ミドル'),
        adjustmentValue(Z34_ADJUSTMENTS[6], null),
      ],
      notes: 'シーズン初戦。ラジアルのまま基準値を作る回。',
      knowledge: {
        intention: 'まず基準セットで1本走って、内圧の上がり方を把握する',
        result: 'フロントが+37kPaまで上がり、最終コーナーでアンダー',
        learning: '冷間をあと5kPa下げるところから',
      },
      drivingFeedback: feedback({ lowSpeedEntry: 2, lowSpeedExit: 1, balance: 1, confidence: 2 }),
      lapTimeData: manualLaps(['1:12.480', '1:03.905', '1:03.112', '1:02.845', '1:03.402', '1:15.220']),
    },
  },
  {
    id: 'demo-setup-20251206-fuji',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: Z34_CAR_MODEL,
      vehicleId: VEHICLE_Z34.id,
      vehicleProfileSnapshot: Z34_SNAPSHOT,
      circuit: FUJI,
      date: jst('2025-12-06T10:00:00'),
      sessionType: 'practice',
      weather: { condition: 'cloudy', airTemp: 9, trackTemp: 12, humidity: 52, pressure: 1019 },
      tireSettings: pressures([180, 180, 175, 175], [205, 208, 200, 202]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_RE71RS,
      tireUsage: { heatCyclesAdded: 2 },
      sessionInfo: { distance: 46, fuel: 35 },
      suspensionSettings: {
        frontDamper: { compression: 16, rebound: 16 },
        rearDamper: { compression: 12, rebound: 12 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 118, rear: 122 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -2.8, rear: -1.8 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'DIXCEL Z', rearPad: 'DIXCEL Z', frontRotor: '純正', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 16),
        adjustmentValue(Z34_ADJUSTMENTS[1], 12),
        adjustmentValue(Z34_ADJUSTMENTS[2], 118),
        adjustmentValue(Z34_ADJUSTMENTS[3], 122),
        adjustmentValue(Z34_ADJUSTMENTS[4], -2.8),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ミドル'),
        adjustmentValue(Z34_ADJUSTMENTS[6], null),
      ],
      notes: '低温でタイヤが入らない。1本目は捨て。',
      knowledge: {
        intention: '低温時の内圧設定を確かめる',
        result: '温間で目標に届かず、グリップが上がりきらなかった',
        learning: '気温1桁の日は冷間+5kPaで入れる',
      },
      drivingFeedback: feedback({ highSpeedEntry: 1, brakeInitial: 2, confidence: 1 }),
      lapTimeData: manualLaps(['2:15.900', '2:04.112', '2:02.980', '2:02.331', '2:03.550', '2:20.410']),
    },
  },
  {
    id: 'demo-setup-20260124-tsukuba',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: Z34_CAR_MODEL,
      vehicleId: VEHICLE_Z34.id,
      vehicleProfileSnapshot: Z34_SNAPSHOT,
      circuit: TSUKUBA,
      date: jst('2026-01-24T09:00:00'),
      sessionType: 'practice',
      weather: { condition: 'sunny', airTemp: 6, trackTemp: 9, humidity: 38, pressure: 1021 },
      tireSettings: pressures([185, 185, 180, 180], [206, 209, 199, 201]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_RE71RS,
      tireUsage: { heatCyclesAdded: 3 },
      sessionInfo: { distance: 38, fuel: 30 },
      suspensionSettings: {
        frontDamper: { compression: 14, rebound: 14 },
        rearDamper: { compression: 10, rebound: 10 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 116, rear: 122 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -3.0, rear: -2.0 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'プロジェクトμ HC+', rearPad: 'プロジェクトμ HC+', frontRotor: 'スリット', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 14),
        adjustmentValue(Z34_ADJUSTMENTS[1], 10),
        adjustmentValue(Z34_ADJUSTMENTS[2], 116),
        adjustmentValue(Z34_ADJUSTMENTS[3], 122),
        adjustmentValue(Z34_ADJUSTMENTS[4], -3.0),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ミドル'),
        adjustmentValue(Z34_ADJUSTMENTS[6], null),
      ],
      notes: '冷間を上げて温間の目標に合わせた。リアの減衰を弱めて trac を稼ぐ。',
      knowledge: {
        intention: '低温対策として冷間+5kPa、リア減衰-2クリック',
        result: '立ち上がりのトラクションが改善。ベスト更新',
        learning: '低温日はリア減衰を弱める方向が効く',
      },
      drivingFeedback: feedback({ lowSpeedExit: 3, accelTraction: 3, balance: 2, confidence: 3 }),
      lapTimeData: manualLaps(['1:11.220', '1:02.905', '1:02.190', '1:02.640', '1:13.880']),
    },
  },
  {
    id: 'demo-setup-20260214-sodegaura',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: Z34_CAR_MODEL,
      vehicleId: VEHICLE_Z34.id,
      vehicleProfileSnapshot: Z34_SNAPSHOT,
      circuit: SODEGAURA,
      date: jst('2026-02-14T11:00:00'),
      sessionType: 'practice',
      weather: { condition: 'wet', airTemp: 11, trackTemp: 12, humidity: 88, pressure: 1006 },
      tireSettings: pressures([190, 190, 185, 185], [201, 203, 196, 198]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_RE71RS,
      tireUsage: { heatCyclesAdded: 1 },
      sessionInfo: { distance: 24, fuel: 26 },
      // ウェットの1本のみ。足まわりは触っていないので記録なし（null 埋めではなく未記録）
      notes: '終日ウェット。無理せずブレーキングの練習に切り替えた。',
      knowledge: {
        intention: '雨のブレーキングポイントを体で覚える',
        result: '3本目でようやく安定。タイムは狙わず',
      },
      drivingFeedback: feedback({ brakeStability: 1, confidence: 1 }),
      lapTimeData: manualLaps(['1:29.400', '1:17.980', '1:16.552', '1:17.010', '1:30.220']),
    },
  },
  {
    id: 'demo-setup-20260411-tsukuba',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: Z34_CAR_MODEL,
      vehicleId: VEHICLE_Z34.id,
      vehicleProfileSnapshot: Z34_SNAPSHOT,
      circuit: TSUKUBA,
      date: jst('2026-04-11T13:20:00'),
      sessionType: 'qualifying',
      weather: { condition: 'sunny', airTemp: 19, trackTemp: 31, humidity: 41, pressure: 1012 },
      tireSettings: pressures([168, 168, 163, 163], [199, 202, 193, 195]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_A050,
      tireUsage: { heatCyclesAdded: 2 },
      sessionInfo: { distance: 26, fuel: 22 },
      suspensionSettings: {
        frontDamper: { compression: 12, rebound: 12 },
        rearDamper: { compression: 10, rebound: 10 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 114, rear: 120 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -3.2, rear: -2.0 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'プロジェクトμ HC+', rearPad: 'プロジェクトμ HC+', frontRotor: 'スリット', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 12),
        adjustmentValue(Z34_ADJUSTMENTS[1], 10),
        adjustmentValue(Z34_ADJUSTMENTS[2], 114),
        adjustmentValue(Z34_ADJUSTMENTS[3], 120),
        adjustmentValue(Z34_ADJUSTMENTS[4], -3.2),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ハード'),
        adjustmentValue(Z34_ADJUSTMENTS[6], 8),
      ],
      notes: 'Sタイヤ投入後の初アタック。1本勝負のつもりで2周目に賭けた。',
      knowledge: {
        intention: 'Sタイヤの美味しい周回数を確かめる',
        result: '2周目が一番速く、3周目以降はタレた',
        learning: 'アタックは2周目までに決める',
      },
      drivingFeedback: feedback({ lowSpeedEntry: 3, lowSpeedMiddle: 3, highSpeedMiddle: 3, brakeInitial: 3, balance: 3, confidence: 3 }),
      lapTimeData: manualLaps(['1:09.880', '1:00.420', '1:00.980', '1:01.760', '1:12.100']),
    },
  },
  {
    id: 'demo-setup-20260606-fuji',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: Z34_CAR_MODEL,
      vehicleId: VEHICLE_Z34.id,
      vehicleProfileSnapshot: Z34_SNAPSHOT,
      circuit: FUJI,
      date: jst('2026-06-06T14:10:00'),
      sessionType: 'race',
      weather: { condition: 'cloudy', airTemp: 24, trackTemp: 33, humidity: 66, pressure: 1008 },
      tireSettings: pressures([165, 165, 160, 160], [198, 201, 192, 196]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_A050,
      tireUsage: { heatCyclesAdded: 3 },
      sessionInfo: { distance: 68, fuel: 45 },
      suspensionSettings: {
        frontDamper: { compression: 12, rebound: 12 },
        rearDamper: { compression: 12, rebound: 12 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 116, rear: 122 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -3.2, rear: -2.0 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'プロジェクトμ HC+', rearPad: 'プロジェクトμ HC+', frontRotor: 'スリット', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 12),
        adjustmentValue(Z34_ADJUSTMENTS[1], 12),
        adjustmentValue(Z34_ADJUSTMENTS[2], 116),
        adjustmentValue(Z34_ADJUSTMENTS[3], 122),
        adjustmentValue(Z34_ADJUSTMENTS[4], -3.2),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ミドル'),
        adjustmentValue(Z34_ADJUSTMENTS[6], 10),
      ],
      notes: '15周のスプリント。終盤のタイヤの落ちを記録しておく。',
      knowledge: {
        intention: '長い距離でのタイヤの持ちを見る',
        result: '10周目以降はベストから+1.5秒で頭打ち',
        learning: '決勝は冷間をさらに-3kPa。終盤の内圧上がりを抑える',
      },
      drivingFeedback: feedback({ highSpeedEntry: 2, accelTraction: 2, brakeMiddle: 2, balance: 2, confidence: 2 }),
      lapTimeData: manualLaps([
        '2:12.400', '2:01.980', '2:01.220', '2:01.640', '2:02.100', '2:02.480',
        '2:02.900', '2:03.120', '2:03.480', '2:03.660', '2:15.300',
      ]),
    },
  },
  {
    id: 'demo-setup-20260620-tsukuba-s2000',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: S2000_CAR_MODEL,
      vehicleId: VEHICLE_S2000.id,
      vehicleProfileSnapshot: S2000_SNAPSHOT,
      circuit: TSUKUBA,
      date: jst('2026-06-20T10:40:00'),
      sessionType: 'practice',
      weather: { condition: 'cloudy', airTemp: 26, trackTemp: 35, humidity: 71, pressure: 1005 },
      tireSettings: pressures([180, 180, 175, 175], [206, 208, 200, 203]),
      targetPressures: { front: 205, rear: 200 },
      tireInfo: S2000_TIRE_INFO_03G,
      tireUsage: { heatCyclesAdded: 2 },
      sessionInfo: { distance: 30, fuel: 24 },
      suspensionSettings: {
        frontDamper: { compression: 8, rebound: 8 },
        rearDamper: { compression: 6, rebound: 6 },
        springRate: { front: 8, rear: 6 },
        rideHeight: { front: 110, rear: 115 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -2.5, rear: -2.0 },
        toe: { front: null, rear: 1.5 },
        caster: null,
      },
      adjustmentValues: [
        adjustmentValue(S2000_ADJUSTMENTS[0], 8),
        adjustmentValue(S2000_ADJUSTMENTS[1], 6),
        adjustmentValue(S2000_ADJUSTMENTS[2], 1.5),
      ],
      notes: 'S2000の足ならし。リアのトーを少し増やして安定方向。',
      drivingFeedback: feedback({ balance: 2, confidence: 2 }),
      lapTimeData: manualLaps(['1:14.200', '1:05.980', '1:05.320', '1:05.610', '1:16.400']),
    },
  },
  {
    id: 'demo-setup-20260719-nikko-s2000',
    owner: 'owner',
    data: {
      driver: DRIVER_OWNER,
      visibility: 'private',
      carModel: S2000_CAR_MODEL,
      vehicleId: VEHICLE_S2000.id,
      vehicleProfileSnapshot: S2000_SNAPSHOT,
      circuit: NIKKO,
      date: jst('2026-07-19T08:50:00'),
      sessionType: 'practice',
      // 記録が粗いセッション。測っていない項目は null のまま残す
      weather: { condition: 'sunny', airTemp: 31, trackTemp: null, humidity: null, pressure: null },
      tireSettings: pressures([175, 175, 170, 170], [null, null, null, null]),
      tireInfo: S2000_TIRE_INFO_03G,
      sessionInfo: { distance: null, fuel: null },
      notes: '朝練。計測はラップのみ。',
      lapTimeData: manualLaps(['0:45.900', '0:41.220', '0:40.880', '0:46.500']),
    },
  },
];

// ─── 走行記録（ロガー取込あり: 鈴鹿3セッション） ─────────────

/**
 * 速度プロファイル生成用のパラメータ。
 * 実車の公称スペックではなく、粗い中心線データの上で現実的なラップタイムに
 * 収束させるための調整値。数値の意味は demoTelemetry.ts 側のモデルに閉じる。
 */
const Z34_PERFORMANCE: DemoCarPerformance = {
  topSpeedKmh: 198,
  maxLatG: 0.95,
  maxBrakeG: 0.95,
  maxAccelG: 0.4,
  powerKw: 200,
  massKg: 1520,
};

const GR86_PERFORMANCE: DemoCarPerformance = {
  topSpeedKmh: 186,
  maxLatG: 0.9,
  maxBrakeG: 0.9,
  maxAccelG: 0.38,
  powerKw: 160,
  massKg: 1290,
};

interface TelemetrySessionSeed {
  setupId: string;
  traceId: string;
  owner: DemoOwnerKey;
  driver: string;
  carModel: string;
  vehicleId: string;
  snapshot: CarSetup['vehicleProfileSnapshot'];
  performance: DemoCarPerformance;
  date: Date;
  fileName: string;
  seed: number;
  /** 各周のペース係数（先頭=アウトラップ、末尾=インラップ） */
  paceScales: readonly number[];
  visibility: CarSetup['visibility'];
  anonymized?: boolean;
  base: Omit<
    DemoSetupData,
    'driver' | 'carModel' | 'vehicleId' | 'vehicleProfileSnapshot' | 'circuit' | 'date' | 'lapTimeData' | 'telemetry' | 'visibility' | 'anonymized'
  >;
}

const TELEMETRY_SEEDS: TelemetrySessionSeed[] = [
  {
    setupId: 'demo-setup-20260321-suzuka',
    traceId: 'demo-trace-20260321-suzuka',
    owner: 'owner',
    driver: DRIVER_OWNER,
    carModel: Z34_CAR_MODEL,
    vehicleId: VEHICLE_Z34.id,
    snapshot: Z34_SNAPSHOT,
    performance: Z34_PERFORMANCE,
    date: jst('2026-03-21T10:15:00'),
    fileName: 'demo_suzuka_20260321.dtb',
    seed: 20260321,
    paceScales: [0.9, 0.972, 0.978, 0.974, 0.85],
    visibility: 'shared',
    anonymized: false,
    base: {
      sessionType: 'practice',
      weather: { condition: 'sunny', airTemp: 14, trackTemp: 22, humidity: 44, pressure: 1016 },
      tireSettings: pressures([172, 172, 167, 167], [204, 207, 197, 200]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_A050,
      tireUsage: { heatCyclesAdded: 2 },
      sessionInfo: { distance: 52, fuel: 38 },
      suspensionSettings: {
        frontDamper: { compression: 14, rebound: 14 },
        rearDamper: { compression: 12, rebound: 12 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 118, rear: 122 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -3.0, rear: -2.0 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'プロジェクトμ HC+', rearPad: 'プロジェクトμ HC+', frontRotor: 'スリット', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 14),
        adjustmentValue(Z34_ADJUSTMENTS[1], 12),
        adjustmentValue(Z34_ADJUSTMENTS[2], 118),
        adjustmentValue(Z34_ADJUSTMENTS[3], 122),
        adjustmentValue(Z34_ADJUSTMENTS[4], -3.0),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ミドル'),
        adjustmentValue(Z34_ADJUSTMENTS[6], 8),
      ],
      notes: 'Sタイヤ+ロガーで鈴鹿の基準ラップを作る回。',
      knowledge: {
        intention: 'ロガーを付けてセクターごとの弱点を洗い出す',
        result: 'S字〜ダンロップで明らかに遅い。進入速度が足りない',
        learning: '次回は1コーナーのブレーキを10m奥へ',
      },
      drivingFeedback: feedback({ highSpeedEntry: 2, highSpeedMiddle: 2, brakeInitial: 2, balance: 2, confidence: 2 }),
    },
  },
  {
    setupId: 'demo-setup-20260517-suzuka',
    traceId: 'demo-trace-20260517-suzuka',
    owner: 'owner',
    driver: DRIVER_OWNER,
    carModel: Z34_CAR_MODEL,
    vehicleId: VEHICLE_Z34.id,
    snapshot: Z34_SNAPSHOT,
    performance: Z34_PERFORMANCE,
    date: jst('2026-05-17T09:40:00'),
    fileName: 'demo_suzuka_20260517.dtb',
    seed: 20260517,
    paceScales: [0.9, 0.99, 0.996, 0.988, 0.85],
    visibility: 'private',
    base: {
      sessionType: 'practice',
      weather: { condition: 'sunny', airTemp: 21, trackTemp: 32, humidity: 49, pressure: 1011 },
      tireSettings: pressures([166, 166, 161, 161], [200, 203, 194, 197]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_A050,
      tireUsage: { heatCyclesAdded: 3 },
      sessionInfo: { distance: 58, fuel: 40 },
      suspensionSettings: {
        frontDamper: { compression: 12, rebound: 12 },
        rearDamper: { compression: 12, rebound: 12 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 116, rear: 122 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -3.2, rear: -2.0 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'プロジェクトμ HC+', rearPad: 'プロジェクトμ HC+', frontRotor: 'スリット', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 12),
        adjustmentValue(Z34_ADJUSTMENTS[1], 12),
        adjustmentValue(Z34_ADJUSTMENTS[2], 116),
        adjustmentValue(Z34_ADJUSTMENTS[3], 122),
        adjustmentValue(Z34_ADJUSTMENTS[4], -3.2),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ミドル'),
        adjustmentValue(Z34_ADJUSTMENTS[6], 10),
      ],
      notes: 'キャンバーを増やしてフロントの入りを改善する狙い。',
      knowledge: {
        intention: 'フロントキャンバー -3.0 → -3.2、車高を2mm下げる',
        result: '高速コーナーの座りが良くなり、S字の通過速度が上がった',
        learning: 'キャンバー増は効いた。次は内圧を1〜2kPa下げて接地を稼ぐ',
      },
      drivingFeedback: feedback({ highSpeedEntry: 3, highSpeedMiddle: 3, lowSpeedExit: 2, brakeInitial: 3, balance: 3, confidence: 3 }),
    },
  },
  {
    setupId: 'demo-setup-20260711-suzuka',
    traceId: 'demo-trace-20260711-suzuka',
    owner: 'owner',
    driver: DRIVER_OWNER,
    carModel: Z34_CAR_MODEL,
    vehicleId: VEHICLE_Z34.id,
    snapshot: Z34_SNAPSHOT,
    performance: Z34_PERFORMANCE,
    date: jst('2026-07-11T09:20:00'),
    fileName: 'demo_suzuka_20260711.dtb',
    seed: 20260711,
    paceScales: [0.9, 1.0, 1.008, 0.998, 0.85],
    visibility: 'shared',
    anonymized: false,
    base: {
      sessionType: 'practice',
      weather: { condition: 'sunny', airTemp: 29, trackTemp: 44, humidity: 62, pressure: 1004 },
      tireSettings: pressures([160, 160, 155, 155], [199, 202, 193, 196]),
      targetPressures: { front: 200, rear: 195 },
      tireInfo: Z34_TIRE_INFO_A050,
      tireUsage: { heatCyclesAdded: 2 },
      sessionInfo: { distance: 46, fuel: 36 },
      suspensionSettings: {
        frontDamper: { compression: 12, rebound: 14 },
        rearDamper: { compression: 12, rebound: 12 },
        springRate: { front: 10, rear: 8 },
        rideHeight: { front: 116, rear: 122 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -3.2, rear: -2.0 },
        toe: { front: 0, rear: 2 },
        caster: null,
      },
      brakeSettings: { frontPad: 'プロジェクトμ HC+', rearPad: 'プロジェクトμ HC+', frontRotor: 'スリット', rearRotor: '純正', balance: null },
      adjustmentValues: [
        adjustmentValue(Z34_ADJUSTMENTS[0], 12),
        adjustmentValue(Z34_ADJUSTMENTS[1], 12),
        adjustmentValue(Z34_ADJUSTMENTS[2], 116),
        adjustmentValue(Z34_ADJUSTMENTS[3], 122),
        adjustmentValue(Z34_ADJUSTMENTS[4], -3.2),
        adjustmentValue(Z34_ADJUSTMENTS[5], 'ハード'),
        adjustmentValue(Z34_ADJUSTMENTS[6], 12),
      ],
      notes: '猛暑対策で冷間を大きく下げた。ウイングを1段立てて高速の安心感を優先。',
      knowledge: {
        intention: '路温44℃想定で冷間 -6kPa、ウイング +2°',
        result: '温間が目標どおりに収まり、130Rが全開のまま行けた',
        learning: '路温40℃超えは冷間160kPaを基準にする',
      },
      drivingFeedback: feedback({
        lowSpeedEntry: 3,
        lowSpeedExit: 3,
        highSpeedEntry: 4,
        highSpeedMiddle: 4,
        brakeInitial: 3,
        brakeStability: 3,
        accelTraction: 3,
        balance: 4,
        confidence: 4,
      }),
    },
  },
  {
    setupId: 'demo-setup-20260530-suzuka-rival',
    traceId: 'demo-trace-20260530-suzuka-rival',
    owner: 'rival',
    driver: DRIVER_RIVAL,
    carModel: GR86_CAR_MODEL,
    vehicleId: VEHICLE_GR86.id,
    snapshot: GR86_SNAPSHOT,
    performance: GR86_PERFORMANCE,
    date: jst('2026-05-30T13:00:00'),
    fileName: 'demo_suzuka_20260530_rival.dtb',
    seed: 20260530,
    paceScales: [0.9, 0.995, 1.0, 0.99, 0.85],
    visibility: 'shared',
    anonymized: true,
    base: {
      sessionType: 'practice',
      weather: { condition: 'cloudy', airTemp: 23, trackTemp: 30, humidity: 58, pressure: 1009 },
      tireSettings: pressures([190, 190, 185, 185], [214, 216, 208, 210]),
      targetPressures: { front: 210, rear: 205 },
      tireInfo: {
        brand: 'ブリヂストン',
        manufacturer: 'ブリヂストン',
        productName: 'POTENZA RE-71RS',
        compound: '—',
        frontSize: '225/40R18',
        rearSize: '225/40R18',
      },
      sessionInfo: { distance: 40, fuel: 32 },
      suspensionSettings: {
        frontDamper: { compression: 8, rebound: 8 },
        rearDamper: { compression: 8, rebound: 8 },
        springRate: { front: 8, rear: 6 },
        rideHeight: { front: 120, rear: 125 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -2.5, rear: -1.5 },
        toe: { front: 0, rear: 1 },
        caster: null,
      },
      adjustmentValues: [
        adjustmentValue(GR86_ADJUSTMENTS[0], 8),
        adjustmentValue(GR86_ADJUSTMENTS[1], '冷間190kPaスタートで温間+24kPa'),
      ],
      notes: '共有ブラウズ確認用のデモ記録。',
      drivingFeedback: feedback({ balance: 3, confidence: 3 }),
    },
  },
];

interface BuiltTelemetrySession {
  setup: DemoDoc<DemoSetupData>;
  trace: DemoDoc<DemoTraceData>;
}

function buildTelemetrySession(seed: TelemetrySessionSeed): BuiltTelemetrySession {
  const circuit = SUZUKA;
  const setupForTrace = {
    carModel: seed.carModel,
    circuit,
    date: seed.date,
    sessionType: seed.base.sessionType,
    weather: seed.base.weather,
    tireInfo: seed.base.tireInfo,
    tireSettings: seed.base.tireSettings,
    targetPressures: seed.base.targetPressures,
    sessionInfo: seed.base.sessionInfo,
    notes: seed.base.notes,
  };

  const { trace, detection } = buildDemoTrace({
    trackId: 'suzuka-full',
    sessionDate: seed.date,
    car: seed.performance,
    lapPaceScales: seed.paceScales,
    fileName: seed.fileName,
    seed: seed.seed,
    ownerId: 'placeholder', // シード投入時に実 uid へ差し替える
    setupId: seed.setupId,
    setup: setupForTrace,
  });

  const laps: LapTime[] = detection.laps.map((lap) => ({
    lapNumber: lap.lapNumber,
    time: formatLapTime(lap.timeSeconds),
    type: lap.type,
  }));
  const bestIndex = detection.bestLapIndex;
  const bestLap = bestIndex === null ? null : formatLapTime(detection.laps[bestIndex].timeSeconds);

  const lapTimeData: LapTimeData = {
    bestLap,
    totalLaps: laps.length,
    laps,
    source: 'logger',
    evidence: {
      fileName: seed.fileName,
      format: 'digispice-dtb',
      importedAt: seed.date,
      trackId: 'suzuka-full',
    },
  };

  const setupData: DemoSetupData = {
    ...seed.base,
    driver: seed.anonymized ? null : seed.driver, // 匿名共有はデータ層でドライバー名を持たない
    visibility: seed.visibility,
    anonymized: seed.anonymized ?? false,
    carModel: seed.carModel,
    vehicleId: seed.vehicleId,
    vehicleProfileSnapshot: seed.snapshot,
    circuit,
    date: seed.date,
    lapTimeData,
    telemetry: {
      traceIds: [seed.traceId],
      primaryTraceId: seed.traceId,
      importStatus: 'trace_saved',
    },
  };

  const { ownerId: _ownerId, ...traceWithoutOwner } = trace;

  return {
    setup: { id: seed.setupId, owner: seed.owner, data: setupData },
    trace: {
      id: seed.traceId,
      owner: seed.owner,
      data: {
        ...traceWithoutOwner,
        visibility: seed.visibility === 'shared' ? 'shared' : 'private',
        anonymized: seed.anonymized ?? false,
        summary: {
          ...traceWithoutOwner.summary,
          nextAction: seed.base.knowledge?.learning,
        },
      },
    },
  };
}

// ─── ライバルユーザーの手入力記録（共有ブラウズ用） ───────────

const rivalManualSetups: DemoDoc<DemoSetupData>[] = [
  {
    id: 'demo-setup-20260613-tsukuba-rival',
    owner: 'rival',
    data: {
      driver: DRIVER_RIVAL,
      visibility: 'shared',
      anonymized: false,
      carModel: GR86_CAR_MODEL,
      vehicleId: VEHICLE_GR86.id,
      vehicleProfileSnapshot: GR86_SNAPSHOT,
      circuit: TSUKUBA,
      date: jst('2026-06-13T10:30:00'),
      sessionType: 'practice',
      weather: { condition: 'sunny', airTemp: 25, trackTemp: 38, humidity: 55, pressure: 1007 },
      tireSettings: pressures([185, 185, 180, 180], [210, 212, 204, 206]),
      targetPressures: { front: 210, rear: 205 },
      tireInfo: {
        brand: 'ブリヂストン',
        manufacturer: 'ブリヂストン',
        productName: 'POTENZA RE-71RS',
        compound: '—',
        frontSize: '225/40R18',
        rearSize: '225/40R18',
      },
      sessionInfo: { distance: 28, fuel: 26 },
      suspensionSettings: {
        frontDamper: { compression: 8, rebound: 8 },
        rearDamper: { compression: 6, rebound: 6 },
        springRate: { front: 8, rear: 6 },
        rideHeight: { front: 118, rear: 124 },
        antiRollBar: { front: null, rear: null },
      },
      alignmentSettings: {
        camber: { front: -2.8, rear: -1.5 },
        toe: { front: 0, rear: 1 },
        caster: null,
      },
      adjustmentValues: [adjustmentValue(GR86_ADJUSTMENTS[0], 8)],
      notes: '共有ブラウズ確認用のデモ記録。',
      knowledge: {
        intention: 'リアの減衰を弱めて立ち上がりを稼ぐ',
        result: '最終コーナーの立ち上がりが安定',
      },
      drivingFeedback: feedback({ accelTraction: 3, balance: 3 }),
      lapTimeData: manualLaps(['1:12.900', '1:04.320', '1:03.780', '1:04.010', '1:14.100']),
    },
  },
  {
    id: 'demo-setup-20260704-fuji-rival',
    owner: 'rival',
    data: {
      driver: DRIVER_RIVAL,
      visibility: 'shared',
      anonymized: false,
      carModel: GR86_CAR_MODEL,
      vehicleId: VEHICLE_GR86.id,
      vehicleProfileSnapshot: GR86_SNAPSHOT,
      circuit: FUJI,
      date: jst('2026-07-04T11:20:00'),
      sessionType: 'practice',
      weather: { condition: 'cloudy', airTemp: 27, trackTemp: 36, humidity: 70, pressure: 1006 },
      tireSettings: pressures([185, 185, 180, 180], [208, 211, 202, 205]),
      targetPressures: { front: 210, rear: 205 },
      tireInfo: {
        brand: 'ブリヂストン',
        manufacturer: 'ブリヂストン',
        productName: 'POTENZA RE-71RS',
        compound: '—',
        frontSize: '225/40R18',
        rearSize: '225/40R18',
      },
      sessionInfo: { distance: 42, fuel: 34 },
      notes: '共有ブラウズ確認用のデモ記録。足まわりは前回のまま。',
      lapTimeData: manualLaps(['2:18.900', '2:07.640', '2:06.980', '2:07.210', '2:21.500']),
    },
  },
];

// ─── データセット組み立て ────────────────────────────────────

const ACCOUNTS: DemoAccount[] = [
  {
    key: 'owner',
    email: 'demo.velocity@example.com',
    password: 'DemoPass123!',
    displayName: DRIVER_OWNER,
    locale: 'ja-JP',
    onboarding: { homeCircuit: SUZUKA, goalType: 'laptime', targetLapTime: '2:15.000' },
  },
  {
    key: 'rival',
    email: 'demo.rival@example.com',
    password: 'DemoPass123!',
    displayName: DRIVER_RIVAL,
    locale: 'ja-JP',
    onboarding: { homeCircuit: TSUKUBA, goalType: 'record', targetLapTime: null },
  },
];

/**
 * デモデータセットを構築する。
 * 同じ入力から常に同じ出力になる（ID・日時・走行ログすべて固定）。
 */
export function buildDemoDataset(): DemoDataset {
  const telemetry = TELEMETRY_SEEDS.map(buildTelemetrySession);

  const setups: DemoDoc<DemoSetupData>[] = [
    ...manualSetups,
    ...telemetry.map((entry) => entry.setup),
    ...rivalManualSetups,
  ].sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

  const telemetryTraces = telemetry.map((entry) => entry.trace);

  // 公開リンクは共有中の代表セッション1件だけ作る（IDはルールの ^[A-Za-z0-9]{12,}$ を満たす固定値）
  const publicShareSource = telemetry.find((entry) => entry.setup.id === 'demo-setup-20260711-suzuka')!;
  const publicShares: DemoPublicShare[] = [
    {
      id: 'demoSuzuka20260711',
      owner: 'owner',
      setupId: publicShareSource.setup.id,
      summary: buildShareSummary({
        ...publicShareSource.setup.data,
        id: publicShareSource.setup.id,
        userId: 'placeholder',
        createdAt: publicShareSource.setup.data.date,
        updatedAt: publicShareSource.setup.data.date,
      }),
    },
  ];

  const entitlements = (['owner', 'rival'] as DemoOwnerKey[]).map((owner) => {
    const shared = setups.find((setup) => setup.owner === owner && setup.data.visibility === 'shared');
    if (!shared) throw new Error(`共有中のセットアップがありません: ${owner}`);
    return { owner, setupId: shared.id };
  });

  return {
    accounts: ACCOUNTS,
    vehicles: VEHICLES,
    tireSets: TIRE_SETS,
    setups,
    telemetryTraces,
    publicShares,
    entitlements,
  };
}
