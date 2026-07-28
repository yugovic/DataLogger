import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDraft, loadDraft, clearDraft, isDraftWorthRestoring,
  type DraftStorageBackend,
} from './draftStorage';
import { createEmptyDraft } from './setupDraft';

const NOW = new Date('2026-07-29T10:00:00.000Z');
const UID = 'user-1';

/** localStorage を持たない node 環境でテストするためのインメモリ実装 */
function memoryBackend(): DraftStorageBackend & { dump: () => Map<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    dump: () => map,
  };
}

describe('draftStorage', () => {
  let store: ReturnType<typeof memoryBackend>;

  beforeEach(() => {
    store = memoryBackend();
  });

  it('保存した下書きを読み戻せる', () => {
    const draft = { ...createEmptyDraft(), circuit: '鈴鹿サーキット', airTemp: '25' };
    expect(saveDraft(UID, draft, null, NOW, store)).toBe(true);

    const loaded = loadDraft(UID, store);
    expect(loaded).not.toBeNull();
    expect(loaded!.draft.circuit).toBe('鈴鹿サーキット');
    expect(loaded!.draft.airTemp).toBe('25');
    expect(loaded!.savedAt).toBe(NOW.toISOString());
    expect(loaded!.setupId).toBeNull();
  });

  it('別ユーザーの下書きは読めない', () => {
    saveDraft(UID, { ...createEmptyDraft(), circuit: '筑波' }, null, NOW, store);
    expect(loadDraft('user-2', store)).toBeNull();
  });

  it('何も保存していなければ null', () => {
    expect(loadDraft(UID, store)).toBeNull();
  });

  it('破棄したら読めなくなる', () => {
    saveDraft(UID, { ...createEmptyDraft(), circuit: '富士' }, null, NOW, store);
    clearDraft(UID, store);
    expect(loadDraft(UID, store)).toBeNull();
  });

  it('壊れたJSONは null（例外を投げない）', () => {
    store.setItem(`velocity-logger:draft:${UID}`, '{壊れている');
    expect(() => loadDraft(UID, store)).not.toThrow();
    expect(loadDraft(UID, store)).toBeNull();
  });

  it('バージョンが違う下書きは復元しない', () => {
    store.setItem(
      `velocity-logger:draft:${UID}`,
      JSON.stringify({ version: 999, savedAt: NOW.toISOString(), userId: UID, setupId: null, draft: createEmptyDraft() }),
    );
    expect(loadDraft(UID, store)).toBeNull();
  });

  it('sessionDate を Date として復元する（JSON化で文字列になるのを戻す）', () => {
    const when = new Date('2026-07-20T01:02:03.000Z');
    const draft = { ...createEmptyDraft(), sessionDate: when };
    saveDraft(UID, draft, null, NOW, store);

    const loaded = loadDraft(UID, store);
    expect(loaded!.draft.sessionDate).toBeInstanceOf(Date);
    expect(loaded!.draft.sessionDate.getTime()).toBe(when.getTime());
  });

  it('sessionDate が壊れていても Date を返す（画面を壊さない）', () => {
    store.setItem(
      `velocity-logger:draft:${UID}`,
      JSON.stringify({
        version: 1, savedAt: NOW.toISOString(), userId: UID, setupId: null,
        draft: { ...createEmptyDraft(), sessionDate: 'ぜんぜん日付じゃない' },
      }),
    );
    const loaded = loadDraft(UID, store);
    expect(loaded!.draft.sessionDate).toBeInstanceOf(Date);
    expect(Number.isNaN(loaded!.draft.sessionDate.getTime())).toBe(false);
  });

  it('編集中の setupId を保持する', () => {
    saveDraft(UID, createEmptyDraft(), 'setup-abc', NOW, store);
    expect(loadDraft(UID, store)!.setupId).toBe('setup-abc');
  });
});

describe('isDraftWorthRestoring', () => {
  it('空の下書きは復元を聞かない', () => {
    const stored = { version: 1, savedAt: NOW.toISOString(), userId: UID, setupId: null, draft: createEmptyDraft() };
    expect(isDraftWorthRestoring(stored)).toBe(false);
  });

  it('null は false', () => {
    expect(isDraftWorthRestoring(null)).toBe(false);
  });

  it('サーキットが入っていれば復元する価値がある', () => {
    const draft = { ...createEmptyDraft(), circuit: '鈴鹿' };
    expect(isDraftWorthRestoring({ version: 1, savedAt: NOW.toISOString(), userId: UID, setupId: null, draft })).toBe(true);
  });

  it('空気圧が1輪でも入っていれば復元する価値がある', () => {
    const empty = createEmptyDraft();
    const draft = {
      ...empty,
      tirePressures: { ...empty.tirePressures, fl: { ...empty.tirePressures.fl, after: '215' } },
    };
    expect(isDraftWorthRestoring({ version: 1, savedAt: NOW.toISOString(), userId: UID, setupId: null, draft })).toBe(true);
  });

  it('ベストラップだけでも復元する価値がある', () => {
    const draft = { ...createEmptyDraft(), bestLap: '2:05.432' };
    expect(isDraftWorthRestoring({ version: 1, savedAt: NOW.toISOString(), userId: UID, setupId: null, draft })).toBe(true);
  });
});
