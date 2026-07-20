import React from 'react';
import { Card, Tag, Tooltip, Checkbox, Modal, message } from 'antd';
import { CalendarOutlined, CarOutlined, EnvironmentOutlined, EditOutlined, CopyOutlined, SwapOutlined, UserOutlined, DashboardOutlined, DeleteOutlined } from '@ant-design/icons';
import { CarSetup } from '../../types/setup';
import { displayValue, pressureSummary } from '../../lib/setupFields';
import { buildCopyPath } from '../../lib/setupNavigation';
import { ShareToggle } from '../share/ShareToggle';
import { SharedBadge, AnonymizedBadge, LoggerEvidenceBadge } from '../share/ShareBadges';
import { PublicShareButton } from '../share/PublicShareButton';
import { isShared, hasLoggerEvidence } from '../share/shareUtils';
import { deleteSetup } from '../../services/setupService';
import { normalizeWeather } from '../../lib/weather';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import { formatDateTime } from '../../i18n/formatters';

interface SetupCardProps {
  setup: CarSetup;
  /** 選択モード（比較用）。true のとき選択チェックボックスを表示 */
  selectable?: boolean;
  /** このカードが選択されているか */
  selected?: boolean;
  /** 選択トグル */
  onToggleSelect?: (id: string) => void;
  /** 「前回と比較」押下（直前のセットアップと比較） */
  onCompareWithPrevious?: (id: string) => void;
  /** 「前回と比較」を表示できるか（直前データが存在するか） */
  hasPrevious?: boolean;
  /** 共有切替を有効にするか（自分のデータの履歴では true）。true で共有トグルを表示 */
  shareable?: boolean;
  /** 共有状態が変わったときに親へ通知（一覧のローカル更新用） */
  onVisibilityChanged?: (id: string, next: { visibility: 'private' | 'shared'; anonymized: boolean }) => void;
  /** 削除成功時に親へ通知（一覧からカードを消すため） */
  onDeleted?: (id: string) => void;
}

