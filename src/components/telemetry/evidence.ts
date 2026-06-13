// ラップタイム証憑ヘルパー — テレメトリ検出結果をセットアップ記録の
// lapTimeData 形式へ変換する純ロジック（WP5: テレメトリUI統合）
//
// 規律: ここで作る値はすべてロガーファイルの検出結果から機械的に導出する。
// 既定値・推定値での充填は行わない（NORMAL ラップが無ければ bestLap は null。
// OUT/IN ラップのタイムをベストラップに昇格させない）。

import type { Lap, LapDetectionResult, TelemetryFormat } from '../../lib/telemetry';
import type { LapEvidence, LapTime } from '../../types/setup';

/** フォーマット識別子の表示ラベル */
export const FORMAT_LABELS: Record<TelemetryFormat, string> = {
  'aim-csv': 'AIM CSV',
  'digispice-dtb': 'DigiSpice .dtb',
  nmea: 'NMEA RMC',
};

/**
 * 秒数を m:ss.mmm 形式へ整形する（例: 141.7114 → "2:21.711"）。
 * LapTimeModal の parseTimeString（/^\d+:\d{2}\.\d{3}$/）と互換の形式。
 */
export function formatLapSeconds(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const m = Math.floor(totalMs / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** ラップタイム差を ±s.mmm 形式へ整形する（例: 0.4123 → "+0.412"） */
export function formatLapDelta(deltaSeconds: number): string {
  const rounded = Math.round(deltaSeconds * 1000) / 1000;
  const sign = rounded >= 0 ? '+' : '-';
  return `${sign}${Math.abs(rounded).toFixed(3)}`;
}

/** 検出ラップ1本を保存形式 LapTime へ変換する */
export function lapToLapTime(lap: Lap): LapTime {
  const totalMs = Math.round(lap.timeSeconds * 1000);
  return {
    lapNumber: lap.lapNumber,
    time: formatLapSeconds(lap.timeSeconds),
    type: lap.type,
    minutes: Math.floor(totalMs / 60000),
    seconds: Math.floor((totalMs % 60000) / 1000),
    milliseconds: totalMs % 1000,
  };
}

/** セットアップ記録のラップタイムセクションへ添付するペイロード */
export interface LapAttachPayload {
  laps: LapTime[];
  /** NORMAL ラップが無い場合は null（不完全周のタイムをベスト扱いしない） */
  bestLap: string | null;
  /** OUT/IN を含む総周回数 */
  totalLaps: number;
  /** ロガー証憑メタデータ */
  evidence: LapEvidence;
}

/**
 * ラップ検出結果から添付ペイロードを組み立てる。
 * bestLap は detectLaps が確定した NORMAL 最速のみを採用する。
 */
export function buildAttachPayload(
  detection: LapDetectionResult,
  meta: { fileName: string; format: TelemetryFormat; trackId: string | null },
): LapAttachPayload {
  const best = detection.bestLapIndex !== null ? detection.laps[detection.bestLapIndex] : null;
  return {
    laps: detection.laps.map(lapToLapTime),
    bestLap: best ? formatLapSeconds(best.timeSeconds) : null,
    totalLaps: detection.laps.length,
    evidence: {
      fileName: meta.fileName,
      format: meta.format,
      importedAt: new Date(),
      trackId: meta.trackId,
    },
  };
}
