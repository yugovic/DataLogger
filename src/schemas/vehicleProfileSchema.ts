import { z } from 'zod';
import { zodKey } from '../i18n/errorMessages';

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
  let schema = z.number(zodKey('validation.number')).nullable();
  if (min !== undefined) schema = schema.refine((v) => v === null || v >= min, { message: zodKey('validation.min', { min }) });
  if (max !== undefined) schema = schema.refine((v) => v === null || v <= max, { message: zodKey('validation.max', { max }) });
  return schema;
};

export const modificationEntrySchema = z.object({
  id: z.string(zodKey('validation.modIdString')).min(1, zodKey('validation.modIdRequired')),
  category: z.enum(MOD_CATEGORIES, zodKey('validation.modCategory')),
  partName: z.string(zodKey('validation.partNameString')).min(1, zodKey('validation.partNameRequired')),
  maker: z.string(zodKey('validation.makerString')).nullable(),
  installedAt: z.date(zodKey('validation.installedAtDate')).nullable(),
  removedAt: z.date(zodKey('validation.removedAtDate')).nullable(),
  costJPY: nullableNum(0, 10000000),
  memo: z.string(zodKey('validation.memoString')).nullable(),
});

export const vehicleProfileSchema = z.object({
  modifications: z.array(modificationEntrySchema),
  tireClass: z.enum(TIRE_CLASSES, zodKey('validation.tireClass')).nullable(),
  powerPs: nullableNum(0, 2000),
  weightKg: nullableNum(300, 3500),
});

export type VehicleProfileInput = z.infer<typeof vehicleProfileSchema>;
