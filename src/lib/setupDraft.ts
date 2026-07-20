// canonical フォーム state（SetupDraft）と、その純粋な変換関数群。
//
// 新規・既存読込・コピー・前回引き継ぎ・保存のすべてが、この 4 関数を通る:
//   - setupToDraft:        既存 CarSetup → 編集用 draft（ラップ・証憑・共有設定も復元）
//   - copySetupToDraft:    既存 CarSetup → 新規 draft（日時=今、ラップ/証憑/テレメトリ/共有は初期化）
//   - inheritSetupSettings: 現 draft にセッション非依存の設定だけを上書き
//   - draftToSetupInput:   draft → 保存ペイロード（未入力は null、デモ初期値は保存しない）
//
// 原則: 未入力は null。0 や '' 由来の数値・デモ評価値での充填を禁止する。

import { useReducer, useCallback } from 'react';
import { toNumberOrNull, toIntOrNull, calcPressureDiff } from './units';
import type {
  CarSetup,
  KnowledgeNote,
  LapTime,
  LapTimeSource,
  LapEvidence,
  SetupTelemetryRefs,
  SetupVisibility,
  WeatherType,
  DrivingFeedback,
  SetupAdjustmentValue,
} from '../types/setup';
import { normalizeWeather } from './weather';

// ─── 補助 ────────────────────────────────────────────────────────────────

/** number | null → 表示用文字列（null/undefined は空文字） */
const numToStr = (n: number | null | undefined): string =>
  n === null || n === undefined ? '' : String(n);

/** 差分の符号付き表示（+5 / -3 / 空） */
const fmtDiff = (diff: number | null | undefined): string => {
  if (diff == null) return '';
  return diff >= 0 ? `+${diff}` : diff.toString();
};

export interface TirePressureDraft {
  before: string;
  after: string;
  diff: string;
}

export interface TirePressuresDraft {
  fl: TirePressureDraft;
  fr: TirePressureDraft;
  rl: TirePressureDraft;
  rr: TirePressureDraft;
}

/** canonical なフォーム state。UI 入力の生表現（文字列/nullable数値）を保持する */
export interface SetupDraft {
  // セッション・基本情報
  driver: string;
  carModel: string;
  vehicleId: string | null;
  circuit: string;
  sessionDate: Date;
  sessionType: 'practice' | 'qualifying' | 'race';

  // 環境データ
  weatherCondition: WeatherType | '';
  airTemp: string;
  trackTemp: string;
  humidity: string;
  pressure: string;

  // タイヤ情報
  tireBrand: string;
  tireProductName: string;
  tireCompound: string;
  frontTireSize: string;
  rearTireSize: string;
  tireSetId: string;
  tireSetCode: string;
  tireHeatCyclesAdded: string;
  distance: string;
  fuel: string;

  // タイヤ空気圧
  tirePressures: TirePressuresDraft;
  targetPressures: { front: string; rear: string };

  // サスペンション（前後軸単位 — スキーマに一致）
  frontDamperCompression: number | null;
  frontDamperRebound: number | null;
  rearDamperCompression: number | null;
  rearDamperRebound: number | null;
  frontSpringRate: string;
  rearSpringRate: string;
  frontRideHeight: string;
  rearRideHeight: string;
  frontStabilizer: string;
  rearStabilizer: string;

  // アライメント（前後軸単位 — スキーマに一致）
  frontCamber: string;
  rearCamber: string;
  frontToe: string;
  rearToe: string;
  caster: string;

  // 車両固有の追加調整項目
  frontBrakePad: string;
  rearBrakePad: string;
  frontBrakeRotor: string;
  rearBrakeRotor: string;
  brakeBalance: string;
  frontAero: string;
  rearAero: string;
  ecuMap: string;
  boost: string;

  // 車両側の定義に基づく可変セッティング値（新しいコア入力モデル）
  adjustmentValues: SetupAdjustmentValue[];

  // ドライバーフィードバック
  notes: string;
  knowledge: KnowledgeNote;
  drivingFeedback: DrivingFeedback;

  // ラップタイム・証憑・共有（編集保存で既存値を消さないため draft に保持）
  bestLap: string;
  totalLaps: string;
  detailedLaps: LapTime[];
  lapSource: LapTimeSource;
  lapEvidence: LapEvidence | null;
  telemetryRefs: SetupTelemetryRefs;
  visibility: SetupVisibility;
  anonymized: boolean;
}

