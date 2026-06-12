// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { AutoComplete, Input, Tabs, message } from 'antd';
import { StepNumber } from './src/components/common/StepNumber';
import { ReloadOutlined } from '@ant-design/icons';
import { useAuth } from './src/contexts/AuthContext';
import { saveSetup, getUserSetups, getSetup, updateSetup } from './src/services/setupService';
import { CarSetup as CarSetupType, KnowledgeNote, LapTime } from './src/types/setup';
import { checkFirestoreConnection } from './src/utils/initFirestore';
import { BasicInfoTab } from './src/components/setup/tabs/BasicInfoTab';
import { SuspensionTab } from './src/components/setup/tabs/SuspensionTab';
import { DrivingTab } from './src/components/setup/tabs/DrivingTab';
<<<<<<< HEAD
import { LapTimeModal } from './src/components/setup/modals/LapTimeModal';
import { Header } from './src/components/common/Header';
=======
import { MobileCardLayout } from './src/components/setup/layouts/MobileCardLayout';
import { TirePressureCard } from './src/components/setup/cards/TirePressureCard';
import { DamperCard } from './src/components/setup/cards/DamperCard';
const { TabPane } = Tabs;
>>>>>>> b6f3fee5dade52ad5f6e9c5389521239df45bc60
interface DropdownState {
isOpen: boolean;
position: { top: number; left: number };
currentInput: string;
options: { value: string; label: string }[];
}
const App: React.FC = () => {
const { currentUser } = useAuth();
const { id: setupId } = useParams<{ id: string }>();
const location = useLocation();
const searchParams = new URLSearchParams(location.search);
const copyId = searchParams.get('copy');
const [isViewMode, setIsViewMode] = useState(false);
const [loadingSetup, setLoadingSetup] = useState(false);

// Firestore接続確認
useEffect(() => {
  if (currentUser) {
    checkFirestoreConnection(currentUser.uid).then(success => {
      if (!success) {
        console.error('Firestore connection check failed');
      }
    });
  }
}, [currentUser]);
const [isSaving, setIsSaving] = useState(false);
const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
const [settingsModal, setSettingsModal] = useState(false);
const [currentSettingView, setCurrentSettingView] = useState('account');
const [isMobileView, setIsMobileView] = useState(false);
const [activeCardTab, setActiveCardTab] = useState('basic');
const [dropdownState, setDropdownState] = useState<DropdownState>({
isOpen: false,
position: { top: 0, left: 0 },
currentInput: '',
options: []
});
// 状态管理
const [weatherCondition, setWeatherCondition] = useState('晴れ');
const [bestLap, setBestLap] = useState('');
const [totalLaps, setTotalLaps] = useState('');
const [showLapTimeModal, setShowLapTimeModal] = useState(false);
const [detailedLaps, setDetailedLaps] = useState<LapTime[]>([]);
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
fl: { before: "190", after: "215", diff: "+25" },
fr: { before: "190", after: "218", diff: "+28" },
rl: { before: "185", after: "210", diff: "+25" },
rr: { before: "185", after: "213", diff: "+28" }
});
const calculatePressureDiff = (before: string, after: string) => {
const diff = parseInt(after) - parseInt(before);
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
const [airTemp, setAirTemp] = useState('24');
const [trackTemp, setTrackTemp] = useState('33');
const [humidity, setHumidity] = useState('75');
const [pressure, setPressure] = useState('1008');
const [tireBrand, setTireBrand] = useState('ADVAN');
const [tireCompound, setTireCompound] = useState('A050');
const [distance, setDistance] = useState('120');
const [fuel, setFuel] = useState('30');

// サスペンション用状態
const [frontDamperCompression, setFrontDamperCompression] = useState(10);
const [frontDamperRebound, setFrontDamperRebound] = useState(10);
const [rearDamperCompression, setRearDamperCompression] = useState(10);
const [rearDamperRebound, setRearDamperRebound] = useState(10);
const [frontSpringRate, setFrontSpringRate] = useState('8.0');
const [rearSpringRate, setRearSpringRate] = useState('6.0');
const [frontRideHeight, setFrontRideHeight] = useState('120');
const [rearRideHeight, setRearRideHeight] = useState('125');
const [frontStabilizer, setFrontStabilizer] = useState('22');
const [rearStabilizer, setRearStabilizer] = useState('20');

// アライメント用状態
const [frontCamber, setFrontCamber] = useState('-2.5');
const [rearCamber, setRearCamber] = useState('-1.5');
const [frontToe, setFrontToe] = useState('0');
const [rearToe, setRearToe] = useState('2');
const [caster, setCaster] = useState('5.5');

// ドライビング用状態
const [notes, setNotes] = useState('');
const [knowledge, setKnowledge] = useState<KnowledgeNote>({
  intention: '',
  result: '',
  learning: ''
});

// セッション情報用状態
const [circuit, setCircuit] = useState('鈴鹿サーキット');
const [carModel, setCarModel] = useState('Honda S2000');
const [sessionType, setSessionType] = useState<'practice' | 'qualifying' | 'race'>('practice');

// ダンパー設定の状態管理
const [damperSettings, setDamperSettings] = useState({
  fl: { bump: 8, rebound: 10 },
  fr: { bump: 8, rebound: 10 },
  rl: { bump: 7, rebound: 9 },
  rr: { bump: 7, rebound: 9 }
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
    const setupData: Omit<CarSetupType, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser.uid,
      carModel: carModel,
      circuit: circuit,
      date: new Date(),
      sessionType: sessionType,
      weather: {
        condition: weatherCondition,
        airTemp: parseFloat(airTemp) || 0,
        trackTemp: parseFloat(trackTemp) || 0,
        humidity: parseFloat(humidity) || 0,
        pressure: parseFloat(pressure) || 0
      },
      tireSettings: {
        fl: {
          before: parseFloat(tirePressures.fl.before) || 0,
          after: parseFloat(tirePressures.fl.after) || 0,
          diff: parseFloat(tirePressures.fl.diff) || 0
        },
        fr: {
          before: parseFloat(tirePressures.fr.before) || 0,
          after: parseFloat(tirePressures.fr.after) || 0,
          diff: parseFloat(tirePressures.fr.diff) || 0
        },
        rl: {
          before: parseFloat(tirePressures.rl.before) || 0,
          after: parseFloat(tirePressures.rl.after) || 0,
          diff: parseFloat(tirePressures.rl.diff) || 0
        },
        rr: {
          before: parseFloat(tirePressures.rr.before) || 0,
          after: parseFloat(tirePressures.rr.after) || 0,
          diff: parseFloat(tirePressures.rr.diff) || 0
        }
      },
      tireInfo: {
        brand: tireBrand,
        compound: tireCompound
      },
      sessionInfo: {
        distance: parseFloat(distance) || 0,
        fuel: parseFloat(fuel) || 0
      },
      // ラップタイムデータを保存
      lapTimeData: {
        bestLap: bestLap || undefined,
        totalLaps: parseInt(totalLaps || '0') || 0,
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
          front: parseFloat(frontSpringRate) || 0,
          rear: parseFloat(rearSpringRate) || 0
        },
        rideHeight: {
          front: parseFloat(frontRideHeight) || 0,
          rear: parseFloat(rearRideHeight) || 0
        },
        antiRollBar: {
          front: parseFloat(frontStabilizer) || 0,
          rear: parseFloat(rearStabilizer) || 0
        }
      },
      alignmentSettings: {
        camber: {
          front: parseFloat(frontCamber) || 0,
          rear: parseFloat(rearCamber) || 0
        },
        toe: {
          front: parseFloat(frontToe) || 0,
          rear: parseFloat(rearToe) || 0
        },
        caster: parseFloat(caster) || 0
      },
      knowledge: hasKnowledge ? trimmedKnowledge : undefined,
      notes: notes
    };

    // 新規保存か更新かを判定
    if (setupId && !isViewMode) {
      // 編集モードから保存する場合は更新
      await updateSetup(setupId, setupData);
      message.success('セットアップデータを更新しました');
      console.log('Updated setup with ID:', setupId);
    } else {
      // 新規作成
      const newSetupId = await saveSetup(setupData);
      message.success('セットアップデータを保存しました');
      console.log('Saved setup with ID:', newSetupId);
    }
  } catch (error: any) {
    console.error('Save error:', error);
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
    
    // 基本情報
    setWeatherCondition(previousData.weather.condition);
    setAirTemp(previousData.weather.airTemp.toString());
    setTrackTemp(previousData.weather.trackTemp.toString());
    setHumidity(previousData.weather.humidity.toString());
    setPressure(previousData.weather.pressure.toString());
    
    // タイヤ情報
    setTireBrand(previousData.tireInfo.brand);
    setTireCompound(previousData.tireInfo.compound);
    setDistance(previousData.sessionInfo.distance.toString());
    setFuel(previousData.sessionInfo.fuel.toString());
    
    // タイヤ圧設定
    setTirePressures({
      fl: { 
        before: previousData.tireSettings.fl.before.toString(), 
        after: previousData.tireSettings.fl.after.toString(), 
        diff: (previousData.tireSettings.fl.diff || 0) >= 0 ? `+${previousData.tireSettings.fl.diff || 0}` : (previousData.tireSettings.fl.diff || 0).toString()
      },
      fr: { 
        before: previousData.tireSettings.fr.before.toString(), 
        after: previousData.tireSettings.fr.after.toString(), 
        diff: (previousData.tireSettings.fr.diff || 0) >= 0 ? `+${previousData.tireSettings.fr.diff || 0}` : (previousData.tireSettings.fr.diff || 0).toString()
      },
      rl: { 
        before: previousData.tireSettings.rl.before.toString(), 
        after: previousData.tireSettings.rl.after.toString(), 
        diff: (previousData.tireSettings.rl.diff || 0) >= 0 ? `+${previousData.tireSettings.rl.diff || 0}` : (previousData.tireSettings.rl.diff || 0).toString()
      },
      rr: { 
        before: previousData.tireSettings.rr.before.toString(), 
        after: previousData.tireSettings.rr.after.toString(), 
        diff: (previousData.tireSettings.rr.diff || 0) >= 0 ? `+${previousData.tireSettings.rr.diff || 0}` : (previousData.tireSettings.rr.diff || 0).toString()
      }
    });
    
    // サスペンション設定
    if (previousData.suspensionSettings) {
      setFrontDamperCompression(previousData.suspensionSettings.frontDamper.compression);
      setFrontDamperRebound(previousData.suspensionSettings.frontDamper.rebound);
      setRearDamperCompression(previousData.suspensionSettings.rearDamper.compression);
      setRearDamperRebound(previousData.suspensionSettings.rearDamper.rebound);
      setFrontSpringRate(previousData.suspensionSettings.springRate.front.toString());
      setRearSpringRate(previousData.suspensionSettings.springRate.rear.toString());
      setFrontRideHeight(previousData.suspensionSettings.rideHeight.front.toString());
      setRearRideHeight(previousData.suspensionSettings.rideHeight.rear.toString());
      setFrontStabilizer(previousData.suspensionSettings.antiRollBar.front.toString());
      setRearStabilizer(previousData.suspensionSettings.antiRollBar.rear.toString());
    }
    
    // アライメント設定
    if (previousData.alignmentSettings) {
      setFrontCamber(previousData.alignmentSettings.camber.front.toString());
      setRearCamber(previousData.alignmentSettings.camber.rear.toString());
      setFrontToe(previousData.alignmentSettings.toe.front.toString());
      setRearToe(previousData.alignmentSettings.toe.rear.toString());
      setCaster(previousData.alignmentSettings.caster.toString());
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
    
    // ダンパー設定
    setDamperSettings({
      fl: { bump: previousData.suspensionSettings?.frontDamper.compression || 8, rebound: previousData.suspensionSettings?.frontDamper.rebound || 10 },
      fr: { bump: previousData.suspensionSettings?.frontDamper.compression || 8, rebound: previousData.suspensionSettings?.frontDamper.rebound || 10 },
      rl: { bump: previousData.suspensionSettings?.rearDamper.compression || 7, rebound: previousData.suspensionSettings?.rearDamper.rebound || 9 },
      rr: { bump: previousData.suspensionSettings?.rearDamper.compression || 7, rebound: previousData.suspensionSettings?.rearDamper.rebound || 9 }
    });
    
    message.success(`前回のセットアップデータを読み込みました（${previousData.date.toLocaleDateString('ja-JP')}）`);
  } catch (error: any) {
    console.error('Load previous data error:', error);
    const errorMessage = error?.code === 'permission-denied' 
      ? 'アクセス権限がありません。再度ログインしてください' 
      : `前回のデータ読み込みに失敗しました: ${error?.message || 'エラーが発生しました'}`;
    message.error(errorMessage);
  } finally {
    setIsLoadingPrevious(false);
  }
};

