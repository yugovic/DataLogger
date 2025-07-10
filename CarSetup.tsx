// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useRef } from 'react';
import { AutoComplete, Input, Tabs, Modal, Switch, Checkbox, message } from 'antd';
import { SettingOutlined, PlusOutlined, BellOutlined, UserOutlined, NotificationOutlined, DatabaseOutlined, ExportOutlined, QuestionCircleOutlined, LogoutOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from './src/contexts/AuthContext';
import { logout } from './src/services/authService';
import { saveSetup, getUserSetups } from './src/services/setupService';
import { CarSetup as CarSetupType } from './src/types/setup';
import { BasicInfoTab } from './src/components/setup/tabs/BasicInfoTab';
import { SuspensionTab } from './src/components/setup/tabs/SuspensionTab';
import { DrivingTab } from './src/components/setup/tabs/DrivingTab';
import { MobileCardLayout } from './src/components/setup/layouts/MobileCardLayout';
import { TirePressureCard } from './src/components/setup/cards/TirePressureCard';
import { DamperCard } from './src/components/setup/cards/DamperCard';
const { TabPane } = Tabs;
interface DropdownState {
isOpen: boolean;
position: { top: number; left: number };
currentInput: string;
options: { value: string; label: string }[];
}
const App: React.FC = () => {
const { currentUser } = useAuth();
// 将来的にユーザー情報を表示に使用
console.log('Current user:', currentUser?.email);
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
      notes: notes
    };

    // Firestoreに保存
    const setupId = await saveSetup(setupData);
    message.success('セットアップデータを保存しました');
    console.log('Saved setup with ID:', setupId);
  } catch (error) {
    console.error('Save error:', error);
    message.error('保存に失敗しました');
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
  } catch (error) {
    console.error('Load previous data error:', error);
    message.error('前回のデータ読み込みに失敗しました');
  } finally {
    setIsLoadingPrevious(false);
  }
};

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