// ─── 初期値 ──────────────────────────────────────────────────────────────

export const emptyTelemetryRefs = (): SetupTelemetryRefs => ({
  traceIds: [],
  primaryTraceId: null,
  importStatus: 'none',
});

/** 全項目未評価（null）の drivingFeedback。デモ初期値は入れない */
export const emptyDrivingFeedback = (): DrivingFeedback => ({
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
});

const emptyTirePressure = (): TirePressureDraft => ({ before: '', after: '', diff: '' });

/** 新規記録用の空 draft（sessionDate のみ現在時刻） */
export const createEmptyDraft = (): SetupDraft => ({
  driver: '',
  carModel: '',
  vehicleId: null,
  circuit: '',
  sessionDate: new Date(),
  sessionType: 'practice',
  weatherCondition: '',
  airTemp: '',
  trackTemp: '',
  humidity: '',
  pressure: '',
  tireBrand: '',
  tireProductName: '',
  tireCompound: '',
  frontTireSize: '',
  rearTireSize: '',
  tireSetId: '',
  tireSetCode: '',
  tireHeatCyclesAdded: '',
  distance: '',
  fuel: '',
  tirePressures: {
    fl: emptyTirePressure(),
    fr: emptyTirePressure(),
    rl: emptyTirePressure(),
    rr: emptyTirePressure(),
  },
  targetPressures: { front: '', rear: '' },
  frontDamperCompression: null,
  frontDamperRebound: null,
  rearDamperCompression: null,
  rearDamperRebound: null,
  frontSpringRate: '',
  rearSpringRate: '',
  frontRideHeight: '',
  rearRideHeight: '',
  frontStabilizer: '',
  rearStabilizer: '',
  frontCamber: '',
  rearCamber: '',
  frontToe: '',
  rearToe: '',
  caster: '',
  frontBrakePad: '', rearBrakePad: '', frontBrakeRotor: '', rearBrakeRotor: '', brakeBalance: '',
  frontAero: '', rearAero: '', ecuMap: '', boost: '',
  adjustmentValues: [],
  notes: '',
  knowledge: { intention: '', result: '', learning: '' },
  drivingFeedback: emptyDrivingFeedback(),
  bestLap: '',
  totalLaps: '',
  detailedLaps: [],
  lapSource: 'manual',
  lapEvidence: null,
  telemetryRefs: emptyTelemetryRefs(),
  visibility: 'private',
  anonymized: false,
});

// ─── 変換: CarSetup → draft の共通部分 ────────────────────────────────────

/**
 * ラップ/証憑/テレメトリ/共有以外の、セッション設定・実測値を draft へ写す共通部分。
 * setupToDraft と copySetupToDraft の両方で使う。
 */
const baseFieldsFromSetup = (setup: CarSetup): Omit<
  SetupDraft,
  | 'sessionDate'
  | 'bestLap'
  | 'totalLaps'
  | 'detailedLaps'
  | 'lapSource'
  | 'lapEvidence'
  | 'telemetryRefs'
  | 'visibility'
  | 'anonymized'
