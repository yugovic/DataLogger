// セットアップ画面のコピー導線・保存ライフサイクルに関する純粋関数。
//
// 「コピーして新規作成」の遷移先と、保存が新規作成/更新のどちらになるかの判定を
// 単一の source of truth に集約する。履歴カード(SetupCard)と詳細画面(CarSetup)の
// 両方がここを通ることで、コピー URL のずれ・重複保存を防ぐ。

/**
 * コピー元セットアップから「新規記録」画面への遷移先パス。
 * `?copy=<id>` を付けることで CarSetup 側がコピー元を読み込み、
 * 日時・ラップ・証憑・テレメトリ・共有状態を初期化した新規 draft を構築する。
 */
export const buildCopyPath = (setupId: string): string => `/?copy=${setupId}`;

/** 保存済みセットアップの詳細/編集画面パス。 */
export const buildSetupPath = (setupId: string): string => `/setup/${setupId}`;

export interface SaveModeContext {
  /** URL の :id（既存レコードを開いている場合のみ存在） */
  setupId: string | undefined;
  /** 閲覧モード（詳細表示）か */
  isViewMode: boolean;
}

/**
 * 保存が「新規作成」か「更新」かを判定する。
 *
 * - 既存レコードを編集中（setupId あり かつ 閲覧モードでない）→ 更新（false）
 * - それ以外（新規入力・コピーからの新規・閲覧モードからの保存）→ 新規作成（true）
 *
 * 新規保存に成功したら `buildSetupPath(newId)` へ replace 遷移する。以後は
 * setupId が入り、編集(閲覧解除)して保存すると更新経路になるため、
 * 同一内容の新規ドキュメントが増えない（「新規は1件、以後は同一IDの更新」）。
 */
export const isNewSave = ({ setupId, isViewMode }: SaveModeContext): boolean =>
  !(setupId && !isViewMode);
