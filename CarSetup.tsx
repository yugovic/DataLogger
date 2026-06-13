// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { AutoComplete, Input, Tabs, message } from 'antd';
import { StepNumber } from './src/components/common/StepNumber';
import { ReloadOutlined } from '@ant-design/icons';
import { useAuth } from './src/contexts/AuthContext';
import { saveSetup, getUserSetups, getSetup, updateSetup, getSetupsByCarModel } from './src/services/setupService';
import { CarSetup as CarSetupType, KnowledgeNote, LapTime, WeatherType } from './src/types/setup';
import { toNumberOrNull, toIntOrNull, calcPressureDiff } from './src/lib/units';
import { checkFirestoreConnection } from './src/utils/initFirestore';
import { BasicInfoTab } from './src/components/setup/tabs/BasicInfoTab';
import { SuspensionTab } from './src/components/setup/tabs/SuspensionTab';
import { DrivingTab } from './src/components/setup/tabs/DrivingTab';
import { LapTimeModal } from './src/components/setup/modals/LapTimeModal';
import { Header } from './src/components/common/Header';
import logger from './src/utils/logger';
interface DropdownState {
isOpen: boolean;
position: { top: number; left: number };
currentInput: string;
options: { value: string; label: string }[];
}
// datetime-local入力用: ローカル時刻で YYYY-MM-DDTHH:mm に整形（toISOStringはUTCになるため使用不可）
const toLocalDatetimeInput = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const App: React.FC = () => {
const { currentUser } = useAuth();
const { id: setupId } = useParams<{ id: string }>();
const location = useLocation();
const searchParams = new URLSearchParams(location.search);
const copyId = searchParams.get('copy');
const [isViewMode, setIsViewMode] = useState(false);
const [, setLoadingSetup] = useState(false);

// Firestore接続確認
useEffect(() => {
  if (currentUser) {
    checkFirestoreConnection(currentUser.uid).then(success => {
      if (!success) {
        logger.error('Firestore connection check failed');
      }
    });
  }
}, [currentUser]);
const [isSaving, setIsSaving] = useState(false);
const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
const [isInheriting, setIsInheriting] = useState(false);
const [settingsModal, setSettingsModal] = useState(false);
const [currentSettingView, setCurrentSettingView] = useState('account');
const [dropdownState, setDropdownState] = useState<DropdownState>({
isOpen: false,
position: { top: 0, left: 0 },
currentInput: '',
options: []
});
// 状態管理 — 全入力は空値スタート（デモ初期値禁止）
const [weatherCondition, setWeatherCondition] = useState<WeatherType | ''>('');
const [bestLap, setBestLap] = useState('');
const [totalLaps, setTotalLaps] = useState('');
const [showLapTimeModal, setShowLapTimeModal] = useState(false);
const [detailedLaps, setDetailedLaps] = useState<LapTime[]>([]);
// セッション日時: 新規は現在日時、既存データ読込時は保存済み日時を復元
const [sessionDate, setSessionDate] = useState<Date>(new Date());
// ドライバー名: state → 保存 → 読込 → 表示の一貫配線
const [driver, setDriver] = useState<string>('');
const dropdownRef = useRef<HTMLDivElement>(null);
const handleDropdownClick = (e: React.MouseEvent, inputValue: string, options: { value: string; label: string }[]) => {
e.stopPropagation();
const button = e.currentTarget as HTMLButtonElement;
const rect = button.getBoundingClientRect();
setDropdownState({
isOpen: true,
position: {
top: rect.bottom + window.scrollY,
left: rect.left + window.scrollX
},
currentInput: inputValue,
options: options
});
};
const [tirePressures, setTirePressures] = useState({
fl: { before: "", after: "", diff: "" },
fr: { before: "", after: "", diff: "" },
rl: { before: "", after: "", diff: "" },
rr: { before: "", after: "", diff: "" }
});
const calculatePressureDiff = (before: string, after: string): string => {
  const b = parseInt(before, 10);
  const a = parseInt(after, 10);
  if (isNaN(b) || isNaN(a)) return '';
  const diff = a - b;
  return diff >= 0 ? `+${diff}` : diff.toString();
};
const handleOptionSelect = (value: string) => {
const [position, timing] = dropdownState.currentInput.split('-');
setTirePressures(prev => {
const currentPos = prev[position as keyof typeof prev];
const newPos = {
...currentPos,
[timing]: value,
diff: timing === 'after'
? calculatePressureDiff(currentPos.before, value)
: calculatePressureDiff(value, currentPos.after)
};
return {
...prev,
[position]: newPos
};
});
setDropdownState(prev => ({ ...prev, isOpen: false }));
};
React.useEffect(() => {
const handleClickOutside = (event: MouseEvent) => {
if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
setDropdownState(prev => ({ ...prev, isOpen: false }));
}
};
document.addEventListener('mousedown', handleClickOutside);
return () => {
document.removeEventListener('mousedown', handleClickOutside);
};
}, []);
// 環境データ — 全て空値スタート
const [airTemp, setAirTemp] = useState('');
const [trackTemp, setTrackTemp] = useState('');
const [humidity, setHumidity] = useState('');
const [pressure, setPressure] = useState('');
const [tireBrand, setTireBrand] = useState('');
const [tireCompound, setTireCompound] = useState('');
const [distance, setDistance] = useState('');
const [fuel, setFuel] = useState('');

// サスペンション用状態 — 全て空値スタート
const [frontDamperCompression, setFrontDamperCompression] = useState<number | null>(null);
const [frontDamperRebound, setFrontDamperRebound] = useState<number | null>(null);
const [rearDamperCompression, setRearDamperCompression] = useState<number | null>(null);
const [rearDamperRebound, setRearDamperRebound] = useState<number | null>(null);
const [frontSpringRate, setFrontSpringRate] = useState('');
const [rearSpringRate, setRearSpringRate] = useState('');
const [frontRideHeight, setFrontRideHeight] = useState('');
const [rearRideHeight, setRearRideHeight] = useState('');
const [frontStabilizer, setFrontStabilizer] = useState('');
const [rearStabilizer, setRearStabilizer] = useState('');

// アライメント用状態 — 全て空値スタート
const [frontCamber, setFrontCamber] = useState('');
const [rearCamber, setRearCamber] = useState('');
const [frontToe, setFrontToe] = useState('');
const [rearToe, setRearToe] = useState('');
const [caster, setCaster] = useState('');