> => ({
  driver: setup.driver ?? '',
  carModel: setup.carModel,
  vehicleId: setup.vehicleId ?? null,
  circuit: setup.circuit,
  sessionType: setup.sessionType,
  weatherCondition: normalizeWeather(setup.weather.condition) ?? '',
  airTemp: numToStr(setup.weather.airTemp),
  trackTemp: numToStr(setup.weather.trackTemp),
  humidity: numToStr(setup.weather.humidity),
  pressure: numToStr(setup.weather.pressure),
  tireBrand: setup.tireInfo.manufacturer ?? setup.tireInfo.brand,
  tireProductName: setup.tireInfo.productName ?? '',
  tireCompound: setup.tireInfo.compound,
  frontTireSize: setup.tireInfo.frontSize ?? '',
  rearTireSize: setup.tireInfo.rearSize ?? '',
  tireSetId: setup.tireInfo.tireSetId ?? '',
  tireSetCode: setup.tireInfo.tireSetCode ?? '',
  tireHeatCyclesAdded: numToStr(setup.tireUsage?.heatCyclesAdded ?? null),
  distance: numToStr(setup.sessionInfo.distance),
  fuel: numToStr(setup.sessionInfo.fuel),
  tirePressures: {
    fl: {
      before: numToStr(setup.tireSettings.fl.before),
      after: numToStr(setup.tireSettings.fl.after),
      diff: fmtDiff(setup.tireSettings.fl.diff),
    },
    fr: {
      before: numToStr(setup.tireSettings.fr.before),
      after: numToStr(setup.tireSettings.fr.after),
      diff: fmtDiff(setup.tireSettings.fr.diff),
    },
    rl: {
      before: numToStr(setup.tireSettings.rl.before),
      after: numToStr(setup.tireSettings.rl.after),
      diff: fmtDiff(setup.tireSettings.rl.diff),
    },
    rr: {
      before: numToStr(setup.tireSettings.rr.before),
      after: numToStr(setup.tireSettings.rr.after),
      diff: fmtDiff(setup.tireSettings.rr.diff),
    },
  },
  targetPressures: {
    front: numToStr(setup.targetPressures?.front ?? null),
    rear: numToStr(setup.targetPressures?.rear ?? null),
  },
  frontDamperCompression: setup.suspensionSettings?.frontDamper.compression ?? null,
  frontDamperRebound: setup.suspensionSettings?.frontDamper.rebound ?? null,
  rearDamperCompression: setup.suspensionSettings?.rearDamper.compression ?? null,
  rearDamperRebound: setup.suspensionSettings?.rearDamper.rebound ?? null,
  frontSpringRate: numToStr(setup.suspensionSettings?.springRate.front ?? null),
  rearSpringRate: numToStr(setup.suspensionSettings?.springRate.rear ?? null),
  frontRideHeight: numToStr(setup.suspensionSettings?.rideHeight.front ?? null),
  rearRideHeight: numToStr(setup.suspensionSettings?.rideHeight.rear ?? null),
  frontStabilizer: numToStr(setup.suspensionSettings?.antiRollBar.front ?? null),
  rearStabilizer: numToStr(setup.suspensionSettings?.antiRollBar.rear ?? null),
  frontCamber: numToStr(setup.alignmentSettings?.camber.front ?? null),
  rearCamber: numToStr(setup.alignmentSettings?.camber.rear ?? null),
  frontToe: numToStr(setup.alignmentSettings?.toe.front ?? null),
  rearToe: numToStr(setup.alignmentSettings?.toe.rear ?? null),
  caster: numToStr(setup.alignmentSettings?.caster ?? null),
  frontBrakePad: setup.brakeSettings?.frontPad ?? '',
  rearBrakePad: setup.brakeSettings?.rearPad ?? '',
  frontBrakeRotor: setup.brakeSettings?.frontRotor ?? '',
  rearBrakeRotor: setup.brakeSettings?.rearRotor ?? '',
  brakeBalance: numToStr(setup.brakeSettings?.balance ?? null),
  frontAero: numToStr(setup.aeroSettings?.front ?? null),
  rearAero: numToStr(setup.aeroSettings?.rear ?? null),
  ecuMap: setup.engineSettings?.ecuMap ?? '',
  boost: numToStr(setup.engineSettings?.boost ?? null),
  adjustmentValues: setup.adjustmentValues?.map((entry) => ({ ...entry })) ?? [],
  notes: setup.notes ?? '',
  knowledge: {
    intention: setup.knowledge?.intention ?? '',
    result: setup.knowledge?.result ?? '',
    learning: setup.knowledge?.learning ?? '',
  },
  drivingFeedback: { ...emptyDrivingFeedback(), ...(setup.drivingFeedback ?? {}) },
});

/** 既存 CarSetup を編集用 draft へ変換（ラップ・証憑・共有設定も復元する） */
export const setupToDraft = (setup: CarSetup): SetupDraft => ({
  ...baseFieldsFromSetup(setup),
  sessionDate: setup.date instanceof Date ? setup.date : new Date(setup.date),
  bestLap: setup.lapTimeData?.bestLap ?? '',
  totalLaps: numToStr(setup.lapTimeData?.totalLaps ?? null),
  detailedLaps: setup.lapTimeData?.laps ?? [],
  lapSource: setup.lapTimeData?.source ?? 'manual',
  lapEvidence: setup.lapTimeData?.evidence ?? null,
  telemetryRefs: setup.telemetry ?? emptyTelemetryRefs(),
  visibility: setup.visibility ?? 'private',
  anonymized: setup.anonymized ?? false,
});

