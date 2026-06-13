// ルールベース読み解きのテスト — アノテーション検出と要約文の決定性

import { describe, expect, it } from 'vitest';
import { buildCoachingReadout } from './annotations';
import type { DeltaTResult, LapMetrics } from './compare';

function metrics(p: Partial<LapMetrics>): LapMetrics {
  return {
    lapTimeSeconds: 90,
    topSpeedKmh: 180,
    topSpeedAtM: 500,
    minCornerSpeedKmh: 60,
    avgAbsLongG: 0.4,
    maxBrakingG: -0.9,
    maxLatG: 1.1,
    brakingPointM: 300,
    slowestCornerAtM: 360,
    fullThrottlePct: null,
    ...p,
  };
}

/** 単調増加（B が一律遅い）デルタを作る */
function risingDelta(finalDelta: number, n = 11, length = 1000): DeltaTResult {
  const points = Array.from({ length: n }, (_, i) => ({
    distance: (length * i) / (n - 1),
    delta: (finalDelta * i) / (n - 1),
  }));
  return { points, commonLengthM: length, finalDelta };
}

describe('buildCoachingReadout', () => {
  it('データ不足では安全なメッセージを返す', () => {
    const r = buildCoachingReadout(
      { points: [], commonLengthM: 0, finalDelta: 0 },
      metrics({}),
      metrics({}),
    );
    expect(r.annotations).toEqual([]);
    expect(r.summary).toContain('十分なデータがありません');
    expect(r.topOpportunity).toBeNull();
  });

  it('B が遅い場合「遅い」と述べ、最大ロス区間をアノテートする', () => {
    const delta = risingDelta(0.5);
    const r = buildCoachingReadout(delta, metrics({}), metrics({}));
    expect(r.summary).toContain('遅い');
    expect(r.annotations.some((a) => a.kind === 'loss')).toBe(true);
    expect(r.topOpportunity).not.toBeNull();
  });

  it('B が速い場合「速い」と述べる', () => {
    const delta = risingDelta(-0.4);
    const r = buildCoachingReadout(delta, metrics({}), metrics({}));
    expect(r.summary).toContain('速い');
    expect(r.annotations.some((a) => a.kind === 'gain')).toBe(true);
  });

  it('ほぼ互角ならその旨を述べる', () => {
    const delta = risingDelta(0.0);
    const r = buildCoachingReadout(delta, metrics({}), metrics({}));
    expect(r.summary).toContain('互角');
  });

  it('ブレーキ点がAより手前ならロスのアノテーションを付ける', () => {
    const delta = risingDelta(0.3);
    const r = buildCoachingReadout(
      delta,
      metrics({ brakingPointM: 320 }), // A は奥で踏む
      metrics({ brakingPointM: 290, slowestCornerAtM: 360 }), // B は30m手前
    );
    const brakeAnno = r.annotations.find((a) => a.text.includes('ブレーキ開始'));
    expect(brakeAnno).toBeDefined();
    expect(brakeAnno!.text).toContain('手前');
  });

  it('最小コーナー速度差をアノテートする（Bが低い→loss）', () => {
    const delta = risingDelta(0.3);
    const r = buildCoachingReadout(
      delta,
      metrics({ minCornerSpeedKmh: 65 }),
      metrics({ minCornerSpeedKmh: 58, slowestCornerAtM: 360 }),
    );
    const cornerAnno = r.annotations.find((a) => a.text.includes('最小コーナー速度'));
    expect(cornerAnno).toBeDefined();
    expect(cornerAnno!.kind).toBe('loss');
  });

  it('単位が文言に含まれる（km/h・m・s）', () => {
    const delta = risingDelta(0.4);
    const r = buildCoachingReadout(
      delta,
      metrics({ brakingPointM: 330, minCornerSpeedKmh: 66 }),
      metrics({ brakingPointM: 295, minCornerSpeedKmh: 58, slowestCornerAtM: 360 }),
    );
    const allText = r.summary + r.annotations.map((a) => a.text).join(' ');
    expect(allText).toMatch(/m/);
    expect(allText).toMatch(/s/);
    expect(allText).toMatch(/km\/h/);
  });

  it('決定的: 同じ入力なら同じ出力', () => {
    const delta = risingDelta(0.42);
    const a = buildCoachingReadout(delta, metrics({}), metrics({ brakingPointM: 280 }));
    const b = buildCoachingReadout(delta, metrics({}), metrics({ brakingPointM: 280 }));
    expect(a).toEqual(b);
  });

  it('アノテーションは距離昇順に並ぶ', () => {
    const delta = risingDelta(0.5);
    const r = buildCoachingReadout(
      delta,
      metrics({ brakingPointM: 700, minCornerSpeedKmh: 66 }),
      metrics({ brakingPointM: 660, minCornerSpeedKmh: 58, slowestCornerAtM: 750 }),
    );
    for (let i = 1; i < r.annotations.length; i++) {
      expect(r.annotations[i].distance).toBeGreaterThanOrEqual(r.annotations[i - 1].distance);
    }
  });
});
