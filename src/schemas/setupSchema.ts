import { z } from 'zod';

// ─── 共通バリデーション ──────────────────────────────────────

const nullableNum = (min?: number, max?: number) => {
  let schema = z.number().nullable();
  if (min !== undefined) schema = schema.refine(v => v === null || v >= min, { message: `${min}以上の値を入力してください` });
  if (max !== undefined) schema = schema.refine(v => v === null || v <= max, { message: `${max}以下の値を入力してください` });
  return schema;
};

const TIRE_CLASSES = ['S_TIRE', 'HIGH_GRIP_RADIAL', 'RADIAL'] as const;
const MOD_CATEGORIES = [
  'intake_exhaust',
  'forced_induction',
  'suspension',
  'brake',
  'aero',
  'weight_reduction',
  'ecu',
  'drivetrain',
  'engine_internal',
  'tire_wheel',
  'body_reinforcement',
  'other',
] as const;
const MOD_LEVELS = ['NORMAL', 'LIGHT', 'MIDDLE', 'FULL'] as const;
const ADJUSTMENT_GROUPS = [
  'tire', 'damper', 'spring', 'ride_height', 'anti_roll_bar', 'alignment', 'brake',
  'aero', 'drivetrain', 'engine', 'electronics', 'weight_balance', 'other',
] as const;
const ADJUSTMENT_POSITIONS = ['vehicle', 'front', 'rear', 'fl', 'fr', 'rl', 'rr'] as const;
const ADJUSTMENT_VALUE_TYPES = ['number', 'select', 'text', 'boolean'] as const;

// ─── サブスキーマ ──────────────────────────────────────────

const tirePressureSchema = z.object({
  before: nullableNum(0, 500),   // kPa
  after: nullableNum(0, 500),
  diff: nullableNum(-200, 200).optional(),
});

const tireSettingsSchema = z.object({
  fl: tirePressureSchema,
  fr: tirePressureSchema,
  rl: tirePressureSchema,
  rr: tirePressureSchema,
});

const weatherConditionSchema = z.object({
  condition: z.enum(['sunny', 'cloudy', 'wet', 'full_wet', '晴れ', '曇り', 'ウェット', 'フルウェット']).nullable(),
  airTemp: nullableNum(-20, 60),     // ℃
  trackTemp: nullableNum(-20, 80),   // ℃
  humidity: nullableNum(0, 100),     // %
  pressure: nullableNum(900, 1100),  // hPa
});

const sessionInfoSchema = z.object({
  distance: nullableNum(0, 50000), // km
  fuel: nullableNum(0, 500),       // L
});

const damperPairSchema = z.object({
  compression: nullableNum(0, 100),
  rebound: nullableNum(0, 100),
});

const suspensionSettingsSchema = z.object({
  frontDamper: damperPairSchema,
  rearDamper: damperPairSchema,
  springRate: z.object({
    front: nullableNum(0, 200),    // kgf/mm
    rear: nullableNum(0, 200),
  }),
  rideHeight: z.object({
    front: nullableNum(50, 300),   // mm
    rear: nullableNum(50, 300),
  }),
  antiRollBar: z.object({
    front: nullableNum(0, 100),
    rear: nullableNum(0, 100),
  }),
}).optional();

const alignmentSettingsSchema = z.object({
  camber: z.object({
    front: nullableNum(-10, 5),   // deg
    rear: nullableNum(-10, 5),
  }),
  toe: z.object({
    front: nullableNum(-20, 20),  // mm
    rear: nullableNum(-20, 20),
  }),
  caster: nullableNum(-10, 20),  // deg
}).optional();

const targetPressuresSchema = z.object({
  front: nullableNum(0, 500), // kPa
  rear: nullableNum(0, 500),  // kPa
}).optional();

const setupAdjustmentValueSchema = z.object({
  definitionId: z.string().min(1),
  group: z.enum(ADJUSTMENT_GROUPS),
  label: z.string().min(1),
  position: z.enum(ADJUSTMENT_POSITIONS),
  valueType: z.enum(ADJUSTMENT_VALUE_TYPES),
  unit: z.string().optional(),
  value: z.union([z.number(), z.string(), z.boolean()]).nullable(),
});