// ドライビング用状態
const [notes, setNotes] = useState('');
const [knowledge, setKnowledge] = useState<KnowledgeNote>({
  intention: '',
  result: '',
  learning: ''
});

// セッション情報用状態 — 空値スタート
const [circuit, setCircuit] = useState('');
const [carModel, setCarModel] = useState('');
const [sessionType, setSessionType] = useState<'practice' | 'qualifying' | 'race'>('practice');

// ダンパー設定の状態管理 — 空値スタート
const [damperSettings, setDamperSettings] = useState({
  fl: { bump: null as number | null, rebound: null as number | null },
  fr: { bump: null as number | null, rebound: null as number | null },
  rl: { bump: null as number | null, rebound: null as number | null },
  rr: { bump: null as number | null, rebound: null as number | null }
});

// 保存処理
const handleSave = async () => {
  if (!currentUser) {
    message.error('ログインが必要です');
    return;
  }

  setIsSaving(true);
  try {
    const trimmedKnowledge = {
      intention: knowledge.intention?.trim() || '',
      result: knowledge.result?.trim() || '',
      learning: knowledge.learning?.trim() || ''
    };
    const hasKnowledge = Object.values(trimmedKnowledge).some((value) => value.length > 0);
    // フォームデータを収集
    // タイヤ空気圧: diff は導出値（before/after どちらかが null なら null）
    const buildTirePressure = (tp: { before: string; after: string }) => {
      const before = toNumberOrNull(tp.before);
      const after = toNumberOrNull(tp.after);
      return { before, after, diff: calcPressureDiff(before, after) };
    };

    const setupData: Omit<CarSetupType, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser.uid,
      driver: driver.trim() || null,
      carModel: carModel,
      circuit: circuit,
      date: sessionDate,  // 保存済み日時を保持（new Date() 直書き禁止）
      sessionType: sessionType,
      weather: {
        condition: (weatherCondition as WeatherType) || null,
        airTemp: toNumberOrNull(airTemp),
        trackTemp: toNumberOrNull(trackTemp),
        humidity: toNumberOrNull(humidity),
        pressure: toNumberOrNull(pressure)
      },
      tireSettings: {
        fl: buildTirePressure(tirePressures.fl),
        fr: buildTirePressure(tirePressures.fr),
        rl: buildTirePressure(tirePressures.rl),
        rr: buildTirePressure(tirePressures.rr),
      },
      tireInfo: {
        brand: tireBrand,
        compound: tireCompound
      },
      sessionInfo: {
        distance: toNumberOrNull(distance),
        fuel: toNumberOrNull(fuel)
      },
      // ラップタイムデータを保存
      lapTimeData: {
        bestLap: bestLap || null,
        totalLaps: toIntOrNull(totalLaps),
        laps: detailedLaps || []
      },
      suspensionSettings: {
        frontDamper: {
          compression: frontDamperCompression,
          rebound: frontDamperRebound
        },
        rearDamper: {
          compression: rearDamperCompression,
          rebound: rearDamperRebound
        },
        springRate: {
          front: toNumberOrNull(frontSpringRate),
          rear: toNumberOrNull(rearSpringRate)
        },
        rideHeight: {
          front: toNumberOrNull(frontRideHeight),
          rear: toNumberOrNull(rearRideHeight)
        },
        antiRollBar: {
          front: toNumberOrNull(frontStabilizer),
          rear: toNumberOrNull(rearStabilizer)
        }
      },
      alignmentSettings: {
        camber: {
          front: toNumberOrNull(frontCamber),
          rear: toNumberOrNull(rearCamber)
        },
        toe: {
          front: toNumberOrNull(frontToe),
          rear: toNumberOrNull(rearToe)
        },
        caster: toNumberOrNull(caster)
      },
      knowledge: hasKnowledge ? trimmedKnowledge : undefined,
      notes: notes
    };

    // 新規保存か更新かを判定
    if (setupId && !isViewMode) {
      // 編集モードから保存する場合は更新
      await updateSetup(setupId, setupData);
      message.success('セットアップデータを更新しました');
      logger.log('Updated setup with ID:', setupId);
    } else {
      // 新規作成
      const newSetupId = await saveSetup(setupData);
      message.success('セットアップデータを保存しました');
      logger.log('Saved setup with ID:', newSetupId);
    }
  } catch (error: any) {
    logger.error('Save error:', error);
    const errorMessage = error?.code === 'permission-denied' 
      ? 'アクセス権限がありません。再度ログインしてください' 
      : `保存に失敗しました: ${error?.message || 'エラーが発生しました'}`;
    message.error(errorMessage);
  } finally {
    setIsSaving(false);
  }
};

