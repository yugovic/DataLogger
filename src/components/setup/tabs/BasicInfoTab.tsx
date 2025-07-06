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
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.fl.before}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.fl.before;
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">→</div>
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.fl.after}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.fl.after;
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
            <div className="text-red-500 text-sm text-right mt-1">{tirePressures.fl.diff}</div>
          </div>
          <div className="relative">
            <div className="text-center mb-2 font-medium">FR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.fr.before}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.fr.before;
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">→</div>
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.fr.after}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.fr.after;
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
            <div className="text-red-500 text-sm text-right mt-1">{tirePressures.fr.diff}</div>
          </div>
          <div className="relative">
            <div className="text-center mb-2 font-medium">RL</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.rl.before}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.rl.before;
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">→</div>
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.rl.after}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.rl.after;
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
            <div className="text-red-500 text-sm text-right mt-1">{tirePressures.rl.diff}</div>
          </div>
          <div className="relative">
            <div className="text-center mb-2 font-medium">RR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.rr.before}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.rr.before;
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">→</div>
              <div className="flex-1">
                <AutoComplete
                  value={tirePressures.rr.after}
                  onChange={(value) => {
                    if (/^\d*$/.test(value) && value.length <= 4) {
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
                  className="w-full"
                  options={Array.from({ length: 61 }, (_, i) => ({ 
                    value: (100 + i * 5).toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = tirePressures.rr.after;
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
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fl.bump.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fl: { ...prev.fl, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fl.bump.toString();
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fl.rebound.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fl: { ...prev.fl, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fl.rebound.toString();
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
          <div>
            <div className="text-center mb-2 font-medium">FR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fr.bump.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fr: { ...prev.fr, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fr.bump.toString();
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fr.rebound.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fr: { ...prev.fr, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fr.rebound.toString();
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
          <div>
            <div className="text-center mb-2 font-medium">RL</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rl.bump.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rl: { ...prev.rl, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rl.bump.toString();
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rl.rebound.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rl: { ...prev.rl, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rl.rebound.toString();
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
          <div>
            <div className="text-center mb-2 font-medium">RR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rr.bump.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rr: { ...prev.rr, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rr.bump.toString();
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rr.rebound.toString()}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rr: { ...prev.rr, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rr.rebound.toString();
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
        </div>
      </div>
      </div>
    </div>
  );
};