/**
 * 既存 CarSetup を新規記録用 draft へ変換（コピー / 前回読込）。
 * 設定値・実測値は引き継ぐが、以下は新規セッションとして初期化する:
 *   - sessionDate = 現在
 *   - ラップタイム / ロガー証憑 / テレメトリ参照
 *   - 公開状態（visibility / anonymized）
 */
export const copySetupToDraft = (setup: CarSetup): SetupDraft => ({
  ...baseFieldsFromSetup(setup),
  distance: '',
  fuel: '',
  tireHeatCyclesAdded: '',
  sessionDate: new Date(),
  bestLap: '',
  totalLaps: '',
  detailedLaps: [],
  lapSource: 'manual',
  lapEvidence: null,
  telemetryRefs: emptyTelemetryRefs(),
  visibility: 'private',
  anonymized: false,
});

/**
 * 現 draft に、同一車種の過去セットアップから「セッション非依存の設定」だけを上書きする。
 * 引き継ぐ: タイヤ銘柄/コンパウンド・サスペンション・アライメント・ダンパー・ドライバー名
 * 引き継がない: 空気圧の実測値・天候・ラップ・走行距離/燃料・共有設定・日時（=セッション固有値）
 */
export const inheritSetupSettings = (current: SetupDraft, source: CarSetup): SetupDraft => {
  const next: SetupDraft = { ...current };

  // タイヤ銘柄・コンパウンド
  next.tireBrand = source.tireInfo.manufacturer ?? source.tireInfo.brand;
  next.tireProductName = source.tireInfo.productName ?? '';
  next.tireCompound = source.tireInfo.compound;
  next.frontTireSize = source.tireInfo.frontSize ?? '';
  next.rearTireSize = source.tireInfo.rearSize ?? '';
  next.tireSetId = source.tireInfo.tireSetId ?? '';
  next.tireSetCode = source.tireInfo.tireSetCode ?? '';
  next.tireHeatCyclesAdded = '';

  // サスペンション設定
  if (source.suspensionSettings) {
    next.frontDamperCompression = source.suspensionSettings.frontDamper.compression ?? null;
    next.frontDamperRebound = source.suspensionSettings.frontDamper.rebound ?? null;
    next.rearDamperCompression = source.suspensionSettings.rearDamper.compression ?? null;
    next.rearDamperRebound = source.suspensionSettings.rearDamper.rebound ?? null;
    next.frontSpringRate = numToStr(source.suspensionSettings.springRate.front);
    next.rearSpringRate = numToStr(source.suspensionSettings.springRate.rear);
    next.frontRideHeight = numToStr(source.suspensionSettings.rideHeight.front);
    next.rearRideHeight = numToStr(source.suspensionSettings.rideHeight.rear);
    next.frontStabilizer = numToStr(source.suspensionSettings.antiRollBar.front);
    next.rearStabilizer = numToStr(source.suspensionSettings.antiRollBar.rear);
  }

  // アライメント設定
  if (source.alignmentSettings) {
    next.frontCamber = numToStr(source.alignmentSettings.camber.front);
    next.rearCamber = numToStr(source.alignmentSettings.camber.rear);
    next.frontToe = numToStr(source.alignmentSettings.toe.front);
    next.rearToe = numToStr(source.alignmentSettings.toe.rear);
    next.caster = numToStr(source.alignmentSettings.caster);
  }
  if (source.brakeSettings) {
    next.frontBrakePad = source.brakeSettings.frontPad;
    next.rearBrakePad = source.brakeSettings.rearPad;
    next.frontBrakeRotor = source.brakeSettings.frontRotor;
    next.rearBrakeRotor = source.brakeSettings.rearRotor;
    next.brakeBalance = numToStr(source.brakeSettings.balance);
  }
  if (source.aeroSettings) {
    next.frontAero = numToStr(source.aeroSettings.front);
    next.rearAero = numToStr(source.aeroSettings.rear);
  }
  if (source.engineSettings) {
    next.ecuMap = source.engineSettings.ecuMap;
    next.boost = numToStr(source.engineSettings.boost);
  }
  if (source.adjustmentValues) {
    next.adjustmentValues = source.adjustmentValues.map((entry) => ({ ...entry }));
  }

  // ドライバー名（車両に紐づく運転者として引き継ぐ）
  if (source.driver) next.driver = source.driver;

  return next;
};

