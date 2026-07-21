import { useMemo } from 'react';
import { Alert, Empty, Input, InputNumber, Select } from 'antd';
import {
  ADJUSTMENT_GROUP_LABELS,
  ADJUSTMENT_POSITION_LABELS,
  activeAdjustmentDefinitions,
} from '../../../lib/setupAdjustments';
import type { SetupAdjustmentValue } from '../../../types/setup';
import type { SetupAdjustmentDefinition, SetupAdjustmentGroup } from '../../../types/vehicle';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        placeholder={t('setupTabs.common.notEntered')}
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
        placeholder={t('setupTabs.common.notSelected')}
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
        placeholder={t('setupTabs.common.notRecorded')}
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
      placeholder={t('setupTabs.common.notEntered')}
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
  const { t } = useTranslation();
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
    return <Empty className="py-12" description={t('setupTabs.dynamic.empty')} />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Alert
        type="info"
        showIcon
        message={t('setupTabs.dynamic.message')}
        description={t('setupTabs.dynamic.description')}
      />

      {grouped.map(({ group, definitions: groupDefinitions }) => (
        <section key={group} aria-labelledby={`adjustment-group-${group}`}>
          <h3
            id={`adjustment-group-${group}`}
            className="mb-3 text-base font-semibold text-gray-800 dark:text-gray-100"
          >
            {t(`setupTabs.dynamic.groups.${group}`, { defaultValue: ADJUSTMENT_GROUP_LABELS[group] })}
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
                      {t(`setupTabs.dynamic.positions.${definition.position}`, { defaultValue: ADJUSTMENT_POSITION_LABELS[definition.position] })}
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
