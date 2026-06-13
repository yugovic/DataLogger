import { z } from 'zod';

// ─── 共通バリデーション ──────────────────────────────────────

const nullableNum = (min?: number, max?: number) => {
  let schema = z.number().nullable();
  if (min !== undefined) schema = schema.refine(v => v === null || v >= min, { message: `${min}以上の値を入力してください` });
  if (max !== undefined) schema = schema.refine(v => v === null || v <= max, { message: `${max}以下の値を入力してください` });
  return schema;
};

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
  condition: z.enum(['晴れ', '曇り', 'ウェット', 'フルウェット']).nullable(),
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

// ─── メインスキーマ（保存前バリデーション） ──────────────────

export const carSetupSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDが必要です'),
  driver: z.string().nullable(),
  visibility: z.enum(['private', 'shared']).optional(),
  anonymized: z.boolean().optional(),
  carModel: z.string().min(1, '車種を入力してください'),
  circuit: z.string().min(1, 'サーキットを入力してください'),
  date: z.date(),
  sessionType: z.enum(['practice', 'qualifying', 'race']),
  weather: weatherConditionSchema,
  tireSettings: tireSettingsSchema,
  targetPressures: targetPressuresSchema,
  tireInfo: z.object({
    brand: z.string(),
    compound: z.string(),
  }),
  sessionInfo: sessionInfoSchema,
  suspensionSettings: suspensionSettingsSchema,
  alignmentSettings: alignmentSettingsSchema,
  notes: z.string().optional(),
  knowledge: z.object({
    intention: z.string().optional(),
    result: z.string().optional(),
    learning: z.string().optional(),
  }).optional(),
  lapTimeData: lapTimeDataSchema,
  images: z.array(z.string()).optional(),
});

export type CarSetupInput = z.infer<typeof carSetupSchema>;
