// ルールベースの自動アノテーション＋平易な読み解き（段階A・§4.5）
//
// デルタT＋速度＋G から「どこで・どれだけ得失したか」を決定的に検出し、
// デルタT上の発生地点にピン留めするタグと、コーチ口調の要約文を生成する。
// LLM 不使用・完全に決定的（同じ入力なら同じ出力）。
//
// 重要: 旧「AIアドバイス」タブは保存に未接続の偽UIだったため廃止された。
// ここはラップ検出済みの実テレメトリに根ざした決定的な読み解きであり、
// 捏造値は一切持ち込まない（すべて compare.ts の実測導出から作る）。

import type { DeltaTResult, LapMetrics, SegmentDelta } from './compare';

/** アノテーションの種別（色・トーン用） */
export type AnnotationKind = 'loss' | 'gain' | 'info';

/**
 * アノテーションの安定コード（言語非依存の判別子）。
 * text は表示専用（将来 i18n 化しうる）ため、ロジック分岐は必ずこの code で行う。
 */
export type AnnotationCode =
  | 'lossSegment'        // 最大ロス区間
  | 'gainSegment'        // 最大ゲイン区間
  | 'brakeStartEarlier'  // ブレーキ開始がAより手前（早い）
  | 'brakeStartLater'    // ブレーキ開始がAより奥（遅い）
  | 'cornerSpeedLower'   // 最小コーナー速度がAより低い
  | 'cornerSpeedHigher'; // 最小コーナー速度がAより高い

/** デルタT 上にピン留めする1アノテーション */
export interface Annotation {
  /** 発生地点（ラップ開始からの距離 m） */
  distance: number;
  kind: AnnotationKind;
  /** 判別用の安定コード（言語非依存。ロジック分岐にはこれを使う） */
  code: AnnotationCode;
  /** 表示テキスト（日本語・単位つき。表示専用） */
  text: string;
}

/** 読み解き結果一式 */
export interface CoachingReadout {
  /** ピン留めアノテーション（距離順） */
  annotations: Annotation[];
  /** 平易な読み解き（1〜3文） */
  summary: string;
  /** 最も伸ばせる1箇所の短い見出し（無ければ null） */
  topOpportunity: string | null;
}

/** 距離を「約 N m地点」表記にする（10m丸め） */
function fmtDist(m: number): string {
  return `${Math.round(m / 10) * 10}m地点`;
}

/** 秒を符号つき s.SS 表記にする（得失の向きを言葉に合わせて呼び分ける） */
function fmtSecAbs(s: number): string {
  return `${Math.abs(s).toFixed(2)}s`;
}

/**
 * デルタT トレースを走査し、連続して同符号の傾き（B が縮める=ゲイン /
 * 広げる=ロス）が続く区間を抽出する。最も大きいゲイン区間とロス区間を返す。
 * 区間のデルタ増分 = 終端ΔT − 始端ΔT。
 */
function findExtremeSegments(delta: DeltaTResult): {
  maxLoss: { fromM: number; toM: number; amount: number } | null;
  maxGain: { fromM: number; toM: number; amount: number } | null;
} {
  const pts = delta.points;
  if (pts.length < 2) return { maxLoss: null, maxGain: null };

  // 隣接区間の傾き符号でランレングス分割
  interface Run {
    fromM: number;
    toM: number;
    amount: number; // 終端 − 始端のΔT（正=ロス, 負=ゲイン）
    sign: number;
  }
  const runs: Run[] = [];
  let start = 0;
  const slopeSign = (i: number): number => {
    const d = pts[i + 1].delta - pts[i].delta;
    return d > 1e-6 ? 1 : d < -1e-6 ? -1 : 0;
  };
  let curSign = slopeSign(0);
  for (let i = 1; i < pts.length - 1; i++) {
    const s = slopeSign(i);
    if (s !== curSign && s !== 0) {
      runs.push({
        fromM: pts[start].distance,
        toM: pts[i].distance,
        amount: pts[i].delta - pts[start].delta,
        sign: curSign,
      });
      start = i;
      curSign = s;
    }
  }
  runs.push({
    fromM: pts[start].distance,
    toM: pts[pts.length - 1].distance,
    amount: pts[pts.length - 1].delta - pts[start].delta,
    sign: curSign,
  });

  let maxLoss: Run | null = null;
  let maxGain: Run | null = null;
  for (const r of runs) {
    if (r.amount > 0 && (maxLoss === null || r.amount > maxLoss.amount)) maxLoss = r;
    if (r.amount < 0 && (maxGain === null || r.amount < maxGain.amount)) maxGain = r;
  }
  return {
    maxLoss: maxLoss ? { fromM: maxLoss.fromM, toM: maxLoss.toM, amount: maxLoss.amount } : null,
    maxGain: maxGain ? { fromM: maxGain.fromM, toM: maxGain.toM, amount: maxGain.amount } : null,
  };
}

/**
 * 2ラップの比較結果から決定的なアノテーションと読み解きを生成する。
 *
 * @param delta deltaT() の結果（B − A、正 = B 遅い）
 * @param metricsA ラップA（基準）の拡張指標
 * @param metricsB ラップB（比較）の拡張指標
 * @param segments computeSegmentDeltas() の結果（任意・読み解きの補強に使う）
 *
 * 視点は「B を A に近づける/超える」。A をベスト・B をターゲットに置く UI 前提だが、
 * 文言は中立に「Bは〜」「Aに対して〜」と書く。
 */
