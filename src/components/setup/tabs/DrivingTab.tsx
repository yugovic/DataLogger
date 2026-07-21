// ドライビングタブコンポーネント
import React from 'react';
import { Input, Slider, Collapse } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { KnowledgeNote, DrivingFeedback } from '../../../types/setup';

const { TextArea } = Input;
const { Panel } = Collapse;

interface DrivingTabProps {
  notes: string;
  setNotes: (value: string) => void;
  knowledge: KnowledgeNote;
  setKnowledge: (value: KnowledgeNote) => void;
  feedback: DrivingFeedback;
  onFeedbackChange: (key: keyof DrivingFeedback, value: number | null) => void;
  disabled?: boolean;
}

// アンダー/オーバーステア系（コーナリング）用マーク
const balanceMarks = {
  0: 'U/S++',
  1: 'U/S+',
  2: 'N',
  3: 'O/S+',
  4: 'O/S++',
};

/**
 * 未評価（null）を扱えるフィードバックスライダー。
 * - null のときはハンドルを中央(2)に薄く表示するが、値は保存しない（未評価のまま）
 * - ユーザーが操作した時点で number になる
 * - 「クリア」で null（未評価）へ戻せる
 */
const FeedbackSlider: React.FC<{
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  marks: Record<number, string>;
  disabled?: boolean;
}> = ({ label, value, onChange, marks, disabled }) => {
  const { t } = useTranslation();
  return (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      {value === null ? (
        <span className="text-xs text-gray-400 dark:text-gray-500">{t('setupTabs.driving.notEvaluated')}</span>
      ) : (
        !disabled && (
          <button
            type="button"
            className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
            onClick={() => onChange(null)}
          >
            {t('setupTabs.driving.clear')}
          </button>
        )
      )}
    </div>
    <Slider
      value={value ?? 2}
      onChange={(v) => onChange(v as number)}
      min={0}
      max={4}
      marks={marks}
      step={1}
      dots={true}
      disabled={disabled}
      className={value === null ? 'opacity-40' : ''}
    />
  </div>
  );
};

