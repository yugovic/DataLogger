// サスペンションタブコンポーネント
import React from 'react';
import { Select } from 'antd';

interface SuspensionTabProps {
  // この props は一旦シンプルにしておき、後で必要に応じて追加
}

export const SuspensionTab: React.FC<SuspensionTabProps> = () => {
  // 数値選択肢の生成
  const generateOptions = (start: number, end: number, step: number = 0.1, suffix: string = '') => {
    const options = [];
    for (let i = start; i <= end; i += step) {
      const value = i.toFixed(1);
      options.push({ value, label: value + suffix });
    }
    return options;
  };

  const generateIntOptions = (start: number, end: number, step: number = 1, suffix: string = '') => {
    const options = [];
    for (let i = start; i <= end; i += step) {
      options.push({ value: i.toString(), label: i + suffix });
    }
    return options;
  };

  return (
    <div className="p-6 space-y-8">
      {/* FL サスペンション */}
      <div>
        <h3 className="text-lg font-semibold mb-4">FL サスペンション</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
            <Select
              defaultValue="-2.5"
              className="w-full"
              options={generateOptions(-5, 0, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
            <Select
              defaultValue="7.0"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
            <Select
              defaultValue="1.0"
              className="w-full"
              options={generateOptions(-5, 5, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
            <Select
              defaultValue="8.0"
              className="w-full"
              options={generateOptions(2, 20, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
            <Select
              defaultValue="2.5"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
            <Select
              defaultValue="50"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
            <Select
              defaultValue="3.0"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
            <Select
              defaultValue="40"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
        </div>
      </div>

      {/* FR サスペンション */}
      <div>
        <h3 className="text-lg font-semibold mb-4">FR サスペンション</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
            <Select
              defaultValue="-2.5"
              className="w-full"
              options={generateOptions(-5, 0, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
            <Select
              defaultValue="7.0"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
            <Select
              defaultValue="1.0"
              className="w-full"
              options={generateOptions(-5, 5, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
            <Select
              defaultValue="8.0"
              className="w-full"
              options={generateOptions(2, 20, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
            <Select
              defaultValue="2.5"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
            <Select
              defaultValue="50"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
            <Select
              defaultValue="3.0"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
            <Select
              defaultValue="40"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
        </div>
      </div>

      {/* RL サスペンション */}
      <div>
        <h3 className="text-lg font-semibold mb-4">RL サスペンション</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
            <Select
              defaultValue="-2.0"
              className="w-full"
              options={generateOptions(-5, 0, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
            <Select
              defaultValue="6.5"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
            <Select
              defaultValue="2.0"
              className="w-full"
              options={generateOptions(-5, 5, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
            <Select
              defaultValue="7.0"
              className="w-full"
              options={generateOptions(2, 20, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
            <Select
              defaultValue="2.0"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
            <Select
              defaultValue="50"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
            <Select
              defaultValue="2.8"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
            <Select
              defaultValue="40"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
        </div>
      </div>

      {/* RR サスペンション */}
      <div>
        <h3 className="text-lg font-semibold mb-4">RR サスペンション</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャンバー角 (deg)</label>
            <Select
              defaultValue="-2.0"
              className="w-full"
              options={generateOptions(-5, 0, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャスター角 (deg)</label>
            <Select
              defaultValue="6.5"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">トー角 (mm)</label>
            <Select
              defaultValue="2.0"
              className="w-full"
              options={generateOptions(-5, 5, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バネレート (kgf/mm)</label>
            <Select
              defaultValue="7.0"
              className="w-full"
              options={generateOptions(2, 20, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング硬さ (kgf/mm)</label>
            <Select
              defaultValue="2.0"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヘルパースプリング長さ (mm)</label>
            <Select
              defaultValue="50"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー硬さ (kgf/mm)</label>
            <Select
              defaultValue="2.8"
              className="w-full"
              options={generateOptions(0, 10, 0.1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">バンプストッパー長さ (mm)</label>
            <Select
              defaultValue="40"
              className="w-full"
              options={generateIntOptions(0, 100, 5)}
            />
          </div>
        </div>
      </div>

      {/* アンチロールバー設定 */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-blue-600 mr-2">⚙</span>
          アンチロールバー設定
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">フロント ARB</label>
            <div className="flex items-center">
              <Select
                defaultValue="22"
                className="flex-1"
                options={generateIntOptions(10, 40)}
              />
              <span className="ml-2 text-gray-500">mm</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">リア ARB</label>
            <div className="flex items-center">
              <Select
                defaultValue="20"
                className="flex-1"
                options={generateIntOptions(10, 40)}
              />
              <span className="ml-2 text-gray-500">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* ブレーキ設定 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">ブレーキ設定</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ブレーキバイアス (前:後)</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <Select
                  defaultValue="60"
                  className="flex-1"
                  options={generateIntOptions(40, 80)}
                />
                <span className="ml-2 text-gray-500">%</span>
              </div>
              <span className="text-center">:</span>
              <div className="flex items-center">
                <Select
                  defaultValue="40"
                  className="flex-1"
                  options={generateIntOptions(20, 60)}
                />
                <span className="ml-2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">フロントブレーキパッド</label>
            <Select
              defaultValue="Type-R (レース用)"
              className="w-full"
              options={[
                { value: 'Type-R (レース用)', label: 'Type-R (レース用)' },
                { value: 'Type-S (スポーツ)', label: 'Type-S (スポーツ)' },
                { value: 'Type-N (ストリート)', label: 'Type-N (ストリート)' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">リアブレーキパッド</label>
            <Select
              defaultValue="Type-R (レース用)"
              className="w-full"
              options={[
                { value: 'Type-R (レース用)', label: 'Type-R (レース用)' },
                { value: 'Type-S (スポーツ)', label: 'Type-S (スポーツ)' },
                { value: 'Type-N (ストリート)', label: 'Type-N (ストリート)' }
              ]}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">走行距離 (km)</label>
            <Select
              defaultValue="0"
              className="w-full"
              options={generateIntOptions(0, 1000, 10)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">走行距離 (km)</label>
            <Select
              defaultValue="0"
              className="w-full"
              options={generateIntOptions(0, 1000, 10)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};