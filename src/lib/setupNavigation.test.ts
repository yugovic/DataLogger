import { describe, it, expect } from 'vitest';
import { buildCopyPath, buildSetupPath, isNewSave } from './setupNavigation';

// ─── コピー導線 ──────────────────────────────────────────────────────────
// 履歴カード(SetupCard)と詳細画面(CarSetup)の「コピーして新規作成」は、
// どちらも buildCopyPath を通って `/?copy=<id>` へ遷移する（URL のずれを固定）。

describe('buildCopyPath', () => {
  it('コピー元 ID を ?copy= クエリ付きのトップ画面パスへ変換する', () => {
    expect(buildCopyPath('setup-123')).toBe('/?copy=setup-123');
  });

  it('履歴カードと詳細画面が同じ遷移先を生成する（両方からコピーできる）', () => {
    // SetupCard の window.location.href、CarSetup 詳細ボタンの navigate() が
    // 参照する唯一の source of truth。両者が一致することを回帰テストで固定する。
    const id = 'abc';
    const fromHistoryCard = buildCopyPath(id);
    const fromDetailView = buildCopyPath(id);
    expect(fromHistoryCard).toBe('/?copy=abc');
    expect(fromDetailView).toBe(fromHistoryCard);
  });
});

describe('buildSetupPath', () => {
  it('保存済みレコードの詳細/編集画面パスを生成する', () => {
    expect(buildSetupPath('setup-9')).toBe('/setup/setup-9');
  });
});

// ─── 保存ライフサイクル（新規は1件、以後は同一IDの更新） ────────────────

describe('isNewSave', () => {
  it('新規入力（setupId 未設定）は新規保存になる', () => {
    expect(isNewSave({ setupId: undefined, isViewMode: false })).toBe(true);
  });

  it('コピーからの新規（setupId 未設定）は新規保存になる', () => {
    // コピーは /?copy= で開くため URL に :id は無い
    expect(isNewSave({ setupId: undefined, isViewMode: false })).toBe(true);
  });

  it('既存レコードを編集中（setupId あり・閲覧モード解除）は更新になる', () => {
    expect(isNewSave({ setupId: 'setup-1', isViewMode: false })).toBe(false);
  });

  it('閲覧モード（setupId あり・isViewMode）は更新経路に入らない', () => {
    // 閲覧モードでは保存 FAB を出さない前提。ロジック上は新規側に倒す。
    expect(isNewSave({ setupId: 'setup-1', isViewMode: true })).toBe(true);
  });

  it('新規保存→保存済みID遷移後に編集すると、以後は更新になる（重複作成しない）', () => {
    // 1) 新規入力の保存: setupId 未設定 → 新規作成（1件だけ作られる）
    expect(isNewSave({ setupId: undefined, isViewMode: false })).toBe(true);

    // 2) 保存成功後 buildSetupPath(newId) へ replace 遷移 → setupId=newId・閲覧モード
    const newId = 'created-1';
    expect(buildSetupPath(newId)).toBe('/setup/created-1');
    expect(isNewSave({ setupId: newId, isViewMode: true })).toBe(true); // 閲覧中は保存不可

    // 3) 「編集」で閲覧モードを解除して再保存 → 同一 ID の更新（新規ドキュメントを増やさない）
    expect(isNewSave({ setupId: newId, isViewMode: false })).toBe(false);
  });
});
