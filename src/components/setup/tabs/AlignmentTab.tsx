// アライメントタブコンポーネント
import React from 'react';
import { Input } from 'antd';

interface AlignmentTabProps {
  // キャンバー
  frontCamber: string;
  setFrontCamber: (value: string) => void;
  rearCamber: string;
  setRearCamber: (value: string) => void;
  
  // トー
  frontToe: string;
  setFrontToe: (value: string) => void;
  rearToe: string;
  setRearToe: (value: string) => void;
  
  // キャスター
  caster: string;
  setCaster: (value: string) => void;
}

export const AlignmentTab: React.FC<AlignmentTabProps> = ({
  frontCamber,
  setFrontCamber,
  rearCamber,
  setRearCamber,
  frontToe,
  setFrontToe,
  rearToe,
  setRearToe,
  caster,
  setCaster
}) => {
  return (
    <div className="space-y-6">
      {/* キャンバー角 */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">キャンバー角</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">フロント</label>
            <Input
              value={frontCamber}
              onChange={(e) => setFrontCamber(e.target.value)}
              suffix="°"
              placeholder="-2.5"
            />
            <p className="text-xs text-gray-500 mt-1">ネガティブ値を入力（例: -2.5）</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">リア</label>
            <Input
              value={rearCamber}
              onChange={(e) => setRearCamber(e.target.value)}
              suffix="°"
              placeholder="-1.5"
            />
            <p className="text-xs text-gray-500 mt-1">ネガティブ値を入力（例: -1.5）</p>
          </div>
        </div>
      </div>

      {/* トー角 */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">トー角</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">フロント</label>
            <Input
              value={frontToe}
              onChange={(e) => setFrontToe(e.target.value)}
              suffix="mm"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">トーイン: 正の値、トーアウト: 負の値</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">リア</label>
            <Input
              value={rearToe}
              onChange={(e) => setRearToe(e.target.value)}
              suffix="mm"
              placeholder="2"
            />
            <p className="text-xs text-gray-500 mt-1">トーイン: 正の値、トーアウト: 負の値</p>
          </div>
        </div>
      </div>

      {/* キャスター角 */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">キャスター角</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャスター</label>
            <Input
              value={caster}
              onChange={(e) => setCaster(e.target.value)}
              suffix="°"
              placeholder="5.5"
            />
            <p className="text-xs text-gray-500 mt-1">通常は正の値（例: 5.5）</p>
          </div>
        </div>
      </div>

      {/* 参考情報 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          <i className="fas fa-info-circle mr-2"></i>
          アライメント調整の目安
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• キャンバー: グリップ重視なら大きめのネガティブ値</p>
          <p>• トー: 直進安定性重視ならトーイン、回頭性重視ならトーアウト</p>
          <p>• キャスター: 大きいほど直進安定性向上、小さいほど軽快なハンドリング</p>
        </div>
      </div>
    </div>
  );
};