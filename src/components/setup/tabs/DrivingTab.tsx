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

  // コーナリング評価コンポーネント
  const CornerEvaluation = ({ 
    title, 
    values, 
    onChange, 
    bgColor 
  }: { 
    title: string; 
    values: any; 
    onChange: (values: any) => void;
    bgColor: string;
  }) => (
    <div className={`${bgColor} rounded-lg p-3`}>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">進入</div>
          <Slider
            value={values.entry}
            onChange={(value) => onChange({ ...values, entry: value })}
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
            value={values.middle}
            onChange={(value) => onChange({ ...values, middle: value })}
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
            value={values.exit}
            onChange={(value) => onChange({ ...values, exit: value })}
            min={0}
            max={4}
            marks={simpleMarks}
            step={1}
            dots={true}
          />
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="p-4">
      {/* Bento Grid Layout */}
      <div className="space-y-4">
        {/* コーナリング特性 - Main Bento Box */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
            <div className="flex items-center">
              <i className="fas fa-route text-white mr-2"></i>
              <h3 className="text-white font-medium">コーナリング特性</h3>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <CornerEvaluation 
                title="低速コーナー" 
                values={cornerValues.lowSpeed}
                onChange={(values) => setCornerValues(prev => ({ ...prev, lowSpeed: values }))}
                bgColor="bg-blue-50"
              />
              <CornerEvaluation 
                title="高速コーナー" 
                values={cornerValues.highSpeed}
                onChange={(values) => setCornerValues(prev => ({ ...prev, highSpeed: values }))}
                bgColor="bg-purple-50"
              />
            </div>
            
            {/* 凡例 */}
            <div className="mt-4 bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-600 text-center">
                U/S++ : 強アンダーステア | U/S+ : 弱アンダーステア | N : ニュートラル | O/S+ : 弱オーバーステア | O/S++ : 強オーバーステア
              </div>
            </div>
          </div>
        </div>

        {/* その他の評価項目 - Bento Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* ブレーキング */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-3 py-2">
              <div className="flex items-center">
                <i className="fas fa-hand-paper text-white mr-2 text-sm"></i>
                <h4 className="text-white font-medium text-sm">ブレーキング</h4>
              </div>
            </div>
            <div className="p-3 space-y-3">
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
          </div>
          
          {/* アクセルレスポンス */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-3 py-2">
              <div className="flex items-center">
                <i className="fas fa-tachometer-alt text-white mr-2 text-sm"></i>
                <h4 className="text-white font-medium text-sm">アクセルレスポンス</h4>
              </div>
            </div>
            <div className="p-3 space-y-3">
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
          </div>
          
          {/* 全体的な感触 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2">
              <div className="flex items-center">
                <i className="fas fa-balance-scale text-white mr-2 text-sm"></i>
                <h4 className="text-white font-medium text-sm">全体的な感触</h4>
              </div>
            </div>
            <div className="p-3 space-y-3">
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
          </div>
        </div>

        {/* コメント・メモ - Bottom Box */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-3">
            <div className="flex items-center">
              <i className="fas fa-comment-alt text-white mr-2"></i>
              <h3 className="text-white font-medium">コメント・メモ</h3>
            </div>
          </div>
          <div className="p-4">
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="走行の感想、改善点などを記入してください"
              rows={4}
              className="w-full text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};