return (
<div className="min-h-screen bg-gray-50">
{/* ヘッダー */}
<header className="bg-white shadow-sm py-3 px-6 flex items-center justify-between">
<div className="flex items-center">
<h1 className="text-2xl font-bold">
<span className="text-blue-500">VELOCITY</span> <span className="text-gray-800">LOGGER</span>
</h1>
</div>
<div className="flex items-center space-x-4">
<button className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer whitespace-nowrap">
<i className="fas fa-tachometer-alt mr-2"></i>
ダッシュボード
</button>
<button className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md cursor-pointer whitespace-nowrap">
<i className="fas fa-cog mr-2"></i>
セットアップ記録
</button>
<button className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer whitespace-nowrap">
<i className="fas fa-history mr-2"></i>
履歴一覧
</button>
</div>
<div className="flex items-center space-x-4">
<button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer">
<PlusOutlined style={{ fontSize: '20px' }} />
</button>
<button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer">
<BellOutlined style={{ fontSize: '20px' }} />
</button>
<button
className="p-2 text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer"
onClick={() => setSettingsModal(true)}
>
<SettingOutlined style={{ fontSize: '20px' }} />
</button>
<button
className="p-2 text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer"
onClick={async () => {
  try {
    await logout();
    message.success('ログアウトしました');
    window.location.href = '/auth';
  } catch (error) {
    message.error('ログアウトに失敗しました');
  }
}}
title="ログアウト"
>
<LogoutOutlined style={{ fontSize: '20px' }} />
</button>
<Modal
title="設定"
open={settingsModal}
onCancel={() => setSettingsModal(false)}
width={600}
footer={null}
className="settings-modal"
>
<div className="flex h-[600px] overflow-hidden">
<div className="w-48 border-r border-gray-200 pt-4 overflow-y-auto">
<div className="flex flex-col space-y-1">
<button
className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'account' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
onClick={() => setCurrentSettingView('account')}
>
<UserOutlined className="mr-3" />
アカウント設定
</button>
<button
className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'vehicle' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
onClick={() => setCurrentSettingView('vehicle')}
>
<i className="fas fa-car mr-3"></i>
車両設定
</button>
<button
className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'notification' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
onClick={() => setCurrentSettingView('notification')}
>
<NotificationOutlined className="mr-3" />
通知設定
</button>
<button
className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'default' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
onClick={() => setCurrentSettingView('default')}
>
<DatabaseOutlined className="mr-3" />
デフォルト値設定
</button>
<button
className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'export' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
onClick={() => setCurrentSettingView('export')}
>
<ExportOutlined className="mr-3" />
データエクスポート
</button>
<button
className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'help' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
onClick={() => setCurrentSettingView('help')}
>
<QuestionCircleOutlined className="mr-3" />
ヘルプ＆サポート
</button>
</div>
</div>
<div className="flex-1 p-6 overflow-y-auto">
{currentSettingView === 'account' && (
<div className="text-gray-600">アカウント設定の内容がここに表示されます</div>
)}
{currentSettingView === 'vehicle' && (
<div className="p-4">
<h3 className="text-lg font-medium mb-6">車両設定</h3>
<div className="space-y-6">
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">メーカー</label>
<AutoComplete
defaultValue="honda"
className="w-full"
options={[
{ value: 'honda' },
{ value: 'toyota' },
{ value: 'nissan' },
{ value: 'mazda' }
]}
onDropdownVisibleChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector('.ant-select-item[title="honda"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">モデル</label>
<AutoComplete
defaultValue="s2000"
className="w-full"
options={[
{ value: 's2000' },
{ value: 'civic_type_r' },
{ value: 'nsx' }
]}
onDropdownVisibleChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector('.ant-select-item[title="s2000"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">年式</label>
<AutoComplete
defaultValue="2005"
className="w-full"
options={Array.from({ length: 30 }, (_, i) => {
const year = 2025 - i;
return { value: year.toString() };
})}
onDropdownVisibleChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector('.ant-select-item[title="2005"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">エンジン型式</label>
<AutoComplete
defaultValue="f20c"
className="w-full"
options={[
{ value: 'f20c' },
{ value: 'f22c' }
]}
onDropdownVisibleChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector('.ant-select-item[title="f20c"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">駆動方式</label>
<AutoComplete
defaultValue="fr"
className="w-full"
options={[
{ value: 'fr' },
{ value: 'ff' },
{ value: 'awd' },
{ value: 'mr' }
]}
onDropdownVisibleChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector('.ant-select-item[title="fr"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">トランスミッション</label>
<AutoComplete
defaultValue="6mt"
className="w-full"
options={[
{ value: '6mt' },
{ value: '5mt' },
{ value: 'at' },
{ value: 'dct' }
]}
onDropdownVisibleChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector('.ant-select-item[title="6mt"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
<Input.TextArea
rows={4}
placeholder="車両に関する特記事項があれば入力してください"
className="w-full"
/>
</div>
<div className="flex justify-end">
<button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors !rounded-button whitespace-nowrap">
保存
</button>
</div>
</div>
</div>
)}
{currentSettingView === 'notification' && (
<div className="space-y-8">
<h3 className="text-lg font-medium mb-6">通知設定</h3>
{/* 通知チャンネル設定 */}
<div className="space-y-6">
<div className="flex items-center justify-between py-3 border-b">
<div className="flex items-center space-x-3">
<i className="fas fa-bell text-blue-500"></i>
<div>
<div className="font-medium">アプリ内通知</div>
<div className="text-sm text-gray-500">アプリ使用中のポップアップ通知</div>
</div>
</div>
<Switch defaultChecked />
</div>
<div className="flex items-center justify-between py-3 border-b">
<div className="flex items-center space-x-3">
<i className="fas fa-envelope text-blue-500"></i>
<div>
<div className="font-medium">メール通知</div>
<div className="text-sm text-gray-500">登録メールアドレスへの通知</div>
</div>
</div>
<Switch defaultChecked />
</div>
<div className="flex items-center justify-between py-3 border-b">
<div className="flex items-center space-x-3">
<i className="fas fa-mobile-alt text-blue-500"></i>
<div>
<div className="font-medium">プッシュ通知</div>
<div className="text-sm text-gray-500">モバイルデバイスへのプッシュ通知</div>
</div>
</div>
<Switch />
</div>
</div>
{/* 通知イベント設定 */}
<div className="mt-8">
<h4 className="text-base font-medium mb-4">通知を受け取るイベント</h4>
<div className="space-y-4">
<div className="flex items-center space-x-3">
<Checkbox defaultChecked>
<span className="ml-2">ラップタイム更新</span>
</Checkbox>
</div>
<div className="flex items-center space-x-3">
<Checkbox defaultChecked>
<span className="ml-2">セッション開始・終了</span>
</Checkbox>
</div>
<div className="flex items-center space-x-3">
<Checkbox defaultChecked>
<span className="ml-2">メンテナンススケジュール</span>
</Checkbox>
</div>
<div className="flex items-center space-x-3">
<Checkbox>
<span className="ml-2">システムアップデート</span>
</Checkbox>
</div>
<div className="flex items-center space-x-3">
<Checkbox>
<span className="ml-2">他のドライバーのアクティビティ</span>
</Checkbox>
</div>
</div>
</div>
{/* 保存ボタン */}
<div className="flex justify-end mt-8">
<button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors !rounded-button whitespace-nowrap">
設定を保存
</button>
</div>
</div>
)}
{currentSettingView === 'default' && (
<div className="text-gray-600">デフォルト値設定の内容がここに表示されます</div>
)}
{currentSettingView === 'export' && (
<div className="text-gray-600">データエクスポートの内容がここに表示されます</div>
)}
{currentSettingView === 'help' && (
<div className="text-gray-600">ヘルプ＆サポートの内容がここに表示されます</div>
)}
</div>
</div>
</Modal>
</div>
</header>
{/* メインコンテンツ */}
<main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
{/* セッション情報バー */}
<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
<div className="flex items-center justify-between">
<div className="flex items-center space-x-4">
<div className="text-gray-800 font-medium">{new Date().toLocaleDateString('ja-JP')} {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
<div className="flex items-center">
<i className="fas fa-map-marker-alt text-gray-500 mr-2"></i>
<AutoComplete
  value={circuit}
  onChange={setCircuit}
  className="border-0 shadow-none"
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
<div className="flex items-center space-x-4">
<AutoComplete
value={carModel}
onChange={setCarModel}
className="w-40"
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
bordered={false}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
/>
<AutoComplete
defaultValue="鈴木健太"
className="w-32"
options={[{ value: '鈴木健太' }]}
bordered={false}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
onDropdownVisibleChange={(open) => {
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
className="w-32"
options={[
  { value: '練習走行' },
  { value: '予選' },
  { value: 'レース' }
]}
bordered={false}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
/>
</div>
<button className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap">
<i className="fas fa-bolt mr-2"></i>
クイック入力
</button>
</div>
</div>
{/* データ表示セクション */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
{/* 環境データ */}
<div className="bg-white rounded-lg shadow-sm p-6">
<div className="flex items-center mb-4">
<i className="fas fa-temperature-high text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">環境データ</h3>
<div className="ml-auto text-sm text-gray-500">
平均気温: 24°C &nbsp; 平均路温: 33°C
</div>
</div>
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 mb-1">天候</label>
<AutoComplete
defaultValue={weatherCondition}
onChange={setWeatherCondition}
className="w-full"
options={[
{ value: '晴れ' },
{ value: '曇り' },
{ value: '雨' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
onDropdownVisibleChange={(open) => {
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
<label className="block text-sm font-medium text-gray-700 mb-1">気温 (°C)</label>
<Input
value={airTemp}
onChange={(e) => setAirTemp(e.target.value)}
className="w-full"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">路面温度 (°C)</label>
<Input
value={trackTemp}
onChange={(e) => setTrackTemp(e.target.value)}
className="w-full"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">湿度 (%)</label>
<Input
value={humidity}
onChange={(e) => setHumidity(e.target.value)}
className="w-full"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">気圧 (hPa)</label>
<Input
value={pressure}
onChange={(e) => setPressure(e.target.value)}
className="w-full"
/>
</div>
</div>
</div>
{/* タイヤ情報 */}
<div className="bg-white rounded-lg shadow-sm p-6">
<div className="flex items-center mb-4">
<i className="fas fa-tire text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">タイヤ情報</h3>
</div>
<div className="grid grid-cols-2 gap-4 mb-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ブランド</label>
<AutoComplete
value={tireBrand}
onChange={setTireBrand}
className="w-full"
options={[
{ value: 'ADVAN' },
{ value: 'BRIDGESTONE' },
{ value: 'MICHELIN' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
onDropdownVisibleChange={(open) => {
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
<label className="block text-sm font-medium text-gray-700 mb-1">コンパウンド</label>
<AutoComplete
value={tireCompound}
onChange={setTireCompound}
className="w-full"
options={[
{ value: 'A050' },
{ value: 'RE71R' },
{ value: 'PS4S' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
onDropdownVisibleChange={(open) => {
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
<label className="block text-sm font-medium text-gray-700 mb-1">走行距離 (km)</label>
<Input
value={distance}
onChange={(e) => setDistance(e.target.value)}
className="w-full"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">燃料量 (L)</label>
<Input
value={fuel}
onChange={(e) => setFuel(e.target.value)}
className="w-full"
/>
</div>
</div>
{/* ラップタイム */}
<div className="bg-white rounded-lg shadow-sm p-6">
<div className="flex items-center justify-between mb-4">
<div className="flex items-center">
<i className="fas fa-stopwatch text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">ラップタイム</h3>
</div>
<button className="text-blue-500 hover:text-blue-700 text-sm cursor-pointer whitespace-nowrap !rounded-button">詳細を表示</button>
</div>
<div className="mb-4">
<div className="flex justify-between items-center mb-2">
<span className="text-sm text-gray-600">ベストラップ</span>
<span className="text-xl font-bold text-gray-800">1:58.423</span>
</div>
<div className="flex justify-between items-center mb-2">
<span className="text-sm text-gray-600">平均ラップ</span>
<span className="text-lg text-gray-800">2:01.856</span>
</div>
<div className="flex justify-between items-center mb-2">
<span className="text-sm text-gray-600">総周回数</span>
<span className="text-lg text-gray-800">12</span>
</div>
<div className="flex justify-between items-center">
<span className="text-sm text-gray-600">前回比</span>
<span className="text-lg text-green-500">-0.621</span>
</div>
</div>
</div>
</div>
{/* 設定タブセクション */}
<div className="bg-white rounded-lg shadow-sm mb-6">
<Tabs defaultActiveKey="1" className="px-6 pt-4">
<TabPane tab="基本設定" key="1">
<BasicInfoTab
  tirePressures={tirePressures}
  setTirePressures={setTirePressures}
  damperSettings={damperSettings}
  setDamperSettings={setDamperSettings}
  handleDropdownClick={handleDropdownClick}
/>
</TabPane>
<TabPane tab="サスペンション" key="2">
<SuspensionTab />
</TabPane>
<TabPane tab="エンジン・空力" key="3">
<div className="p-6">
<div className="space-y-8">
{/* エンジン設定 */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-6">
<i className="fas fa-engine text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">エンジン設定</h3>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">点火時期 (°BTDC)</label>
<div className="relative">
<Input defaultValue="12" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">燃料噴射時期 (ms)</label>
<div className="relative">
<Input defaultValue="2.8" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">ブースト圧 (kPa)</label>
<div className="relative">
<Input defaultValue="120" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">スロットル開度マップ</label>
<AutoComplete
defaultValue="track"
className="w-full"
options={[
{ value: 'track' },
{ value: 'sport' },
{ value: 'eco' }
]}
onDropdownVisibleChange={(open) => {
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
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-6">
<i className="fas fa-wind text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">空力設定</h3>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">フロントスプリッター (mm)</label>
<div className="relative">
<Input defaultValue="50" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">リアウイング角度 (°)</label>
<div className="relative">
<Input defaultValue="12" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">アンダーパネル設定</label>
<AutoComplete
defaultValue="full"
className="w-full"
options={[
{ value: 'full' },
{ value: 'partial' },
{ value: 'none' }
]}
onDropdownVisibleChange={(open) => {
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
<label className="block text-sm font-medium text-gray-700 mb-2">サイドスカート高さ (mm)</label>
<div className="relative">
<Input defaultValue="35" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
{/* 冷却系設定 */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-6">
<i className="fas fa-temperature-low text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">冷却系設定</h3>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">ラジエター開度 (%)</label>
<div className="relative">
<Input defaultValue="80" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">オイルクーラー開度 (%)</label>
<div className="relative">
<Input defaultValue="75" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">インタークーラースプレー</label>
<AutoComplete
defaultValue="auto"
className="w-full"
options={[
{ value: 'auto' },
{ value: 'manual' },
{ value: 'off' }
]}
onDropdownVisibleChange={(open) => {
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
<label className="block text-sm font-medium text-gray-700 mb-2">ブレーキダクト開度 (%)</label>
<div className="relative">
<Input defaultValue="90" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
</div>
</div>
</TabPane>
<TabPane tab="ドライバーフィードバック" key="4">
<DrivingTab
  notes={notes}
  setNotes={setNotes}
/>
</TabPane>
<TabPane tab="セッション後記録" key="5">
<div className="h-96 flex items-center justify-center text-gray-500">
セッション後記録コンテンツ
</div>
</TabPane>
<TabPane tab={
<div className="flex items-center">
<i className="fas fa-robot text-blue-500 mr-2"></i>
<span>AI アドバイス</span>
</div>
} key="6">
<div className="p-6 space-y-8">
{/* セットアップ提案 */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-6">
<i className="fas fa-sliders-h text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">セットアップ提案</h3>
</div>
<div className="space-y-6">
<div className="bg-green-50 p-4 rounded-lg">
<p className="text-sm text-gray-600">
フロント：空気圧を-3kPa調整することで、高速コーナーでのアンダーステア傾向を軽減できる可能性があります。
リア：現状の空気圧を維持し、温度管理に注力することを推奨します。
</p>
</div>
</div>
</div>
{/* ドライビングアドバイス */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-6">
<i className="fas fa-car text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">ドライビングアドバイス</h3>
</div>
<div className="space-y-4">
<div className="bg-yellow-50 p-4 rounded-lg">
<ul className="text-sm text-gray-600 space-y-2">
<li>• タイヤ温度の推移を注視し、最適な温度帯でのアタックを心がけてください</li>
<li>• 提案したセットアップ変更後の車両挙動の変化を確認してください</li>
<li>• 特に高速コーナーでのステアリング操作に注目し、アンダーステアの改善を確認してください</li>
</ul>
</div>
</div>
</div>
</div>
</TabPane>
</Tabs>
</div>
{/* 保存ボタンと前回データ読み込みボタン */}
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
</main>
{/* フッター */}
{dropdownState.isOpen && (
<div
ref={dropdownRef}
className="fixed bg-white shadow-lg rounded-md overflow-hidden z-50"
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
className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
onClick={() => handleOptionSelect(option.value)}
>
{option.label}
</div>
))}
</div>
)}
<footer className="bg-white py-6 border-t border-gray-200">
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