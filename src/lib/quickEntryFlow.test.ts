import { describe, it, expect } from 'vitest';
import {
  buildQuickEntrySteps,
  nextEmptyWheel,
  firstEmptyWheel,
  isAllWheelsFilled,
  initialTireMode,
  type QuickEntryFieldState,
} from './quickEntryFlow';

const emptyState: QuickEntryFieldState = {
  weather: '',
  airTemp: '',
  trackTemp: '',
  humidity: '',
  pressure: '',
  tirePressureFilled: false,
  bestLap: '',
  totalLaps: '',
};

describe('buildQuickEntrySteps', () => {
  it('全項目未入力なら環境→タイヤ→ラップの順で全質問を返す', () => {
    expect(buildQuickEntrySteps(emptyState)).toEqual([
      'weather',
      'airTemp',
      'trackTemp',
      'humidity',
      'pressure',
      'tirePressure',
      'bestLap',
      'totalLaps',
    ]);
  });

  it('入力済みの項目は除外される', () => {
    const state: QuickEntryFieldState = {
      ...emptyState,
      airTemp: '24',
      trackTemp: '38',
      tirePressureFilled: true,
    };
    expect(buildQuickEntrySteps(state)).toEqual(['weather', 'humidity', 'pressure', 'bestLap', 'totalLaps']);
  });

  it('全項目入力済みなら空配列を返す', () => {
    const state: QuickEntryFieldState = {
      weather: 'sunny',
      airTemp: '24',
      trackTemp: '38',
      humidity: '55',
      pressure: '1013',
      tirePressureFilled: true,
      bestLap: '1:58.423',
      totalLaps: '12',
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
