import React from 'react';

interface ControlTileProps {
  title: string;
  helper?: string;
  active?: boolean;
  variant?: 'light' | 'dark';
  onClick?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  align?: 'start' | 'center';
}

export const ControlTile: React.FC<ControlTileProps> = ({
  title,
  helper,
  active,
  variant = 'light',
  onClick,
  children,
  disabled,
  align = 'start'
}) => {
  const bgClass = variant === 'dark' ? 'bg-[var(--disc-black)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-charcoal)]';
  const stateClass = active ? 'shadow-[0_12px_25px_rgba(0,0,0,0.2)] scale-[0.99]' : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_18px_rgba(0,0,0,0.08)]';
  const cursorClass = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:translate-y-0.5';
  const alignment = align === 'center' ? 'items-center text-center' : '';
  const detailClass = variant === 'dark' ? 'text-white/70' : 'text-[var(--text-muted)]';

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={`w-full rounded-[22px] p-4 transition-all duration-200 ${bgClass} ${stateClass} ${cursorClass} flex flex-col gap-2 ${alignment}`}
      disabled={disabled}
    >
      <div className="flex flex-col">
        {helper && (
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]/80">
            {helper}
          </span>
        )}
        <span className="text-lg font-semibold leading-tight">
          {title}
        </span>
      </div>
      {children && <div className={`text-sm ${detailClass}`}>{children}</div>}
    </button>
  );
};
