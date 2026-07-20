import type { SetupAdjustmentValue } from '../types/setup';
import type {
  SetupAdjustmentDefinition,
  SetupAdjustmentGroup,
  SetupAdjustmentPosition,
  SetupAdjustmentValueType,
} from '../types/vehicle';

export const ADJUSTMENT_GROUP_LABELS: Record<SetupAdjustmentGroup, string> = {
  tire: 'タイヤ',
  damper: 'ダンパー',
  spring: 'スプリング',
  ride_height: '車高',
  anti_roll_bar: 'スタビライザー / ARB',
  alignment: 'アライメント',
  brake: 'ブレーキ',
  aero: 'エアロ',
  drivetrain: '駆動系',
  engine: 'エンジン',
  electronics: '電子制御',
  weight_balance: '重量・バランス',
  other: 'その他',
};

export const ADJUSTMENT_POSITION_LABELS: Record<SetupAdjustmentPosition, string> = {
  vehicle: '車両全体',
  front: 'フロント',
  rear: 'リア',
  fl: '左フロント',
  fr: '右フロント',
  rl: '左リア',
  rr: '右リア',
};

export const ADJUSTMENT_VALUE_TYPE_LABELS: Record<SetupAdjustmentValueType, string> = {
  number: '数値',
  select: '選択肢',
  text: '文字列',
  boolean: 'ON / OFF',
};

const nullableNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const textOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeAdjustmentDefinitions = (
  definitions: SetupAdjustmentDefinition[] | null | undefined,
): SetupAdjustmentDefinition[] =>
  (definitions ?? [])
    .map((definition, index) => {
      const valueType = definition.valueType ?? 'number';
      const options = valueType === 'select'
        ? (definition.options ?? []).map((option) => option.trim()).filter(Boolean)
        : undefined;

      return {
        id: textOrUndefined(definition.id) ?? crypto.randomUUID(),
        group: definition.group ?? 'other',
        label: definition.label?.trim() ?? '',
        position: definition.position ?? 'vehicle',
        valueType,
        ...(textOrUndefined(definition.unit) ? { unit: textOrUndefined(definition.unit) } : {}),
        ...(nullableNumber(definition.min) !== undefined ? { min: nullableNumber(definition.min) } : {}),
        ...(nullableNumber(definition.max) !== undefined ? { max: nullableNumber(definition.max) } : {}),
        ...(nullableNumber(definition.step) !== undefined ? { step: nullableNumber(definition.step) } : {}),
        ...(options && options.length > 0 ? { options } : {}),
        ...(textOrUndefined(definition.helpText) ? { helpText: textOrUndefined(definition.helpText) } : {}),
        enabled: definition.enabled !== false,
        order: nullableNumber(definition.order) ?? index,
      } satisfies SetupAdjustmentDefinition;
    })
    .filter((definition) => definition.label.length > 0)
    .sort((a, b) => a.order - b.order);

export const adjustmentDefinitionErrors = (
  definitions: SetupAdjustmentDefinition[] | null | undefined,
): string[] => {
  const normalized = normalizeAdjustmentDefinitions(definitions);
  const errors: string[] = [];
  const ids = new Set<string>();

  normalized.forEach((definition) => {
    if (ids.has(definition.id)) errors.push(`${definition.label}: 項目IDが重複しています`);
    ids.add(definition.id);
    if (definition.valueType === 'select' && (definition.options?.length ?? 0) === 0) {
      errors.push(`${definition.label}: 選択肢を1つ以上登録してください`);
    }
    if (definition.min !== undefined && definition.max !== undefined && definition.min > definition.max) {
      errors.push(`${definition.label}: 最小値は最大値以下にしてください`);
    }
    if (definition.step !== undefined && definition.step <= 0) {
      errors.push(`${definition.label}: 刻み幅は0より大きい値にしてください`);
    }
  });

  return errors;
};

export const activeAdjustmentDefinitions = (
  definitions: SetupAdjustmentDefinition[] | null | undefined,
): SetupAdjustmentDefinition[] => normalizeAdjustmentDefinitions(definitions).filter((definition) => definition.enabled);

/** 車両定義が取得できない場合でも、保存時スナップショットから過去記録を表示する。 */
export const adjustmentDefinitionsFromValues = (
  values: SetupAdjustmentValue[] | null | undefined,
): SetupAdjustmentDefinition[] => (values ?? []).map((entry, index) => ({
  id: entry.definitionId,
  group: entry.group,
  label: entry.label,
  position: entry.position,
  valueType: entry.valueType,
  ...(entry.unit ? { unit: entry.unit } : {}),
  enabled: true,
  order: index,
}));

const emptyAdjustmentValue = (): SetupAdjustmentValue['value'] => null;

/**
 * 車両定義と既存の走行値を突き合わせる。定義変更後も同じ ID の値を保持し、
 * 画面に存在する定義だけを現在の順序で返す。
 */
export const reconcileAdjustmentValues = (
  definitions: SetupAdjustmentDefinition[] | null | undefined,
  current: SetupAdjustmentValue[] | null | undefined,
): SetupAdjustmentValue[] => {
  const byId = new Map((current ?? []).map((entry) => [entry.definitionId, entry]));

  return activeAdjustmentDefinitions(definitions).map((definition) => {
    const existing = byId.get(definition.id);
    return {
      definitionId: definition.id,
      group: definition.group,
      label: definition.label,
      position: definition.position,
      valueType: definition.valueType,
      ...(definition.unit ? { unit: definition.unit } : {}),
      value: existing?.value ?? emptyAdjustmentValue(),
    };
  });
};

export const setAdjustmentValue = (
  values: SetupAdjustmentValue[],
  definition: SetupAdjustmentDefinition,
  value: SetupAdjustmentValue['value'],
): SetupAdjustmentValue[] => {
  const next = reconcileAdjustmentValues([definition], values)[0];
  const replacement: SetupAdjustmentValue = { ...next, value };
  const found = values.some((entry) => entry.definitionId === definition.id);
  return found
    ? values.map((entry) => (entry.definitionId === definition.id ? replacement : entry))
    : [...values, replacement];
};

export const hasMeaningfulAdjustmentValues = (values: SetupAdjustmentValue[] | undefined): boolean =>
  (values ?? []).some((entry) => entry.value !== null && entry.value !== '');
