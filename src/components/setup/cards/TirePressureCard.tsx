// タイヤ空気圧カードコンポーネント
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

interface TirePressureCardProps {
  tirePressures: TirePressures;
  setTirePressures: React.Dispatch<React.SetStateAction<TirePressures>>;
}

export const TirePressureCard: React.FC<TirePressureCardProps> = ({
  tirePressures,
  setTirePressures
}) => {
  const calculatePressureDiff = (before: string, after: string) => {
    const diff = parseInt(after) - parseInt(before);
    return diff >= 0 ? `+${diff}` : diff.toString();
  };

  const WheelPressure = ({ position, data }: { position: string, data: TirePressure }) => (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-700">{position.toUpperCase()}</span>
        <span className={`text-xs font-semibold ${parseInt(data.diff) > 0 ? 'text-red-500' : 'text-blue-500'}`}>
          {data.diff} kPa
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">走行前</div>
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
          />
        </div>
        
        <i className="fas fa-arrow-right text-gray-400 text-sm"></i>
        
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">走行後</div>
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
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* クイックサマリー */}
      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-700">平均変化</span>
          <span className="text-lg font-bold text-blue-600">
            +{Math.round((
              parseInt(tirePressures.fl.diff) + 
              parseInt(tirePressures.fr.diff) + 
              parseInt(tirePressures.rl.diff) + 
              parseInt(tirePressures.rr.diff)
            ) / 4)} kPa
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">フロント平均:</span>
            <span className="font-medium">
              +{Math.round((parseInt(tirePressures.fl.diff) + parseInt(tirePressures.fr.diff)) / 2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">リア平均:</span>
            <span className="font-medium">
              +{Math.round((parseInt(tirePressures.rl.diff) + parseInt(tirePressures.rr.diff)) / 2)}
            </span>
          </div>
        </div>
      </div>
      
      {/* 4輪グリッド */}
      <div className="grid grid-cols-2 gap-3">
        <WheelPressure position="fl" data={tirePressures.fl} />
        <WheelPressure position="fr" data={tirePressures.fr} />
        <WheelPressure position="rl" data={tirePressures.rl} />
        <WheelPressure position="rr" data={tirePressures.rr} />
      </div>
      
      {/* ビジュアル表現 */}
      <div className="relative h-32 opacity-20">
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fas fa-car text-6xl text-blue-400"></i>
        </div>
        {/* 圧力差を視覚的に表示 */}
        <div className="absolute top-4 left-8 text-xs font-bold text-red-500">
          {tirePressures.fl.diff}
        </div>
        <div className="absolute top-4 right-8 text-xs font-bold text-red-500">
          {tirePressures.fr.diff}
        </div>
        <div className="absolute bottom-4 left-8 text-xs font-bold text-red-500">
          {tirePressures.rl.diff}
        </div>
        <div className="absolute bottom-4 right-8 text-xs font-bold text-red-500">
          {tirePressures.rr.diff}
        </div>
      </div>
    </div>
  );
};