export const SetupCard: React.FC<SetupCardProps> = ({
  setup,
  selectable = false,
  selected = false,
  onToggleSelect,
  onCompareWithPrevious,
  hasPrevious = false,
  shareable = false,
  onVisibilityChanged,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'practice':
        return { label: t('common.sessionType.practice'), color: 'blue' };
      case 'qualifying':
        return { label: t('common.sessionType.qualifying'), color: 'orange' };
      case 'race':
        return { label: t('common.sessionType.race'), color: 'red' };
      default:
        return { label: t('common.sessionType.unknown'), color: 'default' };
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (normalizeWeather(condition)) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'wet':
        return '🌧️';
      case 'full_wet':
        return '⛈️';
      default:
        return '🌤️';
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!setup.id) return;
    const shared = isShared(setup);
    Modal.confirm({
      title: t('history.card.delete.title'),
      content: (
        <div>
          <p>{t('history.card.delete.content')}</p>
          {shared && <p className="text-red-500">{t('history.card.delete.shared')}</p>}
        </div>
      ),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteSetup(setup.id as string);
          message.success(t('history.card.delete.success'));
          onDeleted?.(setup.id as string);
        } catch {
          message.error(t('history.card.delete.error'));
        }
      },
    });
  };

  const sessionType = getSessionTypeLabel(setup.sessionType);
  const recordedAdjustments = (setup.adjustmentValues ?? []).filter(
    (entry) => entry.value !== null && entry.value !== '',
  );
  const knowledgeItems = [
    { label: t('history.card.knowledge.intention'), value: setup.knowledge?.intention },
    { label: t('history.card.knowledge.result'), value: setup.knowledge?.result },
    { label: t('history.card.knowledge.learning'), value: setup.knowledge?.learning }
  ]
    .map((item) => ({ ...item, value: item.value?.trim() }))
    .filter((item) => item.value);
  const summarizeText = (value: string, maxLength = 44) => {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}…`;
  };

  return (
    <Card
      hoverable
      className={`shadow-sm hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}
      styles={{ body: { padding: '16px' } }}
    >
      <div className="space-y-3">
        {/* ヘッダー：日付とアクションボタン */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            {selectable && setup.id && (
              <Checkbox
                checked={selected}
                onChange={() => onToggleSelect?.(setup.id as string)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
            )}
            <div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                <CalendarOutlined className="mr-2" />
                <span className="text-sm dark:text-gray-300">{formatDateTime(setup.date, locale)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag color={sessionType.color} className="!mr-0">{sessionType.label}</Tag>
                {isShared(setup) && <SharedBadge />}
                {isShared(setup) && setup.anonymized && <AnonymizedBadge />}
                {hasLoggerEvidence(setup) && <LoggerEvidenceBadge />}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {shareable && setup.id && (
              <>
                <PublicShareButton setup={setup} />
                <ShareToggle
                  setup={setup}
                  onChanged={(next) => onVisibilityChanged?.(setup.id as string, next)}
                />
              </>
            )}
            {hasPrevious && setup.id && (
              <Tooltip title={t('history.card.actions.comparePrevious')}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompareWithPrevious?.(setup.id as string);
                  }}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                  <SwapOutlined style={{ fontSize: '16px' }} />
                </button>
              </Tooltip>
            )}
            <Tooltip title={t('common.edit')}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/setup/${setup.id}`;
                }}
                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
              >
                <EditOutlined style={{ fontSize: '16px' }} />
              </button>
            </Tooltip>
            <Tooltip title={t('history.card.actions.copy')}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = buildCopyPath(setup.id as string);
                }}
                className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-md transition-colors"
              >
                <CopyOutlined style={{ fontSize: '16px' }} />
              </button>
            </Tooltip>
            <div className="ml-1 pl-1 border-l border-gray-200 dark:border-gray-700">
              <Tooltip title={t('common.delete')}>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                >
                  <DeleteOutlined style={{ fontSize: '16px' }} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* メイン情報 */}
        <div>
          <div className="flex items-center justify-between text-gray-900 dark:text-gray-100 font-medium text-lg mb-1">
            <div className="flex items-center">
              <EnvironmentOutlined className="mr-2 text-blue-500 dark:text-blue-400" />
              {setup.circuit}
            </div>
            <div className="text-base font-bold text-green-600 dark:text-green-400">
              {setup.lapTimeData?.bestLap ? setup.lapTimeData.bestLap : '—'}
            </div>
          </div>
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm">
            <div className="flex items-center">
              <CarOutlined className="mr-2" />
              {setup.carModel}
            </div>
            {setup.driver && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <UserOutlined className="mr-1" />
                {setup.driver}
              </div>
            )}
          </div>
        </div>

        {/* 主要数値サマリー: 温間後空気圧範囲（kPa） */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 px-3 py-1.5 rounded-md">
          <DashboardOutlined className="mr-2" />
          <span>{t('history.card.hotPressure', { value: pressureSummary(setup) })}</span>
        </div>

        {recordedAdjustments.length > 0 && (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-700/60 dark:text-gray-300">
            <span className="mr-2 font-semibold">{t('history.card.setup')}</span>
            {recordedAdjustments.slice(0, 3).map((entry, index) => (
              <span key={entry.definitionId}>
                {index > 0 ? ' / ' : ''}
                {entry.label} {displayValue(entry.value, entry.unit)}
              </span>
            ))}
            {recordedAdjustments.length > 3 && (
              <span className="ml-2 text-gray-400">{t('history.card.moreItems', { count: recordedAdjustments.length - 3 })}</span>
            )}
          </div>
        )}

        {/* コンディション情報 */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md">
          <div className="flex items-center gap-3">
            <span className="text-lg">{getWeatherIcon(setup.weather.condition ?? '')}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {setup.weather.airTemp != null ? `${setup.weather.airTemp}°C` : '—'} / {setup.weather.trackTemp != null ? `${setup.weather.trackTemp}°C` : '—'}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {setup.tireInfo.tireSetCode ? `${setup.tireInfo.tireSetCode} / ` : ''}
            {setup.tireInfo.productName || setup.tireInfo.brand || '—'} {setup.tireInfo.compound || ''}
          </span>
        </div>

        {knowledgeItems.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500 mb-2">{t('history.card.knowledge.title')}</div>
            <div className="space-y-2">
              {knowledgeItems.map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {item.label}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {summarizeText(item.value as string)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
