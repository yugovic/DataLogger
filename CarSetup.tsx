// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useRef } from 'react';
import { Select, Input, Tabs, Modal, Switch, Checkbox, message } from 'antd';
import { SettingOutlined, PlusOutlined, BellOutlined, UserOutlined, NotificationOutlined, DatabaseOutlined, ExportOutlined, QuestionCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from './src/contexts/AuthContext';
import { logout } from './src/services/authService';
const { TabPane } = Tabs;
interface DropdownState {
isOpen: boolean;
position: { top: number; left: number };
currentInput: string;
options: { value: string; label: string }[];
}
const App: React.FC = () => {
const { currentUser } = useAuth();
const [settingsModal, setSettingsModal] = useState(false);
const [currentSettingView, setCurrentSettingView] = useState('account');
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
<Select
defaultValue="honda"
className="w-full"
options={[
{ value: 'honda', label: 'Honda' },
{ value: 'toyota', label: 'Toyota' },
{ value: 'nissan', label: 'Nissan' },
{ value: 'mazda', label: 'Mazda' }
]}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">モデル</label>
<Select
defaultValue="s2000"
className="w-full"
options={[
{ value: 's2000', label: 'S2000' },
{ value: 'civic_type_r', label: 'シビック タイプR' },
{ value: 'nsx', label: 'NSX' }
]}
/>
</div>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">年式</label>
<Select
defaultValue="2005"
className="w-full"
options={Array.from({ length: 30 }, (_, i) => {
const year = 2025 - i;
return { value: year.toString(), label: year.toString() };
})}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">エンジン型式</label>
<Select
defaultValue="f20c"
className="w-full"
options={[
{ value: 'f20c', label: 'F20C' },
{ value: 'f22c', label: 'F22C' }
]}
/>
</div>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">駆動方式</label>
<Select
defaultValue="fr"
className="w-full"
options={[
{ value: 'fr', label: 'FR' },
{ value: 'ff', label: 'FF' },
{ value: 'awd', label: '4WD/AWD' },
{ value: 'mr', label: 'MR' }
]}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">トランスミッション</label>
<Select
defaultValue="6mt"
className="w-full"
options={[
{ value: '6mt', label: '6速MT' },
{ value: '5mt', label: '5速MT' },
{ value: 'at', label: 'AT' },
{ value: 'dct', label: 'DCT' }
]}
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
<div className="text-gray-800 font-medium">2025/06/24 10:30</div>
<div className="flex items-center">
<i className="fas fa-map-marker-alt text-gray-500 mr-2"></i>
<span>鈴鹿サーキット</span>
</div>
</div>
<div className="flex items-center space-x-4">
<Select
defaultValue="Honda S2000"
className="w-40"
options={[{ value: 'Honda S2000', label: 'Honda S2000' }]}
bordered={false}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
/>
<Select
defaultValue="鈴木健太"
className="w-32"
options={[{ value: '鈴木健太', label: '鈴木健太' }]}
bordered={false}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
/>
<Select
defaultValue="練習走行"
className="w-32"
options={[{ value: '練習走行', label: '練習走行' }]}
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
<Select
defaultValue={weatherCondition}
onChange={setWeatherCondition}
className="w-full"
options={[
{ value: '晴れ', label: '晴れ' },
{ value: '曇り', label: '曇り' },
{ value: '雨', label: '雨' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
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
<Select
value={tireBrand}
onChange={setTireBrand}
className="w-full"
options={[
{ value: 'ADVAN', label: 'ADVAN' },
{ value: 'BRIDGESTONE', label: 'BRIDGESTONE' },
{ value: 'MICHELIN', label: 'MICHELIN' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">コンパウンド</label>
<Select
value={tireCompound}
onChange={setTireCompound}
className="w-full"
options={[
{ value: 'A050', label: 'A050' },
{ value: 'RE71R', label: 'RE71R' },
{ value: 'PS4S', label: 'PS4S' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
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
<div className="p-6">
<div className="grid grid-cols-2 gap-8">
{/* タイヤ空気圧設定 */}
<div className="relative bg-gray-50 rounded-lg p-6">
{/* 車両イメージ - タイヤ空気圧 */}
<div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
<i className="fas fa-car text-9xl text-gray-400"></i>
</div>
<div className="flex justify-between items-center mb-4">
<div className="flex items-center">
<i className="fas fa-tachometer-alt text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">タイヤ空気圧</h3>
</div>
<div className="text-sm text-gray-500">
走行前 → 走行後 (kPa)
</div>
</div>
<div className="grid grid-cols-2 gap-x-8 gap-y-6">
<div className="relative">
<div className="text-center mb-2 font-medium">FL</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value={tirePressures.fl.before}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
fl: {
...prev.fl,
before: value,
diff: calculatePressureDiff(value, prev.fl.after)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "fl-before", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
<div className="text-gray-500">→</div>
<div className="flex-1 relative">
<Input
value={tirePressures.fl.after}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
fl: {
...prev.fl,
after: value,
diff: calculatePressureDiff(prev.fl.before, value)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "fl-after", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() }))}
/>
</div>
</div>
<div className="text-red-500 text-sm text-right mt-1">{tirePressures.fl.diff}</div>
</div>
<div className="relative">
<div className="text-center mb-2 font-medium">FR</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value={tirePressures.fr.before}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
fr: {
...prev.fr,
before: value,
diff: calculatePressureDiff(value, prev.fr.after)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "fr-before", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
<div className="text-gray-500">→</div>
<div className="flex-1 relative">
<Input
value={tirePressures.fr.after}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
fr: {
...prev.fr,
after: value,
diff: calculatePressureDiff(prev.fr.before, value)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "fr-after", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() }))}
/>
</div>
</div>
<div className="text-red-500 text-sm text-right mt-1">{tirePressures.fr.diff}</div>
</div>
<div className="relative">
<div className="text-center mb-2 font-medium">RL</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value={tirePressures.rl.before}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
rl: {
...prev.rl,
before: value,
diff: calculatePressureDiff(value, prev.rl.after)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "rl-before", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
<div className="text-gray-500">→</div>
<div className="flex-1 relative">
<Input
value={tirePressures.rl.after}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
rl: {
...prev.rl,
after: value,
diff: calculatePressureDiff(prev.rl.before, value)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "rl-after", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() }))}
/>
</div>
</div>
<div className="text-red-500 text-sm text-right mt-1">{tirePressures.rl.diff}</div>
</div>
<div className="relative">
<div className="text-center mb-2 font-medium">RR</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value={tirePressures.rr.before}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
rr: {
...prev.rr,
before: value,
diff: calculatePressureDiff(value, prev.rr.after)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "rr-before", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
<div className="text-gray-500">→</div>
<div className="flex-1 relative">
<Input
value={tirePressures.rr.after}
onChange={(e) => {
const value = e.target.value;
if (/^\d*$/.test(value)) {
setTirePressures(prev => ({
...prev,
rr: {
...prev.rr,
after: value,
diff: calculatePressureDiff(prev.rr.before, value)
}
}));
}
}}
className="text-center pr-8"
/>
<button
className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
onClick={(e) => handleDropdownClick(e, "rr-after", Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() })))}
>
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 61 }, (_, i) => ({ value: (100 + i * 5).toString(), label: (100 + i * 5).toString() }))}
/>
</div>
</div>
<div className="text-red-500 text-sm text-right mt-1">{tirePressures.rr.diff}</div>
</div>
</div>
</div>
{/* ダンパー設定 */}
<div className="relative bg-gray-50 rounded-lg p-6">
{/* 車両イメージ - ダンパー設定 */}
<div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
<i className="fas fa-car text-9xl text-gray-400"></i>
</div>
<div className="flex justify-between items-center mb-4">
<div className="flex items-center">
<i className="fas fa-car-side text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800">ダンパー設定</h3>
</div>
<div className="text-sm text-gray-500">
Bump / Rebound (クリック)
</div>
</div>
<div className="grid grid-cols-2 gap-x-8 gap-y-6">
<div>
<div className="text-center mb-2 font-medium">FL</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value="8"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
<div className="text-gray-500">/</div>
<div className="flex-1 relative">
<Input
value="10"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
</div>
</div>
<div>
<div className="text-center mb-2 font-medium">FR</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value="8"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
<div className="text-gray-500">/</div>
<div className="flex-1 relative">
<Input
value="10"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
</div>
</div>
<div>
<div className="text-center mb-2 font-medium">RL</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value="7"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
<div className="text-gray-500">/</div>
<div className="flex-1 relative">
<Input
value="9"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
</div>
</div>
<div>
<div className="text-center mb-2 font-medium">RR</div>
<div className="flex items-center space-x-2">
<div className="flex-1 relative">
<Input
value="7"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
<div className="text-gray-500">/</div>
<div className="flex-1 relative">
<Input
value="9"
className="text-center pr-8"
/>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
<Select
className="absolute top-full left-0 w-full mt-1 z-10"
style={{ display: 'none' }}
options={Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() }))}
/>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</TabPane>
<TabPane tab="メカニカルグリップ" key="2">
<div className="p-8">
<div className="relative bg-gray-50 rounded-lg p-8">
{/* 車両ピクトグラム */}
<div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
<i className="fas fa-car text-[200px] text-gray-400"></i>
</div>
<div className="grid grid-cols-2 gap-8">
{/* 左前輪 (FL) */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-4">
<i className="fas fa-tire text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium">FL サスペンション</h3>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
<div className="relative">
<Input defaultValue="-2.5" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
<div className="relative">
<Input defaultValue="7.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
<div className="relative">
<Input defaultValue="1.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
<div className="relative">
<Input defaultValue="8.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div className="col-span-2 space-y-4">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="2.5" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
<div className="relative">
<Input defaultValue="50" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="3.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
<div className="relative">
<Input defaultValue="40" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
</div>
</div>
{/* 右前輪 (FR) */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-4">
<i className="fas fa-tire text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium">FR サスペンション</h3>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
<div className="relative">
<Input defaultValue="-2.5" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
<div className="relative">
<Input defaultValue="7.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
<div className="relative">
<Input defaultValue="1.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
<div className="relative">
<Input defaultValue="8.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div className="col-span-2 space-y-4">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="2.5" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
<div className="relative">
<Input defaultValue="50" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="3.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
<div className="relative">
<Input defaultValue="40" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
</div>
</div>
{/* 左後輪 (RL) */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-4">
<i className="fas fa-tire text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium">RL サスペンション</h3>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
<div className="relative">
<Input defaultValue="-2.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
<div className="relative">
<Input defaultValue="6.5" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
<div className="relative">
<Input defaultValue="2.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
<div className="relative">
<Input defaultValue="7.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div className="col-span-2 space-y-4">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="2.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
<div className="relative">
<Input defaultValue="50" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="2.8" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
<div className="relative">
<Input defaultValue="40" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
</div>
</div>
{/* 右後輪 (RR) */}
<div className="bg-white rounded-lg p-6 shadow-sm">
<div className="flex items-center mb-4">
<i className="fas fa-tire text-blue-500 mr-2"></i>
<h3 className="text-lg font-medium">RR サスペンション</h3>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
<div className="relative">
<Input defaultValue="-2.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
<div className="relative">
<Input defaultValue="6.5" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
<div className="relative">
<Input defaultValue="2.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
<div className="relative">
<Input defaultValue="7.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div className="col-span-2 space-y-4">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="2.0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
<div className="relative">
<Input defaultValue="50" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
<div className="relative">
<Input defaultValue="2.8" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
<div className="relative">
<Input defaultValue="40" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
{/* ARB設定 */}
<div className="mt-8 space-y-6">
{/* アンチロールバー設定 */}
<div className="bg-white rounded-lg p-8 shadow-sm">
<div className="flex items-center mb-6">
<i className="fas fa-cog text-blue-500 mr-2"></i>
<h3 className="text-base font-medium">アンチロールバー設定</h3>
</div>
<div className="space-y-6">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">フロント ARB</label>
<div className="relative">
<Input defaultValue="22" className="text-center pr-8 h-8 text-sm" />
<span className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">mm</span>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">リア ARB</label>
<div className="relative">
<Input defaultValue="20" className="text-center pr-8 h-8 text-sm" />
<span className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">mm</span>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
</div>
{/* ブレーキ設定 */}
<div className="bg-white rounded-lg p-8 shadow-sm">
<div className="flex items-center mb-6">
<i className="fas fa-brake-system text-blue-500 mr-2"></i>
<h3 className="text-base font-medium">ブレーキ設定</h3>
</div>
<div className="space-y-6">
{/* ブレーキバイアス */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">ブレーキバイアス (前:後)</label>
<div className="flex items-center space-x-2">
<div className="relative flex-1">
<Input defaultValue="60" className="text-center pr-8 h-8 text-sm" />
<span className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">%</span>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
<span className="text-gray-500">:</span>
<div className="relative flex-1">
<Input defaultValue="40" className="text-center pr-8 h-8 text-sm" />
<span className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">%</span>
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
{/* ブレーキパッド */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">フロントブレーキパッド</label>
<div className="relative">
<Select
defaultValue="type_r"
className="w-full"
options={[
{ value: 'type_r', label: 'Type-R (レース用)' },
{ value: 'sport', label: 'スポーツ' },
{ value: 'street', label: 'ストリート' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
/>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">走行距離 (km)</label>
<div className="relative">
<Input defaultValue="0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
<div className="space-y-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">リアブレーキパッド</label>
<div className="relative">
<Select
defaultValue="type_r"
className="w-full"
options={[
{ value: 'type_r', label: 'Type-R (レース用)' },
{ value: 'sport', label: 'スポーツ' },
{ value: 'street', label: 'ストリート' }
]}
suffixIcon={<i className="fas fa-chevron-down text-gray-400"></i>}
/>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">走行距離 (km)</label>
<div className="relative">
<Input defaultValue="0" className="text-center pr-8 h-8 text-sm" />
<button className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500">
<i className="fas fa-chevron-down text-xs"></i>
</button>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
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
<Select
defaultValue="track"
className="w-full"
options={[
{ value: 'track', label: 'サーキット' },
{ value: 'sport', label: 'スポーツ' },
{ value: 'eco', label: 'エコ' }
]}
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
<Select
defaultValue="full"
className="w-full"
options={[
{ value: 'full', label: 'フルフラット' },
{ value: 'partial', label: 'パーシャル' },
{ value: 'none', label: 'なし' }
]}
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
<Select
defaultValue="auto"
className="w-full"
options={[
{ value: 'auto', label: '自動' },
{ value: 'manual', label: '手動' },
{ value: 'off', label: 'オフ' }
]}
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
<div className="p-6">
<div className="space-y-8">
<div>
<h3 className="text-lg font-medium text-gray-800 mb-6">低速コーナー</h3>
<div className="grid grid-cols-3 gap-6">
<div>
<div className="text-sm text-gray-600 mb-4">進入</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
style={{
WebkitAppearance: 'none',
}}
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>強アンダー</span>
<span>弱アンダー</span>
<span>ニュートラル</span>
<span>弱オーバー</span>
<span>強オーバー</span>
</div>
<style>{`
input[type='range'] {
background: #E5E7EB;
}
input[type='range']::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
transition: all 0.15s ease-in-out;
}
input[type='range']::-webkit-slider-thumb:hover {
transform: scale(1.2);
}
input[type='range']::-moz-range-thumb {
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
border: none;
transition: all 0.15s ease-in-out;
}
input[type='range']::-moz-range-thumb:hover {
transform: scale(1.2);
}
`}</style>
</div>
</div>
<div>
<div className="text-sm text-gray-600 mb-4">中間</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
style={{
WebkitAppearance: 'none',
}}
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>強アンダー</span>
<span>弱アンダー</span>
<span>ニュートラル</span>
<span>弱オーバー</span>
<span>強オーバー</span>
</div>
<style>{`
input[type='range'] {
background: #E5E7EB;
}
input[type='range']::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
transition: all 0.15s ease-in-out;
}
input[type='range']::-webkit-slider-thumb:hover {
transform: scale(1.2);
}
input[type='range']::-moz-range-thumb {
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
border: none;
transition: all 0.15s ease-in-out;
}
input[type='range']::-moz-range-thumb:hover {
transform: scale(1.2);
}
`}</style>
</div>
</div>
<div>
<div className="text-sm text-gray-600 mb-4">脱出</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
style={{
WebkitAppearance: 'none',
}}
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>強アンダー</span>
<span>弱アンダー</span>
<span>ニュートラル</span>
<span>弱オーバー</span>
<span>強オーバー</span>
</div>
<style>{`
input[type='range'] {
background: #E5E7EB;
}
input[type='range']::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
transition: all 0.15s ease-in-out;
}
input[type='range']::-webkit-slider-thumb:hover {
transform: scale(1.2);
}
input[type='range']::-moz-range-thumb {
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
border: none;
transition: all 0.15s ease-in-out;
}
input[type='range']::-moz-range-thumb:hover {
transform: scale(1.2);
}
`}</style>
</div>
</div>
</div>
</div>
<div>
<h3 className="text-lg font-medium text-gray-800 mb-6">高速コーナー</h3>
<div className="grid grid-cols-3 gap-6">
<div>
<div className="text-sm text-gray-600 mb-4">進入</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
style={{
WebkitAppearance: 'none',
}}
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>強アンダー</span>
<span>弱アンダー</span>
<span>ニュートラル</span>
<span>弱オーバー</span>
<span>強オーバー</span>
</div>
<style>{`
input[type='range'] {
background: #E5E7EB;
}
input[type='range']::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
transition: all 0.15s ease-in-out;
}
input[type='range']::-webkit-slider-thumb:hover {
transform: scale(1.2);
}
input[type='range']::-moz-range-thumb {
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
border: none;
transition: all 0.15s ease-in-out;
}
input[type='range']::-moz-range-thumb:hover {
transform: scale(1.2);
}
`}</style>
</div>
</div>
<div>
<div className="text-sm text-gray-600 mb-4">中間</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
style={{
WebkitAppearance: 'none',
}}
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>強アンダー</span>
<span>弱アンダー</span>
<span>ニュートラル</span>
<span>弱オーバー</span>
<span>強オーバー</span>
</div>
<style>{`
input[type='range'] {
background: #E5E7EB;
}
input[type='range']::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
transition: all 0.15s ease-in-out;
}
input[type='range']::-webkit-slider-thumb:hover {
transform: scale(1.2);
}
input[type='range']::-moz-range-thumb {
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
border: none;
transition: all 0.15s ease-in-out;
}
input[type='range']::-moz-range-thumb:hover {
transform: scale(1.2);
}
`}</style>
</div>
</div>
<div>
<div className="text-sm text-gray-600 mb-4">脱出</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
style={{
WebkitAppearance: 'none',
}}
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>強アンダー</span>
<span>弱アンダー</span>
<span>ニュートラル</span>
<span>弱オーバー</span>
<span>強オーバー</span>
</div>
<style>{`
input[type='range'] {
background: #E5E7EB;
}
input[type='range']::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
transition: all 0.15s ease-in-out;
}
input[type='range']::-webkit-slider-thumb:hover {
transform: scale(1.2);
}
input[type='range']::-moz-range-thumb {
width: 16px;
height: 16px;
background: #3B82F6;
border-radius: 50%;
cursor: pointer;
border: none;
transition: all 0.15s ease-in-out;
}
input[type='range']::-moz-range-thumb:hover {
transform: scale(1.2);
}
`}</style>
</div>
</div>
</div>
</div>
<div className="space-y-4 mt-8">
<div className="border rounded-lg overflow-hidden">
<button
className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
onClick={() => document.getElementById('braking-section')?.classList.toggle('hidden')}
>
<div className="flex items-center">
<i className="fas fa-brake-system mr-2 text-blue-500"></i>
<span className="font-medium">ブレーキング</span>
</div>
<i className="fas fa-chevron-down text-gray-400"></i>
</button>
<div id="braking-section" className="hidden p-4">
<div className="grid grid-cols-2 gap-6">
<div>
<div className="text-sm text-gray-600 mb-4">ブレーキの効き</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>弱い</span>
<span>やや弱い</span>
<span>適度</span>
<span>やや強い</span>
<span>強い</span>
</div>
</div>
</div>
<div>
<div className="text-sm text-gray-600 mb-4">ブレーキの安定性</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>不安定</span>
<span>やや不安定</span>
<span>普通</span>
<span>やや安定</span>
<span>安定</span>
</div>
</div>
</div>
</div>
</div>
</div>
<div className="border rounded-lg overflow-hidden">
<button
className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
onClick={() => document.getElementById('throttle-section')?.classList.toggle('hidden')}
>
<div className="flex items-center">
<i className="fas fa-tachometer-alt mr-2 text-blue-500"></i>
<span className="font-medium">アクセルレスポンス</span>
</div>
<i className="fas fa-chevron-down text-gray-400"></i>
</button>
<div id="throttle-section" className="hidden p-4">
<div className="grid grid-cols-2 gap-6">
<div>
<div className="text-sm text-gray-600 mb-4">レスポンスの速さ</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>遅い</span>
<span>やや遅い</span>
<span>普通</span>
<span>やや速い</span>
<span>速い</span>
</div>
</div>
</div>
<div>
<div className="text-sm text-gray-600 mb-4">コントロール性</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>悪い</span>
<span>やや悪い</span>
<span>普通</span>
<span>やや良い</span>
<span>良い</span>
</div>
</div>
</div>
</div>
</div>
</div>
<div className="border rounded-lg overflow-hidden">
<button
className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
onClick={() => document.getElementById('overall-section')?.classList.toggle('hidden')}
>
<div className="flex items-center">
<i className="fas fa-car mr-2 text-blue-500"></i>
<span className="font-medium">全体的な感触</span>
</div>
<i className="fas fa-chevron-down text-gray-400"></i>
</button>
<div id="overall-section" className="hidden p-4">
<div className="grid grid-cols-2 gap-6">
<div>
<div className="text-sm text-gray-600 mb-4">車両バランス</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>不安定</span>
<span>やや不安定</span>
<span>普通</span>
<span>やや安定</span>
<span>安定</span>
</div>
</div>
</div>
<div>
<div className="text-sm text-gray-600 mb-4">グリップレベル</div>
<div className="relative">
<input
type="range"
min="0"
max="4"
defaultValue="2"
step="1"
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
/>
<div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
<span>低い</span>
<span>やや低い</span>
<span>普通</span>
<span>やや高い</span>
<span>高い</span>
</div>
</div>
</div>
</div>
</div>
</div>
<div className="mt-8">
<div className="flex items-center mb-4">
<i className="fas fa-comment mr-2 text-blue-500"></i>
<h3 className="text-lg font-medium text-gray-800">コメント・メモ</h3>
</div>
<textarea
className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
placeholder="走行の感想、改善点などを記入してください"
></textarea>
</div>
</div>
</div>
</div>
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
{/* 保存ボタン */}
<div className="fixed bottom-8 right-8 z-50">
<button className="bg-gray-800 text-white p-4 rounded-full hover:bg-gray-700 cursor-pointer shadow-lg transition-all duration-200 hover:shadow-xl !rounded-button whitespace-nowrap flex items-center justify-center">
<i className="fas fa-save text-xl"></i>
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