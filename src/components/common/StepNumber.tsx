import React, { useEffect, useRef } from 'react';
import { InputNumber, Button } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

interface StepNumberProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 大きなステップ（指定時のみ ±largeStep ボタンを追加） */
  largeStep?: number;
  unit?: string; // e.g. 'kPa', 'mm', 'km', 'L'
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  width?: number | string;
  inputWidth?: number;
  placeholder?: string;
  /** 未入力時にボタンを押した際の初期値。指定しない場合は min（さらに未指定なら0） */
  defaultValue?: number;
}

export const StepNumber: React.FC<StepNumberProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  size = 'middle',
  disabled,
  width,
  inputWidth = 110,
  placeholder = '——',
  largeStep,
  defaultValue,
}) => {
  const incTimer = useRef<number | null>(null);
  const decTimer = useRef<number | null>(null);
  const inputRef = useRef<any>(null);
  const hasLarge = typeof largeStep === 'number' && largeStep > 0;

  const clamp = (v: number) => {
    if (min !== undefined && v < min) return min;
    if (max !== undefined && v > max) return max;
    return v;
  };

  const stepBy = (delta: number) => {
    if (value === null || value === undefined) {
      const base = typeof defaultValue === 'number' ? defaultValue : (min ?? 0);
      const next = clamp(Number((base + delta).toFixed(6)));
      onChange(next);
      return;
    }
    const next = clamp(Number((value + delta).toFixed(6)));
    if (next !== value) onChange(next);
  };

  const startHold = (delta: number) => {
    stepBy(delta);
    const ref = delta > 0 ? incTimer : decTimer;
    if (ref.current) window.clearInterval(ref.current);
    // accelerate repeat
    let interval = 300;
    ref.current = window.setInterval(() => {
      stepBy(delta);
      interval = Math.max(60, interval - 20);
    }, interval);
  };

  const stopHold = () => {
    if (incTimer.current) window.clearInterval(incTimer.current);
    if (decTimer.current) window.clearInterval(decTimer.current);
    incTimer.current = null;
    decTimer.current = null;
  };

  useEffect(() => {
    return () => stopHold();
  }, []);

  return (
    <div className="flex items-center flex-wrap" style={{ width: width ?? 'auto' }}>
      {hasLarge && (
        <Button
          size={size}
          disabled={disabled}
          onMouseDown={() => startHold(-(largeStep as number))}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => startHold(-(largeStep as number))}
          onTouchEnd={stopHold}
          className="text-xs"
          style={{ minWidth: size === 'small' ? 28 : undefined, padding: size === 'small' ? '0 2px' : undefined, fontWeight: 600 }}
        >
          −{largeStep}
        </Button>
      )}
      <Button
        size={size}
        disabled={disabled}
        onMouseDown={() => startHold(-step)}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold(-step)}
        onTouchEnd={stopHold}
        icon={<MinusOutlined />}
      />
      <InputNumber
        ref={inputRef}
        value={value as number | null}
        onChange={(v) => {
          if (v === null) { onChange(null); return; }
          onChange(clamp(v));
        }}
        min={min}
        max={max}
        step={step}
        className="mx-2"
        size={size}
        controls={false}
        style={{ width: inputWidth }}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') stepBy(step);
          if (e.key === 'ArrowDown') stepBy(-step);
        }}
        onWheel={(e) => {
          if (disabled) return;
          const delta = e.deltaY < 0 ? step : -step;
          stepBy(delta);
        }}
      />
      {unit && (
        <span className="text-xs text-gray-400 select-none ml-1" style={{ minWidth: 24 }}>
          {unit}
        </span>
      )}
      <Button
        size={size}
        disabled={disabled}
        onMouseDown={() => startHold(step)}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold(step)}
        onTouchEnd={stopHold}
        icon={<PlusOutlined />}
      />
      {hasLarge && (
        <Button
          size={size}
          disabled={disabled}
          onMouseDown={() => startHold(largeStep as number)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => startHold(largeStep as number)}
          onTouchEnd={stopHold}
          className="text-xs"
          style={{ minWidth: size === 'small' ? 28 : undefined, padding: size === 'small' ? '0 2px' : undefined, fontWeight: 600 }}
        >
          +{largeStep}
        </Button>
      )}
    </div>
  );
};

export default StepNumber;