// 前回のセットアップデータを読み込む処理
const handleLoadPrevious = async () => {
  if (!currentUser) {
    message.error('ログインが必要です');
    return;
  }

  setIsLoadingPrevious(true);
  try {
    // 最新1件のセットアップデータを取得
    const previousSetups = await getUserSetups(currentUser.uid, 1);
    
    if (previousSetups.length === 0) {
      message.warning('前回のセットアップデータが見つかりません');
      return;
    }

    const previousData = previousSetups[0];

    // 前回読込: セッション日時は今（新規セッションとして開始）、前回の値を引き継ぎ
    setSessionDate(new Date());

    // ドライバー名も引き継ぎ
    setDriver(previousData.driver ?? '');

    // 基本情報（null は空文字に変換）
    setWeatherCondition(previousData.weather.condition ?? '');
    setAirTemp(previousData.weather.airTemp != null ? previousData.weather.airTemp.toString() : '');
    setTrackTemp(previousData.weather.trackTemp != null ? previousData.weather.trackTemp.toString() : '');
    setHumidity(previousData.weather.humidity != null ? previousData.weather.humidity.toString() : '');
    setPressure(previousData.weather.pressure != null ? previousData.weather.pressure.toString() : '');

    // タイヤ情報
    setTireBrand(previousData.tireInfo.brand);
    setTireCompound(previousData.tireInfo.compound);
    setDistance(previousData.sessionInfo.distance != null ? previousData.sessionInfo.distance.toString() : '');
    setFuel(previousData.sessionInfo.fuel != null ? previousData.sessionInfo.fuel.toString() : '');

    // タイヤ圧設定（null は空文字に変換）
    const fmtDiff = (diff: number | null | undefined): string => {
      if (diff == null) return '';
      return diff >= 0 ? `+${diff}` : diff.toString();
    };
    setTirePressures({
      fl: {
        before: previousData.tireSettings.fl.before != null ? previousData.tireSettings.fl.before.toString() : '',
        after: previousData.tireSettings.fl.after != null ? previousData.tireSettings.fl.after.toString() : '',
        diff: fmtDiff(previousData.tireSettings.fl.diff)
      },
      fr: {
        before: previousData.tireSettings.fr.before != null ? previousData.tireSettings.fr.before.toString() : '',
        after: previousData.tireSettings.fr.after != null ? previousData.tireSettings.fr.after.toString() : '',
        diff: fmtDiff(previousData.tireSettings.fr.diff)
      },
      rl: {
        before: previousData.tireSettings.rl.before != null ? previousData.tireSettings.rl.before.toString() : '',
        after: previousData.tireSettings.rl.after != null ? previousData.tireSettings.rl.after.toString() : '',
        diff: fmtDiff(previousData.tireSettings.rl.diff)
      },
      rr: {
        before: previousData.tireSettings.rr.before != null ? previousData.tireSettings.rr.before.toString() : '',
        after: previousData.tireSettings.rr.after != null ? previousData.tireSettings.rr.after.toString() : '',
        diff: fmtDiff(previousData.tireSettings.rr.diff)
      }
    });

    // サスペンション設定（null はそのまま）
    if (previousData.suspensionSettings) {
      setFrontDamperCompression(previousData.suspensionSettings.frontDamper.compression ?? null);
      setFrontDamperRebound(previousData.suspensionSettings.frontDamper.rebound ?? null);
      setRearDamperCompression(previousData.suspensionSettings.rearDamper.compression ?? null);
      setRearDamperRebound(previousData.suspensionSettings.rearDamper.rebound ?? null);
      setFrontSpringRate(previousData.suspensionSettings.springRate.front != null ? previousData.suspensionSettings.springRate.front.toString() : '');
      setRearSpringRate(previousData.suspensionSettings.springRate.rear != null ? previousData.suspensionSettings.springRate.rear.toString() : '');
      setFrontRideHeight(previousData.suspensionSettings.rideHeight.front != null ? previousData.suspensionSettings.rideHeight.front.toString() : '');
      setRearRideHeight(previousData.suspensionSettings.rideHeight.rear != null ? previousData.suspensionSettings.rideHeight.rear.toString() : '');
      setFrontStabilizer(previousData.suspensionSettings.antiRollBar.front != null ? previousData.suspensionSettings.antiRollBar.front.toString() : '');
      setRearStabilizer(previousData.suspensionSettings.antiRollBar.rear != null ? previousData.suspensionSettings.antiRollBar.rear.toString() : '');
    }

    // アライメント設定（null は空文字に変換）
    if (previousData.alignmentSettings) {
      setFrontCamber(previousData.alignmentSettings.camber.front != null ? previousData.alignmentSettings.camber.front.toString() : '');
      setRearCamber(previousData.alignmentSettings.camber.rear != null ? previousData.alignmentSettings.camber.rear.toString() : '');
      setFrontToe(previousData.alignmentSettings.toe.front != null ? previousData.alignmentSettings.toe.front.toString() : '');
      setRearToe(previousData.alignmentSettings.toe.rear != null ? previousData.alignmentSettings.toe.rear.toString() : '');
      setCaster(previousData.alignmentSettings.caster != null ? previousData.alignmentSettings.caster.toString() : '');
    }

    // ドライビングノート
    if (previousData.notes) {
      setNotes(previousData.notes);
    }
    setKnowledge({
      intention: previousData.knowledge?.intention ?? '',
      result: previousData.knowledge?.result ?? '',
      learning: previousData.knowledge?.learning ?? ''
    });

    // セッション情報
    setCarModel(previousData.carModel);
    setCircuit(previousData.circuit);
    setSessionType(previousData.sessionType);

    // ダンパー設定（null はそのまま）
    setDamperSettings({
      fl: { bump: previousData.suspensionSettings?.frontDamper.compression ?? null, rebound: previousData.suspensionSettings?.frontDamper.rebound ?? null },
      fr: { bump: previousData.suspensionSettings?.frontDamper.compression ?? null, rebound: previousData.suspensionSettings?.frontDamper.rebound ?? null },
      rl: { bump: previousData.suspensionSettings?.rearDamper.compression ?? null, rebound: previousData.suspensionSettings?.rearDamper.rebound ?? null },
      rr: { bump: previousData.suspensionSettings?.rearDamper.compression ?? null, rebound: previousData.suspensionSettings?.rearDamper.rebound ?? null }
    });

    message.success(`前回のセットアップデータを読み込みました（${previousData.date.toLocaleDateString('ja-JP')}）`);
  } catch (error: any) {
    logger.error('Load previous data error:', error);
    const errorMessage = error?.code === 'permission-denied' 
      ? 'アクセス権限がありません。再度ログインしてください' 
      : `前回のデータ読み込みに失敗しました: ${error?.message || 'エラーが発生しました'}`;
    message.error(errorMessage);
  } finally {
    setIsLoadingPrevious(false);
  }
};

