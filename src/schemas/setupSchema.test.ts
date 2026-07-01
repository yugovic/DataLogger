import { describe, it, expect } from 'vitest';
import { carSetupSchema } from './setupSchema';

// 正常な最小ペイロードを組み立てるヘルパー
const validPayload = () => ({
  userId: 'user-001',
  driver: null,
  carModel: 'Honda S2000',
  circuit: '筑波サーキット',
  date: new Date('2026-06-01T09:00:00'),
  sessionType: 'practice' as const,
  weather: {
    condition: null,
    airTemp: null,
    trackTemp: null,
    humidity: null,
    pressure: null,
  },
  tireSettings: {
    fl: { before: null, after: null },
    fr: { before: null, after: null },
    rl: { before: null, after: null },
    rr: { before: null, after: null },
  },
  tireInfo: { brand: '', compound: '' },
  sessionInfo: { distance: null, fuel: null },
});

// ─── 正常系 ─────────────────────────────────────────────────────────────────

describe('carSetupSchema — 正常ペイロード', () => {
  it('最小の正常ペイロードが通ること', () => {
    const result = carSetupSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it('null 数値フィールドが通ること（未入力 = null は有効）', () => {
    const payload = {
      ...validPayload(),
      tireSettings: {
        fl: { before: null, after: null },
        fr: { before: null, after: null },
        rl: { before: null, after: null },
        rr: { before: null, after: null },
      },
    };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('正常な空気圧 200 kPa が通ること', () => {
    const payload = {
      ...validPayload(),
      tireSettings: {
        fl: { before: 200, after: 210 },
        fr: { before: 200, after: 210 },
        rl: { before: 180, after: 190 },
        rr: { before: 180, after: 190 },
      },
    };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('気温 null が通ること（任意フィールド）', () => {
    const payload = { ...validPayload(), weather: { condition: null, airTemp: null, trackTemp: null, humidity: null, pressure: null } };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('登録車両IDと snapshot が null でも通ること', () => {
    const payload = {
      ...validPayload(),
      vehicleId: null,
      vehicleProfileSnapshot: null,
    };

    const result = carSetupSchema.safeParse(payload);

    expect(result.success).toBe(true);
  });

  it('公開用 snapshot が通ること', () => {
    const payload = {
      ...validPayload(),
      vehicleId: 'vehicle-001',
      vehicleProfileSnapshot: {
        modifications: [
          {
            category: 'brake' as const,
            partName: 'ブレーキパッド',
            maker: 'ENDLESS',
          },
        ],
        tireClass: 'HIGH_GRIP_RADIAL' as const,
        powerPs: 250,
        weightKg: 1250,
        modLevel: 'LIGHT' as const,
      },
    };

    const result = carSetupSchema.safeParse(payload);

    expect(result.success).toBe(true);
  });
});

// ─── エラー系 ────────────────────────────────────────────────────────────────

describe('carSetupSchema — バリデーションエラー', () => {
  it('circuit が空文字のときエラーになること', () => {
    const payload = { ...validPayload(), circuit: '' };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map(i => i.path.join('.'));
      expect(fields).toContain('circuit');
    }
  });

  it('carModel が空文字のときエラーになること', () => {
    const payload = { ...validPayload(), carModel: '' };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('空気圧 600 kPa（範囲外）でエラーになること（上限 500）', () => {
    const payload = {
      ...validPayload(),
      tireSettings: {
        fl: { before: 600, after: null },
        fr: { before: null, after: null },
        rl: { before: null, after: null },
        rr: { before: null, after: null },
      },
    };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('userId が空文字のときエラーになること', () => {
    const payload = { ...validPayload(), userId: '' };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('date が Date 型でないときエラーになること', () => {
    const payload = { ...validPayload(), date: '2026-06-01' as unknown as Date };
    const result = carSetupSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('snapshot に costJPY などの非公開フィールドが混入したらエラーになること', () => {
    const payload = {
      ...validPayload(),
      vehicleId: 'vehicle-001',
      vehicleProfileSnapshot: {
        modifications: [
          {
            category: 'brake' as const,
            partName: 'ブレーキパッド',
            maker: null,
            costJPY: 40000,
          },
        ],
        tireClass: null,
        powerPs: null,
        weightKg: null,
        modLevel: 'LIGHT' as const,
      },
    };

    const result = carSetupSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });
});
