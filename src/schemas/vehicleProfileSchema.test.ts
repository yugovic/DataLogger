import { describe, expect, it } from 'vitest';
import { vehicleProfileSchema } from './vehicleProfileSchema';

const validProfile = () => ({
  modifications: [
    {
      id: 'mod-001',
      category: 'brake' as const,
      partName: 'ブレーキパッド',
      maker: null,
      installedAt: null,
      removedAt: null,
      costJPY: null,
      memo: null,
    },
  ],
  tireClass: null,
  powerPs: null,
  weightKg: null,
});

describe('vehicleProfileSchema', () => {
  it('任意項目が null のプロフィールを valid とすること', () => {
    const result = vehicleProfileSchema.safeParse(validProfile());

    expect(result.success).toBe(true);
  });

  it('partName が空文字のとき invalid とすること', () => {
    const profile = validProfile();
    profile.modifications[0].partName = '';

    const result = vehicleProfileSchema.safeParse(profile);

    expect(result.success).toBe(false);
  });

  it.each([-1, 2001])('powerPs が範囲外（%s）のとき invalid とすること', (powerPs) => {
    const profile = {
      ...validProfile(),
      powerPs,
    };

    const result = vehicleProfileSchema.safeParse(profile);

    expect(result.success).toBe(false);
  });
});