export const DrivingTab: React.FC<DrivingTabProps> = ({
  notes,
  setNotes,
  knowledge,
  setKnowledge,
  feedback,
  onFeedbackChange,
  disabled,
}) => {
  const { t } = useTranslation();
  const handleKnowledgeChange = (field: keyof KnowledgeNote, value: string) => {
    setKnowledge({
      ...knowledge,
      [field]: value,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* コーナリング特性 - 2列グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 低速コーナー */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('setupTabs.driving.lowSpeedCorner')}</h4>
          <div className="space-y-3">
            <FeedbackSlider label={t('setupTabs.driving.entry')} value={feedback.lowSpeedEntry} onChange={(v) => onFeedbackChange('lowSpeedEntry', v)} marks={balanceMarks} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.middle')} value={feedback.lowSpeedMiddle} onChange={(v) => onFeedbackChange('lowSpeedMiddle', v)} marks={balanceMarks} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.exit')} value={feedback.lowSpeedExit} onChange={(v) => onFeedbackChange('lowSpeedExit', v)} marks={balanceMarks} disabled={disabled} />
          </div>
        </div>

        {/* 高速コーナー */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('setupTabs.driving.highSpeedCorner')}</h4>
          <div className="space-y-3">
            <FeedbackSlider label={t('setupTabs.driving.entry')} value={feedback.highSpeedEntry} onChange={(v) => onFeedbackChange('highSpeedEntry', v)} marks={balanceMarks} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.middle')} value={feedback.highSpeedMiddle} onChange={(v) => onFeedbackChange('highSpeedMiddle', v)} marks={balanceMarks} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.exit')} value={feedback.highSpeedExit} onChange={(v) => onFeedbackChange('highSpeedExit', v)} marks={balanceMarks} disabled={disabled} />
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {t('setupTabs.driving.balanceLegend')}
      </div>

      {/* その他の評価項目 - Collapse使用 */}
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        className="bg-gray-50 dark:bg-gray-800"
      >
        <Panel header={t('setupTabs.driving.braking')} key="1" className="text-sm">
          <div className="space-y-3 px-4">
            <FeedbackSlider label={t('setupTabs.driving.initialBraking')} value={feedback.brakeInitial} onChange={(v) => onFeedbackChange('brakeInitial', v)} marks={{ 0: t('setupTabs.driving.weak'), 2: t('setupTabs.driving.optimal'), 4: t('setupTabs.driving.strong') }} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.midBraking')} value={feedback.brakeMiddle} onChange={(v) => onFeedbackChange('brakeMiddle', v)} marks={{ 0: t('setupTabs.driving.unstable'), 2: t('setupTabs.driving.stable'), 4: t('setupTabs.driving.lockingTendency') }} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.attitudeStability')} value={feedback.brakeStability} onChange={(v) => onFeedbackChange('brakeStability', v)} marks={{ 0: t('setupTabs.driving.unstable'), 2: t('setupTabs.driving.stable'), 4: t('setupTabs.driving.overStable') }} disabled={disabled} />
          </div>
        </Panel>

        <Panel header={t('setupTabs.driving.accelResponse')} key="2" className="text-sm">
          <div className="space-y-3 px-4">
            <FeedbackSlider label={t('setupTabs.driving.initialResponse')} value={feedback.accelResponse} onChange={(v) => onFeedbackChange('accelResponse', v)} marks={{ 0: t('setupTabs.driving.dull'), 2: t('setupTabs.driving.optimal'), 4: t('setupTabs.driving.oversensitive') }} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.traction')} value={feedback.accelTraction} onChange={(v) => onFeedbackChange('accelTraction', v)} marks={{ 0: t('setupTabs.driving.insufficient'), 2: t('setupTabs.driving.optimal'), 4: t('setupTabs.driving.excessive') }} disabled={disabled} />
          </div>
        </Panel>

        <Panel header={t('setupTabs.driving.overallFeel')} key="3" className="text-sm">
          <div className="space-y-3 px-4">
            <FeedbackSlider label={t('setupTabs.driving.balance')} value={feedback.balance} onChange={(v) => onFeedbackChange('balance', v)} marks={{ 0: t('setupTabs.driving.unbalanced'), 2: t('setupTabs.driving.wellBalanced'), 4: t('setupTabs.driving.perfect') }} disabled={disabled} />
            <FeedbackSlider label={t('setupTabs.driving.driverConfidence')} value={feedback.confidence} onChange={(v) => onFeedbackChange('confidence', v)} marks={{ 0: t('setupTabs.driving.anxious'), 2: t('setupTabs.driving.normal'), 4: t('setupTabs.driving.highConfidence') }} disabled={disabled} />
          </div>
        </Panel>
      </Collapse>

      {/* コメント・メモ */}
      <div className="border-t dark:border-gray-700 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('setupTabs.driving.commentsMemo')}</h4>
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('setupTabs.driving.commentsPlaceholder')}
          rows={4}
          className="w-full text-sm"
          disabled={disabled}
        />
      </div>

      <div className="border-t dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('setupTabs.driving.knowledgeMemo')}</h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('setupTabs.driving.intentionResultLearning')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('setupTabs.driving.intention')}</div>
            <TextArea
              value={knowledge.intention ?? ''}
              onChange={(e) => handleKnowledgeChange('intention', e.target.value)}
              placeholder={t('setupTabs.driving.intentionPlaceholder')}
              rows={3}
              className="w-full text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('setupTabs.driving.result')}</div>
            <TextArea
              value={knowledge.result ?? ''}
              onChange={(e) => handleKnowledgeChange('result', e.target.value)}
              placeholder={t('setupTabs.driving.resultPlaceholder')}
              rows={3}
              className="w-full text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('setupTabs.driving.learning')}</div>
            <TextArea
              value={knowledge.learning ?? ''}
              onChange={(e) => handleKnowledgeChange('learning', e.target.value)}
              placeholder={t('setupTabs.driving.learningPlaceholder')}
              rows={3}
              className="w-full text-sm"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
