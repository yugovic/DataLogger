import React from 'react';

interface MobileShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  fullHeight?: boolean;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  title,
  subtitle,
  children,
  onBack,
  rightSlot,
  fullHeight = true
}) => {
  const containerClass = fullHeight ? 'min-h-screen' : '';
  return (
    <div className={`${containerClass} bg-[var(--bg-cream)] flex justify-center py-6 px-2`}>
      <div className="relative w-full max-w-md bg-[var(--bg-shell-light)] rounded-[40px] shadow-[0_45px_65px_rgba(0,0,0,0.15)] overflow-hidden border border-black/5">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-8 bg-black/80 rounded-full" aria-hidden="true"></div>
        <div className="pt-14 pb-6 px-6">
          <div className="flex items-center justify-between mb-6 text-[var(--text-charcoal)]">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-lg"
              aria-label="戻る"
            >
              <span>&lsaquo;</span>
            </button>
            <div className="text-center flex-1">
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Car setup</p>
              <h1 className="text-2xl font-semibold tracking-tight leading-tight">{title}</h1>
              {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
            </div>
            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-lg">
              {rightSlot ?? <span>&bull;</span>}
            </div>
          </div>
          <div className="cream-panel p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
