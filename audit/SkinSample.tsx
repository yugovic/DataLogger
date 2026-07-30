// 洗練モードのスキン層を計測するための見本。
//
// Dashboard / SetupHistory / SetupCompare は Firestore と認証に依存していて
// 単体では描画できない。そこで、それらの画面が実際に使っている dark: の
// 配色ユーティリティだけを抜き出して並べ、コントラストを実測する。
//
// 画面側で新しい色を使い始めたら、ここにも足すこと。足し忘れると
// 「測っていないのに通っている」状態になる。
import React from 'react';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="border-b border-gray-200 py-3 dark:border-gray-700">
    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {label}
    </div>
    {children}
  </div>
);

export const SkinSample: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900">
    <h1 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">セットアップ履歴</h1>

    <Row label="カード面">
      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <div className="text-lg font-bold text-gray-800 dark:text-gray-200">鈴鹿サーキット</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">2026-07-29 ・ 晴れ</div>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">FL 218 / FR 222 kPa</div>
      </div>
    </Row>

    <Row label="入れ子の面">
      <div className="rounded-lg bg-white p-3 dark:bg-gray-800">
        <div className="rounded bg-gray-100 p-3 dark:bg-gray-700">
          <span className="text-sm text-gray-800 dark:text-gray-200">ベストラップ 1:58.423</span>
        </div>
      </div>
    </Row>

    <Row label="意味を持つ色">
      <div className="flex flex-wrap gap-3 rounded-lg bg-white p-3 dark:bg-gray-800">
        <span className="text-sm font-bold text-green-700 dark:text-green-400">レンジ内</span>
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">ベスト更新</span>
        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">要確認</span>
        <span className="text-sm font-bold text-red-700 dark:text-red-400">レンジ外</span>
        <span className="text-sm font-bold text-blue-700 dark:text-blue-400">詳細を見る</span>
        <span className="text-sm font-bold text-violet-700 dark:text-violet-400">共有済み</span>
      </div>
    </Row>

    <Row label="slate 系（比較ビュー）">
      <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
        <div className="text-sm text-slate-900 dark:text-slate-100">セッションA</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">差分 −0.412s</div>
        <div className="mt-2 rounded border border-slate-200 p-2 dark:border-slate-800">
          <span className="text-sm text-slate-700 dark:text-slate-300">タイヤ: RE-71RS</span>
        </div>
      </div>
    </Row>

    <Row label="操作">
      <div className="flex gap-2">
        <button type="button" className="rounded-lg bg-blue-800 px-4 font-bold text-white" style={{ minHeight: 60 }}>
          保存
        </button>
        <button
          type="button"
          className="rounded-lg border-2 border-gray-700 px-4 font-bold text-gray-900 dark:border-gray-600 dark:text-gray-200"
          style={{ minHeight: 60 }}
        >
          複製
        </button>
      </div>
    </Row>
  </div>
);