// 同一車種の最新セットアップから「セッション非依存の設定」だけを引き継ぐ。
// 引き継ぐ: タイヤ銘柄/コンパウンド・サスペンション・アライメント・ダンパー
// 引き継がない: 空気圧の実測値・天候・ラップタイム・走行距離/燃料（=セッション固有値）
const handleInheritFromPrevious = async () => {
  if (!currentUser) {
    message.error('ログインが必要です');
    return;
  }
  if (!carModel.trim()) {
    message.warning('先に車種を選択すると、その車種の前回セットアップを引き継げます');
    return;
  }

  setIsInheriting(true);
  try {
    const sameModel = await getSetupsByCarModel(currentUser.uid, carModel);
    if (sameModel.length === 0) {
      message.warning(`「${carModel}」の過去のセットアップが見つかりません`);
      return;
    }
    const src = sameModel[0]; // date desc 取得済みなので先頭が最新

    // タイヤ銘柄・コンパウンド（セッション非依存）
    setTireBrand(src.tireInfo.brand);
    setTireCompound(src.tireInfo.compound);

    // サスペンション設定（セッション非依存）
    if (src.suspensionSettings) {
      setFrontDamperCompression(src.suspensionSettings.frontDamper.compression ?? null);
      setFrontDamperRebound(src.suspensionSettings.frontDamper.rebound ?? null);
      setRearDamperCompression(src.suspensionSettings.rearDamper.compression ?? null);
      setRearDamperRebound(src.suspensionSettings.rearDamper.rebound ?? null);
      setFrontSpringRate(src.suspensionSettings.springRate.front != null ? src.suspensionSettings.springRate.front.toString() : '');
      setRearSpringRate(src.suspensionSettings.springRate.rear != null ? src.suspensionSettings.springRate.rear.toString() : '');
      setFrontRideHeight(src.suspensionSettings.rideHeight.front != null ? src.suspensionSettings.rideHeight.front.toString() : '');
      setRearRideHeight(src.suspensionSettings.rideHeight.rear != null ? src.suspensionSettings.rideHeight.rear.toString() : '');
      setFrontStabilizer(src.suspensionSettings.antiRollBar.front != null ? src.suspensionSettings.antiRollBar.front.toString() : '');
      setRearStabilizer(src.suspensionSettings.antiRollBar.rear != null ? src.suspensionSettings.antiRollBar.rear.toString() : '');
      setDamperSettings({
        fl: { bump: src.suspensionSettings.frontDamper.compression ?? null, rebound: src.suspensionSettings.frontDamper.rebound ?? null },
        fr: { bump: src.suspensionSettings.frontDamper.compression ?? null, rebound: src.suspensionSettings.frontDamper.rebound ?? null },
        rl: { bump: src.suspensionSettings.rearDamper.compression ?? null, rebound: src.suspensionSettings.rearDamper.rebound ?? null },
        rr: { bump: src.suspensionSettings.rearDamper.compression ?? null, rebound: src.suspensionSettings.rearDamper.rebound ?? null }
      });
    }

    // アライメント設定（セッション非依存）
    if (src.alignmentSettings) {
      setFrontCamber(src.alignmentSettings.camber.front != null ? src.alignmentSettings.camber.front.toString() : '');
      setRearCamber(src.alignmentSettings.camber.rear != null ? src.alignmentSettings.camber.rear.toString() : '');
      setFrontToe(src.alignmentSettings.toe.front != null ? src.alignmentSettings.toe.front.toString() : '');
      setRearToe(src.alignmentSettings.toe.rear != null ? src.alignmentSettings.toe.rear.toString() : '');
      setCaster(src.alignmentSettings.caster != null ? src.alignmentSettings.caster.toString() : '');
    }

    // ドライバー名（車両に紐づく運転者として引き継ぐ）
    if (src.driver) setDriver(src.driver);

    const srcDate = src.date instanceof Date ? src.date : new Date(src.date);
    message.success(`${srcDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}のセットアップから引き継ぎました`);
  } catch (error: unknown) {
    logger.error('Inherit setup error:', error);
    const err = error as { code?: string; message?: string } | undefined;
    const errorMessage = err?.code === 'permission-denied'
      ? 'アクセス権限がありません。再度ログインしてください'
      : `引き継ぎに失敗しました: ${err?.message || 'エラーが発生しました'}`;
    message.error(errorMessage);
  } finally {
    setIsInheriting(false);
  }
};

