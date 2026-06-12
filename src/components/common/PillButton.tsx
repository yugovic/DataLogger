import React from 'react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shape?: 'pill' | 'circle';
  variant?: 'filled' | 'ghost';
  icon?: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({
  label,
  shape = 'pill',
  variant = 'filled',
  icon,
  className = '',
  ...props
}) => {
  const baseClass = 'transition-all duration-200 font-semibold tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-sunset)] disabled:opacity-40 disabled:cursor-not-allowed';
  const shapeClass =
    shape === 'circle'
      ? 'w-20 h-20 rounded-full flex items-center justify-center text-lg shadow-[0_15px_25px_rgba(244,88,27,0.35)]'
      : 'px-6 py-3 rounded-full text-base shadow-[0_14px_24px_rgba(0,0,0,0.1)]';
  const variantClass =
    variant === 'filled'
      ? 'bg-[var(--accent-sunset)] text-white'
      : 'bg-transparent border border-black/10 text-[var(--text-charcoal)]';

  return (
    <button {...props} className={`${baseClass} ${shapeClass} ${variantClass} ${className}`}>
      <span className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        {label}
      </span>
    </button>
  );
};
