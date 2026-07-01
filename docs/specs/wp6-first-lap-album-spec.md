# WP-6 要件定義: ファーストラップ・アルバム（走行後ハイライト自動生成）

- 日付: 2026-07-02
- 起点: docs/strategy/06-content-differentiation-plan.md（柱C-3 / WP-6）
- 前提: WP-1/2/8マージ済み、WP-5（透かし・公開リンク）完了後に着手
- 実装担当: codex（implementer） / レビュー: Fable 5

## 目的

ビギナー〜エンジョイ勢（ペルソナP3）向けの「ゼロ操作で成果物が届く」体験。
セットアップ保存直後に「今日の走行ハイライト」を自動生成し、誇れる共有画像として持ち帰らせる。
分析をしない層の記録動機（NSM）と、SNS共有によるフライホイールの起点を担う。

## プロジェクト原則（厳守）

- **偽データ・サンプル表示の禁止**: ラップタイムが無い走行ではハイライトを出さない
  （「データが揃うと表示されます」の類の空状態も出さない — 保存フローを邪魔しないため単に何も出さない）
- 称号（バッジ）は履歴から**その場で計算**する。新しいコレクション・保存フィールドは作らない
  （偽実績の混入余地を作らない＋スキーマ変更を避ける）
- null保存原則。共有はWP-5のオプトイン公開リンクの仕組みを再利用

## スコープ

### 1. 純粋ロジック — src/lib/sessionHighlights.ts（新規）

React・Firebase非依存。既存 `lapTimeToMs`（src/lib/setupFields.ts）を再利用。

```typescript
export interface SessionHighlight {
  circuit: string;
  carModel: string;
  sessionDate: Date;
  bestLap: string | null;          // 表示用文字列（無ければnull）
  lapCount: number | null;         // lapTimeData.totalLaps（無ければnull）
  badges: HighlightBadge[];
}

export type HighlightBadge =
  | 'FIRST_VISIT'        // このサーキット初走行（履歴に同サーキットなし）
  | 'SELF_BEST'          // 同サーキット×同車両の自己ベスト更新
  | 'FIRST_LOGGER'       // 初のロガー証憑付き記録
  | 'RAIN_SESSION';      // 雨天走行（weather.condition が 'ウェット' | 'フルウェット'）

export const HIGHLIGHT_BADGE_LABELS: Record<HighlightBadge, string>;
// 例: FIRST_VISIT='初走行', SELF_BEST='自己ベスト更新', FIRST_LOGGER='初ロガー計測', RAIN_SESSION='雨天走行'

export function computeSessionHighlight(
  current: CarSetup,
  history: CarSetup[],   // 呼び出し側で「保存済みの過去セットアップ（current除く）」を渡す
): SessionHighlight | null;
```

- **bestLap が null（パース不能含む）の場合は SessionHighlight 自体を null で返す**
  （ハイライトはラップタイムがあって初めて成立。バッジだけの空虚な演出はしない）
- SELF_BEST 判定: 同 circuit かつ同車両（vehicleId があれば vehicleId一致、
  無ければ carModel 一致 — buildJournal.ts の対応付けと同じ規則）の過去 bestLap と
  lapTimeToMs で比較。過去に有効なラップが1件も無い場合は SELF_BEST を付けない
  （FIRST_VISIT と重複した自明な「自己ベスト」を避ける）
- FIRST_LOGGER: current に lapTimeData.evidence があり、履歴に evidence 付きが無い場合
- 判定不能な条件（weather未入力等）はバッジを付けない（推定しない）

### 2. ハイライト画像 — src/utils/shareImage.ts 拡張

- `generateHighlightImage(data: HighlightImageData): Promise<Blob>` を追加
  - 1200×630、既存のダークトーン・Canvas直描画パターン
  - 内容: サーキット名（大）・日付・ベストラップ（最大表示）・周回数（あれば）・
    バッジ（最大4個、ピル型）・車種名・WP-5の `drawWatermark` を適用
    （公開リンク発行時はURL入り）
- バッジ0個でも成立するレイアウトにする（バッジは加点要素）

### 3. UI — 保存後ハイライトモーダル

- `src/components/setup/SessionHighlightModal.tsx`（新規）
- 発火点: CarSetup.tsx の保存成功後（新規保存のみ。更新・編集保存では出さない）、
  `computeSessionHighlight` が非nullを返した場合のみ表示
  - 履歴は保存フロー内で既に取得済みのデータがあれば再利用し、なければ
    getUserSetups で取得（過剰なクエリを避ける）
- モーダル内容:
  1. ハイライトカードのプレビュー（画像と同等の情報をJSXで表示。バッジをアニメなしで列挙）
  2. アクション: 「画像を保存」（download）/「共有」（Web Share、cancelled対応は既存パターン）/
     「公開リンクを発行して共有」（WP-5 createPublicShare → URL入り画像＋リンクコピー）
  3. 閉じるボタン（保存フローを妨げない。モーダルを閉じても再表示手段は不要 — スコープ外）
- 計測イベント: `session_highlight_shown` / `session_highlight_image_saved` /
  `session_highlight_shared`（既存analyticsの流儀）

### 4. テスト — src/lib/sessionHighlights.test.ts（新規）

- bestLap無し → null（モーダル非表示の根拠）
- FIRST_VISIT: 同サーキット履歴なしで付与、ありで付かない
- SELF_BEST: 過去ベストより速い→付与 / 遅い→付かない / 過去に有効ラップなし→付かない
- vehicleId優先の車両対応付け（vehicleId不一致はcarModel一致でも別車両）
- FIRST_LOGGER: 履歴にevidence無し＆currentにあり→付与
- RAIN_SESSION: condition='ウェット'→付与、null→付かない
- HIGHLIGHT_BADGE_LABELS の網羅（Record型でtypecheck担保）

## スコープ外（やらないこと）

- バッジの永続化・実績一覧ページ（アルバムのギャラリービューは将来）
- テレメトリ由来のハイライト（セクターベスト等 — 段階B資産と合わせて将来）
- 更新保存・過去データ編集時のハイライト
- 3Dリプレイクリップ（保留中）

## 受け入れ基準

- [ ] `npm run typecheck` / `npm run lint` / `npm run test` 全成功
- [ ] ラップタイム無し保存ではモーダルが一切出ない
- [ ] バッジが履歴から正しく計算される（保存フィールド追加なし）
- [ ] 画像に透かしが入り、公開リンク発行時はURLが焼き込まれる
- [ ] 保存フロー自体の挙動（成功メッセージ・画面遷移）に回帰がない
- [ ] 偽データ・プレースホルダ実績が一切表示されない
