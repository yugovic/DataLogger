import React, { useRef, useState } from 'react';

interface CircularDialProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  helper?: string;
  size?: number;
  disabled?: boolean;
}

export const CircularDial: React.FC<CircularDialProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  helper,
  size = 120,
  disabled
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clampValue = (next: number) => {
    const clamped = Math.min(Math.max(next, min), max);
    if (step <= 0) return clamped;
    const rounded = Math.round(clamped / step) * step;
    return Number(rounded.toFixed(2));
  };

  const valueToPercent = (val: number) => {
    if (max === min) return 0;
    return (val - min) / (max - min);
  };

  const percentToValue = (percent: number) => {
    const raw = min + percent * (max - min);
    return clampValue(raw);
  };

  const handlePointer = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    const degrees = (angle * 180) / Math.PI;
    const rotated = (degrees + 450) % 360; // 0 at top, clockwise
    const percent = rotated / 360;
    const nextValue = percentToValue(percent);
    onChange(nextValue);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    handlePointer(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    handlePointer(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const percent = valueToPercent(value);
  const angle = percent * 360;
  const radius = size / 2 - 18;

  return (
    <div className="flex flex-col items-center text-center space-y-3">
      <div
        ref={dialRef}
        className={`relative rounded-full bg-[var(--disc-black)] text-white select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="absolute inset-4 rounded-full bg-black/40"></div>
        <div className="absolute inset-0 flex items-center justify-center text-3xl font-semibold tracking-wide">
          {Math.round(value)}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `rotate(${angle}deg)` }}>
          <div
            className="w-4 h-4 rounded-full bg-[var(--accent-sunset)] shadow-[0_6px_16px_rgba(244,88,27,0.45)]"
            style={{ transform: `translateY(-${radius}px)` }}
          ></div>
        </div>
      </div>
      <div>
        <p className="font-semibold text-[var(--text-charcoal)]">{label}</p>
        {helper && <p className="text-xs text-[var(--text-muted)]">{helper}</p>}
      </div>
    </div>
  );
};