// URLパラメータからセットアップデータを読み込む
useEffect(() => {
  const loadSetupData = async () => {
    if (!setupId) {
      setIsViewMode(false);
      return;
    }

    setLoadingSetup(true);
    setIsViewMode(true);
    
    try {
      const setupData = await getSetup(setupId);
      if (!setupData) {
        message.error('セットアップデータが見つかりません');
        window.location.href = '/history';
        return;
      }

      // セッション日時を保存済み値から復元（Critical指摘#1）
      setSessionDate(setupData.date instanceof Date ? setupData.date : new Date(setupData.date));

      // ドライバー名を復元
      setDriver(setupData.driver ?? '');

      // 基本情報の設定（null は空文字に変換して表示）
      setWeatherCondition(setupData.weather.condition ?? '');
      setAirTemp(setupData.weather.airTemp != null ? setupData.weather.airTemp.toString() : '');
      setTrackTemp(setupData.weather.trackTemp != null ? setupData.weather.trackTemp.toString() : '');
      setHumidity(setupData.weather.humidity != null ? setupData.weather.humidity.toString() : '');
      setPressure(setupData.weather.pressure != null ? setupData.weather.pressure.toString() : '');

      // タイヤ情報
      setTireBrand(setupData.tireInfo.brand);
      setTireCompound(setupData.tireInfo.compound);
      setDistance(setupData.sessionInfo.distance != null ? setupData.sessionInfo.distance.toString() : '');
      setFuel(setupData.sessionInfo.fuel != null ? setupData.sessionInfo.fuel.toString() : '');

      // タイヤ圧設定（null は空文字に変換）
      const formatDiff = (diff: number | null | undefined): string => {
        if (diff == null) return '';
        return diff >= 0 ? `+${diff}` : diff.toString();
      };
      setTirePressures({
        fl: {
          before: setupData.tireSettings.fl.before != null ? setupData.tireSettings.fl.before.toString() : '',
          after: setupData.tireSettings.fl.after != null ? setupData.tireSettings.fl.after.toString() : '',
          diff: formatDiff(setupData.tireSettings.fl.diff)
        },
        fr: {
          before: setupData.tireSettings.fr.before != null ? setupData.tireSettings.fr.before.toString() : '',
          after: setupData.tireSettings.fr.after != null ? setupData.tireSettings.fr.after.toString() : '',
          diff: formatDiff(setupData.tireSettings.fr.diff)
        },
        rl: {
          before: setupData.tireSettings.rl.before != null ? setupData.tireSettings.rl.before.toString() : '',
          after: setupData.tireSettings.rl.after != null ? setupData.tireSettings.rl.after.toString() : '',
          diff: formatDiff(setupData.tireSettings.rl.diff)
        },
        rr: {
          before: setupData.tireSettings.rr.before != null ? setupData.tireSettings.rr.before.toString() : '',
          after: setupData.tireSettings.rr.after != null ? setupData.tireSettings.rr.after.toString() : '',
          diff: formatDiff(setupData.tireSettings.rr.diff)
        }
      });

      // サスペンション設定（null は null のまま保持）
      if (setupData.suspensionSettings) {
        setFrontDamperCompression(setupData.suspensionSettings.frontDamper.compression ?? null);
        setFrontDamperRebound(setupData.suspensionSettings.frontDamper.rebound ?? null);
        setRearDamperCompression(setupData.suspensionSettings.rearDamper.compression ?? null);
        setRearDamperRebound(setupData.suspensionSettings.rearDamper.rebound ?? null);
        setFrontSpringRate(setupData.suspensionSettings.springRate.front != null ? setupData.suspensionSettings.springRate.front.toString() : '');
        setRearSpringRate(setupData.suspensionSettings.springRate.rear != null ? setupData.suspensionSettings.springRate.rear.toString() : '');
        setFrontRideHeight(setupData.suspensionSettings.rideHeight.front != null ? setupData.suspensionSettings.rideHeight.front.toString() : '');
        setRearRideHeight(setupData.suspensionSettings.rideHeight.rear != null ? setupData.suspensionSettings.rideHeight.rear.toString() : '');
        setFrontStabilizer(setupData.suspensionSettings.antiRollBar.front != null ? setupData.suspensionSettings.antiRollBar.front.toString() : '');
        setRearStabilizer(setupData.suspensionSettings.antiRollBar.rear != null ? setupData.suspensionSettings.antiRollBar.rear.toString() : '');
      }

      // アライメント設定（null は空文字に変換）
      if (setupData.alignmentSettings) {
        setFrontCamber(setupData.alignmentSettings.camber.front != null ? setupData.alignmentSettings.camber.front.toString() : '');
        setRearCamber(setupData.alignmentSettings.camber.rear != null ? setupData.alignmentSettings.camber.rear.toString() : '');
        setFrontToe(setupData.alignmentSettings.toe.front != null ? setupData.alignmentSettings.toe.front.toString() : '');
        setRearToe(setupData.alignmentSettings.toe.rear != null ? setupData.alignmentSettings.toe.rear.toString() : '');
        setCaster(setupData.alignmentSettings.caster != null ? setupData.alignmentSettings.caster.toString() : '');
      }

      // ドライビングノート
      if (setupData.notes) {
        setNotes(setupData.notes);
      }
      setKnowledge({
        intention: setupData.knowledge?.intention ?? '',
        result: setupData.knowledge?.result ?? '',
        learning: setupData.knowledge?.learning ?? ''
      });

      // セッション情報
      setCarModel(setupData.carModel);
      setCircuit(setupData.circuit);
      setSessionType(setupData.sessionType);

      // ラップタイムデータ
      if (setupData.lapTimeData) {
        setBestLap(setupData.lapTimeData.bestLap ?? '');
        setTotalLaps(setupData.lapTimeData.totalLaps != null ? setupData.lapTimeData.totalLaps.toString() : '');
        setDetailedLaps(setupData.lapTimeData.laps || []);
      } else {
        setBestLap('');
        setTotalLaps('');
        setDetailedLaps([]);
      }

      // ダンパー設定（null はそのまま）
      setDamperSettings({
        fl: { bump: setupData.suspensionSettings?.frontDamper.compression ?? null, rebound: setupData.suspensionSettings?.frontDamper.rebound ?? null },
        fr: { bump: setupData.suspensionSettings?.frontDamper.compression ?? null, rebound: setupData.suspensionSettings?.frontDamper.rebound ?? null },
        rl: { bump: setupData.suspensionSettings?.rearDamper.compression ?? null, rebound: setupData.suspensionSettings?.rearDamper.rebound ?? null },
        rr: { bump: setupData.suspensionSettings?.rearDamper.compression ?? null, rebound: setupData.suspensionSettings?.rearDamper.rebound ?? null }
      });

    } catch (error: any) {
      logger.error('Error loading setup:', error);
      const errorMessage = error?.code === 'permission-denied' 
        ? 'アクセス権限がありません。再度ログインしてください' 
        : `セットアップデータの読み込みに失敗しました: ${error?.message || 'エラーが発生しました'}`;
      message.error(errorMessage);
    } finally {
      setLoadingSetup(false);
    }
  };

  loadSetupData();
}, [setupId]);

