// 取込フローの共有パネル群（WP5）
// TelemetryImport（セットアップへの添付フロー）と TelemetryAnalysis
// （分析ページ）の両方で使う表示部品。モバイル1カラム前提。

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { PHASE_LABEL_KEYS } from './useTelemetryImport';

// ─── ファイルドロップ/選択 ──────────────────────────────────

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFile, disabled }) => {
  const { t } = useTranslation();
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
      aria-label={t('telemetry.import.dropZoneAria')}
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
        {t('telemetry.import.dropZonePrompt')}
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        {t('telemetry.import.dropZoneFormats')}
      </p>
      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
        {t('telemetry.import.dropZonePrivacy')}
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
  const { t } = useTranslation();
  if (phase !== 'reading' && phase !== 'parsing' && phase !== 'detecting') return null;
  const steps: ImportPhase[] = ['reading', 'parsing', 'detecting'];
  const current = steps.indexOf(phase);
  return (
    <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-8 text-center">
      <Spin />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{t(PHASE_LABEL_KEYS[phase])}</p>
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

export const ImportErrorPanel: React.FC<ImportErrorPanelProps> = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="w-full rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 px-4 py-5">
      <div className="flex items-start gap-3">
        <ExclamationCircleOutlined className="text-red-500 text-lg mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{t('telemetry.import.errorTitle')}</p>
          <p className="mt-1 text-xs text-red-600/90 dark:text-red-300/80 break-words">{t(message)}</p>
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            {t('telemetry.import.selectAnotherFile')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── セッションサマリー ──────────────────────────────────────

interface SessionSummaryPanelProps {
  result: TelemetryImportResult;
}

export const SessionSummaryPanel: React.FC<SessionSummaryPanelProps> = ({ result }) => {
  const { t } = useTranslation();
  const { session, track, lineSource, detection } = result;
  const meta = session.meta;
  const normalCount = detection.laps.filter((l) => l.type === 'NORMAL').length;

  const facts: string[] = [];
  if (meta.sampleRateHz !== null) facts.push(`${meta.sampleRateHz} Hz`);
  facts.push(t('telemetry.import.factPoints', { count: session.points.length.toLocaleString() }));
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
    facts.push(t('telemetry.import.factLaps', { count: detection.laps.length, measured: normalCount }));
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
            <span className="ml-1.5 text-xs text-gray-400">{t('telemetry.import.trackAutoDetected')}</span>
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">
            {t('telemetry.import.trackNotFound')}
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
            {t('telemetry.import.estimatedLineNote')}
          </p>
        </div>
      )}
    </div>
  );
};
