// ロガー証憑バッジ — ラップタイムがロガーファイル由来であることを示す
// 「信頼の証」（WP5）。マーケットプレイスの商品規格の根幹となる表示のため、
// 形式・ファイル名・取込日時・判定サーキットを偽りなく明示する。

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleFilled } from '@ant-design/icons';
import { findTrackById } from '../../lib/tracks';
import type { LapEvidence } from '../../types/setup';
import { FORMAT_LABELS } from './evidence';

interface EvidenceBadgeProps {
  evidence: LapEvidence;
  /** 「証憑を外す」操作（編集画面のみ）。省略時はボタン非表示 */
  onDetach?: () => void;
}

const formatImportedAt = (d: Date): string => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ evidence, onDetach }) => {
  const { t } = useTranslation();
  const trackName = evidence.trackId ? findTrackById(evidence.trackId)?.name ?? null : null;
  const importedAt = formatImportedAt(evidence.importedAt);

  const details: string[] = [FORMAT_LABELS[evidence.format]];
  if (trackName) details.push(trackName);
  if (importedAt) details.push(t('telemetry.evidence.importedSuffix', { time: importedAt }));

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircleFilled />
          {t('telemetry.evidence.title')}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 break-all min-w-0">
          {evidence.fileName}
        </span>
        {onDetach && (
          <button
            onClick={onDetach}
            className="ml-auto text-[11px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 underline underline-offset-2 transition-colors"
          >
            {t('telemetry.evidence.detach')}
          </button>
        )}
      </div>
      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{details.join(' ・ ')}</p>
    </div>
  );
};
