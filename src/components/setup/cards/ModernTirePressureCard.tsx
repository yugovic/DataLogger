// モダンなタイヤ空気圧カードコンポーネント
import React from 'react';
import { Input } from 'antd';

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

interface ModernTirePressureCardProps {
  tirePressures: TirePressures;
  setTirePressures: React.Dispatch<React.SetStateAction<TirePressures>>;
}

export const ModernTirePressureCard: React.FC<ModernTirePressureCardProps> = ({
  tirePressures,
  setTirePressures
}) => {
  const calculatePressureDiff = (before: string, after: string) => {
    const diff = parseInt(after) - parseInt(before);
    return diff >= 0 ? `+${diff}` : diff.toString();
  };

  const WheelInput = ({ 
    position, 
    type, 
    value, 
    onChange 
  }: { 
    position: string;
    type: 'before' | 'after';
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          if (/^\d*$/.test(newValue) && newValue.length <= 4) {
            onChange(newValue);
          }
        }}
        className="text-center font-medium text-lg h-12 rounded-xl border-2 border-gray-100 hover:border-gray-200 focus:border-blue-500 transition-all"
        placeholder="000"
      />
      <div className="absolute -top-2 left-3 bg-white px-1">
        <span className="text-xs text-gray-500 font-medium">
          {position.toUpperCase()} {type === 'before' ? '前' : '後'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ヘッダーセクション */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">タイヤ空気圧</h3>
          <p className="text-sm text-gray-500 mt-1">単位: kPa</p>
        </div>
        <div className="bg-blue-50 rounded-xl px-4 py-2">
          <div className="text-xs text-blue-600 font-medium">平均上昇</div>
          <div className="text-xl font-bold text-blue-700">
            +{Math.round((
              parseInt(tirePressures.fl.diff) + 
              parseInt(tirePressures.fr.diff) + 
              parseInt(tirePressures.rl.diff) + 
              parseInt(tirePressures.rr.diff)
            ) / 4)}
          </div>
        </div>
      </div>

      {/* メイングリッド */}
      <div className="relative">
        {/* 車のシルエット */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-48 h-48 opacity-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z" />
          </svg>
        </div>

        {/* 入力グリッド */}
        <div className="grid grid-cols-2 gap-8">
          {/* 走行前 */}
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 bg-gray-50 rounded-full px-3 py-1">
                走行前
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <WheelInput 
                position="fl" 
                type="before" 
                value={tirePressures.fl.before}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    fl: {
                      ...prev.fl,
                      before: value,
                      diff: calculatePressureDiff(value, prev.fl.after)
                    }
                  }));
                }}
              />
              <WheelInput 
                position="fr" 
                type="before" 
                value={tirePressures.fr.before}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    fr: {
                      ...prev.fr,
                      before: value,
                      diff: calculatePressureDiff(value, prev.fr.after)
                    }
                  }));
                }}
              />
              <WheelInput 
                position="rl" 
                type="before" 
                value={tirePressures.rl.before}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    rl: {
                      ...prev.rl,
                      before: value,
                      diff: calculatePressureDiff(value, prev.rl.after)
                    }
                  }));
                }}
              />
              <WheelInput 
                position="rr" 
                type="before" 
                value={tirePressures.rr.before}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    rr: {
                      ...prev.rr,
                      before: value,
                      diff: calculatePressureDiff(value, prev.rr.after)
                    }
                  }));
                }}
              />
            </div>
          </div>

          {/* 走行後 */}
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 bg-gray-50 rounded-full px-3 py-1">
                走行後
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <WheelInput 
                position="fl" 
                type="after" 
                value={tirePressures.fl.after}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    fl: {
                      ...prev.fl,
                      after: value,
                      diff: calculatePressureDiff(prev.fl.before, value)
                    }
                  }));
                }}
              />
              <WheelInput 
                position="fr" 
                type="after" 
                value={tirePressures.fr.after}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    fr: {
                      ...prev.fr,
                      after: value,
                      diff: calculatePressureDiff(prev.fr.before, value)
                    }
                  }));
                }}
              />
              <WheelInput 
                position="rl" 
                type="after" 
                value={tirePressures.rl.after}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    rl: {
                      ...prev.rl,
                      after: value,
                      diff: calculatePressureDiff(prev.rl.before, value)
                    }
                  }));
                }}
              />
              <WheelInput 
                position="rr" 
                type="after" 
                value={tirePressures.rr.after}
                onChange={(value) => {
                  setTirePressures(prev => ({
                    ...prev,
                    rr: {
                      ...prev.rr,
                      after: value,
                      diff: calculatePressureDiff(prev.rr.before, value)
                    }
                  }));
                }}
              />
            </div>
          </div>
        </div>

        {/* 差分表示 */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {['fl', 'fr', 'rl', 'rr'].map((pos) => {
            const diff = parseInt(tirePressures[pos as keyof TirePressures].diff);
            return (
              <div key={pos} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{pos.toUpperCase()}</div>
                <div className={`
                  font-bold text-sm rounded-lg px-2 py-1
                  ${diff > 0 ? 'bg-red-50 text-red-600' : 
                    diff < 0 ? 'bg-blue-50 text-blue-600' : 
                    'bg-gray-50 text-gray-600'}
                `}>
                  {tirePressures[pos as keyof TirePressures].diff}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* クイックアクション */}
      <div className="flex gap-2">
        <button className="flex-1 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition-colors">
          前回の値を使用
        </button>
        <button className="flex-1 bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-2 text-sm font-medium text-blue-700 transition-colors">
          推奨値を表示
        </button>
      </div>
    </div>
  );
};