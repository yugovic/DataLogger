// サスペンションタブコンポーネント
//
// 現行スキーマ（SuspensionSettings）に一致する前後軸単位の項目だけを controlled で扱う:
//   - スプリングレート（front/rear, kgf/mm）
//   - 車高（front/rear, mm）
//   - スタビライザー / ARB（front/rear）
// ダンパー（前後 bump/rebound）は基本設定タブに配置。
// スキーマに存在しない項目（4輪独立値・ヘルパースプリング・バンプストッパー・ブレーキ）は
// データモデルが定義されるまで UI から除去している（勝手にスキーマを4輪化しない）。
import React from 'react';
import { StepNumber } from '../../common/StepNumber';
import { AxleFieldPair, SetupSection } from '../SetupFormParts';
import { toNumberOrNull } from '../../../lib/units';
import { unconstrainedSuspension } from '../../../lib/vehicleSetupConstraints';
import type { SuspensionFormConstraints } from '../../../lib/vehicleSetupConstraints';
import { useTranslation } from 'react-i18next';

interface SuspensionTabProps {
  frontSpringRate: string;
  setFrontSpringRate: (value: string) => void;
  rearSpringRate: string;
  setRearSpringRate: (value: string) => void;
  frontRideHeight: string;
  setFrontRideHeight: (value: string) => void;
  rearRideHeight: string;
  setRearRideHeight: (value: string) => void;
  frontStabilizer: string;
  setFrontStabilizer: (value: string) => void;
  rearStabilizer: string;
  setRearStabilizer: (value: string) => void;
  disabled?: boolean;
  /** 選択中の登録車両の setupConfig から導出した表示制約。未指定なら制約なし（後方互換） */
  constraints?: SuspensionFormConstraints;
}

export const SuspensionTab: React.FC<SuspensionTabProps> = ({
  frontSpringRate,
  setFrontSpringRate,
  rearSpringRate,
  setRearSpringRate,
  frontRideHeight,
  setFrontRideHeight,
  rearRideHeight,
  setRearRideHeight,
  frontStabilizer,
  setFrontStabilizer,
  rearStabilizer,
  setRearStabilizer,
  disabled,
  constraints = unconstrainedSuspension(),
}) => {
  const { t } = useTranslation();
  // 文字列 draft ↔ StepNumber(number|null) の橋渡し
  const numOf = (s: string): number | null => toNumberOrNull(s);
  const strOf = (n: number | null): string => (n === null ? '' : String(n));

  const axleRow = (
    unit: string,
    front: string,
    setFront: (v: string) => void,
    rear: string,
    setRear: (v: string) => void,
    opts: { min: number; max: number; step: number; largeStep?: number },
  ) => (
    <AxleFieldPair
      front={<StepNumber
          value={numOf(front)}
          onChange={(n) => setFront(strOf(n))}
          min={opts.min}
          max={opts.max}
          step={opts.step}
          largeStep={opts.largeStep}
          unit={unit}
          size="small"
          disabled={disabled}
        />}
      rear={<StepNumber
          value={numOf(rear)}
          onChange={(n) => setRear(strOf(n))}
          min={opts.min}
          max={opts.max}
          step={opts.step}
          largeStep={opts.largeStep}
          unit={unit}
          size="small"
          disabled={disabled}
        />}
    />
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* スプリングレート */}
      {constraints.springRate.visible && (
        <SetupSection title={t('setupTabs.suspension.springRate')} icon="fas fa-compress-arrows-alt" meta="kgf/mm">
          {axleRow('kgf/mm', frontSpringRate, setFrontSpringRate, rearSpringRate, setRearSpringRate, { min: 0, max: 200, step: 0.5, largeStep: 5 })}
        </SetupSection>
      )}

      {/* 車高 */}
      {constraints.height.visible && (
        <SetupSection title={t('setupTabs.suspension.rideHeight')} icon="fas fa-ruler-vertical" meta="mm">
          <AxleFieldPair
            front={<StepNumber
                value={numOf(frontRideHeight)}
                onChange={(n) => setFrontRideHeight(strOf(n))}
                min={constraints.height.front.min ?? 50}
                max={constraints.height.front.max ?? 300}
                step={1}
                largeStep={5}
                unit="mm"
                size="small"
                disabled={disabled}
              />}
            rear={<StepNumber
                value={numOf(rearRideHeight)}
                onChange={(n) => setRearRideHeight(strOf(n))}
                min={constraints.height.rear.min ?? 50}
                max={constraints.height.rear.max ?? 300}
                step={1}
                largeStep={5}
                unit="mm"
                size="small"
                disabled={disabled}
              />}
          />
        </SetupSection>
      )}

      {/* スタビライザー / ARB */}
      {constraints.stabilizer.visible && (
        <SetupSection title={t('setupTabs.suspension.antiRollBar')} icon="fas fa-grip-lines" meta={t('setupTabs.suspension.adjustmentValue')}>
          {axleRow('', frontStabilizer, setFrontStabilizer, rearStabilizer, setRearStabilizer, { min: 0, max: 100, step: 1 })}
        </SetupSection>
      )}
    </div>
  );
};
