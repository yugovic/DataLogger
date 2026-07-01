import React from 'react';
import { buildSpecCardView } from '../../lib/specCardView';
import type { PublicVehicleProfile } from '../../lib/vehicleProfilePublic';
import type { ModLevel } from '../../lib/modLevel';

interface SpecCardProps {
  carModel: string;
  profile: PublicVehicleProfile;
  variant: 'full' | 'compact';
  ownerLabel?: string | null;
}

const badgeClass: Record<ModLevel, string> = {
  NORMAL: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
  LIGHT: 'bg-blue-500/20 text-blue-100 border-blue-300/50',
  MIDDLE: 'bg-violet-500/20 text-violet-100 border-violet-300/50',
  FULL: 'bg-amber-400/20 text-amber-100 border-amber-300/60',
};

export const SpecCard: React.FC<SpecCardProps> = ({
  carModel,
  profile,
  variant,
  ownerLabel = null,
}) => {
  const view = buildSpecCardView(profile);

  if (variant === 'compact') {
    return (
      <div className="rounded-md border border-blue-300/25 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-3 py-2 text-slate-100 shadow-sm dark:border-blue-300/25">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-5">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${badgeClass[view.modLevel]}`}>
            {view.modLevelLabel}
          </span>
          {view.tireClassLabel && (
            <span className="inline-flex items-center rounded-full bg-blue-400/15 px-2 py-0.5 text-blue-100">
              {view.tireClassLabel}
            </span>
          )}
          {view.modificationCategoryCount > 0 && (
            <span className="text-slate-300">{view.compactSummary}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-blue-300/25 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100 shadow-lg dark:border-blue-300/25">
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-400 to-slate-900" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-300">
              MACHINE SPEC CARD
            </div>
            <h3 className="mt-1 break-words text-xl font-bold leading-tight text-slate-50 sm:text-2xl">
              {carModel}
            </h3>
            {ownerLabel && (
              <div className="mt-1 text-xs text-slate-400">
                オーナー: {ownerLabel}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass[view.modLevel]}`}>
              {view.modLevelLabel}
            </span>
            {view.tireClassLabel && (
              <span className="inline-flex items-center rounded-full bg-blue-400/15 px-3 py-1 text-xs font-semibold text-blue-100">
                {view.tireClassLabel}
              </span>
            )}
          </div>
        </div>

        {view.specItems.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {view.specItems.map((item) => (
              <div key={item.key} className="rounded-md border border-slate-700/80 bg-slate-950/40 px-3 py-2">
                <div className="text-[11px] text-slate-400">{item.label}</div>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-lg font-bold text-slate-50">{item.value}</span>
                  <span className="rounded bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                    {item.notice}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            MODIFICATIONS
          </div>
          {view.modificationGroups.length === 0 ? (
            <div className="rounded-md border border-slate-700/80 bg-slate-950/40 px-3 py-3 text-sm text-slate-300">
              ノーマル車両
            </div>
          ) : (
            <div className="space-y-3">
              {view.modificationGroups.map((group) => (
                <div key={group.category} className="rounded-md border border-slate-700/80 bg-slate-950/35 px-3 py-3">
                  <div className="mb-2 text-xs font-semibold text-blue-200">{group.label}</div>
                  <ul className="space-y-1.5">
                    {group.items.map((item, index) => (
                      <li key={`${group.category}-${item.partName}-${index}`} className="text-sm text-slate-100">
                        {item.partName}
                        {item.maker && <span className="ml-2 text-xs text-slate-400">{item.maker}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
