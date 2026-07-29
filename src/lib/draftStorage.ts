/**
 * 記録途中の下書きを端末に残す（通信断・アプリ終了で入力を失わないため）
 *
 * ピットでは電波が悪く、保存が通らないまま画面を閉じることがある。
 * Firestore のオフラインキューは「保存ボタンを押した後」しか守ってくれないので、
 * 押す前の入力を localStorage に置いて、開き直したときに復元できるようにする。
 *
 * データ品質方針（CLAUDE.md）:
 * - 復元は必ずユーザーの明示的な選択を経る。黙って古い値を書き戻さない。
 * - 保存済み（＝Firestore へ送出済み）の下書きは破棄する。二重登録の種にしない。
 */

import { createEmptyDraft, type SetupDraft } from './setupDraft';

/** 保存形式のバージョン。SetupDraft の形が変わったら上げて、古い下書きは捨てる */
const SCHEMA_VERSION = 1;
const KEY_PREFIX = 'velocity-logger:draft:';

export interface StoredDraft {
  version: number;
  /** 下書きを書いた時刻（ISO8601）。復元ダイアログに出す */
  savedAt: string;
  /** 復元先を取り違えないための所有者 */
  userId: string;
  /** 編集中の既存セットアップID。新規なら null */
  setupId: string | null;
  draft: SetupDraft;
}

const keyFor = (userId: string): string => `${KEY_PREFIX}${userId}`;

/**
 * 保存した下書きを、いまの SetupDraft の形へ揃えて返す。
 *
 * ここで2つのことをする:
 * 1. JSON 化で失われた型を戻す（sessionDate は ISO 文字列になっている）
 * 2. **いまの空 draft に重ねて、後から増えた項目の欠落を埋める**
 *    項目を増やしたあと古い下書きを復元すると、その項目が undefined のまま
 *    保存へ回ってバリデーションで落ちる（midSpeed* を足したときに実際に起きた）
 */
function reviveDraft(draft: SetupDraft): SetupDraft {
  const base = createEmptyDraft();
  const raw = draft as unknown as { sessionDate?: unknown };

  let sessionDate: Date;
  if (typeof raw.sessionDate === 'string') {
    const d = new Date(raw.sessionDate);
    sessionDate = Number.isNaN(d.getTime()) ? new Date() : d;
  } else if (draft.sessionDate instanceof Date) {
    sessionDate = draft.sessionDate;
  } else {
    // 想定外の型。日付が壊れた下書きで画面を壊さない
    sessionDate = new Date();
  }

  const wheels = ['fl', 'fr', 'rl', 'rr'] as const;
  const tirePressures = { ...base.tirePressures };
  for (const w of wheels) {
    tirePressures[w] = { ...base.tirePressures[w], ...(draft.tirePressures?.[w] ?? {}) };
  }

  return {
    ...base,
    ...draft,
    sessionDate,
    tirePressures,
    drivingFeedback: { ...base.drivingFeedback, ...(draft.drivingFeedback ?? {}) },
    targetPressures: { ...base.targetPressures, ...(draft.targetPressures ?? {}) },
    knowledge: { ...base.knowledge, ...(draft.knowledge ?? {}) },
  };
}

/**
 * 使う分だけの localStorage 互換インターフェース。
 * 差し替え可能にしてあるのは、テストを jsdom 無しの純ロジックのまま保つため
 * （このリポジトリのテストは environment: 'node'）。
 */
export interface DraftStorageBackend {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/** 既定のバックエンド。localStorage が使えない環境（SSR・プライベートモード）では null */
function defaultBackend(): DraftStorageBackend | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    // Safari のプライベートモード等でアクセス自体が投げることがある
    return null;
  }
}

/**
 * 下書きを保存する。失敗しても例外を投げない
 * （下書き保存の失敗で記録作業を止めない）。
 */
export function saveDraft(
  userId: string,
  draft: SetupDraft,
  setupId: string | null,
  now: Date,
  backend: DraftStorageBackend | null = defaultBackend(),
): boolean {
  if (!backend || !userId) return false;
  try {
    const payload: StoredDraft = {
      version: SCHEMA_VERSION,
      savedAt: now.toISOString(),
      userId,
      setupId,
      draft,
    };
    backend.setItem(keyFor(userId), JSON.stringify(payload));
    return true;
  } catch {
    // 容量超過など。黙って諦める
    return false;
  }
}

/**
 * 下書きを読み出す。バージョン不一致・別ユーザー・壊れたJSONはすべて null。
 * 「読めなかった」と「無かった」を区別しない（どちらも復元しない、で正しい）。
 */
export function loadDraft(
  userId: string,
  backend: DraftStorageBackend | null = defaultBackend(),
): StoredDraft | null {
  if (!backend || !userId) return null;
  try {
    const raw = backend.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (parsed?.version !== SCHEMA_VERSION) return null;
    if (parsed?.userId !== userId) return null;
    if (!parsed?.draft || typeof parsed.draft !== 'object') return null;
    return { ...parsed, draft: reviveDraft(parsed.draft) };
  } catch {
    return null;
  }
}

/** 下書きを破棄する（保存完了時・ユーザーが復元を断ったとき） */
export function clearDraft(
  userId: string,
  backend: DraftStorageBackend | null = defaultBackend(),
): void {
  if (!backend || !userId) return;
  try {
    backend.removeItem(keyFor(userId));
  } catch {
    // 消せなくても実害はない（次回の復元確認で断れる）
  }
}

/**
 * 下書きに復元する価値があるか。
 * 空の下書き（何も入力していない）を「復元しますか？」と聞くのは邪魔なだけなので弾く。
 */
export function isDraftWorthRestoring(stored: StoredDraft | null): boolean {
  if (!stored) return false;
  const d = stored.draft;
  const filled = (v: unknown): boolean =>
    v !== '' && v !== null && v !== undefined;

  if (filled(d.circuit) || filled(d.carModel) || filled(d.bestLap) || filled(d.totalLaps)) return true;
  if (filled(d.weatherCondition) || filled(d.airTemp) || filled(d.trackTemp)) return true;

  const wheels = ['fl', 'fr', 'rl', 'rr'] as const;
  if (wheels.some((w) => filled(d.tirePressures?.[w]?.before) || filled(d.tirePressures?.[w]?.after))) {
    return true;
  }
  return false;
}
