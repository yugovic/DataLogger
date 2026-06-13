// 取込フローの共有パネル群（WP5）
// TelemetryImport（セットアップへの添付フロー）と TelemetryAnalysis
// （分析ページ）の両方で使う表示部品。モバイル1カラム前提。

import React, { useRef, useState } from 'react';
import { Spin } from 'antd';
import {
  CloudUploadOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { FORMAT_LABELS } from './evidence';
import type { ImportPhase, TelemetryImportResult } from './useTelemetryImport';
import { PHASE_LABELS } from './useTelemetryImport';

// ─── ファイルドロップ/選択 ──────────────────────────────────

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFile, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (disabled) return;
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="ロガーファイルを選択"
      className={`w-full rounded-xl border-2 border-dashed px-4 py-10 sm:py-12 text-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        dragging
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-gray-900/30'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".dtb,.csv,.nmea,.log,.txt"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ''; // 同じファイルの再選択を許す
        }}
      />
      <CloudUploadOutlined className="text-3xl text-blue-500" />
      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
        ロガーファイルをドロップ、またはタップして選択
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        対応形式: DigiSpice .dtb ／ AIM CSV ／ NMEA 0183（RMC）
      </p>
      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
        データはこの端末内で処理されます（生ログはサーバーへ送信・保存されません）
      </p>
    </div>
  );
};

// ─── 処理中インジケータ ──────────────────────────────────────

interface ImportProgressProps {
  phase: ImportPhase;
  fileName?: string;
}

export const ImportProgress: React.FC<ImportProgressProps> = ({ phase, fileName }) => {
  if (phase !== 'reading' && phase !== 'parsing' && phase !== 'detecting') return null;
  const steps: ImportPhase[] = ['reading', 'parsing', 'detecting'];
  const current = steps.indexOf(phase);
  return (
    <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-8 text-center">
      <Spin />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{PHASE_LABELS[phase]}</p>
      {fileName && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 break-all">{fileName}</p>
      )}
      {/* 段階インジケータ */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              i <= current ? 'w-6 bg-blue-500' : 'w-3 bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// ─── エラーパネル ────────────────────────────────────────────

interface ImportErrorPanelProps {
  message: string;
  onRetry: () => void;
}

export const ImportErrorPanel: React.FC<ImportErrorPanelProps> = ({ message, onRetry }) => (
  <div className="w-full rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 px-4 py-5">
    <div className="flex items-start gap-3">
      <ExclamationCircleOutlined className="text-red-500 text-lg mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">取込に失敗しました</p>
        <p className="mt-1 text-xs text-red-600/90 dark:text-red-300/80 break-words">{message}</p>
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          別のファイルを選択
        </button>
      </div>
    </div>
  </div>
);

// ─── セッションサマリー ──────────────────────────────────────

interface SessionSummaryPanelProps {
  result: TelemetryImportResult;
}

export const SessionSummaryPanel: React.FC<SessionSummaryPanelProps> = ({ result }) => {
  const { session, track, lineSource, detection } = result;
  const meta = session.meta;
  const normalCount = detection.laps.filter((l) => l.type === 'NORMAL').length;

  const facts: string[] = [];
  if (meta.sampleRateHz !== null) facts.push(`${meta.sampleRateHz} Hz`);
  facts.push(`${session.points.length.toLocaleString()} 点`);
  if (meta.startTimestamp) {
    facts.push(
      meta.startTimestamp.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  }
  if (detection.laps.length > 0) {
    facts.push(`${detection.laps.length} 周（計測 ${normalCount}）`);
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* ファイル名 + 形式 */}
      <div className="flex flex-wrap items-center gap-2">
        <FileTextOutlined className="text-blue-500" />
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 break-all min-w-0">
          {result.fileName}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
          {FORMAT_LABELS[meta.format]}
        </span>
      </div>

      {/* サーキット判定 */}
      <div className="mt-2 flex items-start gap-2 text-sm">
        <EnvironmentOutlined className="text-violet-500 mt-0.5" />
        {track ? (
          <span className="text-gray-700 dark:text-gray-300">
            {track.name}
            <span className="ml-1.5 text-xs text-gray-400">（GPS軌跡から自動判定）</span>
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">
            コースDB未登録（サーキットを判定できませんでした）
          </span>
        )}
      </div>

      {/* メタ情報 */}
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{facts.join(' ・ ')}</p>

      {/* 自動推定ラインの明示（証憑の正直さ: 基準線が公式ラインでないことを隠さない） */}
      {lineSource === 'estimated' && detection.laps.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
          <WarningOutlined className="text-amber-500 text-xs mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            計測基準線は走行軌跡からの自動推定です（コース公式のコントロールラインとは位置が異なりますが、周回周期＝ラップタイムは同一です）
          </p>
        </div>
      )}
    </div>
  );
};
