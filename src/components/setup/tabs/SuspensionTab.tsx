// サスペンションタブコンポーネント
import React, { useState } from 'react';
import { Select, Checkbox, Button } from 'antd';
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

  // 数値選択肢の生成
  const generateOptions = (start: number, end: number, step: number = 0.1, suffix: string = '') => {
    const options = [];
    for (let i = start; i <= end; i += step) {
      const value = i.toFixed(1);
      options.push({ value, label: value + suffix });
    }
    return options;
  };

  const generateIntOptions = (start: number, end: number, step: number = 1, suffix: string = '') => {
    const options = [];
    for (let i = start; i <= end; i += step) {
      options.push({ value: i.toString(), label: i + suffix });
    }
    return options;
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
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h4 className="text-lg font-semibold mb-4 text-center">{wheelLabel}</h4>
        
        {/* 2列レイアウトで情報密度を向上 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 左列: アライメント設定 */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2">アライメント</h5>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">キャンバー</label>
                <div className="flex items-center">
                  <Select
                    value={data.camber}
                    onChange={(value) => handleValueChange(position, 'camber', value)}
                    className="flex-1"
                    size="small"
                    options={generateOptions(-5, 0, 0.1)}
                  />
                  <span className="text-xs text-gray-500 ml-1">°</span>
                </div>
              </div>
              {(position === 'fl' || position === 'fr') && (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">キャスター</label>
                  <div className="flex items-center">
                    <Select
                      value={data.caster}
                      onChange={(value) => handleValueChange(position, 'caster', value)}
                      className="flex-1"
                      size="small"
                      options={generateOptions(0, 10, 0.1)}
                    />
                    <span className="text-xs text-gray-500 ml-1">°</span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600 block mb-1">トー</label>
                <div className="flex items-center">
                  <Select
                    value={data.toe}
                    onChange={(value) => handleValueChange(position, 'toe', value)}
                    className="flex-1"
                    size="small"
                    options={generateOptions(-5, 5, 0.1)}
                  />
                  <span className="text-xs text-gray-500 ml-1">mm</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右列: スプリング設定 */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2">スプリング</h5>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">レート</label>
                <div className="flex items-center">
                  <Select
                    value={data.springRate}
                    onChange={(value) => handleValueChange(position, 'springRate', value)}
                    className="flex-1"
                    size="small"
                    options={generateOptions(2, 20, 0.1)}
                  />
                  <span className="text-xs text-gray-500 ml-1">k</span>
                </div>
              </div>
              
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">ヘルパー</label>
                    <div className="flex items-center">
                      <Select
                        value={data.helperSpringRate}
                        onChange={(value) => handleValueChange(position, 'helperSpringRate', value)}
                        className="flex-1"
                        size="small"
                        options={generateOptions(0, 10, 0.1)}
                      />
                      <span className="text-xs text-gray-500 ml-1">k</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">ヘルパー長</label>
                    <div className="flex items-center">
                      <Select
                        value={data.helperSpringLength}
                        onChange={(value) => handleValueChange(position, 'helperSpringLength', value)}
                        className="flex-1"
                        size="small"
                        options={generateIntOptions(0, 100, 5)}
                      />
                      <span className="text-xs text-gray-500 ml-1">mm</span>
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
            <h5 className="text-xs font-medium text-gray-700 mb-2">バンプストッパー</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">硬さ</label>
                <div className="flex items-center">
                  <Select
                    value={data.bumpStopperRate}
                    onChange={(value) => handleValueChange(position, 'bumpStopperRate', value)}
                    className="flex-1"
                    size="small"
                    options={generateOptions(0, 10, 0.1)}
                  />
                  <span className="text-xs text-gray-500 ml-1">k</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">長さ</label>
                <div className="flex items-center">
                  <Select
                    value={data.bumpStopperLength}
                    onChange={(value) => handleValueChange(position, 'bumpStopperLength', value)}
                    className="flex-1"
                    size="small"
                    options={generateIntOptions(0, 100, 5)}
                  />
                  <span className="text-xs text-gray-500 ml-1">mm</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* 統合サマリーセクション - シンプルで一目で分かる */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <span className="text-gray-600 mr-2">車高F:</span>
            <Select
              defaultValue="120"
              size="small"
              className="w-20"
              options={generateIntOptions(80, 150, 5)}
            />
            <span className="text-gray-500 ml-1">mm</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 mr-2">車高R:</span>
            <Select
              defaultValue="125"
              size="small"
              className="w-20"
              options={generateIntOptions(80, 150, 5)}
            />
            <span className="text-gray-500 ml-1">mm</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 mr-2">ARB F:</span>
            <Select
              defaultValue="22"
              size="small"
              className="w-20"
              options={generateIntOptions(10, 40)}
            />
            <span className="text-gray-500 ml-1">mm</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 mr-2">ARB R:</span>
            <Select
              defaultValue="20"
              size="small"
              className="w-20"
              options={generateIntOptions(10, 40)}
            />
            <span className="text-gray-500 ml-1">mm</span>
          </div>
        </div>
      </div>

      {/* コントロールバー - よりコンパクトに */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4 text-sm">
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
      <div className="grid grid-cols-2 gap-4">
        <WheelSettings position="fl" data={suspensionData.fl} />
        <WheelSettings position="fr" data={suspensionData.fr} />
        <WheelSettings position="rl" data={suspensionData.rl} />
        <WheelSettings position="rr" data={suspensionData.rr} />
      </div>

      {/* ブレーキ設定 - シンプル化 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">ブレーキバイアス</span>
              <div className="flex items-center space-x-2">
                <Select
                  defaultValue="60"
                  size="small"
                  className="w-16"
                  options={generateIntOptions(40, 80)}
                />
                <span className="text-gray-500">:</span>
                <Select
                  defaultValue="40"
                  size="small"
                  className="w-16"
                  options={generateIntOptions(20, 60)}
                />
              </div>
            </div>
            
            {/* パッド走行距離 */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">F走行:</span>
                <Select
                  defaultValue="500"
                  size="small"
                  className="w-20"
                  options={generateIntOptions(0, 5000, 100)}
                />
                <span className="text-gray-500">km</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">R走行:</span>
                <Select
                  defaultValue="500"
                  size="small"
                  className="w-20"
                  options={generateIntOptions(0, 5000, 100)}
                />
                <span className="text-gray-500">km</span>
              </div>
            </div>
          </div>
          
          {showDetails && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">F パッド:</span>
                <Select
                  defaultValue="Type-R"
                  size="small"
                  className="w-24"
                  options={[
                    { value: 'Type-R', label: 'Type-R' },
                    { value: 'Type-S', label: 'Type-S' },
                    { value: 'Type-N', label: 'Type-N' }
                  ]}
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">R パッド:</span>
                <Select
                  defaultValue="Type-R"
                  size="small"
                  className="w-24"
                  options={[
                    { value: 'Type-R', label: 'Type-R' },
                    { value: 'Type-S', label: 'Type-S' },
                    { value: 'Type-N', label: 'Type-N' }
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};