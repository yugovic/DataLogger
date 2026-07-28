/**
 * 連続入力フロー（QuickEntryModal）の前進ロジック（純粋関数）
 *
 * 設計の起点は「ピットで次の走行枠までに終わるか」であって、項目網羅ではない。
 * 基本記録タスク = 4輪空気圧 ＋ 気温 ＋ ベストラップ ＋ フィーリング1つ。
 * これ以外（路面温度・湿度・気圧・天候・総周回数）は既定フローから外し、
 * 必要な人だけがカードを開いて入力する。聞く項目を減らすこと自体が最大の改善である。
 *
 * さらに気温・天候・湿度・気圧は観測値であってドライバーの入力物ではないため、
 * autoWeather で自動取得する。取得できたときは質問しない（airTemp が埋まるため）。
 *
 * 未入力は null（または空文字）のまま扱い、0 やデモ値で埋めない
 * （CLAUDE.md のデータ品質方針）。
 */

/**
 * QuickEntryModal が扱う質問の識別子。
 * 基本記録タスクの4種だけを既定フローに置く。
 * airTemp は自動取得に失敗したときだけ現れる。
 */
export type QuickEntryFieldId =
  | 'airTemp'
  | 'tirePressure'
  | 'bestLap'
  | 'feeling';

/** 質問リスト構築に必要な現在値のスナップショット */
export interface QuickEntryFieldState {
  /** 気温。自動取得に成功していれば埋まっているので質問しない */
  airTemp: string;
  /** タイヤ空気圧シーンで聞くべき輪が一つも残っていない（＝全輪入力済み）なら true */
  tirePressureFilled: boolean;
  bestLap: string;
  /** 総合バランス（アンダー〜オーバー）。未評価なら null */
  feeling: number | null;
}

/** 基本記録タスクの並び。測って終わる順（タイヤ→タイム→体感）に置く */
const FIELD_ORDER: QuickEntryFieldId[] = ['airTemp', 'tirePressure', 'bestLap', 'feeling'];

const isEmpty = (state: QuickEntryFieldState, id: QuickEntryFieldId): boolean => {
  switch (id) {
    case 'airTemp':
      return state.airTemp === '';
    case 'tirePressure':
      return !state.tirePressureFilled;
    case 'bestLap':
      return state.bestLap === '';
    case 'feeling':
      return state.feeling == null;
    default:
      return false;
  }
};

/**
 * 未入力の項目だけを既定の順で抽出する。
 * すべて入力済みなら空配列（＝呼び出し元は起動ボタンを出さない）。
 */
export function buildQuickEntrySteps(state: QuickEntryFieldState): QuickEntryFieldId[] {
  return FIELD_ORDER.filter((id) => isEmpty(state, id));
}

// ─── タイヤ空気圧シーン: 4輪の前進ロジック ──────────────────────────────

export type WheelKey = 'fl' | 'fr' | 'rl' | 'rr';

export const WHEEL_ORDER: readonly WheelKey[] = ['fl', 'fr', 'rl', 'rr'];

/** 指定輪から時計回り（FL→FR→RL→RR→FL…）に次の未入力輪を探す。なければ null */
export function nextEmptyWheel(
  vals: Record<WheelKey, number | null>,
  active: WheelKey,
): WheelKey | null {
  const i = WHEEL_ORDER.indexOf(active);
  const rest = [...WHEEL_ORDER.slice(i + 1), ...WHEEL_ORDER.slice(0, i)].filter(
    (w) => vals[w] == null,
  );
  return rest.length > 0 ? rest[0] : null;
}

/** 最初の未入力輪（FL始まり）。全輪入力済みなら null */
export function firstEmptyWheel(vals: Record<WheelKey, number | null>): WheelKey | null {
  return WHEEL_ORDER.find((w) => vals[w] == null) ?? null;
}

/** 4輪すべて入力済みか */
export function isAllWheelsFilled(vals: Record<WheelKey, number | null>): boolean {
  return WHEEL_ORDER.every((w) => vals[w] != null);
}

/**
 * タイヤ空気圧シーンの初期表示モードを決める。
 * 冷間が未入力なら冷間を初期表示、冷間入力済みなら温間を初期選択。
 */
export function initialTireMode(cold: Record<WheelKey, number | null>): 'cold' | 'hot' {
  return isAllWheelsFilled(cold) ? 'hot' : 'cold';
}

// ─── 前回値からの引き継ぎ ────────────────────────────────────────────

/**
 * 前回同一条件の空気圧を初期値として使えるか判定し、使える値だけを返す。
 *
 * ピットでの実測値は前回から数kPaしか動かないことが多い。空欄から積み上げるより、
 * 前回値を置いて差分だけ直す方が操作数が少ない。ただし「前回値をそのまま保存」は
 * 実測でない値の混入なので、UI 側で必ず「前回値である」と示し、
 * ドライバーが確認・修正したうえで保存させること。
 *
 * 引き継がない条件（別物として扱う）:
 * - サーキットが違う（路面・気温帯が変わる）
 * - タイヤセットが違う（銘柄・摩耗が変わる）
 */
export function carryOverPressures(
  previous: {
    circuit: string;
    tireSetId: string | null;
    hot: Record<WheelKey, number | null>;
  } | null,
  current: { circuit: string; tireSetId: string | null },
): Record<WheelKey, number | null> | null {
  if (!previous) return null;
  if (previous.circuit !== current.circuit) return null;
  if ((previous.tireSetId ?? null) !== (current.tireSetId ?? null)) return null;
  if (!isAllWheelsFilled(previous.hot)) return null;
  return { ...previous.hot };
}
