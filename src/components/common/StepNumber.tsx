import React, { useEffect, useRef, useState } from 'react';
import { InputNumber, Button } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

interface StepNumberProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // e.g. 'kPa', 'mm', 'km', 'L'
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  width?: number | string;
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
}) => {
  const incTimer = useRef<number | null>(null);
  const decTimer = useRef<number | null>(null);

  const clamp = (v: number) => {
    if (min !== undefined && v < min) return min;
    if (max !== undefined && v > max) return max;
    return v;
  };

  const stepBy = (delta: number) => {
    const base = typeof value === 'number' ? value : (min ?? 0);
    const next = clamp(Number((base + delta).toFixed(6)));
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
    <div className="flex items-center" style={{ width: width ?? 'auto' }}>
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
        value={value as number | null}
        onChange={(v) => {
          const num = typeof v === 'number' ? v : value ?? 0;
          onChange(clamp(num));
        }}
        min={min}
        max={max}
        step={step}
        className="mx-2"
        size={size}
        controls={false}
        style={{ width: 110 }}
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
    </div>
  );
};

export default StepNumber;
