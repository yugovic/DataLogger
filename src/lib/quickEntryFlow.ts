/**
 * 連続入力フロー（QuickEntryModal）の前進ロジック（純粋関数）
 *
 * 「未入力の項目だけを 環境→タイヤ→ラップ の順で1問1画面に流す」という
 * 起動時の質問リスト構築と、タイヤ空気圧シーンの「次の未入力輪へ進む」
 * ロジックをここに集約する。UI（QuickEntryModal / TirePressureScene）は
 * この純粋関数を呼ぶだけにして、前進ロジック単体をユニットテストできるようにする。
 *
 * 未入力は null（または空文字）のまま扱い、0 やデモ値で埋めない
 * （CLAUDE.md のデータ品質方針）。
 */

/** QuickEntryModal が扱う質問の識別子。環境→タイヤ→ラップの順で並べる */
export type QuickEntryFieldId =
  | 'weather'
  | 'airTemp'
  | 'trackTemp'
  | 'humidity'
  | 'pressure'
  | 'tirePressure'
  | 'bestLap'
  | 'totalLaps';

/** 質問リスト構築に必要な現在値のスナップショット */
export interface QuickEntryFieldState {
  weather: string;
  airTemp: string;
  trackTemp: string;
  humidity: string;
  pressure: string;
  /** タイヤ空気圧シーンで聞くべき輪が一つも残っていない（＝全輪入力済み）なら true */
  tirePressureFilled: boolean;
  bestLap: string;
  totalLaps: string;
}

const FIELD_ORDER: QuickEntryFieldId[] = [
  'weather',
  'airTemp',
  'trackTemp',
  'humidity',
  'pressure',
  'tirePressure',
  'bestLap',
  'totalLaps',
];

const isEmpty = (state: QuickEntryFieldState, id: QuickEntryFieldId): boolean => {
  switch (id) {
    case 'weather':
      return state.weather === '';
    case 'airTemp':
      return state.airTemp === '';
    case 'trackTemp':
      return state.trackTemp === '';
    case 'humidity':
      return state.humidity === '';
    case 'pressure':
      return state.pressure === '';
    case 'tirePressure':
      return !state.tirePressureFilled;
    case 'bestLap':
      return state.bestLap === '';
    case 'totalLaps':
      return state.totalLaps === '';
    default:
      return false;
  }
};

/**
 * 未入力の項目だけを、環境→タイヤ→ラップの順で抽出する。
 * すべて入力済みなら空配列（＝呼び出し元は起動ボタンを出さない/流すことがない）。
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