<<<<<<< HEAD
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

      // 基本情報の設定
      setWeatherCondition(setupData.weather.condition);
      setAirTemp(setupData.weather.airTemp.toString());
      setTrackTemp(setupData.weather.trackTemp.toString());
      setHumidity(setupData.weather.humidity.toString());
      setPressure(setupData.weather.pressure.toString());
      
      // タイヤ情報
      setTireBrand(setupData.tireInfo.brand);
      setTireCompound(setupData.tireInfo.compound);
      setDistance(setupData.sessionInfo.distance.toString());
      setFuel(setupData.sessionInfo.fuel.toString());
      
      // タイヤ圧設定
      setTirePressures({
        fl: { 
          before: setupData.tireSettings.fl.before.toString(), 
          after: setupData.tireSettings.fl.after.toString(), 
          diff: (setupData.tireSettings.fl.diff || 0) >= 0 ? `+${setupData.tireSettings.fl.diff || 0}` : (setupData.tireSettings.fl.diff || 0).toString()
        },
        fr: { 
          before: setupData.tireSettings.fr.before.toString(), 
          after: setupData.tireSettings.fr.after.toString(), 
          diff: (setupData.tireSettings.fr.diff || 0) >= 0 ? `+${setupData.tireSettings.fr.diff || 0}` : (setupData.tireSettings.fr.diff || 0).toString()
        },
        rl: { 
          before: setupData.tireSettings.rl.before.toString(), 
          after: setupData.tireSettings.rl.after.toString(), 
          diff: (setupData.tireSettings.rl.diff || 0) >= 0 ? `+${setupData.tireSettings.rl.diff || 0}` : (setupData.tireSettings.rl.diff || 0).toString()
        },
        rr: { 
          before: setupData.tireSettings.rr.before.toString(), 
          after: setupData.tireSettings.rr.after.toString(), 
          diff: (setupData.tireSettings.rr.diff || 0) >= 0 ? `+${setupData.tireSettings.rr.diff || 0}` : (setupData.tireSettings.rr.diff || 0).toString()
        }
      });
      
      // サスペンション設定
      if (setupData.suspensionSettings) {
        setFrontDamperCompression(setupData.suspensionSettings.frontDamper.compression);
        setFrontDamperRebound(setupData.suspensionSettings.frontDamper.rebound);
        setRearDamperCompression(setupData.suspensionSettings.rearDamper.compression);
        setRearDamperRebound(setupData.suspensionSettings.rearDamper.rebound);
        setFrontSpringRate(setupData.suspensionSettings.springRate.front.toString());
        setRearSpringRate(setupData.suspensionSettings.springRate.rear.toString());
        setFrontRideHeight(setupData.suspensionSettings.rideHeight.front.toString());
        setRearRideHeight(setupData.suspensionSettings.rideHeight.rear.toString());
        setFrontStabilizer(setupData.suspensionSettings.antiRollBar.front.toString());
        setRearStabilizer(setupData.suspensionSettings.antiRollBar.rear.toString());
      }
      
      // アライメント設定
      if (setupData.alignmentSettings) {
        setFrontCamber(setupData.alignmentSettings.camber.front.toString());
        setRearCamber(setupData.alignmentSettings.camber.rear.toString());
        setFrontToe(setupData.alignmentSettings.toe.front.toString());
        setRearToe(setupData.alignmentSettings.toe.rear.toString());
        setCaster(setupData.alignmentSettings.caster.toString());
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
      
      // ダンパー設定
      setDamperSettings({
        fl: { bump: setupData.suspensionSettings?.frontDamper.compression || 8, rebound: setupData.suspensionSettings?.frontDamper.rebound || 10 },
        fr: { bump: setupData.suspensionSettings?.frontDamper.compression || 8, rebound: setupData.suspensionSettings?.frontDamper.rebound || 10 },
        rl: { bump: setupData.suspensionSettings?.rearDamper.compression || 7, rebound: setupData.suspensionSettings?.rearDamper.rebound || 9 },
        rr: { bump: setupData.suspensionSettings?.rearDamper.compression || 7, rebound: setupData.suspensionSettings?.rearDamper.rebound || 9 }
      });
      
    } catch (error: any) {
      console.error('Error loading setup:', error);
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

      // 基本情報の設定（新規作成モードなのでIDはセットしない）
      setWeatherCondition(setupData.weather.condition);
      setAirTemp(setupData.weather.airTemp.toString());
      setTrackTemp(setupData.weather.trackTemp.toString());
      setHumidity(setupData.weather.humidity.toString());
      setPressure(setupData.weather.pressure.toString());
      
      // タイヤ情報
      setTireBrand(setupData.tireInfo.brand);
      setTireCompound(setupData.tireInfo.compound);
      setDistance(setupData.sessionInfo.distance.toString());
      setFuel(setupData.sessionInfo.fuel.toString());
      
      // タイヤ圧設定
      setTirePressures({
        fl: { 
          before: setupData.tireSettings.fl.before.toString(), 
          after: setupData.tireSettings.fl.after.toString(), 
          diff: (setupData.tireSettings.fl.diff || 0) >= 0 ? `+${setupData.tireSettings.fl.diff || 0}` : (setupData.tireSettings.fl.diff || 0).toString()
        },
        fr: { 
          before: setupData.tireSettings.fr.before.toString(), 
          after: setupData.tireSettings.fr.after.toString(), 
          diff: (setupData.tireSettings.fr.diff || 0) >= 0 ? `+${setupData.tireSettings.fr.diff || 0}` : (setupData.tireSettings.fr.diff || 0).toString()
        },
        rl: { 
          before: setupData.tireSettings.rl.before.toString(), 
          after: setupData.tireSettings.rl.after.toString(), 
          diff: (setupData.tireSettings.rl.diff || 0) >= 0 ? `+${setupData.tireSettings.rl.diff || 0}` : (setupData.tireSettings.rl.diff || 0).toString()
        },
        rr: { 
          before: setupData.tireSettings.rr.before.toString(), 
          after: setupData.tireSettings.rr.after.toString(), 
          diff: (setupData.tireSettings.rr.diff || 0) >= 0 ? `+${setupData.tireSettings.rr.diff || 0}` : (setupData.tireSettings.rr.diff || 0).toString()
        }
      });
      
      // サスペンション設定
      if (setupData.suspensionSettings) {
        setFrontDamperCompression(setupData.suspensionSettings.frontDamper.compression);
        setFrontDamperRebound(setupData.suspensionSettings.frontDamper.rebound);
        setRearDamperCompression(setupData.suspensionSettings.rearDamper.compression);
        setRearDamperRebound(setupData.suspensionSettings.rearDamper.rebound);
        setFrontSpringRate(setupData.suspensionSettings.springRate.front.toString());
        setRearSpringRate(setupData.suspensionSettings.springRate.rear.toString());
        setFrontRideHeight(setupData.suspensionSettings.rideHeight.front.toString());
        setRearRideHeight(setupData.suspensionSettings.rideHeight.rear.toString());
        setFrontStabilizer(setupData.suspensionSettings.antiRollBar.front.toString());
        setRearStabilizer(setupData.suspensionSettings.antiRollBar.rear.toString());
      }
      
      // アライメント設定
      if (setupData.alignmentSettings) {
        setFrontCamber(setupData.alignmentSettings.camber.front.toString());
        setRearCamber(setupData.alignmentSettings.camber.rear.toString());
        setFrontToe(setupData.alignmentSettings.toe.front.toString());
        setRearToe(setupData.alignmentSettings.toe.rear.toString());
        setCaster(setupData.alignmentSettings.caster.toString());
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
      
      // ダンパー設定
      setDamperSettings({
        fl: { bump: setupData.suspensionSettings?.frontDamper.compression || 8, rebound: setupData.suspensionSettings?.frontDamper.rebound || 10 },
        fr: { bump: setupData.suspensionSettings?.frontDamper.compression || 8, rebound: setupData.suspensionSettings?.frontDamper.rebound || 10 },
        rl: { bump: setupData.suspensionSettings?.rearDamper.compression || 7, rebound: setupData.suspensionSettings?.rearDamper.rebound || 9 },
        rr: { bump: setupData.suspensionSettings?.rearDamper.compression || 7, rebound: setupData.suspensionSettings?.rearDamper.rebound || 9 }
      });
      
      message.success('セットアップデータをコピーしました');
    } catch (error: any) {
      console.error('Error loading copy data:', error);
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
=======
// レスポンシブ対応
React.useEffect(() => {
  const checkScreenSize = () => {
    setIsMobileView(window.innerWidth < 768);
  };

  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);

  return () => window.removeEventListener('resize', checkScreenSize);
}, []);

// モバイル用カードデータ
const mobileCards = [
  {
    id: 'basic',
    title: '基本設定',
    icon: 'fas fa-tachometer-alt',
    color: 'from-blue-500 to-blue-600',
    content: (
      <div className="space-y-4">
        <TirePressureCard 
          tirePressures={tirePressures}
          setTirePressures={setTirePressures}
        />
        <DamperCard
          damperSettings={damperSettings}
          setDamperSettings={setDamperSettings}
        />
      </div>
    )
  },
  {
    id: 'suspension',
    title: 'サスペンション',
    icon: 'fas fa-car',
    color: 'from-purple-500 to-purple-600',
    content: <SuspensionTab />
  },
  {
    id: 'driving',
    title: 'ドライビング',
    icon: 'fas fa-route',
    color: 'from-green-500 to-green-600',
    content: <DrivingTab notes={notes} setNotes={setNotes} />
  }
];

// モバイルビューの場合
if (isMobileView) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* モバイルヘッダー */}
      <header className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="text-blue-500">VELOCITY</span> <span className="text-gray-800">LOGGER</span>
          </h1>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleLoadPrevious}
              disabled={isLoadingPrevious}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <ReloadOutlined style={{ fontSize: '18px' }} />
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <i className="fas fa-save text-lg"></i>
            </button>
            <button
              onClick={() => setSettingsModal(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <SettingOutlined style={{ fontSize: '18px' }} />
            </button>
          </div>
        </div>
        
        {/* セッション情報バー（モバイル用） */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">{circuit}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{carModel}</span>
          </div>
          <div className="text-gray-500">
            {new Date().toLocaleDateString('ja-JP')}
          </div>
        </div>
      </header>
      
      {/* モバイルカードレイアウト */}
      <MobileCardLayout 
        cards={mobileCards}
        activeTab={activeCardTab}
        onTabChange={setActiveCardTab}
      />
      
      {/* 設定モーダル（共通） */}
      <Modal
        title="設定"
        open={settingsModal}
        onCancel={() => setSettingsModal(false)}
        footer={null}
        width={400}
      >
        {/* 設定内容 */}
      </Modal>
    </div>
  );
}
>>>>>>> b6f3fee5dade52ad5f6e9c5389521239df45bc60

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
<div className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium">{new Date().toLocaleDateString('ja-JP')} {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
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
defaultValue="鈴木健太"
className="w-28 sm:w-32"
disabled={isViewMode}
options={[{ value: '鈴木健太' }]}
variant="borderless"
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
onOpenChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector('.ant-select-item[title="鈴木健太"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
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
  <button className="flex items-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm self-start sm:self-auto">
    <i className="fas fa-bolt mr-2"></i>
    クイック入力
  </button>
)}
</div>
</div>
{/* データ表示セクション */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
{/* 環境データ */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
<div className="flex flex-wrap items-center gap-2 mb-4">
<i className="fas fa-temperature-high text-blue-500 dark:text-blue-400 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">環境データ</h3>
<div className="ml-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">
平均気温: 24°C &nbsp; 平均路温: 33°C
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
    onChange={(n) => setDistance(String(n))}
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
    onChange={(n) => setFuel(String(n))}
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
                    <Input defaultValue="12" className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">燃料噴射時期 (ms)</label>
                  <div className="relative">
                    <Input defaultValue="2.8" className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ブースト圧 (kPa)</label>
                  <div className="relative">
                    <Input defaultValue="120" className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">スロットル開度マップ</label>
                  <AutoComplete
                    defaultValue="track"
                    className="w-full"
                    options={[
                      { value: 'track' },
                      { value: 'sport' },
                      { value: 'eco' }
                    ]}
                    onOpenChange={(open) => {
                      if (open) {
                        setTimeout(() => {
                          const selectedItem = document.querySelector('.ant-select-item[title="track"]');
                          if (selectedItem) {
                            selectedItem.scrollIntoView({ block: 'center' });
                          }
                        }, 10);
                      }
                    }}
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
                    <Input defaultValue="50" className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">リアウイング角度 (°)</label>
                  <div className="relative">
                    <Input defaultValue="12" className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">アンダーパネル設定</label>
                  <AutoComplete
                    defaultValue="full"
                    className="w-full"
                    options={[
                      { value: 'full' },
                      { value: 'partial' },
                      { value: 'none' }
                    ]}
                    onOpenChange={(open) => {
                      if (open) {
                        setTimeout(() => {
                          const selectedItem = document.querySelector('.ant-select-item[title="full"]');
                          if (selectedItem) {
                            selectedItem.scrollIntoView({ block: 'center' });
                          }
                        }, 10);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">サイドスカート高さ (mm)</label>
                  <div className="relative">
                    <Input defaultValue="35" className="text-center pr-8 h-8 text-sm" />
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
                    <Input defaultValue="80" className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">オイルクーラー開度 (%)</label>
                  <div className="relative">
                    <Input defaultValue="75" className="text-center pr-8 h-8 text-sm" />
                    <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">インタークーラースプレー</label>
                  <AutoComplete
                    defaultValue="auto"
                    className="w-full"
                    options={[
                      { value: 'auto' },
                      { value: 'manual' },
                      { value: 'off' }
                    ]}
                    onOpenChange={(open) => {
                      if (open) {
                        setTimeout(() => {
                          const selectedItem = document.querySelector('.ant-select-item[title="auto"]');
                          if (selectedItem) {
                            selectedItem.scrollIntoView({ block: 'center' });
                          }
                        }, 10);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ブレーキダクト開度 (%)</label>
                  <div className="relative">
                    <Input defaultValue="90" className="text-center pr-8 h-8 text-sm" />
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
