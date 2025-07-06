// ドライビングタブコンポーネント
import React, { useState } from 'react';
import { Input, Slider, Collapse } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Panel } = Collapse;

interface DrivingTabProps {
  notes: string;
  setNotes: (value: string) => void;
}

export const DrivingTab: React.FC<DrivingTabProps> = ({ notes, setNotes }) => {
  // スライダーの値を管理するステート
  const [cornerValues, setCornerValues] = useState({
    lowSpeed: { entry: 2, middle: 2, exit: 3 },
    highSpeed: { entry: 1, middle: 2, exit: 3 }
  });
  
  const [brakeValues, setBrakeValues] = useState({
    initial: 2,
    middle: 2,
    stability: 2
  });
  
  const [accelValues, setAccelValues] = useState({
    response: 2,
    traction: 2
  });
  
  const [overallValues, setOverallValues] = useState({
    balance: 2,
    confidence: 3
  });
  // 簡潔なマーク表示
  const simpleMarks = {
    0: 'U/S++',
    1: 'U/S+',
    2: 'N',
    3: 'O/S+',
    4: 'O/S++'
  };
  
  return (
    <div className="p-6 space-y-4">
      {/* コーナリング特性 - 2列グリッド */}
      <div className="grid grid-cols-2 gap-4">
        {/* 低速コーナー */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">低速コーナー</h4>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">進入</div>
              <Slider
                value={cornerValues.lowSpeed.entry}
                onChange={(value) => setCornerValues(prev => ({ 
                  ...prev, 
                  lowSpeed: { ...prev.lowSpeed, entry: value } 
                }))}
                min={0}
                max={4}
                marks={simpleMarks}
                step={1}
                dots={true}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">中間</div>
              <Slider
                value={cornerValues.lowSpeed.middle}
                onChange={(value) => setCornerValues(prev => ({ 
                  ...prev, 
                  lowSpeed: { ...prev.lowSpeed, middle: value } 
                }))}
                min={0}
                max={4}
                marks={simpleMarks}
                step={1}
                dots={true}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">脱出</div>
              <Slider
                value={cornerValues.lowSpeed.exit}
                onChange={(value) => setCornerValues(prev => ({ 
                  ...prev, 
                  lowSpeed: { ...prev.lowSpeed, exit: value } 
                }))}
                min={0}
                max={4}
                marks={simpleMarks}
                step={1}
                dots={true}
              />
            </div>
          </div>
        </div>
        
        {/* 高速コーナー */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">高速コーナー</h4>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">進入</div>
              <Slider
                value={cornerValues.highSpeed.entry}
                onChange={(value) => setCornerValues(prev => ({ 
                  ...prev, 
                  highSpeed: { ...prev.highSpeed, entry: value } 
                }))}
                min={0}
                max={4}
                marks={simpleMarks}
                step={1}
                dots={true}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">中間</div>
              <Slider
                value={cornerValues.highSpeed.middle}
                onChange={(value) => setCornerValues(prev => ({ 
                  ...prev, 
                  highSpeed: { ...prev.highSpeed, middle: value } 
                }))}
                min={0}
                max={4}
                marks={simpleMarks}
                step={1}
                dots={true}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">脱出</div>
              <Slider
                value={cornerValues.highSpeed.exit}
                onChange={(value) => setCornerValues(prev => ({ 
                  ...prev, 
                  highSpeed: { ...prev.highSpeed, exit: value } 
                }))}
                min={0}
                max={4}
                marks={simpleMarks}
                step={1}
                dots={true}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 凡例 */}
      <div className="text-xs text-gray-500 text-center">
        U/S++ : 強アンダーステア | U/S+ : 弱アンダーステア | N : ニュートラル | O/S+ : 弱オーバーステア | O/S++ : 強オーバーステア
      </div>

      {/* その他の評価項目 - Collapse使用 */}
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        className="bg-gray-50"
      >
        <Panel header="ブレーキング" key="1" className="text-sm">
          <div className="space-y-3 px-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">初期制動</div>
              <Slider
                value={brakeValues.initial}
                onChange={(value) => setBrakeValues(prev => ({ ...prev, initial: value }))}
                min={0}
                max={4}
                marks={{
                  0: '弱い',
                  2: '適正',
                  4: '強い'
                }}
                step={1}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">中間域</div>
              <Slider
                value={brakeValues.middle}
                onChange={(value) => setBrakeValues(prev => ({ ...prev, middle: value }))}
                min={0}
                max={4}
                marks={{
                  0: '不安定',
                  2: '安定',
                  4: 'ロック気味'
                }}
                step={1}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">姿勢安定性</div>
              <Slider
                value={brakeValues.stability}
                onChange={(value) => setBrakeValues(prev => ({ ...prev, stability: value }))}
                min={0}
                max={4}
                marks={{
                  0: '不安定',
                  2: '安定',
                  4: '過安定'
                }}
                step={1}
              />
            </div>
          </div>
        </Panel>
        
        <Panel header="アクセルレスポンス" key="2" className="text-sm">
          <div className="space-y-3 px-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">初期レスポンス</div>
              <Slider
                value={accelValues.response}
                onChange={(value) => setAccelValues(prev => ({ ...prev, response: value }))}
                min={0}
                max={4}
                marks={{
                  0: '鈍い',
                  2: '適正',
                  4: '過敏'
                }}
                step={1}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">トラクション</div>
              <Slider
                value={accelValues.traction}
                onChange={(value) => setAccelValues(prev => ({ ...prev, traction: value }))}
                min={0}
                max={4}
                marks={{
                  0: '不足',
                  2: '適正',
                  4: '過剰'
                }}
                step={1}
              />
            </div>
          </div>
        </Panel>
        
        <Panel header="全体的な感触" key="3" className="text-sm">
          <div className="space-y-3 px-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">バランス</div>
              <Slider
                value={overallValues.balance}
                onChange={(value) => setOverallValues(prev => ({ ...prev, balance: value }))}
                min={0}
                max={4}
                marks={{
                  0: 'アンバランス',
                  2: 'バランス良好',
                  4: '完璧'
                }}
                step={1}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">ドライバー信頼感</div>
              <Slider
                value={overallValues.confidence}
                onChange={(value) => setOverallValues(prev => ({ ...prev, confidence: value }))}
                min={0}
                max={4}
                marks={{
                  0: '不安',
                  2: '普通',
                  4: '高い信頼感'
                }}
                step={1}
              />
            </div>
          </div>
        </Panel>
      </Collapse>

      {/* コメント・メモ */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">コメント・メモ</h4>
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="走行の感想、改善点などを記入してください"
          rows={4}
          className="w-full text-sm"
        />
      </div>
    </div>
  );
};