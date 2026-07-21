import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Tabs, Button, Select, message, Empty, Input, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, CameraOutlined, CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';
import { LapTime, LapType } from '../../../types/setup';
import { formatCompactLapTimeInput } from '../../../lib/lapTimeInput';

const { Option } = Select;

interface LapTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (laps: LapTime[], bestLap: string, totalLaps: number) => void;
  initialLaps?: LapTime[];
  /** ロガー証憑つきラップを編集中（保存すると証憑が外れることを警告表示） */
  evidenceActive?: boolean;
}

export const LapTimeModal: React.FC<LapTimeModalProps> = ({
  visible,
  onClose,
  onSave,
  initialLaps = [],
  evidenceActive = false
}) => {
  const { t } = useTranslation();
  const [laps, setLaps] = useState<LapTime[]>(initialLaps);
  const [activeTab, setActiveTab] = useState('manual');
  const [csvText, setCsvText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'keyboard' | 'button' | 'wheel'>('keyboard');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const lastInputRef = useRef<HTMLDivElement>(null);

  // ホイール入力用の選択値
  const [wheelMinutes, setWheelMinutes] = useState(1);
  const [wheelSeconds, setWheelSeconds] = useState(30);
  const [wheelMilliseconds, setWheelMilliseconds] = useState(0);

  // 入力文字列を正規化: 全角→半角、各種区切りを統一
  const normalizeTimeInput = (input: string): string => {
    // 全角数字→半角
    let s = input.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    // 全角コロン・全角ピリオド→半角
    s = s.replace(/：/g, ':').replace(/．/g, '.').replace(/，/g, ',');
    // カンマ小数点 → ピリオド
    s = s.replace(/,/g, '.');
    // ハイフン系（-‐–—）→コロン（分秒区切りとして誤入力）
    s = s.replace(/[‐–—]/g, '-').replace(/-/g, ':');
    // ピリオドが2つ以上ある場合、最初をコロンに変換（1.58.423 → 1:58.423）
    const dots = s.split('.');
    if (dots.length >= 3) {
      s = dots[0] + ':' + dots.slice(1).join('.');
    }
    // スペース区切り → コロン
    s = s.replace(/\s+/g, ':');
    // 連続する区切り記号を1つに
    s = s.replace(/[:.]+/g, (m) => (m.includes(':') ? ':' : '.'));
    return s;
  };

  // 時間文字列をパース（区切り文字に寛容）
  const parseTimeString = (timeStr: string): { minutes: number; seconds: number; milliseconds: number } => {
    const normalized = normalizeTimeInput(timeStr);
    // M:SS.mmm
    const match = normalized.match(/^(\d+):(\d{1,2})\.(\d{1,3})$/);
    if (match) {
      return {
        minutes: parseInt(match[1]),
        seconds: parseInt(match[2]),
        milliseconds: parseInt(match[3].padEnd(3, '0'))
      };
    }
    // SS.mmm（分なし）
    const match2 = normalized.match(/^(\d{1,2})\.(\d{1,3})$/);
    if (match2) {
      return {
        minutes: 0,
        seconds: parseInt(match2[1]),
        milliseconds: parseInt(match2[2].padEnd(3, '0'))
      };
    }
    // M:SS（ミリ秒なし）
    const match3 = normalized.match(/^(\d+):(\d{1,2})$/);
    if (match3) {
      return {
        minutes: parseInt(match3[1]),
        seconds: parseInt(match3[2]),
        milliseconds: 0
      };
    }
    return { minutes: 1, seconds: 30, milliseconds: 0 };
  };

  // 時間をフォーマット
  const formatTime = (minutes: number, seconds: number, milliseconds: number): string => {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // 初期化時に既存のラップタイムをパース
  useEffect(() => {
    if (initialLaps.length > 0) {
      const parsedLaps = initialLaps.map(lap => {
        const parsed = parseTimeString(lap.time);
        return {
          ...lap,
          ...parsed
        };
      });
      setLaps(parsedLaps);
    }
  }, [initialLaps]);

  const addLap = () => {
    let newLap: LapTime;
    
    if (inputMode === 'wheel') {
      // ホイール入力の場合は現在の選択値を使用
      newLap = {
        lapNumber: laps.length + 1,
        time: formatTime(wheelMinutes, wheelSeconds, wheelMilliseconds),
        type: 'NORMAL',
        minutes: wheelMinutes,
        seconds: wheelSeconds,
        milliseconds: wheelMilliseconds
      };
    } else if (inputMode === 'keyboard') {
      // キーボード入力の場合は空の値で開始
      newLap = {
        lapNumber: laps.length + 1,
        time: '',
        type: 'NORMAL',
        minutes: 0,
        seconds: 0,
        milliseconds: 0
      };
    } else if (laps.length > 0) {
      // ボタン入力で前のラップの値をコピー
      const lastLap = laps[laps.length - 1];
      newLap = {
        lapNumber: laps.length + 1,
        time: lastLap.time,
        type: 'NORMAL',
        minutes: lastLap.minutes,
        seconds: lastLap.seconds,
        milliseconds: lastLap.milliseconds
      };
    } else {
      // ボタン入力の初期値
      newLap = {
        lapNumber: 1,
        time: '1:30.000',
        type: 'NORMAL',
        minutes: 1,
        seconds: 30,
        milliseconds: 0
      };
    }
    
    setLaps([...laps, newLap]);
    
    // 新しいラップにフォーカスを移動
    setTimeout(() => {
      lastInputRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const updateLapTime = (index: number, field: 'minutes' | 'seconds' | 'milliseconds', delta: number) => {
    const updatedLaps = [...laps];
    const lap = updatedLaps[index];
    
    if (!lap.minutes) lap.minutes = 0;
    if (!lap.seconds) lap.seconds = 0;
    if (!lap.milliseconds) lap.milliseconds = 0;
    
    switch (field) {
      case 'minutes':
        lap.minutes = Math.max(0, Math.min(9, lap.minutes + delta));
        break;
      case 'seconds':
        let newSeconds = lap.seconds + delta;
        if (newSeconds >= 60) {
          lap.minutes = Math.min(9, lap.minutes + 1);
          newSeconds = 0;
        } else if (newSeconds < 0) {
          if (lap.minutes > 0) {
            lap.minutes--;
            newSeconds = 59;
          } else {
            newSeconds = 0;
          }
        }
        lap.seconds = newSeconds;
        break;
      case 'milliseconds':
        let newMillis = lap.milliseconds + delta;
        if (newMillis >= 1000) {
          lap.seconds = Math.min(59, lap.seconds + 1);
          if (lap.seconds === 0) {
            lap.minutes = Math.min(9, lap.minutes + 1);
          }
          newMillis = newMillis - 1000;
        } else if (newMillis < 0) {
          if (lap.seconds > 0 || lap.minutes > 0) {
            if (lap.seconds === 0 && lap.minutes > 0) {
              lap.minutes--;
              lap.seconds = 59;
            } else if (lap.seconds > 0) {
              lap.seconds--;
            }
            newMillis = 900 + newMillis;
          } else {
            newMillis = 0;
          }
        }
        lap.milliseconds = newMillis;
        break;
    }
    
    lap.time = formatTime(lap.minutes, lap.seconds, lap.milliseconds);
    setLaps(updatedLaps);
  };

  const updateLapTimeByDigit = (index: number, position: string, delta: number) => {
    const updatedLaps = [...laps];
    const lap = updatedLaps[index];
    
    if (!lap.minutes) lap.minutes = 0;
    if (!lap.seconds) lap.seconds = 0; 
    if (!lap.milliseconds) lap.milliseconds = 0;

    switch (position) {
      case 'min':
        lap.minutes = (lap.minutes + delta + 10) % 10;
        break;
      case 'sec10':
        const sec10 = Math.floor(lap.seconds / 10);
        const sec1 = lap.seconds % 10;
        lap.seconds = ((sec10 + delta + 6) % 6) * 10 + sec1;
        break;
      case 'sec1':
        const sec10_2 = Math.floor(lap.seconds / 10);
        const sec1_2 = lap.seconds % 10;
        lap.seconds = sec10_2 * 10 + ((sec1_2 + delta + 10) % 10);
        break;
      case 'ms100':
        const ms100 = Math.floor(lap.milliseconds / 100);
        const ms10 = Math.floor((lap.milliseconds % 100) / 10);
        const ms1 = lap.milliseconds % 10;
        lap.milliseconds = ((ms100 + delta + 10) % 10) * 100 + ms10 * 10 + ms1;
        break;
      case 'ms10':
        const ms100_2 = Math.floor(lap.milliseconds / 100);
        const ms10_2 = Math.floor((lap.milliseconds % 100) / 10);
        const ms1_2 = lap.milliseconds % 10;
        lap.milliseconds = ms100_2 * 100 + ((ms10_2 + delta + 10) % 10) * 10 + ms1_2;
        break;
      case 'ms1':
        const ms100_3 = Math.floor(lap.milliseconds / 100);
        const ms10_3 = Math.floor((lap.milliseconds % 100) / 10);
        const ms1_3 = lap.milliseconds % 10;
        lap.milliseconds = ms100_3 * 100 + ms10_3 * 10 + ((ms1_3 + delta + 10) % 10);
        break;
    }
    
    lap.time = formatTime(lap.minutes, lap.seconds, lap.milliseconds);
    setLaps(updatedLaps);
  };

  const updateLapType = (index: number, type: LapType) => {
    const updatedLaps = [...laps];
    updatedLaps[index].type = type;
    setLaps(updatedLaps);
  };

  const updateLapTimeString = (index: number, timeStr: string) => {
    const updatedLaps = [...laps];
    updatedLaps[index].time = timeStr;
    
    // パースして内部の値も更新
    const parsed = parseTimeString(timeStr);
    updatedLaps[index].minutes = parsed.minutes;
    updatedLaps[index].seconds = parsed.seconds;
    updatedLaps[index].milliseconds = parsed.milliseconds;
    
    setLaps(updatedLaps);
  };

  // 入力途中の数字は変換せず保持し、ユーザーが6桁を続けて入力できるようにする。
  const updateLapTimeRaw = (index: number, timeStr: string) => {
    const updatedLaps = [...laps];
    updatedLaps[index] = { ...updatedLaps[index], time: timeStr };
    setLaps(updatedLaps);
  };

  // 数字のみの入力を自動フォーマット
  const formatNumericInput = (input: string): string => {
    return formatCompactLapTimeInput(input);
  };

  const deleteLap = (index: number) => {
    const updatedLaps = laps.filter((_, i) => i !== index);
    // ラップ番号を再計算
    const renumberedLaps = updatedLaps.map((lap, i) => ({
      ...lap,
      lapNumber: i + 1
    }));
    setLaps(renumberedLaps);
  };

  const handleSave = () => {
    // ベストラップを計算
    let bestLap = '';
    let bestTime = Infinity;
    
    laps.forEach(lap => {
      const totalMs = (lap.minutes || 0) * 60000 + (lap.seconds || 0) * 1000 + (lap.milliseconds || 0);
      if (totalMs < bestTime && totalMs > 0) {
        bestTime = totalMs;
        bestLap = lap.time;
      }
    });
    
    onSave(laps, bestLap, laps.length);
    onClose();
  };

  const handleOCRClick = () => {
    message.info(t('setupTabs.lapTime.ocrPreparing'));
  };

  // Enterキーで次のラップを追加
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && inputMode === 'keyboard') {
      e.preventDefault();
      addLap();
    }
  };

  const renderKeyboardInput = (lap: LapTime, index: number) => (
    <div className="flex items-center space-x-3">
      <Input
        value={focusedIndex === index ? lap.time : (lap.time || '')}
        onChange={(e) => {
          const input = e.target.value;
          if (input === '') {
            updateLapTimeString(index, '');
            return;
          }
          // 数字のみの場合は自動フォーマット
          if (/^\d*$/.test(input)) {
            if (input.length < 6) {
              updateLapTimeRaw(index, input);
              return;
            }
            const formatted = formatNumericInput(input);
            updateLapTimeString(index, formatted);
            return;
          }
          // 区切り文字付き入力は正規化してパース → フォーマット
          const normalized = normalizeTimeInput(input);
          const parsed = parseTimeString(normalized);
          const formatted = formatTime(parsed.minutes, parsed.seconds, parsed.milliseconds);
          updateLapTimeString(index, formatted);
        }}
        onFocus={() => {
          setFocusedIndex(index);
          // 初期値がある場合、フォーカス時にクリア（ユーザーが入力開始時）
          if (lap.time && lap.time !== '') {
            // 少し遅延させて、ユーザーが入力を開始したら値をクリア
            const currentValue = lap.time;
            setTimeout(() => {
              if (focusedIndex === index && laps[index].time === currentValue) {
                updateLapTimeString(index, '');
              }
            }, 100);
          }
        }}
        onBlur={() => {
          setFocusedIndex(null);
          if (/^\d+$/.test(lap.time)) {
            updateLapTimeString(index, formatNumericInput(lap.time));
            return;
          }
          // 空のままなら元の値を復元
          if (!lap.time && (lap.minutes || lap.seconds || lap.milliseconds)) {
            updateLapTimeString(index, formatTime(lap.minutes || 0, lap.seconds || 0, lap.milliseconds || 0));
          }
        }}
        placeholder={t('setupTabs.lapTime.timeInputPlaceholder')}
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addLap();
          }
        }}
      />
      <div className="flex items-center space-x-1">
        <button
          className="px-2 py-1 hover:bg-gray-200 rounded"
          onClick={() => updateLapTime(index, 'seconds', 1)}
        >
          <CaretUpOutlined />
        </button>
        <button
          className="px-2 py-1 hover:bg-gray-200 rounded"
          onClick={() => updateLapTime(index, 'seconds', -1)}
        >
          <CaretDownOutlined />
        </button>
      </div>
    </div>
  );

  const renderButtonInput = (lap: LapTime, index: number) => (
    <div className="flex items-center space-x-2">
      {/* 分 */}
      <div className="flex flex-col items-center">
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'min', 1)}
        >
          <CaretUpOutlined className="text-xs" />
        </button>
        <div className="px-3 py-1 bg-white border rounded text-center text-lg font-mono">
          {lap.minutes || 0}
        </div>
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'min', -1)}
        >
          <CaretDownOutlined className="text-xs" />
        </button>
      </div>
      
      <span className="text-lg font-bold">:</span>
      
      {/* 秒（10の位） */}
      <div className="flex flex-col items-center">
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'sec10', 1)}
        >
          <CaretUpOutlined className="text-xs" />
        </button>
        <div className="px-2 py-1 bg-white border rounded text-center text-lg font-mono">
          {Math.floor((lap.seconds || 0) / 10)}
        </div>
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'sec10', -1)}
        >
          <CaretDownOutlined className="text-xs" />
        </button>
      </div>
      
      {/* 秒（1の位） */}
      <div className="flex flex-col items-center">
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'sec1', 1)}
        >
          <CaretUpOutlined className="text-xs" />
        </button>
        <div className="px-2 py-1 bg-white border rounded text-center text-lg font-mono">
          {(lap.seconds || 0) % 10}
        </div>
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'sec1', -1)}
        >
          <CaretDownOutlined className="text-xs" />
        </button>
      </div>
      
      <span className="text-lg font-bold">.</span>
      
      {/* ミリ秒（100の位） */}
      <div className="flex flex-col items-center">
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'ms100', 1)}
        >
          <CaretUpOutlined className="text-xs" />
        </button>
        <div className="px-2 py-1 bg-white border rounded text-center text-lg font-mono">
          {Math.floor((lap.milliseconds || 0) / 100)}
        </div>
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'ms100', -1)}
        >
          <CaretDownOutlined className="text-xs" />
        </button>
      </div>
      
      {/* ミリ秒（10の位） */}
      <div className="flex flex-col items-center">
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'ms10', 1)}
        >
          <CaretUpOutlined className="text-xs" />
        </button>
        <div className="px-2 py-1 bg-white border rounded text-center text-lg font-mono">
          {Math.floor((lap.milliseconds || 0) % 100 / 10)}
        </div>
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'ms10', -1)}
        >
          <CaretDownOutlined className="text-xs" />
        </button>
      </div>
      
      {/* ミリ秒（1の位） */}
      <div className="flex flex-col items-center">
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'ms1', 1)}
        >
          <CaretUpOutlined className="text-xs" />
        </button>
        <div className="px-2 py-1 bg-white border rounded text-center text-lg font-mono">
          {(lap.milliseconds || 0) % 10}
        </div>
        <button
          className="px-2 py-0.5 hover:bg-gray-200 rounded"
          onClick={() => updateLapTimeByDigit(index, 'ms1', -1)}
        >
          <CaretDownOutlined className="text-xs" />
        </button>
      </div>
    </div>
  );

  const renderWheelInput = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="text-2xl font-mono mb-2">
          {formatTime(wheelMinutes, wheelSeconds, wheelMilliseconds)}
        </div>
        <div className="text-sm text-gray-500">
          {t('setupTabs.lapTime.wheelHint')}
        </div>
      </div>
      
      <div className="flex items-center justify-center space-x-4 bg-gray-50 rounded-lg p-6">
        {/* 分 */}
        <div className="flex flex-col items-center">
          <button
            className="px-3 py-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => setWheelMinutes(Math.min(9, wheelMinutes + 1))}
          >
            <CaretUpOutlined className="text-xl" />
          </button>
          <div 
            className="bg-white border-2 border-gray-300 rounded-lg px-6 py-4 my-2 cursor-pointer select-none"
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setWheelMinutes(Math.min(9, wheelMinutes + 1));
              } else {
                setWheelMinutes(Math.max(0, wheelMinutes - 1));
              }
            }}
          >
            <div className="text-3xl font-mono font-bold">{wheelMinutes}</div>
            <div className="text-xs text-gray-500 mt-1">{t('setupTabs.lapTime.minuteLabel')}</div>
          </div>
          <button
            className="px-3 py-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => setWheelMinutes(Math.max(0, wheelMinutes - 1))}
          >
            <CaretDownOutlined className="text-xl" />
          </button>
        </div>
        
        <div className="text-3xl font-bold text-gray-400">:</div>
        
        {/* 秒 */}
        <div className="flex flex-col items-center">
          <button
            className="px-3 py-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => {
              if (wheelSeconds >= 59) {
                setWheelSeconds(0);
                setWheelMinutes(Math.min(9, wheelMinutes + 1));
              } else {
                setWheelSeconds(wheelSeconds + 1);
              }
            }}
          >
            <CaretUpOutlined className="text-xl" />
          </button>
          <div 
            className="bg-white border-2 border-gray-300 rounded-lg px-6 py-4 my-2 cursor-pointer select-none"
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                if (wheelSeconds >= 59) {
                  setWheelSeconds(0);
                  setWheelMinutes(Math.min(9, wheelMinutes + 1));
                } else {
                  setWheelSeconds(wheelSeconds + 1);
                }
              } else {
                if (wheelSeconds <= 0 && wheelMinutes > 0) {
                  setWheelSeconds(59);
                  setWheelMinutes(wheelMinutes - 1);
                } else {
                  setWheelSeconds(Math.max(0, wheelSeconds - 1));
                }
              }
            }}
          >
            <div className="text-3xl font-mono font-bold">
              {wheelSeconds.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500 mt-1">{t('setupTabs.lapTime.secondLabel')}</div>
          </div>
          <button
            className="px-3 py-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => {
              if (wheelSeconds <= 0 && wheelMinutes > 0) {
                setWheelSeconds(59);
                setWheelMinutes(wheelMinutes - 1);
              } else {
                setWheelSeconds(Math.max(0, wheelSeconds - 1));
              }
            }}
          >
            <CaretDownOutlined className="text-xl" />
          </button>
        </div>
        
        <div className="text-3xl font-bold text-gray-400">.</div>
        
        {/* ミリ秒 */}
        <div className="flex flex-col items-center">
          <button
            className="px-3 py-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => setWheelMilliseconds((wheelMilliseconds + 10) % 1000)}
          >
            <CaretUpOutlined className="text-xl" />
          </button>
          <div 
            className="bg-white border-2 border-gray-300 rounded-lg px-6 py-4 my-2 cursor-pointer select-none"
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setWheelMilliseconds((wheelMilliseconds + 10) % 1000);
              } else {
                setWheelMilliseconds((wheelMilliseconds - 10 + 1000) % 1000);
              }
            }}
          >
            <div className="text-3xl font-mono font-bold">
              {wheelMilliseconds.toString().padStart(3, '0')}
            </div>
            <div className="text-xs text-gray-500 mt-1">{t('setupTabs.lapTime.millisecondLabel')}</div>
          </div>
          <button
            className="px-3 py-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => setWheelMilliseconds((wheelMilliseconds - 10 + 1000) % 1000)}
          >
            <CaretDownOutlined className="text-xl" />
          </button>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={addLap}
          size="large"
        >
          {t('setupTabs.lapTime.addLapWithThisTime')}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      title={t('setupTabs.lapTime.title')}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          {t('common.save')}
        </Button>
      ]}
    >
      {/* 証憑の整合性ルール: logger 由来のラップを手動編集すると証憑が外れる */}
      {evidenceActive && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message={t('setupTabs.lapTime.evidenceWarningTitle')}
          description={t('setupTabs.lapTime.evidenceWarningDesc')}
        />
      )}
      <Tabs activeKey={activeTab} onChange={setActiveTab}
        items={[
          {
            key: 'manual',
            label: t('setupTabs.lapTime.manualTab'),
            children: (
          <div className="space-y-4" onKeyDown={handleKeyDown}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{t('setupTabs.lapTime.inputMethod')}</span>
                <div className="flex items-center space-x-2">
                  <button
                    className={`px-3 py-1 rounded ${inputMode === 'keyboard' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setInputMode('keyboard')}
                  >
                    {t('setupTabs.lapTime.keyboardMode')}
                  </button>
                  <button
                    className={`px-3 py-1 rounded ${inputMode === 'button' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setInputMode('button')}
                  >
                    {t('setupTabs.lapTime.buttonMode')}
                  </button>
                  <button
                    className={`px-3 py-1 rounded ${inputMode === 'wheel' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setInputMode('wheel')}
                  >
                    {t('setupTabs.lapTime.wheelMode')}
                  </button>
                </div>
              </div>
              {inputMode !== 'wheel' && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addLap}
                >
                  {t('setupTabs.lapTime.addLap')}
                </Button>
              )}
            </div>
            
            {inputMode === 'keyboard' && (
              <div className="text-sm text-gray-500 mb-2">
                {t('setupTabs.lapTime.keyboardHint')}
              </div>
            )}
            
            {inputMode === 'wheel' ? (
              renderWheelInput()
            ) : (
              <>
                {laps.length === 0 ? (
                  <Empty
                    description={t('setupTabs.lapTime.noLapData')}
                    className="py-8"
                  >
                    <Button type="primary" onClick={addLap}>
                      {t('setupTabs.lapTime.addFirstLap')}
                    </Button>
                  </Empty>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {laps.map((lap, index) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                        ref={index === laps.length - 1 ? lastInputRef : null}
                      >
                        <span className="w-16 text-sm font-medium">
                          Lap {lap.lapNumber}
                        </span>
                        
                        {inputMode === 'keyboard' 
                          ? renderKeyboardInput(lap, index)
                          : renderButtonInput(lap, index)
                        }
                        
                        <Select
                          value={lap.type}
                          onChange={(value) => updateLapType(index, value as LapType)}
                          className="w-24"
                        >
                          <Option value="IN">IN</Option>
                          <Option value="NORMAL">{t('setupTabs.lapTime.normalType')}</Option>
                          <Option value="OUT">OUT</Option>
                        </Select>
                        
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => deleteLap(index)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {inputMode === 'wheel' && laps.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{t('setupTabs.lapTime.addedLaps')}</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {laps.map((lap, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        Lap {lap.lapNumber}: {lap.time}
                      </span>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteLap(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
            )
          },
          {
            key: 'csv',
            label: t('setupTabs.lapTime.csvTab'),
            children: (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  {t('setupTabs.lapTime.csvHint')}
                </div>
                <Input.TextArea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={t('setupTabs.lapTime.csvPlaceholder')}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const text = csvText || '';
                      // タイムのパターンを全部拾う（1:23.456 または 123456）
                      const times: string[] = [];
                      const regex = /(\d+:\d{2}\.\d{3})/g;
                      let m: RegExpExecArray | null;
                      while ((m = regex.exec(text)) !== null) {
                        times.push(m[1]);
                      }
                      // 数字のみのものも取り込む
                      const numOnly = text.split(/[\s,]+/).filter(x => /^\d{3,}$/.test(x));
                      numOnly.forEach(n => {
                        // 右詰めフォーマット
                        const digits = n.replace(/\D/g, '');
                        if (digits.length >= 4) {
                          let formatted = '';
                          if (digits.length <= 5) {
                            const seconds = digits.slice(0, -3);
                            const millis = digits.slice(-3);
                            formatted = `0:${seconds.padStart(2, '0')}.${millis}`;
                          } else {
                            const minutes = digits.slice(0, -5);
                            const seconds = digits.slice(-5, -3);
                            const millis = digits.slice(-3);
                            formatted = `${minutes}:${seconds}.${millis}`;
                          }
                          times.push(formatted);
                        }
                      });

                      if (times.length === 0) {
                        message.warning(t('setupTabs.lapTime.noTimeDetected'));
                        return;
                      }
                      const newLaps: LapTime[] = times.map((t, i) => {
                        const p = parseTimeString(t);
                        return { lapNumber: i + 1, time: t, type: 'NORMAL', minutes: p.minutes, seconds: p.seconds, milliseconds: p.milliseconds };
                      });
                      setLaps(newLaps);
                      message.success(t('setupTabs.lapTime.lapsImported', { count: newLaps.length }));
                      setActiveTab('manual');
                    }}
                  >
                    {t('setupTabs.lapTime.importAndReplace')}
                  </Button>
                  <Button onClick={() => setCsvText('')}>{t('setupTabs.lapTime.clear')}</Button>
                </div>
              </div>
            )
          },
          {
            key: 'ocr',
            label: t('setupTabs.lapTime.ocrTab'),
            disabled: true,
            children: (
          <div className="text-center py-12">
            <CameraOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">
              {t('setupTabs.lapTime.ocrPreparing')}
            </p>
            <p className="text-sm text-gray-400">
              {t('setupTabs.lapTime.ocrFutureDesc')}
            </p>
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={handleOCRClick}
              className="mt-6"
              disabled
            >
              {t('setupTabs.lapTime.startCameraPreparing')}
            </Button>
          </div>
            )
          }
        ]}
      />
    </Modal>
  );
};
