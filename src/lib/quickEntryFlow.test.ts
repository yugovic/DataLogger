import { describe, it, expect } from 'vitest';
import {
  buildQuickEntrySteps,
  nextEmptyWheel,
  firstEmptyWheel,
  isAllWheelsFilled,
  initialTireMode,
  carryOverPressures,
  type QuickEntryFieldState,
} from './quickEntryFlow';

const emptyState: QuickEntryFieldState = {
  airTemp: '',
  tirePressureFilled: false,
  bestLap: '',
  feeling: null,
};

describe('buildQuickEntrySteps', () => {
  it('基本記録タスクの4種だけを聞く（路面温度・湿度・気圧・天候・総周回数は聞かない）', () => {
    expect(buildQuickEntrySteps(emptyState)).toEqual([
      'airTemp',
      'tirePressure',
      'bestLap',
      'feeling',
    ]);
  });

  it('気温が自動取得できていれば気温は聞かない', () => {
    const state: QuickEntryFieldState = { ...emptyState, airTemp: '25.4' };
    expect(buildQuickEntrySteps(state)).toEqual(['tirePressure', 'bestLap', 'feeling']);
  });

  it('入力済みの項目は除外される', () => {
    const state: QuickEntryFieldState = {
      ...emptyState,
      airTemp: '24',
      tirePressureFilled: true,
    };
    expect(buildQuickEntrySteps(state)).toEqual(['bestLap', 'feeling']);
  });

  it('フィーリングが未評価なら聞く（0 は評価済みとして扱う）', () => {
    expect(buildQuickEntrySteps({ ...emptyState, feeling: 0 })).not.toContain('feeling');
    expect(buildQuickEntrySteps({ ...emptyState, feeling: null })).toContain('feeling');
  });

  it('全項目入力済みなら空配列を返す', () => {
    const state: QuickEntryFieldState = {
      airTemp: '24',
      tirePressureFilled: true,
      bestLap: '1:58.423',
      feeling: 2,
    };
    expect(buildQuickEntrySteps(state)).toEqual([]);
  });
});

describe('タイヤ空気圧シーンの前進ロジック', () => {
  it('nextEmptyWheel: アクティブ輪から時計回りに次の未入力輪を返す', () => {
    const vals = { fl: 200, fr: null, rl: null, rr: 195 };
    expect(nextEmptyWheel(vals, 'fl')).toBe('fr');
    expect(nextEmptyWheel(vals, 'fr')).toBe('rl');
  });

  it('nextEmptyWheel: ラップして未入力輪を探す', () => {
    const vals = { fl: null, fr: 200, rl: 195, rr: 195 };
    expect(nextEmptyWheel(vals, 'rr')).toBe('fl');
  });

  it('nextEmptyWheel: 全輪入力済みなら null', () => {
    const vals = { fl: 200, fr: 200, rl: 195, rr: 195 };
    expect(nextEmptyWheel(vals, 'fl')).toBeNull();
  });

  it('firstEmptyWheel: FL始まりで最初の未入力輪を返す', () => {
    expect(firstEmptyWheel({ fl: 200, fr: null, rl: null, rr: 195 })).toBe('fr');
    expect(firstEmptyWheel({ fl: 200, fr: 200, rl: 195, rr: 195 })).toBeNull();
  });

  it('isAllWheelsFilled', () => {
    expect(isAllWheelsFilled({ fl: 200, fr: 200, rl: 195, rr: 195 })).toBe(true);
    expect(isAllWheelsFilled({ fl: 200, fr: null, rl: 195, rr: 195 })).toBe(false);
  });

  it('initialTireMode: 冷間が未入力なら cold', () => {
    expect(initialTireMode({ fl: null, fr: null, rl: null, rr: null })).toBe('cold');
    expect(initialTireMode({ fl: 200, fr: null, rl: 195, rr: 195 })).toBe('cold');
  });

  it('initialTireMode: 冷間が全輪入力済みなら hot', () => {
    expect(initialTireMode({ fl: 200, fr: 200, rl: 195, rr: 195 })).toBe('hot');
  });
});

describe('carryOverPressures（前回値の引き継ぎ）', () => {
  const prev = {
    circuit: '鈴鹿サーキット',
    tireSetId: 'set-a',
    hot: { fl: 215, fr: 216, rl: 210, rr: 211 },
  };

  it('同一サーキット・同一タイヤセットなら前回値を引き継ぐ', () => {
    expect(carryOverPressures(prev, { circuit: '鈴鹿サーキット', tireSetId: 'set-a' })).toEqual({
      fl: 215, fr: 216, rl: 210, rr: 211,
    });
  });

  it('サーキットが違えば引き継がない', () => {
    expect(carryOverPressures(prev, { circuit: '筑波サーキット', tireSetId: 'set-a' })).toBeNull();
  });

  it('タイヤセットが違えば引き継がない', () => {
    expect(carryOverPressures(prev, { circuit: '鈴鹿サーキット', tireSetId: 'set-b' })).toBeNull();
  });

  it('前回が4輪そろっていなければ引き継がない', () => {
    const partial = { ...prev, hot: { fl: 215, fr: null, rl: 210, rr: 211 } };
    expect(carryOverPressures(partial, { circuit: '鈴鹿サーキット', tireSetId: 'set-a' })).toBeNull();
  });

  it('前回が無ければ null', () => {
    expect(carryOverPressures(null, { circuit: '鈴鹿サーキット', tireSetId: 'set-a' })).toBeNull();
  });

  it('タイヤセット未設定同士（null と null）は同一条件として引き継ぐ', () => {
    const noSet = { ...prev, tireSetId: null };
    expect(carryOverPressures(noSet, { circuit: '鈴鹿サーキット', tireSetId: null })).not.toBeNull();
  });
});
