// 基本情報タブコンポーネント
import React from 'react';
import { Select, Input } from 'antd';

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
  weatherCondition: string;
  setWeatherCondition: (value: string) => void;
  tirePressures: TirePressures;
  setTirePressures: React.Dispatch<React.SetStateAction<TirePressures>>;
  damperSettings: DamperSettings;
  setDamperSettings: React.Dispatch<React.SetStateAction<DamperSettings>>;
  airTemp: string;
  setAirTemp: (value: string) => void;
  trackTemp: string;
  setTrackTemp: (value: string) => void;
  humidity: string;
  setHumidity: (value: string) => void;
  pressure: string;
  setPressure: (value: string) => void;
  tireBrand: string;
  setTireBrand: (value: string) => void;
  tireCompound: string;
  setTireCompound: (value: string) => void;
  distance: string;
  setDistance: (value: string) => void;
  fuel: string;
  setFuel: (value: string) => void;
  frontSpringRate: string;
  setFrontSpringRate: (value: string) => void;
  rearSpringRate: string;
  setRearSpringRate: (value: string) => void;
  frontRideHeight: string;
  setFrontRideHeight: (value: string) => void;
  rearRideHeight: string;
  setRearRideHeight: (value: string) => void;
  frontStabilizer: string;
  setFrontStabilizer: (value: string) => void;
  rearStabilizer: string;
  setRearStabilizer: (value: string) => void;
  handleDropdownClick: (e: React.MouseEvent, inputValue: string, options: { value: string; label: string }[]) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  weatherCondition,
  setWeatherCondition,
  tirePressures,
  setTirePressures,
  damperSettings,
  setDamperSettings,
  airTemp,
  setAirTemp,
  trackTemp,
  setTrackTemp,
  humidity,
  setHumidity,
  pressure,
  setPressure,
  tireBrand,
  setTireBrand,
  tireCompound,
  setTireCompound,
  distance,
  setDistance,
  fuel,
  setFuel,
  frontSpringRate,
  setFrontSpringRate,
  rearSpringRate,
  setRearSpringRate,
  frontRideHeight,
  setFrontRideHeight,
  rearRideHeight,
  setRearRideHeight,
  frontStabilizer,
  setFrontStabilizer,
  rearStabilizer,
  setRearStabilizer,
  handleDropdownClick
}) => {
  const pressureOptions = Array.from({ length: 61 }, (_, i) => ({
    value: (170 + i).toString(),
    label: `${170 + i} kPa`
  }));

  const calculatePressureDiff = (before: string, after: string) => {
    const diff = parseInt(after) - parseInt(before);
    return diff >= 0 ? `+${diff}` : diff.toString();
  };

  const handleTirePressureChange = (position: keyof TirePressures, timing: 'before' | 'after', value: string) => {
    setTirePressures(prev => {
      const currentPos = prev[position];
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
  };

  return (
    <div className="p-6 space-y-8">
      {/* タイヤ空気圧とダンパー設定を横並び */}
      <div className="grid grid-cols-2 gap-6">
        {/* タイヤ空気圧設定 */}
        <div className="bg-blue-50 rounded-lg p-6 relative">
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
              </div>
            </div>
            <div className="text-red-500 text-sm text-right mt-1">{tirePressures.rr.diff}</div>
          </div>
        </div>
      </div>
        
        {/* ダンパー設定 */}
        <div className="relative bg-blue-50 rounded-lg p-6">
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
                  value={damperSettings.fl.bump.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fl: { ...prev.fl, bump: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "fl-bump", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1 relative">
                <Input
                  value={damperSettings.fl.rebound.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fl: { ...prev.fl, rebound: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "fl-rebound", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
            </div>
          </div>
          <div>
            <div className="text-center mb-2 font-medium">FR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={damperSettings.fr.bump.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fr: { ...prev.fr, bump: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "fr-bump", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1 relative">
                <Input
                  value={damperSettings.fr.rebound.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fr: { ...prev.fr, rebound: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "fr-rebound", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
            </div>
          </div>
          <div>
            <div className="text-center mb-2 font-medium">RL</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={damperSettings.rl.bump.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rl: { ...prev.rl, bump: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "rl-bump", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1 relative">
                <Input
                  value={damperSettings.rl.rebound.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rl: { ...prev.rl, rebound: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "rl-rebound", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
            </div>
          </div>
          <div>
            <div className="text-center mb-2 font-medium">RR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={damperSettings.rr.bump.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rr: { ...prev.rr, bump: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "rr-bump", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1 relative">
                <Input
                  value={damperSettings.rr.rebound.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && parseInt(value) <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rr: { ...prev.rr, rebound: parseInt(value) || 0 }
                      }));
                    }
                  }}
                  className="text-center pr-8"
                />
                <button 
                  className="absolute right-0 top-0 h-full px-2 text-gray-500 hover:text-blue-500"
                  onClick={(e) => handleDropdownClick(e, "rr-rebound", Array.from({ length: 21 }, (_, i) => ({ value: i.toString(), label: i.toString() })))}
                >
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* スプリング設定 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-6">
          <i className="fas fa-compress text-blue-500 mr-2"></i>
          <h3 className="text-lg font-medium text-gray-800">スプリング設定</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">フロントスプリングレート (k)</label>
            <Input
              value={frontSpringRate}
              onChange={(e) => setFrontSpringRate(e.target.value)}
              suffix="kgf/mm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">リアスプリングレート (k)</label>
            <Input
              value={rearSpringRate}
              onChange={(e) => setRearSpringRate(e.target.value)}
              suffix="kgf/mm"
            />
          </div>
        </div>
      </div>

      {/* 車高設定 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-6">
          <i className="fas fa-arrows-alt-v text-blue-500 mr-2"></i>
          <h3 className="text-lg font-medium text-gray-800">車高設定</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">フロント車高 (mm)</label>
            <Input
              value={frontRideHeight}
              onChange={(e) => setFrontRideHeight(e.target.value)}
              suffix="mm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">リア車高 (mm)</label>
            <Input
              value={rearRideHeight}
              onChange={(e) => setRearRideHeight(e.target.value)}
              suffix="mm"
            />
          </div>
        </div>
      </div>

      {/* スタビライザー設定 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-6">
          <i className="fas fa-balance-scale text-blue-500 mr-2"></i>
          <h3 className="text-lg font-medium text-gray-800">スタビライザー設定</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">フロントスタビ径 (mm)</label>
            <Input
              value={frontStabilizer}
              onChange={(e) => setFrontStabilizer(e.target.value)}
              suffix="mm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">リアスタビ径 (mm)</label>
            <Input
              value={rearStabilizer}
              onChange={(e) => setRearStabilizer(e.target.value)}
              suffix="mm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};