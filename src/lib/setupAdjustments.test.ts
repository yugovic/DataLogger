import { describe, expect, it } from 'vitest';
import {
  activeAdjustmentDefinitions,
  adjustmentDefinitionErrors,
  hasMeaningfulAdjustmentValues,
  normalizeAdjustmentDefinitions,
  reconcileAdjustmentValues,
} from './setupAdjustments';
import type { SetupAdjustmentDefinition } from '../types/vehicle';

const definition = (overrides: Partial<SetupAdjustmentDefinition> = {}): SetupAdjustmentDefinition => ({
  id: 'rear-rebound',
  group: 'damper',
  label: 'リア減衰力',
  position: 'rear',
  valueType: 'number',
  unit: 'click',
  min: 1,
  max: 14,
  step: 1,
  enabled: true,
  order: 0,
  ...overrides,
});

describe('setupAdjustments', () => {
  it('normalizes labels/options and drops blank definitions', () => {
    const result = normalizeAdjustmentDefinitions([
      definition({ label: ' リア減衰力 ', valueType: 'select', options: [' Soft ', '', 'Hard'] }),
      definition({ id: 'blank', label: ' ' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('リア減衰力');
    expect(result[0].options).toEqual(['Soft', 'Hard']);
  });

  it('returns only enabled definitions in configured order', () => {
    const result = activeAdjustmentDefinitions([
      definition({ id: 'b', order: 2 }),
      definition({ id: 'hidden', enabled: false, order: 0 }),
      definition({ id: 'a', order: 1 }),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('keeps a value by stable definition id and refreshes its snapshot metadata', () => {
    const values = reconcileAdjustmentValues(
      [definition({ label: 'リア・リバウンド' })],
      [{
        definitionId: 'rear-rebound',
        group: 'other',
        label: '旧ラベル',
        position: 'vehicle',
        valueType: 'number',
        value: 7,
      }],
    );

    expect(values[0]).toMatchObject({ label: 'リア・リバウンド', value: 7, group: 'damper' });
  });

  it('treats zero and false as meaningful recorded values', () => {
    expect(hasMeaningfulAdjustmentValues([{
      definitionId: 'tc', group: 'electronics', label: 'TC', position: 'vehicle', valueType: 'number', value: 0,
    }])).toBe(true);
    expect(hasMeaningfulAdjustmentValues([{
      definitionId: 'abs', group: 'electronics', label: 'ABS', position: 'vehicle', valueType: 'boolean', value: false,
    }])).toBe(true);
  });

  it('rejects invalid select/range/step definitions', () => {
    expect(adjustmentDefinitionErrors([
      definition({ valueType: 'select', options: [] }),
      definition({ id: 'range', min: 10, max: 5 }),
      definition({ id: 'step', step: 0 }),
    ])).toHaveLength(3);
  });
});
