import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { getPublicShare } from '../../services/publicShareService';
import { trackEvent } from '../../lib/analytics';
import type { PublicShare } from '../../types/publicShare';
import { SpecCard } from '../vehicle/SpecCard';

const formatSessionDate = (date: Date): string =>
  date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const PublicShareFooter: React.FC = () => (
  <footer className="border-t border-slate-800/80 px-5 py-6 text-center text-xs text-slate-500">
    VELOCITY LOGGER - 走行記録とセットアップ改善を積み上げるログブック
  </footer>
);

export const PublicShareLanding: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [share, setShare] = useState<PublicShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadShare = async () => {
      if (!shareId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getPublicShare(shareId);
        if (!mounted) return;
        setShare(data);
        if (data) {
          void trackEvent('public_share_viewed', { shareId });
        }
      } catch (loadError) {
        console.error('Public share load error:', loadError);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadShare();

    return () => {
      mounted = false;
    };
  }, [shareId]);

  const trackCta = () => {
    void trackEvent('public_share_cta_clicked', { shareId });
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <LoadingOutlined className="text-blue-300" />
          公開リンクを読み込んでいます
        </div>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-slate-950 text-slate-100">
        <main className="flex flex-1 items-center justify-center px-5 py-16">
          <div className="w-full max-w-xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-300">
              VELOCITY LOGGER
            </div>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-50 sm:text-4xl">
              この共有リンクは存在しないか、削除されました
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">
              公開元のユーザーがリンクを削除したか、URLが正しくない可能性があります。
            </p>
            <Link
              to="/auth"
              onClick={trackCta}
              className="mt-8 inline-flex items-center justify-center rounded-md bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-400"
            >
              あなたの走行も記録しよう
            </Link>
          </div>
        </main>
        <PublicShareFooter />
      </div>
    );
  }

  const { summary } = share;

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-start lg:px-8 lg:py-12">
        <section className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-300">
            VELOCITY LOGGER
          </div>
          <h1 className="mt-5 break-words text-4xl font-black leading-tight text-slate-50 sm:text-5xl">
            {summary.circuit}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span>{summary.carModel}</span>
            <span>{formatSessionDate(summary.sessionDate)}</span>
            {summary.hasLoggerEvidence && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                <SafetyCertificateOutlined />
                ロガー計測
              </span>
            )}
          </div>

          <div className="mt-10 border-y border-slate-800 py-7">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              BEST LAP
            </div>
            <div className="mt-3 font-mono text-5xl font-black leading-none text-emerald-300 sm:text-7xl">
              {summary.bestLap ?? '未記録'}
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/auth"
              onClick={trackCta}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-500 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-950/40 transition hover:bg-blue-400 sm:w-auto"
            >
              あなたの走行も記録しよう
            </Link>
          </div>
        </section>

        <aside className="min-w-0">
          {summary.vehicleProfileSnapshot ? (
            <SpecCard
              carModel={summary.carModel}
              profile={summary.vehicleProfileSnapshot}
              variant="full"
              ownerLabel={null}
            />
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">
              車両スペックカードは公開されていません。
            </div>
          )}
        </aside>
      </main>
      <PublicShareFooter />
    </div>
  );
};
