import { useMemo } from 'react';
import { Alert, Empty, Input, InputNumber, Select } from 'antd';
import {
  ADJUSTMENT_GROUP_LABELS,
  ADJUSTMENT_POSITION_LABELS,
  activeAdjustmentDefinitions,
} from '../../../lib/setupAdjustments';
import type { SetupAdjustmentValue } from '../../../types/setup';
import type { SetupAdjustmentDefinition, SetupAdjustmentGroup } from '../../../types/vehicle';

interface DynamicSetupTabProps {
  definitions: SetupAdjustmentDefinition[];
  values: SetupAdjustmentValue[];
  onChange: (definition: SetupAdjustmentDefinition, value: SetupAdjustmentValue['value']) => void;
  disabled?: boolean;
}

const GROUP_ORDER: SetupAdjustmentGroup[] = [
  'tire',
  'damper',
  'spring',
  'ride_height',
  'anti_roll_bar',
  'alignment',
  'brake',
  'aero',
  'drivetrain',
  'engine',
  'electronics',
  'weight_balance',
  'other',
];

function AdjustmentInput({
  definition,
  value,
  disabled,
  onChange,
  inputId,
}: {
  definition: SetupAdjustmentDefinition;
  value: SetupAdjustmentValue['value'];
  disabled?: boolean;
  onChange: (value: SetupAdjustmentValue['value']) => void;
  inputId: string;
}) {
  if (definition.valueType === 'number') {
    return (
      <InputNumber
        id={inputId}
        className="w-full"
        value={typeof value === 'number' ? value : null}
        min={definition.min}
        max={definition.max}
        step={definition.step ?? 1}
        addonAfter={definition.unit || undefined}
        placeholder="未入力"
        disabled={disabled}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (definition.valueType === 'select') {
    return (
      <Select
        id={inputId}
        className="w-full"
        value={typeof value === 'string' && value !== '' ? value : undefined}
        options={(definition.options ?? []).map((option) => ({ value: option, label: option }))}
        placeholder="未選択"
        allowClear
        showSearch
        disabled={disabled}
        onChange={(next) => onChange(next ?? null)}
      />
    );
  }

  if (definition.valueType === 'boolean') {
    return (
      <Select
        id={inputId}
        className="w-full"
        value={typeof value === 'boolean' ? value : undefined}
        options={[
          { value: true, label: 'ON' },
          { value: false, label: 'OFF' },
        ]}
        placeholder="未記録"
        allowClear
        disabled={disabled}
        onChange={(next) => onChange(typeof next === 'boolean' ? next : null)}
      />
    );
  }

  return (
    <Input
      id={inputId}
      value={typeof value === 'string' ? value : ''}
      placeholder="未入力"
      disabled={disabled}
      suffix={definition.unit || undefined}
      onChange={(event) => onChange(event.target.value || null)}
    />
  );
}

export function DynamicSetupTab({
  definitions,
  values,
  onChange,
  disabled,
}: DynamicSetupTabProps) {
  const activeDefinitions = useMemo(
    () => activeAdjustmentDefinitions(definitions),
    [definitions],
  );
  const valueById = useMemo(
    () => new Map(values.map((entry) => [entry.definitionId, entry.value])),
    [values],
  );
  const grouped = useMemo(
    () => GROUP_ORDER.map((group) => ({
      group,
      definitions: activeDefinitions.filter((definition) => definition.group === group),
    })).filter((entry) => entry.definitions.length > 0),
    [activeDefinitions],
  );

  if (activeDefinitions.length === 0) {
    return <Empty className="py-12" description="この車両にはセッティング項目が定義されていません" />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Alert
        type="info"
        showIcon
        message="この走行で実際に使った設定値を記録します"
        description="未変更でも、走行時の値が分かる項目は入力してください。後から同じ状態を再現し、ラップやフィードバックと比較するために使います。"
      />

      {grouped.map(({ group, definitions: groupDefinitions }) => (
        <section key={group} aria-labelledby={`adjustment-group-${group}`}>
          <h3
            id={`adjustment-group-${group}`}
            className="mb-3 text-base font-semibold text-gray-800 dark:text-gray-100"
          >
            {ADJUSTMENT_GROUP_LABELS[group]}
          </h3>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            {groupDefinitions.map((definition) => (
              <div key={definition.id}>
                <label
                  htmlFor={`adjustment-${definition.id}`}
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {definition.label}
                  {definition.position !== 'vehicle' && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {ADJUSTMENT_POSITION_LABELS[definition.position]}
                    </span>
                  )}
                </label>
                <AdjustmentInput
                  definition={definition}
                  value={valueById.get(definition.id) ?? null}
                  disabled={disabled}
                  inputId={`adjustment-${definition.id}`}
                  onChange={(value) => onChange(definition, value)}
                />
                {definition.helpText && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{definition.helpText}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
