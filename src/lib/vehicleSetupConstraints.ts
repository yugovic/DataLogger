// 車両の setupConfig（登録車両ごとの調整可否・調整範囲）から、
// セットアップ入力フォームの表示制約への純粋な変換関数群。
//
// 目的: 「その車で物理的にあり得ない値・存在しない調整項目の入力」を防ぐ（データ品質）。
// 方針:
//   - 車両未選択、または setupConfig 未設定の車両では、常に「制約なし」（全項目表示・min/max なし）を返す。
//     既存データ・既存挙動を壊さないための後方互換。
//   - 制約は「表示可否」と「min/max」のみを扱う。既存の保存値そのものは一切変更しない
//     （非表示になった項目の draft 値は保持され、再表示すれば値は残っている）。

import type { VehicleSetupConfig } from '../types/vehicle';

export interface RangeConstraint {
  min?: number;
  max?: number;
}

export interface SuspensionFormConstraints {
  damper: {
    visible: boolean;
    frontMax?: number;
    rearMax?: number;
  };
  height: {
    visible: boolean;
    front: RangeConstraint;
    rear: RangeConstraint;
  };
  springRate: {
    visible: boolean;
  };
  stabilizer: {
    visible: boolean;
  };
}

export interface AlignmentFormConstraints {
  camber: {
    visible: boolean;
    front: RangeConstraint;
    rear: RangeConstraint;
  };
  toe: {
    visible: boolean;
    front: RangeConstraint;
    rear: RangeConstraint;
  };
  caster: {
    visible: boolean;
    range: RangeConstraint;
  };
}

/** 制約なし（後方互換のデフォルト）: 全項目表示・min/max指定なし */
export const unconstrainedSuspension = (): SuspensionFormConstraints => ({
  damper: { visible: true },
  height: { visible: true, front: {}, rear: {} },
  springRate: { visible: true },
  stabilizer: { visible: true },
});

export const unconstrainedAlignment = (): AlignmentFormConstraints => ({
  camber: { visible: true, front: {}, rear: {} },
  toe: { visible: true, front: {}, rear: {} },
  caster: { visible: true, range: {} },
});

/**
 * 車両の setupConfig からサスペンションタブの表示制約を導出する。
 * config が未設定（車両未選択 or setupConfig 未登録）なら制約なしを返す。
 */
export const suspensionConstraintsFromConfig = (
  config: VehicleSetupConfig | null | undefined,
): SuspensionFormConstraints => {
  if (!config) return unconstrainedSuspension();
  const { suspension } = config;
  if (!suspension) return unconstrainedSuspension();

  return {
    damper: {
      visible: suspension.damperAdjustable !== false,
      frontMax: suspension.damperClicksFront,
      rearMax: suspension.damperClicksRear,
    },
    height: {
      visible: suspension.heightAdjustable !== false,
      front: suspension.heightRangeFront
        ? { min: suspension.heightRangeFront.min, max: suspension.heightRangeFront.max }
        : {},
      rear: suspension.heightRangeRear
        ? { min: suspension.heightRangeRear.min, max: suspension.heightRangeRear.max }
        : {},
    },
    springRate: {
      visible: suspension.springRateChangeable !== false,
    },
    stabilizer: {
      visible: suspension.antiRollBarAdjustable !== false,
    },
  };
};

/**
 * 車両の setupConfig からアライメントタブの表示制約を導出する。
 * config が未設定（車両未選択 or setupConfig 未登録）なら制約なしを返す。
 */
export const alignmentConstraintsFromConfig = (
  config: VehicleSetupConfig | null | undefined,
): AlignmentFormConstraints => {
  if (!config) return unconstrainedAlignment();
  const { alignment } = config;
  if (!alignment) return unconstrainedAlignment();

  return {
    camber: {
      visible: alignment.camberAdjustable !== false,
      front: alignment.camberRangeFront
        ? { min: alignment.camberRangeFront.min, max: alignment.camberRangeFront.max }
        : {},
      rear: alignment.camberRangeRear
        ? { min: alignment.camberRangeRear.min, max: alignment.camberRangeRear.max }
        : {},
    },
    toe: {
      visible: alignment.toeAdjustable !== false,
      front: alignment.toeRangeFront
        ? { min: alignment.toeRangeFront.min, max: alignment.toeRangeFront.max }
        : {},
      rear: alignment.toeRangeRear
        ? { min: alignment.toeRangeRear.min, max: alignment.toeRangeRear.max }
        : {},
    },
    caster: {
      visible: alignment.casterAdjustable !== false,
      range: alignment.casterRange
        ? { min: alignment.casterRange.min, max: alignment.casterRange.max }
        : {},
    },
  };
};
