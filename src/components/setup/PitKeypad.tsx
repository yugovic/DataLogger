// ピット用テンキー（グローブ・直射日光・片手親指を前提にした数値入力）
//
// OS のソフトキーボードを使わない理由:
// - 出現待ちが毎回およそ1秒かかり、記号キーボードへの切替も要る（ラップタイムの ":" "." ）
// - キーの実寸が小さく、グローブでの誤打が多い
// - 画面上半分に入力欄が押し上げられ、親指の到達域から外れる
//
// 配色は src/lib/pitTheme.ts に集約している（すべて対背景 7:1 以上）。
import React from 'react';
import { PIT, PIT_KEY_HEIGHT } from '../../lib/pitTheme';

interface PitKeypadProps {
  /** 「確定」を押したときに呼ばれる。次の項目へ進める */
  onCommit: () => void;
  /** 数字キー */
  onDigit: (d: string) => void;
  /** 1文字削除 */
  onBackspace: () => void;
  /** 確定キーのラベル */
  commitLabel: string;
  /** 確定を押せるか（未入力のまま進ませたくない場合に false） */
  commitEnabled?: boolean;
  /** 数字キーの間に差し込む追加キー。無ければ 0 が2枠分に広がる */
  extraKey?: { label: string; onPress: () => void } | null;
  /** 中断。最下段に置くことで、閉じる操作も親指の到達域に入れる */
  onCancel: () => void;
  cancelLabel: string;
}

const keyBase =
  `flex items-center justify-center rounded-xl border-2 ${PIT.border} ${PIT.surface} ` +
  `text-3xl font-bold tabular-nums ${PIT.text} ${PIT.surfaceActive}`;

export const PitKeypad: React.FC<PitKeypadProps> = ({
  onCommit,
  onDigit,
  onBackspace,
  commitLabel,
  commitEnabled = true,
  extraKey = null,
  onCancel,
  cancelLabel,
}) => {
  const digitKey = (d: string, extraClass = '') => (
    <button
      key={d}
      type="button"
      onClick={() => onDigit(d)}
      className={`${keyBase} ${extraClass}`}
      style={{ minHeight: PIT_KEY_HEIGHT }}
    >
      {d}
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-2 px-3 pb-3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => digitKey(d))}

      {/* 最終行は必ず3枠を埋める。区切りキーが無いときは 0 を2枠に広げ、
          押し損ねやすい端の空白を作らない */}
      {extraKey ? (
        <>
          <button
            type="button"
            onClick={extraKey.onPress}
            className={keyBase}
            style={{ minHeight: PIT_KEY_HEIGHT }}
          >
            {extraKey.label}
          </button>
          {digitKey('0')}
        </>
      ) : (
        digitKey('0', 'col-span-2')
      )}

      <button
        type="button"
        onClick={onBackspace}
        aria-label="1文字消す"
        className={`${keyBase} text-2xl`}
        style={{ minHeight: PIT_KEY_HEIGHT }}
      >
        ⌫
      </button>

      {/* 最下段: 中断(1/3) と 確定(2/3)。閉じる操作も画面上部でなくここに置き、
          親指の到達域から外れないようにする */}
      <button
        type="button"
        onClick={onCancel}
        className={`flex items-center justify-center rounded-xl border-2 ${PIT.border} ${PIT.surface} text-base font-bold ${PIT.text} ${PIT.surfaceActive}`}
        style={{ minHeight: PIT_KEY_HEIGHT }}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onCommit}
        disabled={!commitEnabled}
        className={`col-span-2 flex items-center justify-center rounded-xl text-xl font-bold text-white ${
          commitEnabled ? `${PIT.primaryBg} ${PIT.primaryActive}` : PIT.disabledBg
        }`}
        style={{ minHeight: PIT_KEY_HEIGHT }}
      >
        {commitLabel}
      </button>
    </div>
  );
};
