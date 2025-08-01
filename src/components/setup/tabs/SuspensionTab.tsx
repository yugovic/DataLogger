// サスペンションタブコンポーネント
import React, { useState } from 'react';
import { AutoComplete, Checkbox, Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

interface SuspensionTabProps {
  // この props は一旦シンプルにしておき、後で必要に応じて追加
}

export const SuspensionTab: React.FC<SuspensionTabProps> = () => {
  // 左右対称設定の状態
  const [isSymmetricFront, setIsSymmetricFront] = useState(true);
  const [isSymmetricRear, setIsSymmetricRear] = useState(true);
  
  // 詳細表示の状態
  const [showDetails, setShowDetails] = useState(false);
  
  // サスペンション設定の状態（初期値）
  const [suspensionData, setSuspensionData] = useState({
    fl: {
      camber: '-2.5',
      caster: '7.0',
      toe: '1.0',
      springRate: '8.0',
      helperSpringRate: '2.5',
      helperSpringLength: '50',
      bumpStopperRate: '3.0',
      bumpStopperLength: '40'
    },
    fr: {
      camber: '-2.5',
      caster: '7.0',
      toe: '1.0',
      springRate: '8.0',
      helperSpringRate: '2.5',
      helperSpringLength: '50',
      bumpStopperRate: '3.0',
      bumpStopperLength: '40'
    },
    rl: {
      camber: '-2.0',
      caster: '6.5',
      toe: '2.0',
      springRate: '7.0',
      helperSpringRate: '2.0',
      helperSpringLength: '50',
      bumpStopperRate: '2.8',
      bumpStopperLength: '40'
    },
    rr: {
      camber: '-2.0',
      caster: '6.5',
      toe: '2.0',
      springRate: '7.0',
      helperSpringRate: '2.0',
      helperSpringLength: '50',
      bumpStopperRate: '2.8',
      bumpStopperLength: '40'
    }
  });

  // 車高とスタビライザー設定
  const [rideHeight, setRideHeight] = useState({ front: '120', rear: '125' });
  const [antiRollBar, setAntiRollBar] = useState({ front: '22', rear: '20' });
  const [brakeBias, setBrakeBias] = useState({ front: '60', rear: '40' });
  const [brakePadDistance, setBrakePadDistance] = useState({ front: '500', rear: '500' });
  const [brakePadType, setBrakePadType] = useState({ front: 'Type-R', rear: 'Type-R' });

  // 数値選択肢の生成
  const generateOptions = (start: number, end: number, step: number = 0.1) => {
    const options = [];
    for (let i = start; i <= end; i += step) {
      const value = i.toFixed(1);
      options.push({ value });
    }
    return options;
  };

  const generateIntOptions = (start: number, end: number, step: number = 1) => {
    const options = [];
    for (let i = start; i <= end; i += step) {
      options.push({ value: i.toString() });
    }
    return options;
  };

  // バリデーション関数
  const validateDecimal = (value: string, allowNegative: boolean = false): string => {
    if (!value) return '';
    if (value === '-' && allowNegative) return '-';
    
    let cleaned = value.replace(/[^0-9.-]/g, '');
    
    if (!allowNegative) {
      cleaned = cleaned.replace(/-/g, '');
    } else {
      const parts = cleaned.split('-');
      if (parts.length > 2) {
        cleaned = '-' + parts.slice(1).join('').replace(/-/g, '');
      } else if (parts.length === 2 && parts[0] !== '') {
        cleaned = parts.join('').replace(/-/g, '');
      }
    }
    
    const dotParts = cleaned.split('.');
    if (dotParts.length > 2) {
      cleaned = dotParts[0] + '.' + dotParts.slice(1).join('');
    }
    
    if (dotParts.length === 2 && dotParts[1].length > 1) {
      cleaned = dotParts[0] + '.' + dotParts[1].substring(0, 1);
    }
    
    return cleaned;
  };

  const validateInteger = (value: string): string => {
    if (!value) return '';
    return value.replace(/[^0-9]/g, '');
  };

  // スクロール関数
  const scrollToView = (isOpen: boolean) => {
    if (isOpen) {
      setTimeout(() => {
        const dropdown = document.querySelector('.ant-select-dropdown');
        if (dropdown) {
          const activeItem = dropdown.querySelector('.ant-select-item-option-active');
          if (activeItem) {
            activeItem.scrollIntoView({ block: 'center' });
          }
        }
      }, 0);
    }
  };

  // 値変更ハンドラー
  const handleValueChange = (wheel: 'fl' | 'fr' | 'rl' | 'rr', field: string, value: string) => {
    setSuspensionData(prev => {
      const newData = { ...prev };
      newData[wheel] = { ...newData[wheel], [field]: value };
      
      // 左右対称設定の処理
      if (wheel === 'fl' && isSymmetricFront) {
        newData.fr = { ...newData.fr, [field]: value };
      } else if (wheel === 'fr' && isSymmetricFront) {
        newData.fl = { ...newData.fl, [field]: value };
      } else if (wheel === 'rl' && isSymmetricRear) {
        newData.rr = { ...newData.rr, [field]: value };
      } else if (wheel === 'rr' && isSymmetricRear) {
        newData.rl = { ...newData.rl, [field]: value };
      }
      
      return newData;
    });
  };

  // 車輪設定コンポーネント
  const WheelSettings = ({ position, data }: { position: 'fl' | 'fr' | 'rl' | 'rr', data: any }) => {
    const wheelLabel = position.toUpperCase();
    const isFront = position === 'fl' || position === 'fr';
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="text-sm font-semibold text-gray-700 mb-2 text-center">{wheelLabel}</div>
        
        {/* Bento内部グリッド */}
        <div className="space-y-2">
          {/* アライメント */}
          <div className="bg-blue-50 rounded p-2">
            <div className="text-xs font-medium text-blue-700 mb-1">アライメント</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">キャンバー</label>
                <div className="flex items-center">
                  <AutoComplete
                    value={data.camber}
                    onChange={(value) => {
                      const validated = validateDecimal(value, true);
                      handleValueChange(position, 'camber', validated);
                    }}
                    onDropdownVisibleChange={scrollToView}
                    className="flex-1"
                    size="small"
                    options={generateOptions(-5, 0, 0.1)}
                  />
                  <span className="text-xs text-gray-500 ml-1">°</span>
                </div>
              </div>
              {isFront && (
                <div>
                  <label className="text-xs text-gray-600">キャスター</label>
                  <div className="flex items-center">
                    <AutoComplete
                      value={data.caster}
                      onChange={(value) => {
                        const validated = validateDecimal(value, false);
                        handleValueChange(position, 'caster', validated);
                      }}
                      onDropdownVisibleChange={scrollToView}
                      className="flex-1"
                      size="small"
                      options={generateOptions(0, 10, 0.1)}
                    />
                    <span className="text-xs text-gray-500 ml-1">°</span>
                  </div>
                </div>
              )}
              <div className={isFront ? 'col-span-2' : ''}>
                <label className="text-xs text-gray-600">トー</label>
                <div className="flex items-center">
                  <AutoComplete
                    value={data.toe}
                    onChange={(value) => {
                      const validated = validateDecimal(value, true);
                      handleValueChange(position, 'toe', validated);
                    }}
                    onDropdownVisibleChange={scrollToView}
                    className="flex-1"
                    size="small"
                    options={generateOptions(-5, 5, 0.1)}
                  />
                  <span className="text-xs text-gray-500 ml-1">mm</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* スプリング */}
          <div className="bg-green-50 rounded p-2">
            <div className="text-xs font-medium text-green-700 mb-1">スプリング</div>
            <div>
              <label className="text-xs text-gray-600">レート</label>
              <div className="flex items-center">
                <AutoComplete
                  value={data.springRate}
                  onChange={(value) => {
                    const validated = validateDecimal(value, false);
                    handleValueChange(position, 'springRate', validated);
                  }}
                  onDropdownVisibleChange={scrollToView}
                  className="flex-1"
                  size="small"
                  options={generateOptions(2, 20, 0.1)}
                />
                <span className="text-xs text-gray-500 ml-1">k</span>
              </div>
            </div>
            
            {showDetails && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-xs text-gray-600">ヘルパー</label>
                  <div className="flex items-center">
                    <AutoComplete
                      value={data.helperSpringRate}
                      onChange={(value) => {
                        const validated = validateDecimal(value, false);
                        handleValueChange(position, 'helperSpringRate', validated);
                      }}
                      onDropdownVisibleChange={scrollToView}
                      className="flex-1"
                      size="small"
                      options={generateOptions(0, 10, 0.1)}
                    />
                    <span className="text-xs text-gray-500 ml-1">k</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600">長さ</label>
                  <div className="flex items-center">
                    <AutoComplete
                      value={data.helperSpringLength}
                      onChange={(value) => {
                        const validated = validateInteger(value);
                        handleValueChange(position, 'helperSpringLength', validated);
                      }}
                      onDropdownVisibleChange={scrollToView}
                      className="flex-1"
                      size="small"
                      options={generateIntOptions(0, 100, 5)}
                    />
                    <span className="text-xs text-gray-500 ml-1">mm</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Bento Grid Layout */}
      <div className="space-y-4">
        {/* Top Summary Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-4 gap-4">
            {/* 車高 */}
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs font-medium text-purple-700 mb-1">車高</div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <span className="text-xs text-gray-600 mr-1">F:</span>
                  <AutoComplete
                    value={rideHeight.front}
                    onChange={(value) => {
                      const validated = validateInteger(value);
                      setRideHeight(prev => ({ ...prev, front: validated }));
                    }}
                    onDropdownVisibleChange={scrollToView}
                    size="small"
                    className="w-16"
                    options={generateIntOptions(80, 150, 5)}
                  />
                  <span className="text-xs text-gray-500 ml-1">mm</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-600 mr-1">R:</span>
                  <AutoComplete
                    value={rideHeight.rear}
                    onChange={(value) => {
                      const validated = validateInteger(value);
                      setRideHeight(prev => ({ ...prev, rear: validated }));
                    }}
                    onDropdownVisibleChange={scrollToView}
                    size="small"
                    className="w-16"
                    options={generateIntOptions(80, 150, 5)}
                  />
                  <span className="text-xs text-gray-500 ml-1">mm</span>
                </div>
              </div>
            </div>
            
            {/* スタビライザー */}
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xs font-medium text-orange-700 mb-1">スタビライザー</div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <span className="text-xs text-gray-600 mr-1">F:</span>
                  <AutoComplete
                    value={antiRollBar.front}
                    onChange={(value) => {
                      const validated = validateInteger(value);
                      setAntiRollBar(prev => ({ ...prev, front: validated }));
                    }}
                    onDropdownVisibleChange={scrollToView}
                    size="small"
                    className="w-16"
                    options={generateIntOptions(10, 40)}
                  />
                  <span className="text-xs text-gray-500 ml-1">mm</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-600 mr-1">R:</span>
                  <AutoComplete
                    value={antiRollBar.rear}
                    onChange={(value) => {
                      const validated = validateInteger(value);
                      setAntiRollBar(prev => ({ ...prev, rear: validated }));
                    }}
                    onDropdownVisibleChange={scrollToView}
                    size="small"
                    className="w-16"
                    options={generateIntOptions(10, 40)}
                  />
                  <span className="text-xs text-gray-500 ml-1">mm</span>
                </div>
              </div>
            </div>
            
            {/* 対称設定 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-700 mb-1">対称設定</div>
              <div className="space-y-1">
                <Checkbox 
                  checked={isSymmetricFront}
                  onChange={(e) => setIsSymmetricFront(e.target.checked)}
                  className="text-xs"
                >
                  Front L/R
                </Checkbox>
                <Checkbox 
                  checked={isSymmetricRear}
                  onChange={(e) => setIsSymmetricRear(e.target.checked)}
                  className="text-xs"
                >
                  Rear L/R
                </Checkbox>
              </div>
            </div>
            
            {/* 詳細表示 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-700 mb-1">表示設定</div>
              <Button
                type={showDetails ? "primary" : "default"}
                size="small"
                icon={showDetails ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                {showDetails ? '詳細を隠す' : '詳細を表示'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Suspension Grid */}
        <div className="bg-gray-50 rounded-xl p-4">
          {/* 車両イメージ - 中央配置 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <i className="fas fa-car text-9xl text-gray-400"></i>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <WheelSettings position="fl" data={suspensionData.fl} />
            <WheelSettings position="fr" data={suspensionData.fr} />
            <WheelSettings position="rl" data={suspensionData.rl} />
            <WheelSettings position="rr" data={suspensionData.rr} />
          </div>
        </div>

        {/* ブレーキ設定 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-2">
            <div className="flex items-center">
              <i className="fas fa-circle-stop text-white mr-2"></i>
              <h3 className="text-white font-medium text-sm">ブレーキ設定</h3>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* バイアス */}
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs font-medium text-red-700 mb-2">バイアス</div>
                <div className="flex items-center space-x-2">
                  <AutoComplete
                    value={brakeBias.front}
                    onChange={(value) => {
                      const validated = validateInteger(value);
                      setBrakeBias(prev => ({ ...prev, front: validated }));
                    }}
                    onDropdownVisibleChange={scrollToView}
                    size="small"
                    className="w-16"
                    options={generateIntOptions(40, 80)}
                  />
                  <span className="text-gray-500">:</span>
                  <AutoComplete
                    value={brakeBias.rear}
                    onChange={(value) => {
                      const validated = validateInteger(value);
                      setBrakeBias(prev => ({ ...prev, rear: validated }));
                    }}
                    onDropdownVisibleChange={scrollToView}
                    size="small"
                    className="w-16"
                    options={generateIntOptions(20, 60)}
                  />
                </div>
              </div>
              
              {/* パッド走行距離 */}
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs font-medium text-yellow-700 mb-2">パッド走行距離</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-600 mr-1">F:</span>
                    <AutoComplete
                      value={brakePadDistance.front}
                      onChange={(value) => {
                        const validated = validateInteger(value);
                        setBrakePadDistance(prev => ({ ...prev, front: validated }));
                      }}
                      onDropdownVisibleChange={scrollToView}
                      size="small"
                      className="flex-1"
                      options={generateIntOptions(0, 5000, 100)}
                    />
                    <span className="text-xs text-gray-500 ml-1">km</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-600 mr-1">R:</span>
                    <AutoComplete
                      value={brakePadDistance.rear}
                      onChange={(value) => {
                        const validated = validateInteger(value);
                        setBrakePadDistance(prev => ({ ...prev, rear: validated }));
                      }}
                      onDropdownVisibleChange={scrollToView}
                      size="small"
                      className="flex-1"
                      options={generateIntOptions(0, 5000, 100)}
                    />
                    <span className="text-xs text-gray-500 ml-1">km</span>
                  </div>
                </div>
              </div>
              
              {showDetails && (
                <>
                  {/* パッドタイプ */}
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">パッドタイプ</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-600 mr-1">F:</span>
                        <AutoComplete
                          value={brakePadType.front}
                          onChange={(value) => {
                            setBrakePadType(prev => ({ ...prev, front: value }));
                          }}
                          onDropdownVisibleChange={scrollToView}
                          size="small"
                          className="flex-1"
                          options={[
                            { value: 'Type-R' },
                            { value: 'Type-S' },
                            { value: 'Type-N' }
                          ]}
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-600 mr-1">R:</span>
                        <AutoComplete
                          value={brakePadType.rear}
                          onChange={(value) => {
                            setBrakePadType(prev => ({ ...prev, rear: value }));
                          }}
                          onDropdownVisibleChange={scrollToView}
                          size="small"
                          className="flex-1"
                          options={[
                            { value: 'Type-R' },
                            { value: 'Type-S' },
                            { value: 'Type-N' }
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};