// ドライバー評価（各値 0〜4 の主観評価、未入力は null）。デモ初期値は保存しない。
const drivingRating = nullableNum(0, 4);
const drivingFeedbackSchema = z.object({
  lowSpeedEntry: drivingRating,
  lowSpeedMiddle: drivingRating,
  lowSpeedExit: drivingRating,
  highSpeedEntry: drivingRating,
  highSpeedMiddle: drivingRating,
  highSpeedExit: drivingRating,
  brakeInitial: drivingRating,
  brakeMiddle: drivingRating,
  brakeStability: drivingRating,
  accelResponse: drivingRating,
  accelTraction: drivingRating,
  balance: drivingRating,
  confidence: drivingRating,
}).optional();

const lapEvidenceSchema = z.object({
  fileName: z.string().min(1),
  format: z.enum(['aim-csv', 'digispice-dtb', 'nmea']),
  importedAt: z.date(),
  trackId: z.string().nullable(),
});

const lapTimeDataSchema = z.object({
  bestLap: z.string().nullable().optional(),
  totalLaps: nullableNum(0, 1000).optional(),
  laps: z.array(z.object({
    lapNumber: z.number(),
    time: z.string(),
    type: z.enum(['IN', 'NORMAL', 'OUT']),
    minutes: z.number().optional(),
    seconds: z.number().optional(),
    milliseconds: z.number().optional(),
  })).optional(),
  source: z.enum(['manual', 'logger']).optional(),
  evidence: lapEvidenceSchema.nullable().optional(),
}).optional();

const setupTelemetryRefsSchema = z.object({
  traceIds: z.array(z.string().min(1)),
  primaryTraceId: z.string().nullable(),
  importStatus: z.enum(['none', 'attached', 'trace_saved']),
}).optional();

const publicModificationSchema = z.object({
  category: z.enum(MOD_CATEGORIES),
  partName: z.string().min(1, 'パーツ名を入力してください'),
  maker: z.string().nullable(),
}).strict();

export const publicVehicleProfileSchema = z.object({
  modifications: z.array(publicModificationSchema),
  tireClass: z.enum(TIRE_CLASSES).nullable(),
  powerPs: nullableNum(0, 2000),
  weightKg: nullableNum(300, 3500),
  modLevel: z.enum(MOD_LEVELS),
}).strict();

// ─── メインスキーマ（保存前バリデーション） ──────────────────

export const carSetupSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDが必要です'),
  driver: z.string().nullable(),
  visibility: z.enum(['private', 'shared']).optional(),
  anonymized: z.boolean().optional(),
  carModel: z.string().min(1, '車種を入力してください'),
  vehicleId: z.string().nullable().optional(),
  vehicleProfileSnapshot: publicVehicleProfileSchema.nullable().optional(),
  circuit: z.string().min(1, 'サーキットを入力してください'),
  date: z.date(),
  sessionType: z.enum(['practice', 'qualifying', 'race']),
  weather: weatherConditionSchema,
  tireSettings: tireSettingsSchema,
  targetPressures: targetPressuresSchema,
  tireInfo: z.object({
    brand: z.string(),
    manufacturer: z.string().max(60).optional(),
    productName: z.string().max(80).optional(),
    compound: z.string(),
    frontSize: z.string().optional(),
    rearSize: z.string().optional(),
    tireSetId: z.string().optional(),
    tireSetCode: z.string().max(40).optional(),
  }),
  tireUsage: z.object({ heatCyclesAdded: nullableNum(0, 100) }).optional(),
  sessionInfo: sessionInfoSchema,
  suspensionSettings: suspensionSettingsSchema,
  alignmentSettings: alignmentSettingsSchema,
  brakeSettings: z.object({
    frontPad: z.string(), rearPad: z.string(), frontRotor: z.string(), rearRotor: z.string(),
    balance: nullableNum(0, 100),
  }).optional(),
  aeroSettings: z.object({ front: nullableNum(0, 100), rear: nullableNum(0, 100) }).optional(),
  engineSettings: z.object({ ecuMap: z.string(), boost: nullableNum(0, 500) }).optional(),
  adjustmentValues: z.array(setupAdjustmentValueSchema).optional(),
  notes: z.string().optional(),
  knowledge: z.object({
    intention: z.string().optional(),
    result: z.string().optional(),
    learning: z.string().optional(),
  }).optional(),
  drivingFeedback: drivingFeedbackSchema,
  lapTimeData: lapTimeDataSchema,
  telemetry: setupTelemetryRefsSchema,
  images: z.array(z.string()).optional(),
});

export type CarSetupInput = z.infer<typeof carSetupSchema>;
