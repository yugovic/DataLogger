import { z } from 'zod';

export const tireSetInputSchema = z.object({
  userId: z.string().min(1),
  code: z.string().trim().min(1, 'セットIDを入力してください').max(40),
  manufacturer: z.string().trim().min(1, 'メーカーを入力してください').max(60),
  productName: z.string().trim().min(1, '製品名を入力してください').max(80),
  compound: z.string().trim().max(40),
  frontSize: z.string().trim().max(40),
  rearSize: z.string().trim().max(40),
  primaryVehicleId: z.string().nullable(),
  status: z.enum(['active', 'stored', 'retired']),
  startedAt: z.date().nullable(),
  initialDistanceKm: z.number().min(0).max(100000),
  initialLaps: z.number().int().min(0).max(100000),
  initialHeatCycles: z.number().int().min(0).max(10000),
  notes: z.string().max(500),
});
