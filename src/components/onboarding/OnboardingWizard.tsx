import React, { useState, useEffect } from 'react';
import { Input, Select, message } from 'antd';
import {
  CarOutlined,
  EnvironmentOutlined,
  AimOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { addVehicle } from '../../services/vehicleService';
import { ensureUserProfile } from '../../services/profileService';
import { TRACKS } from '../../lib/tracks';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getUserSetups } from '../../services/setupService';
import { getUserVehicles } from '../../services/vehicleService';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../lib/analytics';

type Step = 0 | 1 | 2 | 3;

export const OnboardingWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Vehicle
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<string>('');
  const [drivetrain, setDrivetrain] = useState('');

  // Step 2: Circuit
  const [homeCircuit, setHomeCircuit] = useState<string | undefined>(undefined);

  // Step 3: Goal
  const [goalType, setGoalType] = useState<'laptime' | 'consistency' | 'record'>('record');
  const [targetLapTime, setTargetLapTime] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    ensureUserProfile(currentUser.uid, currentUser.displayName);
  }, [currentUser]);

  const handleSaveVehicle = async (): Promise<boolean> => {
    if (!currentUser) return false;
    if (!make || !model) {
      message.warning(t('onboarding.errors.makeModelRequired'));
      return false;
    }
    try {
      setLoading(true);
      await addVehicle({
        userId: currentUser.uid,
        make,
        model,
        year: year ? parseInt(year, 10) : new Date().getFullYear(),
        drivetrain: drivetrain || undefined,
        isActive: true,
      });
      return true;
    } catch (_e) {
      message.error(t('onboarding.errors.vehicleSave'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!currentUser) return;

    // Save vehicle if step 1 was filled
    if (make && model) {
      const ok = await handleSaveVehicle();
      if (!ok) return;
    }

    // Save onboarding data to user profile
    try {
      setLoading(true);
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          onboardingCompleted: true,
          onboardingData: {
            homeCircuit: homeCircuit ?? null,
            goalType,
            targetLapTime: targetLapTime || null,
            completedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      message.success(t('onboarding.completed'));
      void trackEvent('onboarding_completed', { skipped: false });
      onComplete();
    } catch (_e) {
      message.error(t('onboarding.errors.save'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentUser) return;
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        { onboardingCompleted: true, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (_e) {
      // silent
    }
    void trackEvent('onboarding_completed', { skipped: true });
    onComplete();
  };

  const next = () => setStep((s) => Math.min(s + 1, 3) as Step);
  const prev = () => setStep((s) => Math.max(s - 1, 0) as Step);

  const cardClass = 'bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm';
  const headingClass = 'text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className={`w-full max-w-2xl ${cardClass} overflow-hidden`}>
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <span className="text-sm font-black">VL</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">VELOCITY LOGGER</h2>
              <div className="text-[10px] font-bold tracking-[0.24em] text-blue-600 dark:text-blue-400">{t('onboarding.welcome')}</div>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
            {t('onboarding.intro')}
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step > i
                    ? 'bg-emerald-500'
                    : step === i
                      ? 'bg-blue-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
            <span className={step >= 0 ? 'text-blue-600 dark:text-blue-400' : ''}>{t('onboarding.progress.vehicle')}</span>
            <span className={step >= 1 ? 'text-blue-600 dark:text-blue-400' : ''}>{t('onboarding.progress.circuit')}</span>
            <span className={step >= 2 ? 'text-blue-600 dark:text-blue-400' : ''}>{t('onboarding.progress.goal')}</span>
          </div>
        </div>

        {/* Step content */}
        <div className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CarOutlined className="text-blue-500" />
                <span className={headingClass}>{t('onboarding.vehicle.title')}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('onboarding.vehicle.description')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('onboarding.vehicle.make')}</label>
                  <Input
                    placeholder="Honda, Toyota..."
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    size="large"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('onboarding.vehicle.model')}</label>
                  <Input
                    placeholder="S2000, GR86..."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    size="large"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('onboarding.vehicle.year')}</label>
                  <Input
                    placeholder="2005"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    size="large"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('onboarding.vehicle.drivetrain')}</label>
                  <Select
                    placeholder="FR, FF, AWD..."
                    value={drivetrain || undefined}
                    onChange={setDrivetrain}
                    size="large"
                    className="w-full"
                    options={[
                      { value: 'FR', label: 'FR' },
                      { value: 'FF', label: 'FF' },
                      { value: 'AWD', label: 'AWD' },
                      { value: 'MR', label: 'MR' },
                      { value: 'RR', label: 'RR' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <EnvironmentOutlined className="text-blue-500" />
                <span className={headingClass}>{t('onboarding.circuit.title')}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('onboarding.circuit.description')}
              </p>
              <Select
                placeholder={t('onboarding.circuit.placeholder')}
                value={homeCircuit}
                onChange={setHomeCircuit}
                size="large"
                className="w-full"
                options={TRACKS.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.region})`,
                }))}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <AimOutlined className="text-blue-500" />
                <span className={headingClass}>{t('onboarding.goal.title')}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('onboarding.goal.description')}
              </p>
              <div className="space-y-2">
                {[
                  { value: 'record', label: t('onboarding.goal.options.record.label'), desc: t('onboarding.goal.options.record.description') },
                  { value: 'laptime', label: t('onboarding.goal.options.laptime.label'), desc: t('onboarding.goal.options.laptime.description') },
                  { value: 'consistency', label: t('onboarding.goal.options.consistency.label'), desc: t('onboarding.goal.options.consistency.description') },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGoalType(opt.value as typeof goalType)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      goalType === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{opt.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                      </div>
                      {goalType === opt.value && (
                        <CheckCircleOutlined className="text-blue-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {goalType === 'laptime' && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('onboarding.goal.targetLapTime')}</label>
                  <Input
                    placeholder="1:23.456"
                    value={targetLapTime}
                    onChange={(e) => setTargetLapTime(e.target.value)}
                    size="large"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <CheckCircleOutlined className="text-5xl text-emerald-500" />
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('onboarding.ready.title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                {t('onboarding.ready.description')}
              </p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {t('onboarding.actions.skip')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && step < 3 && (
              <button
                onClick={prev}
                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('onboarding.actions.back')}
              </button>
            )}
            {step < 2 && (
              <button
                onClick={next}
                className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 inline-flex items-center gap-1"
              >
                {t('onboarding.actions.next')} <RightOutlined style={{ fontSize: 11 }} />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => { setStep(3); }}
                className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 inline-flex items-center gap-1"
              >
                {t('onboarding.actions.review')} <RightOutlined style={{ fontSize: 11 }} />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {loading ? t('common.saving') : t('onboarding.actions.start')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** ユーザーがオンボーディング未完了かどうかを判定する。
 * 既存ユーザー（セットアップ or 車両を既に持っている）には表示しない。 */
export async function checkOnboardingNeeded(uid: string): Promise<boolean> {
  try {
    // 1. プロフィールの onboardingCompleted フラグをチェック
    const snap = await getDoc(doc(db, 'users', uid));
    const data = snap.exists() ? snap.data() : null;
    if (data?.onboardingCompleted === true) return false;

    // 2. 既存データがある場合はオンボーディング不要とみなす（既存ユーザー保護）
    const [setups, vehicles] = await Promise.all([
      getUserSetups(uid, 1),
      getUserVehicles(uid),
    ]);
    if (setups.length > 0 || vehicles.length > 0) return false;

    return true;
  } catch {
    return false;
  }
}
