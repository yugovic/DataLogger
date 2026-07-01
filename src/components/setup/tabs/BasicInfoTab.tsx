// 基本情報タブコンポーネント
import React from 'react';
import { AutoComplete, Modal, message, Dropdown, Tooltip } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { StepNumber } from '../../common/StepNumber';
import { calcPressureAdvice, formatAdjust, getWheelTarget, calcRecommendedCold, PressureStatus } from '../../../lib/pressureAdvice';
// 余計なボタンは削除し、シンプルなUIに戻す

interface TirePressure {
  before: string;
  after: string;
  diff: string;
}

interface TirePressures {
  fl: TirePressure;
  fr: TirePressure;
  rl: TirePressure;
  rr: TirePressure;
}

interface DamperSetting {
  bump: number | null;
  rebound: number | null;
}

interface DamperSettings {
  fl: DamperSetting;
  fr: DamperSetting;
  rl: DamperSetting;
  rr: DamperSetting;
}

interface TargetPressures {
  front: string; // kPa、空文字 = 未設定
  rear: string;
}

interface BasicInfoTabProps {
  tirePressures: TirePressures;
  setTirePressures: React.Dispatch<React.SetStateAction<TirePressures>>;
  damperSettings: DamperSettings;
  setDamperSettings: React.Dispatch<React.SetStateAction<DamperSettings>>;
  targetPressures: TargetPressures;
  setTargetPressures: React.Dispatch<React.SetStateAction<TargetPressures>>;
  handleDropdownClick?: (e: React.MouseEvent, inputValue: string, options: { value: string; label: string }[]) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  tirePressures,
  setTirePressures,
  damperSettings,
  setDamperSettings,
  targetPressures,
  setTargetPressures,
}) => {
  const [modal, modalContextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();
  const calculatePressureDiff = (before: string, after: string): string => {
    const b = parseInt(before, 10);
    const a = parseInt(after, 10);
    if (isNaN(b) || isNaN(a)) return '';
    const diff = a - b;
    return diff >= 0 ? `+${diff}` : diff.toString();
  };

  /** 状態色クラス（符号の色ではなくレンジ内外の色） */
  const statusClass: Record<PressureStatus, string> = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    none: 'text-gray-400 dark:text-gray-500',
  };

  const wheels: Array<{ key: 'fl'|'fr'|'rl'|'rr'; label: string }> = [
    { key: 'fl', label: 'FL' },
    { key: 'fr', label: 'FR' },
    { key: 'rl', label: 'RL' },
    { key: 'rr', label: 'RR' },
  ];

  // ─── 走行前→走行後 コピーの安全化（確認 + Undo + 空欄のみ） ───

  /** before を after に流し込んだ次状態を計算する。onlyEmpty=true なら after が空のホイールのみ更新 */
  const buildCopied = (prev: TirePressures, onlyEmpty: boolean): TirePressures => {
    const next = { ...prev };
    (['fl', 'fr', 'rl', 'rr'] as const).forEach((key) => {
      const cur = prev[key];
      if (cur.before === '') return; // コピー元が空ならスキップ
      if (onlyEmpty && cur.after !== '') return; // 空欄のみモードで既存値は保持
      next[key] = { ...cur, after: cur.before, diff: calculatePressureDiff(cur.before, cur.before) };
    });
    return next;
  };

  /** 実際にコピーを適用し、Undo トーストを表示する */
  const applyCopy = (onlyEmpty: boolean) => {
    let snapshot: TirePressures | null = null;
    setTirePressures((prev) => {
      snapshot = prev; // 直前値を退避（Undo 用）
      return buildCopied(prev, onlyEmpty);
    });
    messageApi.open({
      type: 'success',
      duration: 5,
      content: (
        <span>
          走行前→走行後にコピーしました{onlyEmpty ? '（空欄のみ）' : ''}
          <button
            type="button"
            className="ml-3 text-blue-600 dark:text-blue-400 underline"
            onClick={() => {
              if (snapshot) setTirePressures(snapshot);
              messageApi.destroy();
              messageApi.info('コピーを元に戻しました', 2);
            }}
          >
            元に戻す
          </button>
        </span>
      ),
    });
  };

  /** コピー操作のエントリ。上書き対象に既存値があるときのみ確認モーダル */
  const handleCopyBeforeToAfter = () => {
    const hasSource = (['fl', 'fr', 'rl', 'rr'] as const).some((k) => tirePressures[k].before !== '');
    if (!hasSource) {
      messageApi.warning('コピー元の走行前の値がありません');
      return;
    }
    // 上書きで失われる既存 after があるか
    const willOverwrite = (['fl', 'fr', 'rl', 'rr'] as const).some(
      (k) => tirePressures[k].before !== '' && tirePressures[k].after !== '',
    );
    if (willOverwrite) {
      modal.confirm({
        title: '走行後の値を上書きします',
        content: 'すでに入力済みの走行後の空気圧があります。走行前の値で上書きしますか？（実行後に元に戻せます）',
        okText: 'すべて上書き',
        cancelText: 'キャンセル',
        onOk: () => applyCopy(false),
      });
    } else {
      // 既存値がなければ確認不要でそのままコピー
      applyCopy(false);
    }
  };

  /** 各輪のセルをレンダリング（2×2グリッド用） */
  const renderWheelCell = (key: 'fl'|'fr'|'rl'|'rr', label: string) => {
    const tp = tirePressures[key];
    const targetNum = getWheelTarget(
      key,
      targetPressures.front !== '' ? parseFloat(targetPressures.front) : null,
      targetPressures.rear !== '' ? parseFloat(targetPressures.rear) : null,
    );
    const parsedAfter = tp.after !== '' ? parseInt(tp.after, 10) : null;
    const afterNum = parsedAfter !== null && !isNaN(parsedAfter) ? parsedAfter : null;
    const advice = calcPressureAdvice(afterNum, targetNum);
    const b = parseInt(tp.before, 10);
    const a = parseInt(tp.after, 10);
    const hasDiff = !isNaN(b) && !isNaN(a);
    const d = hasDiff ? a - b : null;

    return (
      <div key={key} className="border border-blue-200/40 rounded-lg p-2 sm:p-3 space-y-2">
        <div className="text-center font-semibold dark:text-gray-200">{label}</div>
        {/* 走行前 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-5 shrink-0">冷</span>
          <StepNumber
            value={tp.before !== '' ? parseInt(tp.before, 10) : null}
            onChange={(n) => setTirePressures(prev => ({
              ...prev,
              [key]: {
                ...prev[key],
                before: n === null ? '' : String(n),
                diff: calculatePressureDiff(n === null ? '' : String(n), prev[key].after)
              }
            }))}
            min={50}
            max={400}
            step={1}
            largeStep={5}
            size="small"
            inputWidth={56}
            defaultValue={targetNum ?? 200}
          />
        </div>
        {/* 走行後 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-5 shrink-0">温</span>
          <StepNumber
            value={tp.after !== '' ? parseInt(tp.after, 10) : null}
            onChange={(n) => setTirePressures(prev => ({
              ...prev,
              [key]: {
                ...prev[key],
                after: n === null ? '' : String(n),
                diff: calculatePressureDiff(prev[key].before, n === null ? '' : String(n))
              }
            }))}
            min={50}
            max={400}
            step={1}
            largeStep={5}
            size="small"
            inputWidth={56}
            defaultValue={targetNum ?? 200}
          />
        </div>
        {/* 差分 & 目標対比（常時表示） */}
        <div className="flex justify-between items-center text-sm pt-1 border-t border-blue-200/30">
          <span className={`text-xs ${hasDiff ? (d! >= 0 ? 'text-red-500' : 'text-blue-400') : 'text-gray-400'}`}>
            Δ{hasDiff ? (d! >= 0 ? `+${d}` : `${d}`) : '—'}
          </span>
          <Tooltip
            title={advice.adjustBy !== null ? `次走行推奨: ${formatAdjust(advice.adjustBy)}` : '目標温間圧または走行後の実測を入力すると表示されます'}
          >
            <span className={`text-xs font-mono ${statusClass[advice.status]}`}>
              目標{advice.diff !== null ? (advice.diff >= 0 ? `+${advice.diff}` : `${advice.diff}`) : '—'}
            </span>
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {modalContextHolder}
      {messageContextHolder}
      {/* タイヤ空気圧とダンパー設定を横並び */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* タイヤ空気圧設定 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 sm:p-6 relative">
          {/* 車両イメージ - タイヤ空気圧 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <i className="fas fa-car text-9xl text-gray-400 dark:text-gray-600"></i>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="flex items-center">
              <i className="fas fa-tachometer-alt text-blue-500 dark:text-blue-400 mr-2"></i>
              <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-200">タイヤ空気圧</h3>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              走行前 → 走行後 (kPa)
            </div>
          </div>
          {/* コピー操作 */}
          <div className="flex justify-end mb-3">
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'all', label: '走行前→走行後にコピー（上書き）' },
                  { key: 'empty', label: '空欄のみコピー（既存値は保持）' },
                ],
                onClick: ({ key }) => {
                  if (key === 'all') handleCopyBeforeToAfter();
                  else applyCopy(true);
                },
              }}
            >
              <button type="button" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                走行前→走行後にコピー <DownOutlined className="text-[10px]" />
              </button>
            </Dropdown>
          </div>

          {/* 2×2グリッド: 車両配置に対応 (FL FR / RL RR) */}
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 mb-1">─ フロント ─</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {renderWheelCell('fl', 'FL')}
            {renderWheelCell('fr', 'FR')}
          </div>
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 mb-1">─ リア ─</div>
          <div className="grid grid-cols-2 gap-3">
            {renderWheelCell('rl', 'RL')}
            {renderWheelCell('rr', 'RR')}
          </div>

          {/* 目標温間圧入力 */}
          <div className="mt-4 pt-3 border-t border-blue-200/40">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <i className="fas fa-bullseye text-blue-400"></i>
              目標温間圧 (kPa)
              <Tooltip title="走行開始から数周後の温まりきった状態での目標空気圧。前後軸で設定します。設定すると各輪の過不足が色で表示されます（緑: ±5以内 / 黄: ±15以内 / 赤: それ超）。">
                <i className="fas fa-info-circle text-gray-400 cursor-help ml-1"></i>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-blue-200/40 rounded-lg p-2 sm:p-3 space-y-2">
                <div className="text-center font-semibold dark:text-gray-200">フロント</div>
                <div className="flex items-center gap-1">
                  <span className="w-5 shrink-0" />
                  <StepNumber
                    value={targetPressures.front !== '' ? parseInt(targetPressures.front, 10) || null : null}
                    onChange={(n) => setTargetPressures(prev => ({ ...prev, front: n === null ? '' : String(n) }))}
                    min={0}
                    max={500}
                    step={1}
                    largeStep={5}
                    size="small"
                    inputWidth={56}
                    placeholder="例: 200"
                    defaultValue={200}
                  />
                </div>
              </div>
              <div className="border border-blue-200/40 rounded-lg p-2 sm:p-3 space-y-2">
                <div className="text-center font-semibold dark:text-gray-200">リア</div>
                <div className="flex items-center gap-1">
                  <span className="w-5 shrink-0" />
                  <StepNumber
                    value={targetPressures.rear !== '' ? parseInt(targetPressures.rear, 10) || null : null}
                    onChange={(n) => setTargetPressures(prev => ({ ...prev, rear: n === null ? '' : String(n) }))}
                    min={0}
                    max={500}
                    step={1}
                    largeStep={5}
                    size="small"
                    inputWidth={56}
                    placeholder="例: 190"
                    defaultValue={200}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 次走行推奨サマリー（目標が設定済みの場合のみ表示） */}
          {(targetPressures.front !== '' || targetPressures.rear !== '') && (
            <div className="mt-3 pt-3 border-t border-blue-200/40">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <i className="fas fa-arrow-right text-blue-400"></i>
                次走行の推奨冷間圧
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {wheels.map(({ key, label }) => {
                  const tp2 = tirePressures[key];
                  const targetNum = getWheelTarget(
                    key,
                    targetPressures.front !== '' ? parseFloat(targetPressures.front) : null,
                    targetPressures.rear !== '' ? parseFloat(targetPressures.rear) : null,
                  );
                  const parsedAfter2 = tp2.after !== '' ? parseInt(tp2.after, 10) : null;
                  const afterNum2 = parsedAfter2 !== null && !isNaN(parsedAfter2) ? parsedAfter2 : null;
                  const advice = calcPressureAdvice(afterNum2, targetNum);
                  const parsedBefore2 = tp2.before !== '' ? parseInt(tp2.before, 10) : null;
                  const beforeNum2 = parsedBefore2 !== null && !isNaN(parsedBefore2) ? parsedBefore2 : null;
                  const recCold = calcRecommendedCold(beforeNum2, advice.adjustBy);
                  return (
                    <div key={key} className="flex items-center justify-between text-xs py-0.5">
                      <span className="font-medium dark:text-gray-300">{label}:</span>
                      <span className={statusClass[advice.status]}>
                        {recCold !== null ? `${recCold} kPa` : formatAdjust(advice.adjustBy)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        
        {/* ダンパー設定 */}
        <div className="relative bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 sm:p-6">
        {/* 車両イメージ - ダンパー設定 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <i className="fas fa-car text-9xl text-gray-400 dark:text-gray-600"></i>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <div className="flex items-center">
            <i className="fas fa-car-side text-blue-500 dark:text-blue-400 mr-2"></i>
            <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-200">ダンパー設定</h3>
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Bump / Rebound (クリック)
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6">
          <div>
            <div className="text-center mb-2 font-medium dark:text-gray-200">FL</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fl.bump != null ? damperSettings.fl.bump.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fl: { ...prev.fl, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fl.bump != null ? damperSettings.fl.bump.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fl.rebound != null ? damperSettings.fl.rebound.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fl: { ...prev.fl, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fl.rebound != null ? damperSettings.fl.rebound.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="text-center mb-2 font-medium dark:text-gray-200">FR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fr.bump != null ? damperSettings.fr.bump.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fr: { ...prev.fr, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fr.bump != null ? damperSettings.fr.bump.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.fr.rebound != null ? damperSettings.fr.rebound.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        fr: { ...prev.fr, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.fr.rebound != null ? damperSettings.fr.rebound.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="text-center mb-2 font-medium dark:text-gray-200">RL</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rl.bump != null ? damperSettings.rl.bump.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rl: { ...prev.rl, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rl.bump != null ? damperSettings.rl.bump.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rl.rebound != null ? damperSettings.rl.rebound.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rl: { ...prev.rl, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rl.rebound != null ? damperSettings.rl.rebound.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="text-center mb-2 font-medium dark:text-gray-200">RR</div>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rr.bump != null ? damperSettings.rr.bump.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rr: { ...prev.rr, bump: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rr.bump != null ? damperSettings.rr.bump.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
              <div className="text-gray-500">/</div>
              <div className="flex-1">
                <AutoComplete
                  value={damperSettings.rr.rebound != null ? damperSettings.rr.rebound.toString() : ''}
                  onChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
                      setDamperSettings(prev => ({
                        ...prev,
                        rr: { ...prev.rr, rebound: numValue }
                      }));
                    }
                  }}
                  className="w-full"
                  options={Array.from({ length: 21 }, (_, i) => ({ 
                    value: i.toString()
                  }))}
                  onOpenChange={(open) => {
                    if (open) {
                      setTimeout(() => {
                        const currentValue = damperSettings.rr.rebound != null ? damperSettings.rr.rebound.toString() : '';
                        const selectedItem = document.querySelector(`.ant-select-item[title="${currentValue}"]`);
                        if (selectedItem) {
                          selectedItem.scrollIntoView({ block: 'center' });
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