// ─── 変換: draft → 保存ペイロード ────────────────────────────────────────

/** drivingFeedback に 1 つでも評価値があるか（全 null なら未評価扱い） */
const hasAnyDrivingFeedback = (f: DrivingFeedback): boolean =>
  Object.values(f).some((v) => v !== null && v !== undefined);

/**
 * draft を保存ペイロード（Omit<CarSetup, 'id' | 'createdAt' | 'updatedAt'>）へ変換する。
 * - 未入力の数値は null（0 変換禁止）
 * - drivingFeedback は全項目未評価なら undefined（デモ初期値を保存しない）
 * - knowledge は全項目空なら undefined
 */
export const draftToSetupInput = (
  draft: SetupDraft,
  userId: string,
): Omit<CarSetup, 'id' | 'createdAt' | 'updatedAt'> => {
  const buildTirePressure = (tp: TirePressureDraft) => {
    const before = toNumberOrNull(tp.before);
    const after = toNumberOrNull(tp.after);
    return { before, after, diff: calcPressureDiff(before, after) };
  };

  const trimmedKnowledge = {
    intention: draft.knowledge.intention?.trim() || '',
    result: draft.knowledge.result?.trim() || '',
    learning: draft.knowledge.learning?.trim() || '',
  };
  const hasKnowledge = Object.values(trimmedKnowledge).some((v) => v.length > 0);
  const recordedAdjustmentValues = draft.adjustmentValues.filter(
    (entry) => entry.value !== null && entry.value !== '',
  );

  return {
    userId,
    driver: draft.driver.trim() || null,
    visibility: draft.visibility,
    anonymized: draft.anonymized,
    carModel: draft.carModel,
    vehicleId: draft.vehicleId,
    circuit: draft.circuit,
    date: draft.sessionDate,
    sessionType: draft.sessionType,
    weather: {
      condition: (draft.weatherCondition as WeatherType) || null,
      airTemp: toNumberOrNull(draft.airTemp),
      trackTemp: toNumberOrNull(draft.trackTemp),
      humidity: toNumberOrNull(draft.humidity),
      pressure: toNumberOrNull(draft.pressure),
    },
    tireSettings: {
      fl: buildTirePressure(draft.tirePressures.fl),
      fr: buildTirePressure(draft.tirePressures.fr),
      rl: buildTirePressure(draft.tirePressures.rl),
      rr: buildTirePressure(draft.tirePressures.rr),
    },
    targetPressures: {
      front: toNumberOrNull(draft.targetPressures.front),
      rear: toNumberOrNull(draft.targetPressures.rear),
    },
    tireInfo: {
      brand: draft.tireBrand,
      manufacturer: draft.tireBrand,
      productName: draft.tireProductName,
      compound: draft.tireCompound,
      frontSize: draft.frontTireSize,
      rearSize: draft.rearTireSize,
      ...(draft.tireSetId ? { tireSetId: draft.tireSetId } : {}),
      ...(draft.tireSetCode ? { tireSetCode: draft.tireSetCode } : {}),
    },
    tireUsage: draft.tireSetId
      ? { heatCyclesAdded: toIntOrNull(draft.tireHeatCyclesAdded) }
      : undefined,
    sessionInfo: {
      distance: toNumberOrNull(draft.distance),
      fuel: toNumberOrNull(draft.fuel),
    },
    suspensionSettings: {
      frontDamper: {
        compression: draft.frontDamperCompression,
        rebound: draft.frontDamperRebound,
      },
      rearDamper: {
        compression: draft.rearDamperCompression,
        rebound: draft.rearDamperRebound,
      },
      springRate: {
        front: toNumberOrNull(draft.frontSpringRate),
        rear: toNumberOrNull(draft.rearSpringRate),
      },
      rideHeight: {
        front: toNumberOrNull(draft.frontRideHeight),
        rear: toNumberOrNull(draft.rearRideHeight),
      },
      antiRollBar: {
        front: toNumberOrNull(draft.frontStabilizer),
        rear: toNumberOrNull(draft.rearStabilizer),
      },
    },
    alignmentSettings: {
      camber: {
        front: toNumberOrNull(draft.frontCamber),
        rear: toNumberOrNull(draft.rearCamber),
      },
      toe: {
        front: toNumberOrNull(draft.frontToe),
        rear: toNumberOrNull(draft.rearToe),
      },
      caster: toNumberOrNull(draft.caster),
    },
    brakeSettings: {
      frontPad: draft.frontBrakePad,
      rearPad: draft.rearBrakePad,
      frontRotor: draft.frontBrakeRotor,
      rearRotor: draft.rearBrakeRotor,
      balance: toNumberOrNull(draft.brakeBalance),
    },
    aeroSettings: { front: toNumberOrNull(draft.frontAero), rear: toNumberOrNull(draft.rearAero) },
    engineSettings: { ecuMap: draft.ecuMap, boost: toNumberOrNull(draft.boost) },
    adjustmentValues: recordedAdjustmentValues.length > 0
      ? recordedAdjustmentValues.map((entry) => ({ ...entry }))
      : undefined,
    drivingFeedback: hasAnyDrivingFeedback(draft.drivingFeedback)
      ? draft.drivingFeedback
      : undefined,
    lapTimeData: {
      bestLap: draft.bestLap || null,
      totalLaps: toIntOrNull(draft.totalLaps),
      laps: draft.detailedLaps || [],
      source: draft.lapSource,
      evidence: draft.lapEvidence,
    },
    telemetry: draft.telemetryRefs,
    knowledge: hasKnowledge ? trimmedKnowledge : undefined,
    notes: draft.notes,
  };
};

