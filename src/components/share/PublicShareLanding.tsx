import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { getPublicShare } from '../../services/publicShareService';
import { trackEvent } from '../../lib/analytics';
import type { PublicShare } from '../../types/publicShare';
import { SpecCard } from '../vehicle/SpecCard';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import { formatDate } from '../../i18n/formatters';
import { LocaleSelect } from '../common/LocaleSelect';

const PublicShareFooter: React.FC = () => {
  const { t } = useTranslation('share');
  return (
  <footer className="border-t border-slate-800/80 px-5 py-6 text-center text-xs text-slate-500">
    {t('footer')}
  </footer>
  );
};

export const PublicShareLanding: React.FC = () => {
  const { t } = useTranslation('share');
  const { locale } = useLocale();
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
        const data = await Promise.race([
          getPublicShare(shareId),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error('public-share-timeout')), 8000);
          }),
        ]);
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

  useEffect(() => {
    if (!share) return;
    const prev = document.title;
    document.title = t('pageTitle', { circuit: share.summary.circuit });
    return () => {
      document.title = prev;
    };
  }, [share, t]);

  const trackCta = () => {
    void trackEvent('public_share_cta_clicked', { shareId });
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <LoadingOutlined className="text-blue-300" />
          {t('loading')}
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
              {t('missingTitle')}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">
              {t('missingDescription')}
            </p>
            <Link
              to="/auth"
              onClick={trackCta}
              className="mt-8 inline-flex items-center justify-center rounded-md bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-400"
            >
              {t('cta')}
            </Link>
          </div>
        </main>
        <PublicShareFooter />
      </div>
    );
  }

  const { summary } = share;

  return (
    <div className="relative min-h-[100dvh] bg-slate-950 text-slate-100">
      <LocaleSelect className="absolute right-5 top-5 z-10 w-32" />
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-start lg:px-8 lg:py-12">
        <section className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-300">
            VELOCITY LOGGER
          </div>
          <h1 className="mt-5 break-words text-2xl font-black leading-tight text-slate-50 sm:text-3xl lg:text-4xl xl:text-5xl">
            {summary.circuit}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span>{summary.carModel}</span>
            <span>{formatDate(summary.sessionDate, locale)}</span>
            {summary.hasLoggerEvidence && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                <SafetyCertificateOutlined />
                {t('loggerEvidence')}
              </span>
            )}
          </div>

          <div className="mt-10 border-y border-slate-800 py-7">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              {t('bestLap')}
            </div>
            <div className="mt-3 font-mono text-5xl font-black leading-none text-emerald-300 sm:text-7xl">
              {summary.bestLap ?? t('noRecord')}
            </div>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-blue-400">›</span>
              {t('featureSetup')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-blue-400">›</span>
              {t('featureHistory')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-blue-400">›</span>
              {t('featureSpec')}
            </li>
          </ul>

          <div className="mt-6">
            <Link
              to="/auth"
              onClick={trackCta}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-500 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-950/40 transition hover:bg-blue-400 sm:w-auto"
            >
              {t('cta')}
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
              {t('noSpecCard')}
            </div>
          )}
        </aside>
      </main>
      <PublicShareFooter />
    </div>
  );
};
