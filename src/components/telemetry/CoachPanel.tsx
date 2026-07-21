// コーチの読み解きパネル（段階A・§4.5）
// ルールベースで生成した平易な要約 + 伸びしろ#1の強調 + ロス/ゲインの一覧。
// 文言はすべて compare.ts の実測導出に根ざす（LLM不使用・捏造なし）。

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BulbOutlined, RiseOutlined, FallOutlined, AimOutlined } from '@ant-design/icons';
import type { Annotation, CoachingReadout } from '../../lib/telemetry';

interface CoachPanelProps {
  readout: CoachingReadout;
}

const KIND_STYLE: Record<Annotation['kind'], { dot: string; icon: React.ReactNode }> = {
  loss: { dot: 'bg-red-500', icon: <FallOutlined className="text-red-500" /> },
  gain: { dot: 'bg-emerald-500', icon: <RiseOutlined className="text-emerald-500" /> },
  info: { dot: 'bg-sky-500', icon: <AimOutlined className="text-sky-500" /> },
};

export const CoachPanel: React.FC<CoachPanelProps> = ({ readout }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <BulbOutlined className="text-amber-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('telemetry.coach.title')}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-gray-700/70 text-gray-500 dark:text-gray-400">
          {t('telemetry.coach.badge')}
        </span>
      </div>

      {/* 平易な要約 */}
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{readout.summary}</p>

      {/* 伸びしろ #1 の強調 */}
      {readout.topOpportunity && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
          <AimOutlined className="text-amber-500 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
              {t('telemetry.coach.topOpportunityLabel')}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-200">{readout.topOpportunity}</div>
          </div>
        </div>
      )}

      {/* アノテーション一覧 */}
      {readout.annotations.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {readout.annotations.map((a, i) => (
            <li key={`${a.distance}-${i}`} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="mt-0.5 shrink-0">{KIND_STYLE[a.kind].icon}</span>
              <span className="leading-relaxed">{a.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
