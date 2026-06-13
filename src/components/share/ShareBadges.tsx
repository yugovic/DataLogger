// 共有状態・証憑を示す小バッジ群（履歴カード・共有ブラウズで共用）。
//
// - 共有中バッジ: visibility==='shared' のとき表示（青系）
// - 匿名バッジ: anonymized のとき表示
// - ロガー証憑バッジ: lapTimeData.source==='logger' のとき表示（緑系）。
//   マーケットプレイスの商品規格の根幹（BUSINESS_PLAN: 品質保証）。
//
// 純粋ヘルパー（isShared / hasLoggerEvidence）は fast-refresh のため
// shareUtils.ts に分離している。

import React from 'react';
import { ShareAltOutlined, EyeInvisibleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

export const SharedBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
    <ShareAltOutlined style={{ fontSize: 11 }} />
    共有中
  </span>
);

export const AnonymizedBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
    <EyeInvisibleOutlined style={{ fontSize: 11 }} />
    匿名
  </span>
);

/** ロガー証憑バッジ（緑系） */
export const LoggerEvidenceBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
    <SafetyCertificateOutlined style={{ fontSize: 11 }} />
    ロガー証憑
  </span>
);
