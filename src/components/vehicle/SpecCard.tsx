import React, { useState } from 'react';
import { buildSpecCardView, splitCarModel } from '../../lib/specCardView';
import type { PublicVehicleProfile } from '../../lib/vehicleProfilePublic';
import type { ModLevel } from '../../lib/modLevel';

interface SpecCardProps {
  carModel: string;
  profile: PublicVehicleProfile;
  variant: 'full' | 'compact';
  ownerLabel?: string | null;
  /** 車両写真（所有者ビューのみ。共有スナップショットには含めない） */
  photoUrl?: string | null;
}

// シグネチャ: 改造度がカードの色になる（装飾ではなく情報としての色）
// NORMAL=素地グレー / LIGHT=スカイ / MIDDLE=バイオレット / FULL=ゴールド
const levelTheme: Record<ModLevel, { field: string; dot: string; chip: string }> = {
  NORMAL: {
    field: 'bg-stone-200',
    dot: 'bg-stone-500',
    chip: 'bg-stone-500/10 text-stone-700 border-stone-400/60',
  },
  LIGHT: {
    field: 'bg-sky-200',
    dot: 'bg-sky-500',
    chip: 'bg-sky-500/10 text-sky-800 border-sky-500/50',
  },
  MIDDLE: {
    field: 'bg-violet-200',
    dot: 'bg-violet-500',
    chip: 'bg-violet-500/10 text-violet-800 border-violet-500/50',
  },
  FULL: {
    field: 'bg-amber-300',
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/15 text-amber-900 border-amber-500/60',
  },
};

/** ピルチップ（ライト面の上に置く共通スタイル） */
const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-900/15 bg-white/85 px-2.5 py-1 text-[11px] font-bold leading-none text-stone-800 shadow-sm">
    {children}
  </span>
);

/** 明細の折りたたみ表示件数（超えたら8件目以降のカテゴリグループごと畳む） */
const VISIBLE_MODIFICATION_ITEM_LIMIT = 8;

export const SpecCard: React.FC<SpecCardProps> = ({
  carModel,
  profile,
  variant,
  ownerLabel = null,
  photoUrl = null,
}) => {
  const [modsExpanded, setModsExpanded] = useState(false);
  const view = buildSpecCardView(profile);
  const theme = levelTheme[view.modLevel];
  const { maker, model } = splitCarModel(carModel);

  // 合計件数が上限を超える最初のカテゴリグループで区切る（グループの途中では切らない）
  let modsCutIndex = view.modificationGroups.length;
  let visibleItemCount = 0;
  for (let i = 0; i < view.modificationGroups.length; i++) {
    const groupItemCount = view.modificationGroups[i].items.length;
    if (visibleItemCount + groupItemCount > VISIBLE_MODIFICATION_ITEM_LIMIT) {
      // 先頭グループ単独で上限超過しても明細が0件にならないよう最低1グループは表示する
      modsCutIndex = Math.max(i, 1);
      break;
    }
    visibleItemCount += groupItemCount;
  }
  const hasCollapsibleMods = modsCutIndex < view.modificationGroups.length;
  const hiddenModCount = view.modificationGroups
    .slice(modsCutIndex)
    .reduce((sum, group) => sum + group.items.length, 0);
  const visibleModGroups = modsExpanded || !hasCollapsibleMods
    ? view.modificationGroups
    : view.modificationGroups.slice(0, modsCutIndex);

  if (variant === 'compact') {
    return (
      <div className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5 dark:border-stone-700 dark:bg-stone-800/70">
        <span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
        <span className="text-[11px] font-bold leading-none text-stone-700 dark:text-stone-200">
          {view.modLevelLabel}
        </span>
        {view.tireClassLabel && (
          <span className="text-[11px] font-semibold leading-none text-stone-500 dark:text-stone-400">
            {view.tireClassLabel}
          </span>
        )}
        {view.modificationCategoryCount > 0 && (
          <span className="text-[11px] leading-none text-stone-400 dark:text-stone-500">
            {view.compactSummary}
          </span>
        )}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-stone-50 text-stone-900 shadow-lg ring-1 ring-stone-900/10 dark:ring-white/10">
      {/* ── 改造度カラーフィールド（写真＋チップ） ── */}
      <div className={`${theme.field} px-5 pt-5 pb-4`}>
        {photoUrl && (
          <div className="mb-4 overflow-hidden rounded-2xl">
            <img
              src={photoUrl}
              alt={carModel}
              loading="lazy"
              className="h-44 w-full object-cover sm:h-52"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill>
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
            {view.modLevelLabel}
          </Pill>
          {view.tireClassLabel && <Pill>{view.tireClassLabel}</Pill>}
          {view.specItems.map((item) => (
            <Pill key={item.key}>
              <span className="font-mono">{item.value}</span>
              <span className="font-medium text-stone-400">{item.notice}</span>
            </Pill>
          ))}
        </div>
      </div>

      {/* ── 車名（二段タイポ） ── */}
      <div className="px-5 pt-4">
        {maker && (
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-400">
            {maker}
          </div>
        )}
        <h3 className="break-words text-3xl font-black leading-none tracking-tight text-stone-900 sm:text-4xl">
          {model}
        </h3>
        {ownerLabel && (
          <div className="mt-1.5 text-xs font-medium text-stone-400">
            オーナー: {ownerLabel}
          </div>
        )}
      </div>

      {/* ── 改造リスト（カテゴリ×パーツの明細表） ── */}
      <div className="px-5 pb-5 pt-4">
        {view.modificationGroups.length === 0 ? (
          <p className="text-sm font-medium text-stone-400">
            ノーマル車両 — 改造申告はありません
          </p>
        ) : (
          <>
            <dl className="divide-y divide-stone-200">
              {visibleModGroups.map((group) => (
                <div key={group.category} className="grid grid-cols-[5.5rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                  <dt className="pt-0.5 text-[11px] font-bold leading-4 tracking-wide text-stone-400">
                    {group.label}
                  </dt>
                  <dd className="min-w-0 space-y-1">
                    {group.items.map((item, index) => (
                      <div key={`${group.category}-${item.partName}-${index}`} className="min-w-0 break-words text-sm font-semibold leading-5 text-stone-800">
                        {item.partName}
                        {item.maker && (
                          <span className="ml-1.5 text-xs font-medium text-stone-400">{item.maker}</span>
                        )}
                      </div>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            {hasCollapsibleMods && (
              <button
                type="button"
                onClick={() => setModsExpanded((prev) => !prev)}
                className="mt-3 text-xs font-bold text-stone-500 underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-700"
              >
                {modsExpanded ? '折りたたむ' : `他${hiddenModCount}件の申告を表示`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── フッターストリップ ── */}
      <div className="flex items-center justify-between bg-stone-900 px-5 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-stone-200">
          Velocity Logger
        </span>
        <span className="text-[11px] font-semibold text-stone-300">
          {view.modificationCategoryCount > 0 ? view.compactSummary : 'ノーマル車両'}
        </span>
      </div>
    </section>
  );
};
