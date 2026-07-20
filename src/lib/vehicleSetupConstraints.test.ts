import { describe, it, expect } from 'vitest';
import {
  suspensionConstraintsFromConfig,
  alignmentConstraintsFromConfig,
  unconstrainedSuspension,
  unconstrainedAlignment,
} from './vehicleSetupConstraints';
import type { VehicleSetupConfig } from '../types/vehicle';

function makeConfig(overrides: Partial<VehicleSetupConfig> = {}): VehicleSetupConfig {
  return {
    suspension: {
      damperAdjustable: true,
      heightAdjustable: true,
      springRateChangeable: true,
      antiRollBarAdjustable: true,
    },
    alignment: {
      camberAdjustable: true,
      toeAdjustable: true,
      casterAdjustable: true,
    },
    tire: { frontSize: [], rearSize: [] },
    brake: { padTypes: [] },
    ...overrides,
  };
}

describe('suspensionConstraintsFromConfig', () => {
  it('config が未設定なら制約なし（全項目表示・min/maxなし）', () => {
    expect(suspensionConstraintsFromConfig(null)).toEqual(unconstrainedSuspension());
    expect(suspensionConstraintsFromConfig(undefined)).toEqual(unconstrainedSuspension());
  });

  it('damperAdjustable: false でダンパー非表示', () => {
    const config = makeConfig({
      suspension: {
        damperAdjustable: false,
        heightAdjustable: true,
        springRateChangeable: true,
        antiRollBarAdjustable: true,
      },
    });
    const result = suspensionConstraintsFromConfig(config);
    expect(result.damper.visible).toBe(false);
  });

  it('damperClicksFront/Rear があれば max に反映', () => {
    const config = makeConfig({
      suspension: {
        damperAdjustable: true,
        damperClicksFront: 16,
        damperClicksRear: 20,
        heightAdjustable: true,
        springRateChangeable: true,
        antiRollBarAdjustable: true,
      },
    });
    const result = suspensionConstraintsFromConfig(config);
    expect(result.damper.frontMax).toBe(16);
    expect(result.damper.rearMax).toBe(20);
  });

  it('heightAdjustable: false で車高非表示、heightRange があれば min/max 反映', () => {
    const config = makeConfig({
      suspension: {
        damperAdjustable: true,
        heightAdjustable: false,
        heightRangeFront: { min: 100, max: 150 },
        heightRangeRear: { min: 110, max: 160 },
        springRateChangeable: true,
        antiRollBarAdjustable: true,
      },
    });
    const result = suspensionConstraintsFromConfig(config);
    expect(result.height.visible).toBe(false);
    expect(result.height.front).toEqual({ min: 100, max: 150 });
    expect(result.height.rear).toEqual({ min: 110, max: 160 });
  });

  it('springRateChangeable: false でスプリングレート非表示', () => {
    const config = makeConfig({
      suspension: {
        damperAdjustable: true,
        heightAdjustable: true,
        springRateChangeable: false,
        antiRollBarAdjustable: true,
      },
    });
    expect(suspensionConstraintsFromConfig(config).springRate.visible).toBe(false);
  });

  it('antiRollBarAdjustable: false でスタビ非表示', () => {
    const config = makeConfig({
      suspension: {
        damperAdjustable: true,
        heightAdjustable: true,
        springRateChangeable: true,
        antiRollBarAdjustable: false,
      },
    });
    expect(suspensionConstraintsFromConfig(config).stabilizer.visible).toBe(false);
  });
});

describe('alignmentConstraintsFromConfig', () => {
  it('config が未設定なら制約なし', () => {
    expect(alignmentConstraintsFromConfig(null)).toEqual(unconstrainedAlignment());
    expect(alignmentConstraintsFromConfig(undefined)).toEqual(unconstrainedAlignment());
  });

  it('camberAdjustable: false でキャンバー非表示、レンジがあれば反映', () => {
    const config = makeConfig({
      alignment: {
        camberAdjustable: false,
        camberRangeFront: { min: -5, max: -1 },
        camberRangeRear: { min: -4, max: -1 },
        toeAdjustable: true,
        casterAdjustable: true,
      },
    });
    const result = alignmentConstraintsFromConfig(config);
    expect(result.camber.visible).toBe(false);
    expect(result.camber.front).toEqual({ min: -5, max: -1 });
    expect(result.camber.rear).toEqual({ min: -4, max: -1 });
  });

  it('toeAdjustable: false でトー非表示', () => {
    const config = makeConfig({
      alignment: {
        camberAdjustable: true,
        toeAdjustable: false,
        casterAdjustable: true,
      },
    });
    expect(alignmentConstraintsFromConfig(config).toe.visible).toBe(false);
  });

  it('casterAdjustable: false でキャスター非表示、casterRange があれば反映', () => {
    const config = makeConfig({
      alignment: {
        camberAdjustable: true,
        toeAdjustable: true,
        casterAdjustable: false,
        casterRange: { min: 3, max: 8 },
      },
    });
    const result = alignmentConstraintsFromConfig(config);
    expect(result.caster.visible).toBe(false);
    expect(result.caster.range).toEqual({ min: 3, max: 8 });
  });
});
