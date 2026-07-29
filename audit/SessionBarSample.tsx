// セッション情報バーの再現（スマホ幅のレイアウト崩れを計測するため）
//
// CarSetup.tsx の該当部分と同じ構造・同じコンポーネントを使う。
// 実アプリは認証が要るのでここで再現して測る。
import React, { useState } from 'react';
import { AutoComplete, Select } from 'antd';

export const SessionBarSample: React.FC = () => {
  const [circuit, setCircuit] = useState('鈴鹿サーキット');
  const [vehicle, setVehicle] = useState('honda-nsx');
  const [driver, setDriver] = useState('');
  const [session, setSession] = useState('practice');

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900">
      <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-800 sm:p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <div className="col-span-2 sm:col-span-1">
            <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">日時</p>
            <input
              type="datetime-local"
              defaultValue="2026-07-29T22:42"
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
              サーキット <span className="text-red-500">*</span>
            </p>
            <AutoComplete
              value={circuit}
              onChange={setCircuit}
              className="w-full"
              options={[{ value: '鈴鹿サーキット' }, { value: '富士スピードウェイ' }]}
            />
          </div>

          <div className="col-span-2 sm:col-span-1 xl:col-span-2">
            <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
              車両 <span className="text-red-500">*</span>
            </p>
            <Select
              value={vehicle}
              onChange={setVehicle}
              className="w-full"
              options={[{ value: 'honda-nsx', label: 'Honda NSX GT3 EVO' }]}
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">ドライバー名</p>
            <input
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              placeholder="ドライバー名"
              className="ant-input w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">セッション種別</p>
            <Select
              value={session}
              onChange={setSession}
              className="w-full"
              options={[{ value: 'practice', label: '練習走行' }]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
