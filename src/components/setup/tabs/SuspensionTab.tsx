// サスペンションタブコンポーネント
import React, { useState } from 'react';
import { AutoComplete, Checkbox, Button } from 'antd';
import { StepNumber } from '../../common/StepNumber';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

// この props は一旦シンプルにしておき、後で必要に応じて追加
type SuspensionTabProps = Record<string, never>;

export const SuspensionTab: React.FC<SuspensionTabProps> = () => {
  // 左右対称設定の状態
  const [isSymmetricFront, setIsSymmetricFront] = useState(true);
  const [isSymmetricRear, setIsSymmetricRear] = useState(true);
  
  // 詳細表示の状態
  const [showDetails, setShowDetails] = useState(false);
  
  // サスペンション設定の状態（空値スタート — デモ初期値禁止）
  const [suspensionData, setSuspensionData] = useState({
    fl: {
      camber: '',
      caster: '',
      toe: '',
      springRate: '',
      helperSpringRate: '',
      helperSpringLength: '',
      bumpStopperRate: '',
      bumpStopperLength: ''
    },
    fr: {
      camber: '',
      caster: '',
      toe: '',
      springRate: '',
      helperSpringRate: '',
      helperSpringLength: '',
      bumpStopperRate: '',
      bumpStopperLength: ''
    },
    rl: {
      camber: '',
      caster: '',
      toe: '',
      springRate: '',
      helperSpringRate: '',
      helperSpringLength: '',
      bumpStopperRate: '',
      bumpStopperLength: ''
    },
    rr: {
      camber: '',
      caster: '',
      toe: '',
      springRate: '',
      helperSpringRate: '',
      helperSpringLength: '',
      bumpStopperRate: '',
      bumpStopperLength: ''
    }
  });

  // 概要セクションの数値（0 は「未入力」を兼ねるため StepNumber の初期値は 0 で OK）
  const [rideHeightF, setRideHeightF] = useState<number>(0);
  const [rideHeightR, setRideHeightR] = useState<number>(0);
  const [brakeBiasF, setBrakeBiasF] = useState<number>(0);
  const [brakeBiasR, setBrakeBiasR] = useState<number>(0);
  const [padKmF, setPadKmF] = useState<number>(0);
  const [padKmR, setPadKmR] = useState<number>(0);

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
    // 空の場合はそのまま返す
    if (!value) return '';
    
    // 負の記号の処理
    if (value === '-' && allowNegative) return '-';
    
    // 数値以外の文字を削除（負の記号と小数点以外）
    let cleaned = value.replace(/[^0-9.-]/g, '');
    
    // 負の記号は先頭のみ許可
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
    
    // 小数点は1つまで
    const dotParts = cleaned.split('.');
    if (dotParts.length > 2) {
      cleaned = dotParts[0] + '.' + dotParts.slice(1).join('');
    }
    
    // 小数点以下は1桁まで
    if (dotParts.length === 2 && dotParts[1].length > 1) {
      cleaned = dotParts[0] + '.' + dotParts[1].substring(0, 1);
    }
    
    return cleaned;
  };

  const validateInteger = (value: string): string => {
    // 空の場合はそのまま返す
    if (!value) return '';
    
    // 数値以外の文字を削除
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
    
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold mb-4 text-center dark:text-gray-200">{wheelLabel}</h4>
        
        {/* 2列レイアウトで情報密度を向上 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 左列: アライメント設定 */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">アライメント</h5>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">キャンバー</label>
                <div className="flex items-center">
                  <AutoComplete
                    value={data.camber}
                    onChange={(value) => {
                      const validated = validateDecimal(value, true);
                      handleValueChange(position, 'camber', validated);
                    }}
                    onOpenChange={scrollToView}
                    className="flex-1"
                    size="small"
                    options={generateOptions(-5, 0, 0.1)}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">°</span>
                </div>
              </div>
              {(position === 'fl' || position === 'fr') && (
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">キャスター</label>
                  <div className="flex items-center">
                    <AutoComplete
                      value={data.caster}
                      onChange={(value) => {
                        const validated = validateDecimal(value, false);
                        handleValueChange(position, 'caster', validated);
                      }}
                      onOpenChange={scrollToView}
                      className="flex-1"
                      size="small"
                      options={generateOptions(0, 10, 0.1)}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">°</span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">トー</label>
                <div className="flex items-center">
                  <AutoComplete
                    value={data.toe}
                    onChange={(value) => {
                      const validated = validateDecimal(value, true);
                      handleValueChange(position, 'toe', validated);
                    }}
                    onOpenChange={scrollToView}
                    className="flex-1"
                    size="small"
                    options={generateOptions(-5, 5, 0.1)}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">mm</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右列: スプリング設定 */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">スプリング</h5>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">レート</label>
                <div className="flex items-center">
                  <AutoComplete
                    value={data.springRate}
                    onChange={(value) => {
                      const validated = validateDecimal(value, false);
                      handleValueChange(position, 'springRate', validated);
                    }}
                    onOpenChange={scrollToView}
                    className="flex-1"
                    size="small"
                    options={generateOptions(2, 20, 0.1)}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">k</span>
                </div>
              </div>
              
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">ヘルパー</label>
                    <div className="flex items-center">
                      <AutoComplete
                        value={data.helperSpringRate}
                        onChange={(value) => {
                          const validated = validateDecimal(value, false);
                          handleValueChange(position, 'helperSpringRate', validated);
                        }}
                        onOpenChange={scrollToView}
                        className="flex-1"
                        size="small"
                        options={generateOptions(0, 10, 0.1)}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">k</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">ヘルパー長</label>
                    <div className="flex items-center">
                      <AutoComplete
                        value={data.helperSpringLength}
                        onChange={(value) => {
                          const validated = validateInteger(value);
                          handleValueChange(position, 'helperSpringLength', validated);
                        }}
                        onOpenChange={scrollToView}
                        className="flex-1"
                        size="small"
                        options={generateIntOptions(0, 100, 5)}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">mm</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* バンプストッパー設定（詳細表示時のみ） */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">バンプストッパー</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">硬さ</label>
                <div className="flex items-center">
                  <AutoComplete
                    value={data.bumpStopperRate}
                    onChange={(value) => {
                      const validated = validateDecimal(value, false);
                      handleValueChange(position, 'bumpStopperRate', validated);
                    }}
                    onOpenChange={scrollToView}
                    className="flex-1"
                    size="small"
                    options={generateOptions(0, 10, 0.1)}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">k</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">長さ</label>
                <div className="flex items-center">
                  <AutoComplete
                    value={data.bumpStopperLength}
                    onChange={(value) => {
                      const validated = validateInteger(value);
                      handleValueChange(position, 'bumpStopperLength', validated);
                    }}
                    onOpenChange={scrollToView}
                    className="flex-1"
                    size="small"
                    options={generateIntOptions(0, 100, 5)}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">mm</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* 統合サマリーセクション - シンプルで一目で分かる */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-gray-600 dark:text-gray-400">車高F:</span>
            <StepNumber value={rideHeightF} onChange={setRideHeightF} min={80} max={150} step={1} unit="mm" size="small" />
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-gray-600 dark:text-gray-400">車高R:</span>
            <StepNumber value={rideHeightR} onChange={setRideHeightR} min={80} max={150} step={1} unit="mm" size="small" />
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 mr-2">ARB F:</span>
            <AutoComplete
              onChange={(value) => {
                validateInteger(value);
              }}
              onOpenChange={scrollToView}
              size="small"
              className="w-20"
              options={generateIntOptions(10, 40)}
            />
            <span className="text-gray-500 dark:text-gray-400 ml-1">mm</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 mr-2">ARB R:</span>
            <AutoComplete
              onChange={(value) => {
                validateInteger(value);
              }}
              onOpenChange={scrollToView}
              size="small"
              className="w-20"
              options={generateIntOptions(10, 40)}
            />
            <span className="text-gray-500 dark:text-gray-400 ml-1">mm</span>
          </div>
        </div>
      </div>

      {/* コントロールバー - よりコンパクトに */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
          <Checkbox 
            checked={isSymmetricFront}
            onChange={(e) => setIsSymmetricFront(e.target.checked)}
          >
            フロント左右対称
          </Checkbox>
          <Checkbox 
            checked={isSymmetricRear}
            onChange={(e) => setIsSymmetricRear(e.target.checked)}
          >
            リア左右対称
          </Checkbox>
        </div>
        <Button
          type="text"
          size="small"
          icon={showDetails ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '詳細を隠す' : '詳細を表示'}
        </Button>
      </div>

      {/* 2×2グリッドレイアウト */}
      <div className="relative">
        {/* 車両イメージ - 中央配置 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <i className="fas fa-car text-9xl text-gray-400 dark:text-gray-600"></i>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <WheelSettings position="fl" data={suspensionData.fl} />
          <WheelSettings position="fr" data={suspensionData.fr} />
          <WheelSettings position="rl" data={suspensionData.rl} />
          <WheelSettings position="rr" data={suspensionData.rr} />
        </div>
      </div>

      {/* ブレーキ設定 - シンプル化 */}
      <div className="border-t pt-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ブレーキバイアス</span>
              <div className="flex items-center space-x-2">
                <StepNumber value={brakeBiasF} onChange={setBrakeBiasF} min={40} max={80} step={1} size="small" />
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <StepNumber value={brakeBiasR} onChange={setBrakeBiasR} min={20} max={60} step={1} size="small" />
              </div>
            </div>
          </div>

          {/* パッド走行距離 */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">F走行:</span>
              <StepNumber value={padKmF} onChange={setPadKmF} min={0} max={5000} step={10} unit="km" size="small" />
              <span className="text-gray-500 dark:text-gray-400">km</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">R走行:</span>
              <StepNumber value={padKmR} onChange={setPadKmR} min={0} max={5000} step={10} unit="km" size="small" />
              <span className="text-gray-500 dark:text-gray-400">km</span>
            </div>
          </div>

          {showDetails && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 dark:text-gray-400">F パッド:</span>
                <AutoComplete size="small" className="w-24" options={[{value:'Type-R'},{value:'Type-S'},{value:'Type-N'}]} />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 dark:text-gray-400">R パッド:</span>
                <AutoComplete size="small" className="w-24" options={[{value:'Type-R'},{value:'Type-S'},{value:'Type-N'}]} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
