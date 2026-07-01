import { z } from 'zod';

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

// 既存 setupSchema.ts と同じ null 許容数値の検証パターン。
const nullableNum = (min?: number, max?: number) => {
  let schema = z.number('数値を入力してください').nullable();
  if (min !== undefined) schema = schema.refine((v) => v === null || v >= min, { message: `${min}以上の値を入力してください` });
  if (max !== undefined) schema = schema.refine((v) => v === null || v <= max, { message: `${max}以下の値を入力してください` });
  return schema;
};

export const modificationEntrySchema = z.object({
  id: z.string('改造パーツIDを文字列で入力してください').min(1, '改造パーツIDが必要です'),
  category: z.enum(MOD_CATEGORIES, '改造カテゴリを選択してください'),
  partName: z.string('パーツ名を文字列で入力してください').min(1, 'パーツ名を入力してください'),
  maker: z.string('メーカー名を文字列で入力してください').nullable(),
  installedAt: z.date('装着日は日付で入力してください').nullable(),
  removedAt: z.date('取外し日は日付で入力してください').nullable(),
  costJPY: nullableNum(0, 10000000),
  memo: z.string('メモを文字列で入力してください').nullable(),
});

export const vehicleProfileSchema = z.object({
  modifications: z.array(modificationEntrySchema),
  tireClass: z.enum(TIRE_CLASSES, 'タイヤ区分を選択してください').nullable(),
  powerPs: nullableNum(0, 2000),
  weightKg: nullableNum(300, 3500),
});

export type VehicleProfileInput = z.infer<typeof vehicleProfileSchema>;