// ─── ダーティ判定（未保存離脱保護用の純粋関数） ─────────────────────────

/**
 * draft を安定した文字列へ直列化する（基準スナップショットとの比較に使う）。
 * sessionDate は Date だが JSON.stringify で ISO 文字列になり決定的。
 * 各オブジェクトのキー順は生成コードで固定のため、比較は安定する。
 */
export const serializeDraft = (draft: SetupDraft): string => JSON.stringify(draft);

/**
 * 現在の draft が基準スナップショット（serializeDraft の結果）と異なるか。
 * 基準と一致すれば「未保存の変更なし」とみなす。
 */
export const isDraftDirty = (baseline: string, draft: SetupDraft): boolean =>
  serializeDraft(draft) !== baseline;

// ─── useSetupDraft: reducer フック ───────────────────────────────────────

type DraftAction =
  | { type: 'replace'; draft: SetupDraft }
  | { type: 'setField'; key: keyof SetupDraft; value: unknown };

function draftReducer(state: SetupDraft, action: DraftAction): SetupDraft {
  switch (action.type) {
    case 'replace':
      return action.draft;
    case 'setField': {
      // value が関数なら現在値を渡して解決（useState 互換の functional update）
      const { key, value } = action;
      const resolved =
        typeof value === 'function'
          ? (value as (prev: unknown) => unknown)(state[key])
          : value;
      return { ...state, [key]: resolved };
    }
    default:
      return state;
  }
}

export interface UseSetupDraftResult {
  draft: SetupDraft;
  /** 単一フィールドの更新。value に関数を渡すと functional update（prev => next） */
  setField: <K extends keyof SetupDraft>(
    key: K,
    value: SetupDraft[K] | ((prev: SetupDraft[K]) => SetupDraft[K]),
  ) => void;
  /** draft 全体の差し替え（新規初期化・既存読込・コピー・引き継ぎで使用） */
  replaceDraft: (draft: SetupDraft) => void;
}

/** canonical フォーム state を管理する reducer フック */
export function useSetupDraft(initial?: SetupDraft): UseSetupDraftResult {
  const [draft, dispatch] = useReducer(draftReducer, initial ?? null, (init) => init ?? createEmptyDraft());

  const setField = useCallback(
    <K extends keyof SetupDraft>(
      key: K,
      value: SetupDraft[K] | ((prev: SetupDraft[K]) => SetupDraft[K]),
    ) => {
      dispatch({ type: 'setField', key, value });
    },
    [],
  );

  const replaceDraft = useCallback((next: SetupDraft) => {
    dispatch({ type: 'replace', draft: next });
  }, []);

  return { draft, setField, replaceDraft };
}
