import React from 'react';
import { Input, InputNumber, Select } from 'antd';
import type { VehicleSetupConfig } from '../../../types/vehicle';
import { AxleFieldPair, SetupEmptyState, SetupField, SetupSection } from '../SetupFormParts';
import { useTranslation } from 'react-i18next';

interface Props {
  config: VehicleSetupConfig | null;
  values: {
    frontBrakePad: string; rearBrakePad: string; frontBrakeRotor: string; rearBrakeRotor: string; brakeBalance: string;
    frontAero: string; rearAero: string; ecuMap: string; boost: string;
  };
  onChange: (key: keyof Props['values'], value: string) => void;
  disabled?: boolean;
}

export const VehicleAdjustmentsTab: React.FC<Props> = ({ config, values, onChange, disabled }) => {
  const { t } = useTranslation();
  // 車両未選択・旧車両は全項目を表示し、既存の自由入力動作を維持する。
  const unrestricted = !config;
  const showBrake = unrestricted || config.brake.padTypes.length > 0 || (config.brake.rotorTypes?.length ?? 0) > 0 || config.brake.balanceAdjustable;
  const showAero = unrestricted || config.aero?.frontAdjustable || config.aero?.rearAdjustable;
  const showEngine = unrestricted || config.engine?.ecuTunable || config.engine?.boostAdjustable;

  const choice = (key: keyof Props['values'], options: string[]) => (
    options.length > 0 ? <Select
      value={values[key] || undefined}
      onChange={(value) => onChange(key, value)}
      options={options.map((value) => ({ value, label: value }))}
      placeholder={t('setupTabs.common.notSelected')}
      allowClear
      showSearch
      disabled={disabled}
    /> : <Input value={values[key]} onChange={(e) => onChange(key, e.target.value)} placeholder={t('setupTabs.common.notEntered')} disabled={disabled} />
  );

  if (!showBrake && !showAero && !showEngine) {
    return <div className="p-4 sm:p-6"><SetupEmptyState>{t('setupTabs.adjustments.empty')}</SetupEmptyState></div>;
  }

  return <div className="space-y-6 p-4 sm:p-6">
    {showBrake && <SetupSection title={t('setupTabs.adjustments.brakes')} meta={t('setupTabs.adjustments.brakeMeta')} icon="fas fa-stop-circle">
      <div className="space-y-4">
        <AxleFieldPair front={choice('frontBrakePad', config?.brake.padTypes ?? [])} rear={choice('rearBrakePad', config?.brake.padTypes ?? [])} frontHint={t('setupTabs.adjustments.brakePad')} rearHint={t('setupTabs.adjustments.brakePad')} />
        <AxleFieldPair front={choice('frontBrakeRotor', config?.brake.rotorTypes ?? [])} rear={choice('rearBrakeRotor', config?.brake.rotorTypes ?? [])} frontHint={t('setupTabs.adjustments.rotor')} rearHint={t('setupTabs.adjustments.rotor')} />
        {(unrestricted || config.brake.balanceAdjustable) && <div className="max-w-md"><SetupField label="フロントブレーキ配分"><InputNumber className="w-full" min={0} max={100} addonAfter="%" value={values.brakeBalance ? Number(values.brakeBalance) : null} onChange={(v) => onChange('brakeBalance', v == null ? '' : String(v))} disabled={disabled} /></SetupField></div>}
      </div>
    </SetupSection>}
    {showAero && <SetupSection title="エアロ設定" meta="段数 / 位置 (0–100)" icon="fas fa-wind">
      <AxleFieldPair
        front={(unrestricted || config.aero?.frontAdjustable) ? <InputNumber className="w-full" min={0} max={100} value={values.frontAero ? Number(values.frontAero) : null} onChange={(v) => onChange('frontAero', v == null ? '' : String(v))} disabled={disabled} /> : <span className="text-sm text-gray-400">調整不可</span>}
        rear={(unrestricted || config.aero?.rearAdjustable) ? <InputNumber className="w-full" min={0} max={100} value={values.rearAero ? Number(values.rearAero) : null} onChange={(v) => onChange('rearAero', v == null ? '' : String(v))} disabled={disabled} /> : <span className="text-sm text-gray-400">調整不可</span>}
      />
    </SetupSection>}
    {showEngine && <SetupSection title="エンジン設定" meta="ECUマップ / ブースト圧" icon="fas fa-tachometer-alt">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(unrestricted || config.engine?.ecuTunable) && <SetupField label="ECUマップ"><Input value={values.ecuMap} onChange={(e) => onChange('ecuMap', e.target.value)} placeholder="例: Map 2 / Wet" disabled={disabled} /></SetupField>}
        {(unrestricted || config.engine?.boostAdjustable) && <SetupField label="ブースト圧"><InputNumber className="w-full" min={0} max={500} addonAfter="kPa" value={values.boost ? Number(values.boost) : null} onChange={(v) => onChange('boost', v == null ? '' : String(v))} disabled={disabled} /></SetupField>}
      </div>
    </SetupSection>}
  </div>;
};
