// アライメントタブコンポーネント
import React from 'react';
import { Input } from 'antd';
import { AxleFieldPair, SetupField, SetupSection } from '../SetupFormParts';
import { unconstrainedAlignment } from '../../../lib/vehicleSetupConstraints';
import type { AlignmentFormConstraints } from '../../../lib/vehicleSetupConstraints';
import { useTranslation } from 'react-i18next';

interface AlignmentTabProps {
  // キャンバー
  frontCamber: string;
  setFrontCamber: (value: string) => void;
  rearCamber: string;
  setRearCamber: (value: string) => void;

  // トー
  frontToe: string;
  setFrontToe: (value: string) => void;
  rearToe: string;
  setRearToe: (value: string) => void;

  // キャスター
  caster: string;
  setCaster: (value: string) => void;

  disabled?: boolean;
  /** 選択中の登録車両の setupConfig から導出した表示制約。未指定なら制約なし（後方互換） */
  constraints?: AlignmentFormConstraints;
}

export const AlignmentTab: React.FC<AlignmentTabProps> = ({
  frontCamber,
  setFrontCamber,
  rearCamber,
  setRearCamber,
  frontToe,
  setFrontToe,
  rearToe,
  setRearToe,
  caster,
  setCaster,
  disabled,
  constraints = unconstrainedAlignment(),
}) => {
  const { t } = useTranslation();
  const rangeHint = (range: { min?: number; max?: number }): string | null =>
    range.min !== undefined && range.max !== undefined ? t('setupTabs.alignment.range', { min: range.min, max: range.max }) : null;

  return (
    <div className="space-y-6">
      {constraints.camber.visible && (
      <SetupSection title={t('setupTabs.alignment.camber')} icon="fas fa-slash" meta="degree (°)">
        <AxleFieldPair
          front={<Input
              value={frontCamber}
              onChange={(e) => setFrontCamber(e.target.value)}
              disabled={disabled}
              inputMode="decimal"
              suffix="°"
              placeholder="-2.5"
            />}
          rear={<Input
              value={rearCamber}
              onChange={(e) => setRearCamber(e.target.value)}
              disabled={disabled}
              inputMode="decimal"
              suffix="°"
              placeholder="-1.5"
            />}
          frontHint={<>{t('setupTabs.alignment.negativeExample', { value: '-2.5' })}{rangeHint(constraints.camber.front) ? ` / ${rangeHint(constraints.camber.front)}` : ''}</>}
          rearHint={<>{t('setupTabs.alignment.negativeExample', { value: '-1.5' })}{rangeHint(constraints.camber.rear) ? ` / ${rangeHint(constraints.camber.rear)}` : ''}</>}
        />
      </SetupSection>
      )}

      {constraints.toe.visible && (
      <SetupSection title={t('setupTabs.alignment.toe')} icon="fas fa-arrows-alt-h" meta="mm">
        <AxleFieldPair
          front={<Input
              value={frontToe}
              onChange={(e) => setFrontToe(e.target.value)}
              disabled={disabled}
              inputMode="decimal"
              suffix="mm"
              placeholder="0"
            />}
          rear={<Input
              value={rearToe}
              onChange={(e) => setRearToe(e.target.value)}
              disabled={disabled}
              inputMode="decimal"
              suffix="mm"
              placeholder="2"
            />}
          frontHint={<>{t('setupTabs.alignment.toeHint')}{rangeHint(constraints.toe.front) ? ` / ${rangeHint(constraints.toe.front)}` : ''}</>}
          rearHint={<>{t('setupTabs.alignment.toeHint')}{rangeHint(constraints.toe.rear) ? ` / ${rangeHint(constraints.toe.rear)}` : ''}</>}
        />
      </SetupSection>
      )}

      {constraints.caster.visible && (
      <SetupSection title={t('setupTabs.alignment.casterAngle')} icon="fas fa-sync-alt" meta="degree (°)">
        <div className="max-w-md">
          <SetupField label={t('setupTabs.alignment.caster')} hint={<>{t('setupTabs.alignment.casterHint')}{rangeHint(constraints.caster.range) ? ` / ${rangeHint(constraints.caster.range)}` : ''}</>}>
            <Input
              value={caster}
              onChange={(e) => setCaster(e.target.value)}
              disabled={disabled}
              inputMode="decimal"
              suffix="°"
              placeholder="5.5"
            />
          </SetupField>
        </div>
      </SetupSection>
      )}

      <aside className="rounded-lg border border-blue-200/60 bg-blue-50/60 p-4 dark:border-blue-800/60 dark:bg-blue-900/10">
        <h4 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
          <i className="fas fa-info-circle mr-2"></i>
          {t('setupTabs.alignment.guideTitle')}
        </h4>
        <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <p>• {t('setupTabs.alignment.camberGuide')}</p>
          <p>• {t('setupTabs.alignment.toeGuide')}</p>
          <p>• {t('setupTabs.alignment.casterGuide')}</p>
        </div>
      </aside>
    </div>
  );
};