// URLパラメータでcopyが指定された場合の処理
useEffect(() => {
  const loadCopyData = async () => {
    if (!copyId) return;

    setLoadingSetup(true);
    
    try {
      const setupData = await getSetup(copyId);
      if (!setupData) {
        message.error('コピー元のデータが見つかりません');
        return;
      }

      // 基本情報の設定（新規作成モードなのでIDはセットしない。コピー先の日時は現在日時）
      // セッション日時は「今」（コピーは新規セッションとして記録）
      setSessionDate(new Date());

      // ドライバー名もコピー
      setDriver(setupData.driver ?? '');

      // 基本情報（null は空文字に変換）
      setWeatherCondition(setupData.weather.condition ?? '');
      setAirTemp(setupData.weather.airTemp != null ? setupData.weather.airTemp.toString() : '');
      setTrackTemp(setupData.weather.trackTemp != null ? setupData.weather.trackTemp.toString() : '');
      setHumidity(setupData.weather.humidity != null ? setupData.weather.humidity.toString() : '');
      setPressure(setupData.weather.pressure != null ? setupData.weather.pressure.toString() : '');

      // タイヤ情報
      setTireBrand(setupData.tireInfo.brand);
      setTireCompound(setupData.tireInfo.compound);
      setDistance(setupData.sessionInfo.distance != null ? setupData.sessionInfo.distance.toString() : '');
      setFuel(setupData.sessionInfo.fuel != null ? setupData.sessionInfo.fuel.toString() : '');

      // タイヤ圧設定（null は空文字に変換）
      const formatDiffCopy = (diff: number | null | undefined): string => {
        if (diff == null) return '';
        return diff >= 0 ? `+${diff}` : diff.toString();
      };
      setTirePressures({
        fl: {
          before: setupData.tireSettings.fl.before != null ? setupData.tireSettings.fl.before.toString() : '',
          after: setupData.tireSettings.fl.after != null ? setupData.tireSettings.fl.after.toString() : '',
          diff: formatDiffCopy(setupData.tireSettings.fl.diff)
        },
        fr: {
          before: setupData.tireSettings.fr.before != null ? setupData.tireSettings.fr.before.toString() : '',
          after: setupData.tireSettings.fr.after != null ? setupData.tireSettings.fr.after.toString() : '',
          diff: formatDiffCopy(setupData.tireSettings.fr.diff)
        },
        rl: {
          before: setupData.tireSettings.rl.before != null ? setupData.tireSettings.rl.before.toString() : '',
          after: setupData.tireSettings.rl.after != null ? setupData.tireSettings.rl.after.toString() : '',
          diff: formatDiffCopy(setupData.tireSettings.rl.diff)
        },
        rr: {
          before: setupData.tireSettings.rr.before != null ? setupData.tireSettings.rr.before.toString() : '',
          after: setupData.tireSettings.rr.after != null ? setupData.tireSettings.rr.after.toString() : '',
          diff: formatDiffCopy(setupData.tireSettings.rr.diff)
        }
      });

      // サスペンション設定（null はそのまま）
      if (setupData.suspensionSettings) {
        setFrontDamperCompression(setupData.suspensionSettings.frontDamper.compression ?? null);
        setFrontDamperRebound(setupData.suspensionSettings.frontDamper.rebound ?? null);
        setRearDamperCompression(setupData.suspensionSettings.rearDamper.compression ?? null);
        setRearDamperRebound(setupData.suspensionSettings.rearDamper.rebound ?? null);
        setFrontSpringRate(setupData.suspensionSettings.springRate.front != null ? setupData.suspensionSettings.springRate.front.toString() : '');
        setRearSpringRate(setupData.suspensionSettings.springRate.rear != null ? setupData.suspensionSettings.springRate.rear.toString() : '');
        setFrontRideHeight(setupData.suspensionSettings.rideHeight.front != null ? setupData.suspensionSettings.rideHeight.front.toString() : '');
        setRearRideHeight(setupData.suspensionSettings.rideHeight.rear != null ? setupData.suspensionSettings.rideHeight.rear.toString() : '');
        setFrontStabilizer(setupData.suspensionSettings.antiRollBar.front != null ? setupData.suspensionSettings.antiRollBar.front.toString() : '');
        setRearStabilizer(setupData.suspensionSettings.antiRollBar.rear != null ? setupData.suspensionSettings.antiRollBar.rear.toString() : '');
      }

      // アライメント設定（null は空文字に変換）
      if (setupData.alignmentSettings) {
        setFrontCamber(setupData.alignmentSettings.camber.front != null ? setupData.alignmentSettings.camber.front.toString() : '');
        setRearCamber(setupData.alignmentSettings.camber.rear != null ? setupData.alignmentSettings.camber.rear.toString() : '');
        setFrontToe(setupData.alignmentSettings.toe.front != null ? setupData.alignmentSettings.toe.front.toString() : '');
        setRearToe(setupData.alignmentSettings.toe.rear != null ? setupData.alignmentSettings.toe.rear.toString() : '');
        setCaster(setupData.alignmentSettings.caster != null ? setupData.alignmentSettings.caster.toString() : '');
      }

      // ドライビングノート
      if (setupData.notes) {
        setNotes(setupData.notes);
      }
      setKnowledge({
        intention: setupData.knowledge?.intention ?? '',
        result: setupData.knowledge?.result ?? '',
        learning: setupData.knowledge?.learning ?? ''
      });

      // セッション情報
      setCarModel(setupData.carModel);
      setCircuit(setupData.circuit);
      setSessionType(setupData.sessionType);

      // ラップタイムデータ
      if (setupData.lapTimeData) {
        setBestLap(setupData.lapTimeData.bestLap || '');
        setTotalLaps((setupData.lapTimeData.totalLaps || 0).toString());
        setDetailedLaps(setupData.lapTimeData.laps || []);
      } else {
        setBestLap('');
        setTotalLaps('');
        setDetailedLaps([]);
      }
      
      // ダンパー設定（null はそのまま）
      setDamperSettings({
        fl: { bump: setupData.suspensionSettings?.frontDamper.compression ?? null, rebound: setupData.suspensionSettings?.frontDamper.rebound ?? null },
        fr: { bump: setupData.suspensionSettings?.frontDamper.compression ?? null, rebound: setupData.suspensionSettings?.frontDamper.rebound ?? null },
        rl: { bump: setupData.suspensionSettings?.rearDamper.compression ?? null, rebound: setupData.suspensionSettings?.rearDamper.rebound ?? null },
        rr: { bump: setupData.suspensionSettings?.rearDamper.compression ?? null, rebound: setupData.suspensionSettings?.rearDamper.rebound ?? null }
      });

      message.success('セットアップデータをコピーしました');
    } catch (error: any) {
      logger.error('Error loading copy data:', error);
      const errorMessage = error?.code === 'permission-denied' 
        ? 'アクセス権限がありません。再度ログインしてください' 
        : `データのコピーに失敗しました: ${error?.message || 'エラーが発生しました'}`;
      message.error(errorMessage);
    } finally {
      setLoadingSetup(false);
    }
  };

  loadCopyData();
}, [copyId]);

