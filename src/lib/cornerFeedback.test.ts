import { describe, it, expect } from 'vitest';
import {
  fieldFor, allSpots, valueAt, ratedSpots, hasFeedback, mostDeviatedSpot,
  SPEED_RANGES, CORNER_PHASES,
} from './cornerFeedback';
import { createEmptyDraft } from './setupDraft';
import type { DrivingFeedback } from '../types/setup';

const empty = (): DrivingFeedback => createEmptyDraft().drivingFeedback;

describe('fieldFor', () => {
  it('速度域×局面が DrivingFeedback のフィールド名に対応する', () => {
    expect(fieldFor({ speed: 'low', phase: 'entry' })).toBe('lowSpeedEntry');
    expect(fieldFor({ speed: 'mid', phase: 'middle' })).toBe('midSpeedMiddle');
    expect(fieldFor({ speed: 'high', phase: 'exit' })).toBe('highSpeedExit');
  });

  it('9通りすべてが実在するフィールドを指す', () => {
    const f = empty();
    for (const spot of allSpots()) {
      expect(Object.prototype.hasOwnProperty.call(f, fieldFor(spot))).toBe(true);
    }
  });
});

describe('allSpots', () => {
  it('速度域3 × 局面3 の9通り', () => {
    expect(allSpots()).toHaveLength(SPEED_RANGES.length * CORNER_PHASES.length);
    expect(allSpots()).toHaveLength(9);
  });

  it('低速→中速→高速の順に並ぶ', () => {
    expect(allSpots().slice(0, 3).every((s) => s.speed === 'low')).toBe(true);
    expect(allSpots().slice(3, 6).every((s) => s.speed === 'mid')).toBe(true);
    expect(allSpots().slice(6, 9).every((s) => s.speed === 'high')).toBe(true);
  });
});

describe('valueAt / ratedSpots', () => {
  it('未評価は null で、評価済みだけを列挙する', () => {
    const f = { ...empty(), midSpeedEntry: 1, highSpeedExit: 4 };
    expect(valueAt(f, { speed: 'low', phase: 'entry' })).toBeNull();
    expect(valueAt(f, { speed: 'mid', phase: 'entry' })).toBe(1);
    expect(ratedSpots(f).map(fieldFor)).toEqual(['midSpeedEntry', 'highSpeedExit']);
  });

  it('0（強アンダー）も評価済みとして扱う', () => {
    const f = { ...empty(), lowSpeedEntry: 0 };
    expect(ratedSpots(f)).toHaveLength(1);
  });
});

describe('hasFeedback', () => {
  it('何も入っていなければ false', () => {
    expect(hasFeedback(empty())).toBe(false);
  });

  it('コーナー別が1つ入っていれば true', () => {
    expect(hasFeedback({ ...empty(), lowSpeedExit: 3 })).toBe(true);
  });

  it('総合バランスだけでも true（気にならなかった、を残せる）', () => {
    expect(hasFeedback({ ...empty(), overallBalance: 2 })).toBe(true);
  });
});

describe('mostDeviatedSpot', () => {
  it('ニュートラルから最も離れた箇所を返す', () => {
    const f = { ...empty(), lowSpeedEntry: 1, highSpeedExit: 4 };
    expect(fieldFor(mostDeviatedSpot(f)!)).toBe('highSpeedExit');
  });

  it('ニュートラルだけなら null（手がかりが無い）', () => {
    expect(mostDeviatedSpot({ ...empty(), lowSpeedEntry: 2, midSpeedExit: 2 })).toBeNull();
  });

  it('何も評価が無ければ null', () => {
    expect(mostDeviatedSpot(empty())).toBeNull();
  });

  it('同点なら表示順で先の箇所', () => {
    const f = { ...empty(), lowSpeedEntry: 0, highSpeedExit: 4 };
    expect(fieldFor(mostDeviatedSpot(f)!)).toBe('lowSpeedEntry');
  });
});
