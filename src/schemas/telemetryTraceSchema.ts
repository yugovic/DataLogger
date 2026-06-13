import { z } from 'zod';

const nullableNum = z.number().nullable();
const numArray = z.array(z.number());

const tirePressureSchema = z.object({
  before: nullableNum,
  after: nullableNum,
  diff: nullableNum.optional(),
});

const tireSettingsSchema = z.object({
  fl: tirePressureSchema,
  fr: tirePressureSchema,
  rl: tirePressureSchema,
  rr: tirePressureSchema,
});

const weatherConditionSchema = z.object({
  condition: z.enum(['晴れ', '曇り', 'ウェット', 'フルウェット']).nullable(),
  airTemp: nullableNum,
  trackTemp: nullableNum,
  humidity: nullableNum,
  pressure: nullableNum,
});

const targetPressuresSchema = z.object({
  front: nullableNum,
  rear: nullableNum,
}).optional();

export const telemetryTraceSchema = z.object({
  ownerId: z.string().min(1),
  setupId: z.string().min(1),
  visibility: z.enum(['private', 'shared', 'market_preview', 'market_paid', 'team']),
  anonymized: z.boolean(),
  carModel: z.string().min(1),
  trackId: z.string().nullable(),
  circuit: z.string().min(1),
  sessionDate: z.date(),
  sessionType: z.enum(['practice', 'qualifying', 'race']),
  source: z.object({
    fileName: z.string().min(1),
    fileSizeBytes: z.number().min(0),
    format: z.enum(['aim-csv', 'digispice-dtb', 'nmea']),
    importedAt: z.date(),
    parserVersion: z.string().min(1),
    sampleRateHz: z.number().nullable(),
    lineSource: z.enum(['db', 'estimated', 'manual']).nullable(),
  }),
  lap: z.object({
    lapNumber: z.number().int().min(1),
    type: z.enum(['IN', 'NORMAL', 'OUT']),
    timeSeconds: z.number().positive(),
    valid: z.boolean(),
    invalidReason: z.string().nullable().optional(),
  }),
  conditions: z.object({
    weather: weatherConditionSchema,
    tireInfo: z.object({
      brand: z.string(),
      compound: z.string(),
    }),
    tireSettings: tireSettingsSchema,
    targetPressures: targetPressuresSchema,
    fuel: nullableNum,
    notes: z.string().optional(),
  }),
  channels: z.object({
    distanceM: numArray.min(2),
    elapsedS: numArray.min(2),
    speedKmh: numArray.min(2),
    longG: numArray.optional(),
    latG: numArray.optional(),
    throttlePct: numArray.optional(),
    brakePct: numArray.optional(),
    steeringDeg: numArray.optional(),
    rpm: numArray.optional(),
    gear: numArray.optional(),
  }),
  path: z.object({
    xM: numArray,
    yM: numArray,
    origin: z.object({ lat: z.number(), lon: z.number() }),
  }).optional(),
  summary: z.object({
    topSpeedKmh: nullableNum,
    minCornerSpeedKmh: nullableNum,
    maxBrakeG: nullableNum,
    maxLatG: nullableNum,
    sectorTimes: z.array(z.object({
      sectorId: z.string(),
      name: z.string(),
      timeSeconds: z.number(),
    })).optional(),
    coachSummary: z.string().optional(),
  }),
  qualityFlags: z.object({
    gpsDropout: z.boolean(),
    estimatedLine: z.boolean(),
    singleLapFile: z.boolean(),
    lowSampleRate: z.boolean(),
    missingOperationChannels: z.boolean(),
  }),
  market: z.object({
    productId: z.string().nullable(),
    quality: z.enum(['raw', 'verified', 'commentary']),
    priceJPY: z.number().optional(),
    sellerId: z.string().optional(),
  }).optional(),
});

export type TelemetryTraceSchemaInput = z.infer<typeof telemetryTraceSchema>;