return (
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
<Header 
  settingsModal={settingsModal}
  setSettingsModal={setSettingsModal}
  currentSettingView={currentSettingView}
  setCurrentSettingView={setCurrentSettingView}
/>
{/* メインコンテンツ */}
<main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
{/* セッション情報バー */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 sm:p-4 mb-6">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
<div className="flex flex-wrap items-center gap-2 sm:gap-4">
<div className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium">
  {isViewMode ? (
    <span>{sessionDate.toLocaleDateString('ja-JP')} {sessionDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
  ) : (
    <input
      type="datetime-local"
      value={toLocalDatetimeInput(sessionDate)}
      onChange={(e) => setSessionDate(e.target.value ? new Date(e.target.value) : new Date())}
      className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-blue-400"
    />
  )}
</div>
<div className="flex items-center">
<i className="fas fa-map-marker-alt text-gray-500 dark:text-gray-400 mr-2"></i>
<AutoComplete
  value={circuit}
  onChange={setCircuit}
  className="border-0 shadow-none"
  disabled={isViewMode}
  options={[
    { value: '鈴鹿サーキット' },
    { value: '富士スピードウェイ' },
    { value: 'ツインリンクもてぎ' },
    { value: '岡山国際サーキット' },
    { value: 'オートポリス' }
  ]}
  style={{ width: 150 }}
/>
</div>
</div>
<div className="flex flex-wrap items-center gap-2 sm:gap-4">
<AutoComplete
value={carModel}
onChange={setCarModel}
className="w-36 sm:w-40"
disabled={isViewMode}
options={[
  { value: 'Honda S2000' },
  { value: 'Honda Civic Type R' },
  { value: 'Honda NSX' },
  { value: 'Mazda RX-7' },
  { value: 'Mazda MX-5' },
  { value: 'Toyota GR86' },
  { value: 'Toyota Supra' },
  { value: 'Nissan GT-R' },
  { value: 'Nissan Fairlady Z' }
]}
variant="borderless"
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
/>
<AutoComplete
value={driver}
onChange={setDriver}
placeholder="ドライバー名"
className="w-28 sm:w-32"
disabled={isViewMode}
options={driver ? [{ value: driver }] : []}
variant="borderless"
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
/>
<AutoComplete
value={sessionType === 'practice' ? '練習走行' : sessionType === 'qualifying' ? '予選' : 'レース'}
onChange={(value) => {
  if (value === '練習走行') setSessionType('practice');
  else if (value === '予選') setSessionType('qualifying');
  else if (value === 'レース') setSessionType('race');
}}
className="w-28 sm:w-32"
disabled={isViewMode}
options={[
  { value: '練習走行' },
  { value: '予選' },
  { value: 'レース' }
]}
variant="borderless"
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
/>
</div>
{isViewMode ? (
  <div className="flex items-center gap-2">
    <button
      className="flex items-center bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm"
      onClick={() => setIsViewMode(false)}
    >
      <i className="fas fa-edit mr-1 sm:mr-2"></i>
      編集
    </button>
    <button
      className="flex items-center bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm"
      onClick={() => {
        window.location.href = '/';
      }}
    >
      <i className="fas fa-copy mr-1 sm:mr-2"></i>
      <span className="hidden sm:inline">コピーして新規作成</span>
      <span className="sm:hidden">コピー</span>
    </button>
  </div>
) : (
  <button
    onClick={handleInheritFromPrevious}
    disabled={isInheriting}
    title="同一車種の前回セットアップから、タイヤ銘柄・サスペンション・アライメントを引き継ぎます（空気圧の実測値・天候・ラップタイムは引き継ぎません）"
    className={`flex items-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm self-start sm:self-auto ${isInheriting ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {isInheriting ? (
      <i className="fas fa-spinner fa-spin mr-2"></i>
    ) : (
      <i className="fas fa-bolt mr-2"></i>
    )}
    <span className="hidden sm:inline">前回のセットアップから引き継ぐ</span>
    <span className="sm:hidden">引き継ぐ</span>
  </button>
)}
</div>
{!isViewMode && (
  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
    「前回のセットアップから引き継ぐ」では、タイヤ銘柄・サスペンション・アライメントを引き継ぎます（空気圧の実測値・天候・ラップタイムは引き継ぎません）
  </div>
)}
</div>
{/* データ表示セクション */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
{/* 環境データ */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
<div className="flex flex-wrap items-center gap-2 mb-4">
<i className="fas fa-temperature-high text-blue-500 dark:text-blue-400 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">環境データ</h3>
<div className="ml-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">
気温: {airTemp !== '' ? `${airTemp}°C` : '—'} &nbsp; 路温: {trackTemp !== '' ? `${trackTemp}°C` : '—'}
</div>
</div>
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">天候</label>
<AutoComplete
value={weatherCondition}
onChange={setWeatherCondition}
className="w-full"
disabled={isViewMode}
options={[
{ value: '晴れ' },
{ value: '曇り' },
{ value: 'ウェット' },
{ value: 'フルウェット' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
onOpenChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector(`.ant-select-item[title="${weatherCondition}"]`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">気温 (°C)</label>
<Input
value={airTemp}
onChange={(e) => setAirTemp(e.target.value)}
className="w-full"
disabled={isViewMode}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">路面温度 (°C)</label>
<Input
value={trackTemp}
onChange={(e) => setTrackTemp(e.target.value)}
className="w-full"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">湿度 (%)</label>
<Input
value={humidity}
onChange={(e) => setHumidity(e.target.value)}
className="w-full"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">気圧 (hPa)</label>
<Input
value={pressure}
onChange={(e) => setPressure(e.target.value)}
className="w-full"
/>
</div>
</div>
</div>
{/* タイヤ情報 */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
<div className="flex items-center mb-4">
<i className="fas fa-tire text-blue-500 dark:text-blue-400 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">タイヤ情報</h3>
</div>
<div className="grid grid-cols-2 gap-4 mb-4">
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ブランド</label>
<AutoComplete
value={tireBrand}
onChange={setTireBrand}
className="w-full"
options={[
{ value: 'ADVAN' },
{ value: 'BRIDGESTONE' },
{ value: 'MICHELIN' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
onOpenChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector(`.ant-select-item[title="${tireBrand}"]`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">コンパウンド</label>
<AutoComplete
value={tireCompound}
onChange={setTireCompound}
className="w-full"
options={[
{ value: 'A050' },
{ value: 'RE71R' },
{ value: 'PS4S' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
onOpenChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector(`.ant-select-item[title="${tireCompound}"]`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
</div>
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">走行距離 (km)</label>
{/* クリックで増減できる数値入力 */}
<div className="w-full">
  <StepNumber
    value={parseFloat(distance) || 0}
    onChange={(n) => setDistance(n === 0 && distance === '' ? '' : String(n))}
    min={0}
    max={10000}
    step={1}
    unit="km"
    size="middle"
  />
  </div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">燃料量 (L)</label>
<div className="w-full">
  <StepNumber
    value={parseFloat(fuel) || 0}
    onChange={(n) => setFuel(n === 0 && fuel === '' ? '' : String(n))}
    min={0}
    max={200}
    step={1}
    unit="L"
    size="middle"
  />
  </div>
</div>
</div>
{/* ラップタイム */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
<div className="flex items-center justify-between mb-4">
<div className="flex items-center">
<i className="fas fa-stopwatch text-blue-500 dark:text-blue-400 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">ラップタイム</h3>
</div>
<button 
  onClick={() => setShowLapTimeModal(true)}
  className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm cursor-pointer whitespace-nowrap !rounded-button"
>
  詳細入力
</button>
</div>
<div className="mb-4">
<div className="space-y-3">
<div>
<label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">ベストラップ</label>
<Input
  value={bestLap}
  onChange={(e) => setBestLap(e.target.value)}
  placeholder="例: 1:58.423"
  className="w-full"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">総周回数</label>
<Input
  value={totalLaps}
  onChange={(e) => setTotalLaps(e.target.value)}
  placeholder="例: 12"
  className="w-full"
  type="number"
/>
</div>
</div>
</div>
</div>
</div>
{/* 設定タブセクション */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
{(() => {
  const tabItems = [
    {
      key: '1',
      label: '基本設定',
      children: (
        <BasicInfoTab
          tirePressures={tirePressures}
          setTirePressures={setTirePressures}
          damperSettings={damperSettings}
          setDamperSettings={setDamperSettings}
          handleDropdownClick={handleDropdownClick}
        />
      ),
    },
    {
      key: '2',
      label: 'サスペンション',
      children: <SuspensionTab />,
    },
    {
      key: '3',
      label: 'エンジン・空力',
      children: (
        <div className="p-4 sm:p-6">
          <div className="space-y-6 sm:space-y-8">
            {/* エンジン設定 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center mb-4 sm:mb-6">
                <i className="fas fa-engine text-blue-500 mr-2"></i>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">エンジン設定</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">点火時期 (°BTDC)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">燃料噴射時期 (ms)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ブースト圧 (kPa)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">スロットル開度マップ</label>
                  <AutoComplete
                    className="w-full"
                    options={[
                      { value: 'track' },
                      { value: 'sport' },
                      { value: 'eco' }
                    ]}
                  />
                </div>
              </div>
            </div>
            {/* 空力設定 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center mb-4 sm:mb-6">
                <i className="fas fa-wind text-blue-500 mr-2"></i>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">空力設定</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">フロントスプリッター (mm)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">リアウイング角度 (°)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">アンダーパネル設定</label>
                  <AutoComplete
                    className="w-full"
                    options={[
                      { value: 'full' },
                      { value: 'partial' },
                      { value: 'none' }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">サイドスカート高さ (mm)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* 冷却系設定 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center mb-4 sm:mb-6">
                <i className="fas fa-temperature-low text-blue-500 mr-2"></i>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">冷却系設定</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ラジエター開度 (%)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">オイルクーラー開度 (%)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">インタークーラースプレー</label>
                  <AutoComplete
                    className="w-full"
                    options={[
                      { value: 'auto' },
                      { value: 'manual' },
                      { value: 'off' }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ブレーキダクト開度 (%)</label>
                  <div className="relative">
                    <Input className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: '4',
      label: 'ドライバーフィードバック',
      children: (
        <DrivingTab
          notes={notes}
          setNotes={setNotes}
          knowledge={knowledge}
          setKnowledge={setKnowledge}
        />
      ),
    },
    {
      key: '5',
      label: 'セッション後記録',
      children: (
        <div className="h-96 flex items-center justify-center text-gray-500">
          セッション後記録コンテンツ
        </div>
      ),
    },
    {
      key: '6',
      label: (
        <div className="flex items-center">
          <i className="fas fa-robot text-blue-500 mr-2"></i>
          <span>AI アドバイス</span>
        </div>
      ),
      children: (
        <div className="p-6 space-y-8">
          {/* セットアップ提案 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <i className="fas fa-sliders-h text-blue-500 mr-2"></i>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">セットアップ提案</h3>
            </div>
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  フロント：空気圧を-3kPa調整することで、高速コーナーでのアンダーステア傾向を軽減できる可能性があります。
                  リア：現状の空気圧を維持し、温度管理に注力することを推奨します。
                </p>
              </div>
            </div>
          </div>
          {/* ドライビングアドバイス */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <i className="fas fa-car text-blue-500 mr-2"></i>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">ドライビングアドバイス</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li>• タイヤ温度の推移を注視し、最適な温度帯でのアタックを心がけてください</li>
                  <li>• 提案したセットアップ変更後の車両挙動の変化を確認してください</li>
                  <li>• 特に高速コーナーでのステアリング操作に注目し、アンダーステアの改善を確認してください</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];
  return <Tabs defaultActiveKey="1" className="px-6 pt-4" items={tabItems} />;
})()}
</div>
{/* 保存ボタンと前回データ読み込みボタン */}
{!isViewMode && (
  <div className="fixed bottom-8 right-8 z-50 flex items-center space-x-4">
    <button 
      onClick={handleLoadPrevious}
      disabled={isLoadingPrevious}
      className={`bg-blue-500 text-white p-4 rounded-full hover:bg-blue-600 cursor-pointer shadow-lg transition-all duration-200 hover:shadow-xl !rounded-button whitespace-nowrap flex items-center justify-center ${isLoadingPrevious ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="前回の値を読み込む"
    >
      {isLoadingPrevious ? (
        <i className="fas fa-spinner fa-spin text-xl"></i>
      ) : (
        <ReloadOutlined style={{ fontSize: '20px' }} />
      )}
    </button>
    <button 
      onClick={handleSave}
      disabled={isSaving}
      className={`bg-gray-800 text-white p-4 rounded-full hover:bg-gray-700 cursor-pointer shadow-lg transition-all duration-200 hover:shadow-xl !rounded-button whitespace-nowrap flex items-center justify-center ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="保存"
    >
      {isSaving ? (
        <i className="fas fa-spinner fa-spin text-xl"></i>
      ) : (
        <i className="fas fa-save text-xl"></i>
      )}
    </button>
  </div>
)}

{/* ラップタイムモーダル */}
<LapTimeModal
  visible={showLapTimeModal}
  onClose={() => setShowLapTimeModal(false)}
  onSave={(laps, bestLapTime, totalLapsCount) => {
    setDetailedLaps(laps);
    setBestLap(bestLapTime);
    setTotalLaps(totalLapsCount.toString());
    message.success('ラップタイムが保存されました');
  }}
  initialLaps={detailedLaps}
/>
</main>
{/* フッター */}
{dropdownState.isOpen && (
<div
ref={dropdownRef}
className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden z-50"
style={{
top: `${dropdownState.position.top}px`,
left: `${dropdownState.position.left}px`,
maxHeight: '200px',
overflowY: 'auto',
minWidth: '100px'
}}
>
{dropdownState.options.map((option) => (
<div
key={option.value}
className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm dark:text-gray-300"
onClick={() => handleOptionSelect(option.value)}
>
{option.label}
</div>
))}
</div>
)}
<footer className="bg-white dark:bg-gray-800 py-6 border-t border-gray-200 dark:border-gray-700">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="text-center text-sm text-gray-500">
© 2025 VELOCITY LOGGER. All rights reserved.
</div>
</div>
</footer>
</div>
);
}
export default App