export function buildCoachingReadout(
  delta: DeltaTResult,
  metricsA: LapMetrics,
  metricsB: LapMetrics,
  segments: readonly SegmentDelta[] = [],
): CoachingReadout {
  const annotations: Annotation[] = [];

  if (delta.points.length < 2) {
    return {
      annotations,
      summary: '比較できる十分なデータがありません（両ラップのGPS軌跡を確認してください）。',
      topOpportunity: null,
    };
  }

  const { maxLoss, maxGain } = findExtremeSegments(delta);

  // (a) 最大ロス区間・最大ゲイン区間
  if (maxLoss && maxLoss.amount > 0.03) {
    const at = (maxLoss.fromM + maxLoss.toM) / 2;
    annotations.push({
      distance: at,
      kind: 'loss',
      code: 'lossSegment',
      text: `${fmtDist(maxLoss.fromM)}〜${fmtDist(maxLoss.toM)}で ${fmtSecAbs(maxLoss.amount)} ロス`,
    });
  }
  if (maxGain && maxGain.amount < -0.03) {
    const at = (maxGain.fromM + maxGain.toM) / 2;
    annotations.push({
      distance: at,
      kind: 'gain',
      code: 'gainSegment',
      text: `${fmtDist(maxGain.fromM)}〜${fmtDist(maxGain.toM)}で ${fmtSecAbs(maxGain.amount)} ゲイン`,
    });
  }

  // (b) 主要コーナーのブレーキ点差（最遅コーナー手前の減速開始地点）
  if (metricsA.brakingPointM !== null && metricsB.brakingPointM !== null) {
    const diff = metricsB.brakingPointM - metricsA.brakingPointM;
    if (Math.abs(diff) >= 5) {
      const earlier = diff < 0; // B の方が手前で踏んでいる
      annotations.push({
        distance: metricsB.brakingPointM,
        kind: earlier ? 'loss' : 'info',
        code: earlier ? 'brakeStartEarlier' : 'brakeStartLater',
        text: `ブレーキ開始がAより${Math.abs(Math.round(diff))}m${earlier ? '手前（早い）' : '奥（遅い）'}`,
      });
    }
  }

  // (c) 最小コーナリング速度差（最遅コーナー）
  if (
    metricsA.minCornerSpeedKmh !== null &&
    metricsB.minCornerSpeedKmh !== null &&
    metricsB.slowestCornerAtM !== null
  ) {
    const diff = metricsB.minCornerSpeedKmh - metricsA.minCornerSpeedKmh;
    if (Math.abs(diff) >= 2) {
      annotations.push({
        distance: metricsB.slowestCornerAtM,
        kind: diff < 0 ? 'loss' : 'gain',
        code: diff < 0 ? 'cornerSpeedLower' : 'cornerSpeedHigher',
        text: `最小コーナー速度がAより ${Math.abs(diff).toFixed(1)} km/h ${diff < 0 ? '低い' : '高い'}`,
      });
    }
  }

  annotations.sort((p, q) => p.distance - q.distance);

  // ── 読み解き文（コーチの声・1〜3文） ──
  const sentences: string[] = [];
  const finalDelta = delta.finalDelta;
  if (Math.abs(finalDelta) < 0.03) {
    sentences.push('AとBはほぼ互角のタイムです。');
  } else if (finalDelta > 0) {
    sentences.push(`BはAより ${fmtSecAbs(finalDelta)} 遅いラップです。`);
  } else {
    sentences.push(`BはAより ${fmtSecAbs(finalDelta)} 速いラップです。`);
  }

  // 最大ロス＝最も伸ばせる1点
  let topOpportunity: string | null = null;
  if (maxLoss && maxLoss.amount > 0.05) {
    topOpportunity = `${fmtDist(maxLoss.fromM)}〜${fmtDist(maxLoss.toM)}（ここだけで ${fmtSecAbs(maxLoss.amount)}）`;
    sentences.push(
      `最も伸ばせるのは ${fmtDist(maxLoss.fromM)}〜${fmtDist(maxLoss.toM)}、ここだけで ${fmtSecAbs(maxLoss.amount)} の差がついています。`,
    );
    // ブレーキ点が早すぎる主因が重なれば言及
    if (metricsB.brakingPointM !== null && metricsA.brakingPointM !== null) {
      const bdiff = metricsB.brakingPointM - metricsA.brakingPointM;
      if (bdiff < -5 && metricsB.slowestCornerAtM !== null && maxLoss.toM >= metricsB.brakingPointM - 30) {
        sentences.push(`主因はブレーキ開始がAより${Math.abs(Math.round(bdiff))}m手前なことです。`);
      }
    }
  } else if (maxGain && maxGain.amount < -0.05) {
    topOpportunity = `${fmtDist(maxGain.fromM)}〜${fmtDist(maxGain.toM)} の走りを他区間でも`;
    sentences.push(
      `${fmtDist(maxGain.fromM)}〜${fmtDist(maxGain.toM)}では ${fmtSecAbs(maxGain.amount)} 稼げています。この走りを他区間でも再現できれば更に詰められます。`,
    );
  }

  // 区間サマリの最悪区間を補足（公式セクターではない旨は UI 側で明示）
  if (segments.length > 0 && Math.abs(finalDelta) >= 0.05) {
    const worst = segments.reduce((a, b) => (b.delta > a.delta ? b : a));
    if (worst.delta > 0.05) {
      sentences.push(`区間別では区間${worst.segment}のロスが最大です。`);
    }
  }

  return {
    annotations,
    summary: sentences.join(''),
    topOpportunity,
  };
}
