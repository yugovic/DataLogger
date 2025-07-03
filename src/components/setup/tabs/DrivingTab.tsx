// ドライビングタブコンポーネント
import React from 'react';
import { Input, Slider } from 'antd';

const { TextArea } = Input;

interface DrivingTabProps {
  notes: string;
  setNotes: (value: string) => void;
}

export const DrivingTab: React.FC<DrivingTabProps> = ({ notes, setNotes }) => {
  return (
    <div className="p-6 space-y-8">
      {/* 低速コーナー */}
      <div>
        <h3 className="text-lg font-semibold mb-6">低速コーナー</h3>
        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">進入</div>
            <Slider
              defaultValue={2}
              min={0}
              max={4}
              marks={{
                0: '強アンダー',
                1: '弱アンダー',
                2: 'ニュートラル',
                3: '弱オーバー',
                4: '強オーバー'
              }}
              step={1}
              dots={true}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">中間</div>
            <Slider
              defaultValue={2}
              min={0}
              max={4}
              marks={{
                0: '強アンダー',
                1: '弱アンダー',
                2: 'ニュートラル',
                3: '弱オーバー',
                4: '強オーバー'
              }}
              step={1}
              dots={true}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">脱出</div>
            <Slider
              defaultValue={3}
              min={0}
              max={4}
              marks={{
                0: '強アンダー',
                1: '弱アンダー',
                2: 'ニュートラル',
                3: '弱オーバー',
                4: '強オーバー'
              }}
              step={1}
              dots={true}
            />
          </div>
        </div>
      </div>

      {/* 高速コーナー */}
      <div>
        <h3 className="text-lg font-semibold mb-6">高速コーナー</h3>
        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">進入</div>
            <Slider
              defaultValue={1}
              min={0}
              max={4}
              marks={{
                0: '強アンダー',
                1: '弱アンダー',
                2: 'ニュートラル',
                3: '弱オーバー',
                4: '強オーバー'
              }}
              step={1}
              dots={true}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">中間</div>
            <Slider
              defaultValue={2}
              min={0}
              max={4}
              marks={{
                0: '強アンダー',
                1: '弱アンダー',
                2: 'ニュートラル',
                3: '弱オーバー',
                4: '強オーバー'
              }}
              step={1}
              dots={true}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">脱出</div>
            <Slider
              defaultValue={3}
              min={0}
              max={4}
              marks={{
                0: '強アンダー',
                1: '弱アンダー',
                2: 'ニュートラル',
                3: '弱オーバー',
                4: '強オーバー'
              }}
              step={1}
              dots={true}
            />
          </div>
        </div>
      </div>

      {/* ブレーキング */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center cursor-pointer">
          <span className="mr-2">ブレーキング</span>
          <i className="fas fa-chevron-down text-gray-400"></i>
        </h3>
      </div>

      {/* アクセルレスポンス */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center cursor-pointer">
          <span className="text-blue-600 mr-2">🏁</span>
          アクセルレスポンス
          <i className="fas fa-chevron-down text-gray-400 ml-2"></i>
        </h3>
      </div>

      {/* 全体的な感触 */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center cursor-pointer">
          <span className="text-blue-600 mr-2">🚗</span>
          全体的な感触
          <i className="fas fa-chevron-down text-gray-400 ml-2"></i>
        </h3>
      </div>

      {/* コメント・メモ */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-blue-600 mr-2">💬</span>
          コメント・メモ
        </h3>
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="走行の感想、改善点などを記入してください"
          rows={6}
          className="w-full"
        />
      </div>
    </div>
  );
};