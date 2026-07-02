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
const levelTheme: Record<ModLevel, { field: string; dot: string; heroInk: string }> = {
  NORMAL: { field: 'bg-stone-200', dot: 'bg-stone-500', heroInk: 'text-stone-600/35' },
  LIGHT: { field: 'bg-sky-200', dot: 'bg-sky-500', heroInk: 'text-sky-700/30' },
  MIDDLE: { field: 'bg-violet-200', dot: 'bg-violet-500', heroInk: 'text-violet-700/30' },
  FULL: { field: 'bg-amber-300', dot: 'bg-amber-500', heroInk: 'text-amber-700/35' },
};

/** ピルチップ（ライト面の上に置く共通スタイル） */
const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-900/15 bg-white/85 px-2.5 py-1 text-[11px] font-bold leading-none text-stone-800 shadow-sm">
    {children}
  </span>
);

export const SpecCard: React.FC<SpecCardProps> = ({
  carModel,
  profile,
  variant,
  ownerLabel = null,
  photoUrl = null,
}) => {
  const [flipped, setFlipped] = useState(false);
  const view = buildSpecCardView(profile);
  const theme = levelTheme[view.modLevel];
  const { maker, model } = splitCarModel(carModel);
  const totalModItems = view.modificationGroups.reduce((sum, group) => sum + group.items.length, 0);
  // 表面のピルは3つまで（トレカとして情報を絞る）: 改造度・タイヤ区分・出力
  const powerItem = view.specItems.find((item) => item.key === 'powerPs') ?? null;

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

  const toggleFlip = () => setFlipped((prev) => !prev);

  return (
    // トレカとして常に一定サイズ（実物トレカと同じ 63:88 比率）。情報量よりサイズの一貫性を優先する
    <div className="group mx-auto w-full max-w-[320px] [perspective:1200px]">
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'カードの表面を見る' : 'カードを裏返して改造申告を見る'}
        onClick={(e) => {
          e.stopPropagation();
          toggleFlip();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            toggleFlip();
          }
        }}
        className={`relative aspect-[63/88] w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* ══ 表面: ビジュアル ══ */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.25rem] bg-stone-50 shadow-lg ring-1 ring-stone-900/10 transition-shadow [backface-visibility:hidden] group-hover:shadow-xl">
          {/* ヒーロー（写真 or 改造度カラー地＋ゴーストタイポ） */}
          <div className={`relative h-[56%] shrink-0 overflow-hidden ${theme.field}`}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={carModel}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                {/* 斜めのスピードライン */}
                <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0,transparent_16px,rgba(255,255,255,0.45)_16px,rgba(255,255,255,0.45)_20px)]" />
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <span
                    className={`select-none break-words text-center text-4xl font-black uppercase italic leading-none tracking-tight ${theme.heroInk}`}
                  >
                    {model}
                  </span>
                </div>
              </>
            )}
            {/* 台紙への馴染ませフェード */}
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-stone-50/80 to-transparent" />
          </div>

          {/* 台紙 */}
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill>
                <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                {view.modLevelLabel}
              </Pill>
              {view.tireClassLabel && <Pill>{view.tireClassLabel}</Pill>}
              {powerItem && (
                <Pill>
                  <span className="font-mono">{powerItem.value}</span>
                  <span className="font-medium text-stone-400">{powerItem.notice}</span>
                </Pill>
              )}
            </div>

            {/* 車名（二段タイポ） */}
            <div className="mt-2.5 min-h-0">
              {maker && (
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400">
                  {maker}
                </div>
              )}
              <h3 className="line-clamp-2 break-words text-[1.65rem] font-black leading-[1.05] tracking-tight text-stone-900">
                {model}
              </h3>
              {ownerLabel && (
                <div className="mt-1 truncate text-[11px] font-medium text-stone-400">
                  オーナー: {ownerLabel}
                </div>
              )}
            </div>
            <div className="flex-1" />
          </div>

          {/* フッターストリップ */}
          <div className="flex shrink-0 items-center justify-between bg-stone-900 px-4 py-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-stone-200">
              Velocity Logger
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400">
              {totalModItems > 0 ? `改造申告 ${totalModItems}件` : 'ノーマル車両'}
              <span aria-hidden="true">⇄</span>
            </span>
          </div>
        </div>

        {/* ══ 裏面: 改造申告明細 ══ */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.25rem] bg-stone-900 text-stone-100 shadow-lg ring-1 ring-white/10 transition-shadow [backface-visibility:hidden] [transform:rotateY(180deg)] group-hover:shadow-xl">
          <div className="shrink-0 px-4 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-stone-500">
                Mod Declaration
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-200">
                <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                {view.modLevelLabel}
              </span>
            </div>
            <h4 className="mt-1 line-clamp-1 break-words text-lg font-black tracking-tight text-white">
              {model}
            </h4>
            {(view.tireClassLabel || view.specItems.length > 0) && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold text-stone-400">
                {view.tireClassLabel && <span>{view.tireClassLabel}</span>}
                {view.specItems.map((item) => (
                  <span key={item.key}>
                    <span className="font-mono text-stone-300">{item.value}</span>
                    <span className="ml-1 text-stone-500">{item.notice}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 明細（固定サイズ内でスクロール） */}
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-4 py-2 [scrollbar-width:thin]">
            {view.modificationGroups.length === 0 ? (
              <p className="pt-2 text-sm font-medium text-stone-500">
                ノーマル車両 — 改造申告はありません
              </p>
            ) : (
              <dl className="divide-y divide-white/10">
                {view.modificationGroups.map((group) => (
                  <div
                    key={group.category}
                    className="grid grid-cols-[4.5rem_1fr] gap-2.5 py-2 first:pt-1 last:pb-1"
                  >
                    <dt className="pt-0.5 text-[10px] font-bold leading-4 tracking-wide text-stone-500">
                      {group.label}
                    </dt>
                    <dd className="min-w-0 space-y-1">
                      {group.items.map((item, index) => (
                        <div
                          key={`${group.category}-${item.partName}-${index}`}
                          className="min-w-0 break-words text-[13px] font-semibold leading-4 text-stone-100"
                        >
                          {item.partName}
                          {item.maker && (
                            <span className="ml-1.5 text-[11px] font-medium text-stone-500">
                              {item.maker}
                            </span>
                          )}
                        </div>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* フッターストリップ */}
          <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-black/30 px-4 py-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-stone-500">
              Velocity Logger
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400">
              表面へ
              <span aria-hidden="true">⇄</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
