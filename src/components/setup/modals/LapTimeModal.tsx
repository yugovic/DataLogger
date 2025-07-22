import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Button, Select, message, Empty, Input, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, CameraOutlined, CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';
import { LapTime, LapType } from '../../../types/setup';

const { TabPane } = Tabs;
const { Option } = Select;

interface LapTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (laps: LapTime[], bestLap: string, totalLaps: number) => void;
  initialLaps?: LapTime[];
}

export const LapTimeModal: React.FC<LapTimeModalProps> = ({
  visible,
  onClose,
  onSave,
  initialLaps = []
}) => {
  const [laps, setLaps] = useState<LapTime[]>(initialLaps);
  const [activeTab, setActiveTab] = useState('manual');
  const [inputMode, setInputMode] = useState<'keyboard' | 'button'>('keyboard');
  const lastInputRef = useRef<HTMLDivElement>(null);

  // 時間文字列をパース
  const parseTimeString = (timeStr: string): { minutes: number; seconds: number; milliseconds: number } => {
    const match = timeStr.match(/^(\d+):(\d{2})\.(\d{3})$/);
    if (match) {
      return {
        minutes: parseInt(match[1]),
        seconds: parseInt(match[2]),
        milliseconds: parseInt(match[3])
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
    
    if (laps.length > 0) {
      // 前のラップの値をコピー
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
      // 初期値
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
    message.info('OCR機能は現在準備中です');
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
        value={lap.time}
        onChange={(e) => updateLapTimeString(index, e.target.value)}
        placeholder="例: 1:58.423"
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

  return (
    <Modal
      title="ラップタイム詳細入力"
      visible={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          キャンセル
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存
        </Button>
      ]}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="手動入力" key="manual">
          <div className="space-y-4" onKeyDown={handleKeyDown}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">入力方式:</span>
                <div className="flex items-center space-x-2">
                  <span className={inputMode === 'keyboard' ? 'font-medium' : 'text-gray-400'}>
                    キーボード入力
                  </span>
                  <Switch
                    checked={inputMode === 'button'}
                    onChange={(checked) => setInputMode(checked ? 'button' : 'keyboard')}
                  />
                  <span className={inputMode === 'button' ? 'font-medium' : 'text-gray-400'}>
                    ボタン入力
                  </span>
                </div>
              </div>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addLap}
              >
                ラップ追加
              </Button>
            </div>
            
            {inputMode === 'keyboard' && (
              <div className="text-sm text-gray-500 mb-2">
                Enterキーで次のラップを追加
              </div>
            )}
            
            {laps.length === 0 ? (
              <Empty
                description="ラップデータがありません"
                className="py-8"
              >
                <Button type="primary" onClick={addLap}>
                  最初のラップを追加
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
                      <Option value="NORMAL">通常</Option>
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
          </div>
        </TabPane>
        
        <TabPane tab="OCR読み取り" key="ocr" disabled>
          <div className="text-center py-12">
            <CameraOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">
              OCR機能は現在準備中です
            </p>
            <p className="text-sm text-gray-400">
              将来的にはカメラで撮影した画像からラップタイムを自動で読み取ることができます
            </p>
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={handleOCRClick}
              className="mt-6"
              disabled
            >
              カメラを起動（準備中）
            </Button>
          </div>
        </TabPane>
        
        {/* 将来的なホイール入力の場所 */}
        {/*
        <TabPane tab="ホイール入力" key="wheel" disabled>
          <div className="text-center py-12">
            <p className="text-gray-500">
              iPhoneタイマーのようなホイール入力は現在開発中です
            </p>
          </div>
        </TabPane>
        */}
      </Tabs>
    </Modal>
  );
};