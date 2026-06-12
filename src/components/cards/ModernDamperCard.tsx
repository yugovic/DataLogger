import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Slider } from 'antd';

interface DamperSetting {
  bump: number;
  rebound: number;
}

interface ModernDamperCardProps {
  damperSettings: {
    fl: DamperSetting;
    fr: DamperSetting;
    rl: DamperSetting;
    rr: DamperSetting;
  };
  setDamperSettings: (settings: any) => void;
}

export const ModernDamperCard: React.FC<ModernDamperCardProps> = ({
  damperSettings,
  setDamperSettings
}) => {
  const handleSettingChange = (
    position: 'fl' | 'fr' | 'rl' | 'rr',
    type: 'bump' | 'rebound',
    value: number
  ) => {
    const newSettings = { ...damperSettings };
    newSettings[position][type] = value;
    setDamperSettings(newSettings);
  };

  const DamperControl = ({ 
    position, 
    label, 
    setting 
  }: { 
    position: 'fl' | 'fr' | 'rl' | 'rr';
    label: string;
    setting: DamperSetting;
  }) => (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{label}</h4>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">伸び側 (Rebound)</span>
            <span className="text-sm font-medium text-gray-900">{setting.rebound}</span>
          </div>
          <Slider
            min={1}
            max={20}
            value={setting.rebound}
            onChange={(value) => handleSettingChange(position, 'rebound', value)}
            trackStyle={{ backgroundColor: '#3B82F6' }}
            handleStyle={{ borderColor: '#3B82F6' }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">縮み側 (Bump)</span>
            <span className="text-sm font-medium text-gray-900">{setting.bump}</span>
          </div>
          <Slider
            min={1}
            max={20}
            value={setting.bump}
            onChange={(value) => handleSettingChange(position, 'bump', value)}
            trackStyle={{ backgroundColor: '#10B981' }}
            handleStyle={{ borderColor: '#10B981' }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">ダンパー設定</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">1-20段階</span>
            <InfoCircleOutlined className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DamperControl 
            position="fl" 
            label="フロント左 (FL)" 
            setting={damperSettings.fl} 
          />
          <DamperControl 
            position="fr" 
            label="フロント右 (FR)" 
            setting={damperSettings.fr} 
          />
          <DamperControl 
            position="rl" 
            label="リア左 (RL)" 
            setting={damperSettings.rl} 
          />
          <DamperControl 
            position="rr" 
            label="リア右 (RR)" 
            setting={damperSettings.rr} 
          />
        </div>

        {/* プリセット */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">プリセット</span>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              現在の設定を保存
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              ソフト
            </button>
            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              ノーマル
            </button>
            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              ハード
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};