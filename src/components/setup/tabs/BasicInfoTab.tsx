// 基本情報タブコンポーネント
import React from 'react';
import { AutoComplete } from 'antd';

interface TirePressure {
  before: string;
  after: string;
  diff: string;
}

interface TirePressures {
  fl: TirePressure;
  fr: TirePressure;
  rl: TirePressure;
  rr: TirePressure;
}

interface DamperSetting {
  bump: number;
  rebound: number;
}

interface DamperSettings {
  fl: DamperSetting;
  fr: DamperSetting;
  rl: DamperSetting;
  rr: DamperSetting;
}

interface BasicInfoTabProps {
  tirePressures: TirePressures;
  setTirePressures: React.Dispatch<React.SetStateAction<TirePressures>>;
  damperSettings: DamperSettings;
  setDamperSettings: React.Dispatch<React.SetStateAction<DamperSettings>>;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  tirePressures,
  setTirePressures,
  damperSettings,
  setDamperSettings
}) => {
  const calculatePressureDiff = (before: string, after: string) => {
    const diff = parseInt(after) - parseInt(before);
    return diff >= 0 ? `+${diff}` : diff.toString();
  };

  // タイヤ圧力ホイールコンポーネント
  const TirePressureWheel = ({ position, data }: { position: string, data: TirePressure }) => (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="text-xs font-semibold text-gray-700 mb-2">{position.toUpperCase()}</div>
      <div className="flex items-center space-x-1">
        <AutoComplete
          value={data.before}
          onChange={(value) => {
            if (/^\d*$/.test(value) && value.length <= 4) {
              setTirePressures(prev => ({
                ...prev,
                [position]: {
                  ...prev[position as keyof TirePressures],
                  before: value,
                  diff: calculatePressureDiff(value, prev[position as keyof TirePressures].after)
                }
              }));
            }
          }}
          className="w-full"
          size="small"
          options={Array.from({ length: 61 }, (_, i) => ({ 
            value: (100 + i * 5).toString()
          }))}
          onDropdownVisibleChange={(open) => {
            if (open) {
              setTimeout(() => {
                const currentValue = data.before;
                const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                if (selectedItem) {
                  selectedItem.scrollIntoView({ block: 'center' });
                }
              }, 10);
            }
          }}
        />
        <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
        <AutoComplete
          value={data.after}
          onChange={(value) => {
            if (/^\d*$/.test(value) && value.length <= 4) {
              setTirePressures(prev => ({
                ...prev,
                [position]: {
                  ...prev[position as keyof TirePressures],
                  after: value,
                  diff: calculatePressureDiff(prev[position as keyof TirePressures].before, value)
                }
              }));
            }
          }}
          className="w-full"
          size="small"
          options={Array.from({ length: 61 }, (_, i) => ({ 
            value: (100 + i * 5).toString()
          }))}
          onDropdownVisibleChange={(open) => {
            if (open) {
              setTimeout(() => {
                const currentValue = data.after;
                const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                if (selectedItem) {
                  selectedItem.scrollIntoView({ block: 'center' });
                }
              }, 10);
            }
          }}
        />
      </div>
      <div className="text-xs text-right mt-1">
        <span className={`font-semibold ${parseInt(data.diff) > 0 ? 'text-red-500' : 'text-blue-500'}`}>
          {data.diff}
        </span>
      </div>
    </div>
  );

  // ダンパー設定ホイールコンポーネント
  const DamperWheel = ({ position, data }: { position: string, data: DamperSetting }) => (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="text-xs font-semibold text-gray-700 mb-2">{position.toUpperCase()}</div>
      <div className="flex items-center space-x-1">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Bump</div>
          <AutoComplete
            value={data.bump.toString()}
            onChange={(value) => {
              const numValue = parseInt(value);
              if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                setDamperSettings(prev => ({
                  ...prev,
                  [position]: { ...prev[position as keyof DamperSettings], bump: numValue }
                }));
              }
            }}
            className="w-full"
            size="small"
            options={Array.from({ length: 21 }, (_, i) => ({ 
              value: i.toString()
            }))}
            onDropdownVisibleChange={(open) => {
              if (open) {
                setTimeout(() => {
                  const currentValue = data.bump.toString();
                  const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                  if (selectedItem) {
                    selectedItem.scrollIntoView({ block: 'center' });
                  }
                }, 10);
              }
            }}
          />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Rebound</div>
          <AutoComplete
            value={data.rebound.toString()}
            onChange={(value) => {
              const numValue = parseInt(value);
              if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                setDamperSettings(prev => ({
                  ...prev,
                  [position]: { ...prev[position as keyof DamperSettings], rebound: numValue }
                }));
              }
            }}
            className="w-full"
            size="small"
            options={Array.from({ length: 21 }, (_, i) => ({ 
              value: i.toString()
            }))}
            onDropdownVisibleChange={(open) => {
              if (open) {
                setTimeout(() => {
                  const currentValue = data.rebound.toString();
                  const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
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
  );

  return (
    <div className="p-4">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* タイヤ空気圧設定 - Bento Box Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <i className="fas fa-tachometer-alt text-white mr-2"></i>
                <h3 className="text-white font-medium">タイヤ空気圧</h3>
              </div>
              <span className="text-blue-100 text-xs">走行前 → 走行後 (kPa)</span>
            </div>
          </div>
          
          {/* Content Grid */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <TirePressureWheel position="fl" data={tirePressures.fl} />
              <TirePressureWheel position="fr" data={tirePressures.fr} />
              <TirePressureWheel position="rl" data={tirePressures.rl} />
              <TirePressureWheel position="rr" data={tirePressures.rr} />
            </div>
            
            {/* Visual Car Reference */}
            <div className="mt-4 relative h-24 opacity-30">
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-car text-5xl text-blue-400"></i>
              </div>
            </div>
          </div>
        </div>
        
        {/* ダンパー設定 - Bento Box Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <i className="fas fa-cogs text-white mr-2"></i>
                <h3 className="text-white font-medium">ダンパー設定</h3>
              </div>
              <span className="text-indigo-100 text-xs">クリック数</span>
            </div>
          </div>
          
          {/* Content Grid */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <DamperWheel position="fl" data={damperSettings.fl} />
              <DamperWheel position="fr" data={damperSettings.fr} />
              <DamperWheel position="rl" data={damperSettings.rl} />
              <DamperWheel position="rr" data={damperSettings.rr} />
            </div>
            
            {/* Visual Car Reference */}
            <div className="mt-4 relative h-24 opacity-30">
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-car text-5xl text-indigo-400"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};