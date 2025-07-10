// ダンパー設定カードコンポーネント
import React from 'react';
import { AutoComplete, Progress } from 'antd';

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

interface DamperCardProps {
  damperSettings: DamperSettings;
  setDamperSettings: React.Dispatch<React.SetStateAction<DamperSettings>>;
}

export const DamperCard: React.FC<DamperCardProps> = ({
  damperSettings,
  setDamperSettings
}) => {
  const WheelDamper = ({ position, data }: { position: string, data: DamperSetting }) => {
    const totalClicks = data.bump + data.rebound;
    const maxClicks = 40; // 20 + 20
    const percentage = (totalClicks / maxClicks) * 100;
    
    return (
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">{position.toUpperCase()}</span>
          <Progress 
            percent={percentage} 
            showInfo={false}
            strokeColor={{
              '0%': '#3b82f6',
              '100%': '#8b5cf6'
            }}
            className="w-12"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
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
            />
          </div>
          
          <div>
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
            />
          </div>
        </div>
        
        {/* バランスインジケーター */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">B/R比</span>
          <span className="font-medium text-indigo-600">
            {data.bump}:{data.rebound}
          </span>
        </div>
      </div>
    );
  };

  // 全体のバランス計算
  const calculateBalance = () => {
    const frontBalance = (damperSettings.fl.bump + damperSettings.fr.bump) / 
                        (damperSettings.fl.rebound + damperSettings.fr.rebound);
    const rearBalance = (damperSettings.rl.bump + damperSettings.rr.bump) / 
                       (damperSettings.rl.rebound + damperSettings.rr.rebound);
    return { frontBalance, rearBalance };
  };

  const { frontBalance, rearBalance } = calculateBalance();

  return (
    <div className="space-y-3">
      {/* バランスサマリー */}
      <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-indigo-700">ダンパーバランス</span>
          <div className="flex items-center space-x-2">
            <div className="text-xs bg-white rounded-lg px-2 py-1">
              <span className="text-gray-600">F:</span>
              <span className="font-medium ml-1">{frontBalance.toFixed(2)}</span>
            </div>
            <div className="text-xs bg-white rounded-lg px-2 py-1">
              <span className="text-gray-600">R:</span>
              <span className="font-medium ml-1">{rearBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* ビジュアルバランス表示 */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">ソフト</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
            <div 
              className="absolute h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all"
              style={{ width: `${((frontBalance + rearBalance) / 2) * 50}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">ハード</span>
        </div>
      </div>
      
      {/* 4輪グリッド */}
      <div className="grid grid-cols-2 gap-3">
        <WheelDamper position="fl" data={damperSettings.fl} />
        <WheelDamper position="fr" data={damperSettings.fr} />
        <WheelDamper position="rl" data={damperSettings.rl} />
        <WheelDamper position="rr" data={damperSettings.rr} />
      </div>
      
      {/* プリセット提案 */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div className="text-xs font-medium text-gray-700 mb-2">クイックプリセット</div>
        <div className="grid grid-cols-3 gap-2">
          <button className="bg-white rounded-lg px-2 py-1 text-xs border border-gray-200 hover:bg-gray-50">
            ソフト
          </button>
          <button className="bg-white rounded-lg px-2 py-1 text-xs border border-gray-200 hover:bg-gray-50">
            標準
          </button>
          <button className="bg-white rounded-lg px-2 py-1 text-xs border border-gray-200 hover:bg-gray-50">
            ハード
          </button>
        </div>
      </div>
    </div>
  );
};