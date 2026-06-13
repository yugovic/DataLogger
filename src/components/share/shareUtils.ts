// 共有関連の純粋ヘルパー（コンポーネントと分離して fast-refresh を保つ）。

import { CarSetup } from '../../types/setup';

/** ロガー由来のラップタイムか（証憑つきデータか） */
export function hasLoggerEvidence(setup: Pick<CarSetup, 'lapTimeData'>): boolean {
  return setup.lapTimeData?.source === 'logger';
}

/** 共有中か（旧データの visibility 欠落は private 扱い） */
export function isShared(setup: Pick<CarSetup, 'visibility'>): boolean {
  return setup.visibility === 'shared';
}
