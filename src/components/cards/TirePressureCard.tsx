import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';

interface TirePressure {
  before: string;
  after: string;
  diff: string;
}

interface TirePressureCardProps {
  tirePressures: {
    fl: TirePressure;
    fr: TirePressure;
    rl: TirePressure;
    rr: TirePressure;
  };
  setTirePressures: (pressures: any) => void;
}

export const TirePressureCard: React.FC<TirePressureCardProps> = ({
  tirePressures,
  setTirePressures
}) => {
  const handlePressureChange = (
    position: 'fl' | 'fr' | 'rl' | 'rr',
    type: 'before' | 'after',
    value: string
  ) => {
    if (!/^\d*$/.test(value) || value.length > 4) return;

    const newPressures = { ...tirePressures };
    newPressures[position][type] = value;
    
    // 差分を計算
    const before = parseInt(newPressures[position].before) || 0;
    const after = parseInt(newPressures[position].after) || 0;
    const diff = after - before;
    newPressures[position].diff = diff >= 0 ? `+${diff}` : `${diff}`;
    
    setTirePressures(newPressures);
  };

  const WheelInput = ({ position, type, value }: { 
    position: 'fl' | 'fr' | 'rl' | 'rr';
    type: 'before' | 'after';
    value: string;
  }) => (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handlePressureChange(position, type, e.target.value)}
        className="w-full px-3 py-2 text-center text-lg font-medium border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        placeholder="0"
      />
      <span className="absolute -top-2 left-3 px-1 bg-white text-xs text-gray-500">
        {type === 'before' ? '走行前' : '走行後'}
      </span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">タイヤ空気圧</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">単位: kPa</span>
            <InfoCircleOutlined className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        <div className="relative max-w-md mx-auto">
          {/* 車のイラスト背景 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <svg viewBox="0 0 300 400" className="w-full h-full">
              <rect x="50" y="50" width="200" height="300" rx="20" stroke="currentColor" strokeWidth="2" fill="none" />
              <rect x="30" y="100" width="20" height="60" rx="5" fill="currentColor" />
              <rect x="250" y="100" width="20" height="60" rx="5" fill="currentColor" />
              <rect x="30" y="240" width="20" height="60" rx="5" fill="currentColor" />
              <rect x="250" y="240" width="20" height="60" rx="5" fill="currentColor" />
            </svg>
          </div>

          {/* タイヤ入力フィールド */}
          <div className="relative z-10 grid grid-cols-2 gap-8">
            {/* フロント */}
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-sm font-medium text-gray-700">フロント左 (FL)</span>
                <div className="mt-2 space-y-2">
                  <WheelInput position="fl" type="before" value={tirePressures.fl.before} />
                  <WheelInput position="fl" type="after" value={tirePressures.fl.after} />
                  <div className="text-center py-1">
                    <span className={`text-sm font-medium ${
                      parseInt(tirePressures.fl.diff) > 0 ? 'text-red-600' : 
                      parseInt(tirePressures.fl.diff) < 0 ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      差分: {tirePressures.fl.diff} kPa
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <span className="text-sm font-medium text-gray-700">リア左 (RL)</span>
                <div className="mt-2 space-y-2">
                  <WheelInput position="rl" type="before" value={tirePressures.rl.before} />
                  <WheelInput position="rl" type="after" value={tirePressures.rl.after} />
                  <div className="text-center py-1">
                    <span className={`text-sm font-medium ${
                      parseInt(tirePressures.rl.diff) > 0 ? 'text-red-600' : 
                      parseInt(tirePressures.rl.diff) < 0 ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      差分: {tirePressures.rl.diff} kPa
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* リア */}
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-sm font-medium text-gray-700">フロント右 (FR)</span>
                <div className="mt-2 space-y-2">
                  <WheelInput position="fr" type="before" value={tirePressures.fr.before} />
                  <WheelInput position="fr" type="after" value={tirePressures.fr.after} />
                  <div className="text-center py-1">
                    <span className={`text-sm font-medium ${
                      parseInt(tirePressures.fr.diff) > 0 ? 'text-red-600' : 
                      parseInt(tirePressures.fr.diff) < 0 ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      差分: {tirePressures.fr.diff} kPa
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <span className="text-sm font-medium text-gray-700">リア右 (RR)</span>
                <div className="mt-2 space-y-2">
                  <WheelInput position="rr" type="before" value={tirePressures.rr.before} />
                  <WheelInput position="rr" type="after" value={tirePressures.rr.after} />
                  <div className="text-center py-1">
                    <span className={`text-sm font-medium ${
                      parseInt(tirePressures.rr.diff) > 0 ? 'text-red-600' : 
                      parseInt(tirePressures.rr.diff) < 0 ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      差分: {tirePressures.rr.diff} kPa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 凡例 */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span className="text-gray-600">温度上昇</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-gray-600">温度低下</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};