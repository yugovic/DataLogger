# WP-8 要件定義: ビルドジャーナル / Mod ROI

- 日付: 2026-07-02
- 起点: docs/strategy/06-content-differentiation-plan.md（柱C-2 / WP-8）、前提: WP-1完了
- 実装担当: codex（implementer、ワークツリー wp8-build-journal ブランチ） / レビュー: Fable 5

## 目的

改造履歴（VehicleProfile.modifications）とラップタイム推移を同じ時間軸に置き、
「この改造の前後でタイムがどう変わったか」を自動注釈する。
本質は**みんカラのパーツレビュー文化×ロガー証憑付きタイムの接続**。
費用が入力されている場合のみ Mod ROI（円/秒）を参考表示する。

## プロジェクト原則（厳守）

- **「因果の証明」ではなく「参考注釈」**: タイム変化には腕・気温・タイヤ摩耗が混ざる。
  UI上に必ず「参考値（走行条件・ドライバーの上達の影響を含みます）」の注記を出す
- null保存原則: 費用未入力ならROIを計算・表示しない（0円扱い禁止）
- 所有者専用ビュー（共有はスコープ外）
- コメント・UIテキストは日本語

## 重要な前提（並行開発の制約）

WP-2が並行開発中で `CarSetup.vehicleId` を追加予定だが、**本WPでは使用しない**。
セットアップと車両の対応付けは `setup.carModel === `${vehicle.make} ${vehicle.model}`` の
文字列一致のみで実装する（vehicleId対応はマージ後にレビュアーが統合する）。
**src/types/setup.ts / src/schemas/setupSchema.ts / src/services/setupService.ts /
src/components/setup/ 配下 / src/utils/shareImage.ts は変更禁止**（WP-2と競合するため）。

## スコープ

### 1. 純粋ロジック — src/lib/buildJournal.ts（新規）

React・Firebaseに依存しない純粋関数のみ。

```typescript
// セットアップから抽出する走行セッション（呼び出し側で整形して渡す）
export interface JournalSession {
  setupId: string;
  date: Date;
  circuit: string;
  bestLapSeconds: number | null; // ベストラップ（秒）。無ければ null
}

// タイムライン上のイベント（改造と走行を時系列マージ）
export type JournalEvent =
  | { kind: 'mod'; date: Date; modification: ModificationEntry }
  | { kind: 'session'; date: Date; session: JournalSession; isCircuitBest: boolean };

export function buildJournalTimeline(
  modifications: ModificationEntry[],
  sessions: JournalSession[],
): JournalEvent[];
```

- installedAt が null の改造はタイムラインに載せない（日付不明のため。UIでは別枠「日付未設定の改造」として一覧表示）
- isCircuitBest: そのセッションが同一サーキットのそれまでの自己ベストを更新したか

```typescript
// 改造前後のタイム変化注釈
export interface ModImpact {
  modificationId: string;
  circuit: string;
  beforeBestSeconds: number;  // 改造前の同サーキット自己ベスト
  afterBestSeconds: number;   // 改造後の同サーキット自己ベスト
  deltaSeconds: number;       // after - before（負=短縮）
  costJPY: number | null;
  yenPerSecond: number | null; // 短縮時かつ費用ありのみ。それ以外 null
}

export function computeModImpacts(
  modifications: ModificationEntry[],
  sessions: JournalSession[],
): ModImpact[];
```

- 計算条件: installedAt があり、**同一サーキットで改造前・改造後それぞれ1セッション以上**
  （bestLapSeconds非null）が存在する場合のみ注釈を生成。片側しかなければ生成しない
- before = 改造日以前の同サーキット最速、after = 改造日より後の同サーキット最速
- yenPerSecond = costJPY / |deltaSeconds|（deltaSeconds < 0 かつ costJPY 非null のときのみ。
  丸めは整数円）。タイム悪化（delta ≥ 0）の場合は null（ROIは表示せずdeltaのみ表示）
- 複数サーキットで条件を満たす場合はサーキットごとに1件ずつ生成

```typescript
// ラップタイム文字列 → 秒（既存ユーティリティがあれば再利用し、これは作らない）
export function parseLapTimeToSeconds(lapTime: string): number | null;
```

- **実装前に src/lib/ 配下（setupFields.ts, csv.ts, telemetry/ 等）に既存のラップタイム
  パース関数がないか必ず調査し、あればそれを再利用する**。無い場合のみ新設し、
  既存データで使われている表記（例: "1:08.500", "1'08.500", "68.5"）に対応。
  パース不能は null（例外を投げない）

### 2. データ取得 — src/services/ の再利用

- 既存 `setupService` のユーザーセットアップ取得関数を再利用し、
  `carModel === `${make} ${model}`` で絞り込んで JournalSession[] へ整形する。
  整形ロジックは `src/lib/buildJournal.ts` に純粋関数 `toJournalSessions(setups, vehicle)` として置く
  （CarSetup型のimportは読み取り専用なので可。**setup.tsの変更は禁止**）
- 新しいFirestoreクエリ・インデックスは追加しない（クライアント側フィルタで十分）

### 3. UI — src/components/vehicle/BuildJournal.tsx（新規）

- ルート: `/vehicles/:id/journal`（App.tsx にPrivateRoute 1行追加のみ）
- 入口: VehicleList の各車両カードに「ビルドジャーナル」ボタン（profile.modificationsが
  1件以上ある車両のみ表示）
- 構成（上から）:
  1. **ヘッダー**: 車種名・改造度バッジ（MOD_LEVEL_LABELS再利用）
  2. **サーキット別ベストラップ推移チャート**: echarts（既存Dashboard.tsxのダーク対応
     パターンに従う）。X軸=日付、Y軸=ベストラップ秒（下ほど速い、inverse）。
     サーキットごとに系列。改造イベントは markLine（縦線＋パーツ名ラベル）で重ねる。
     サーキット選択（Select）で系列を絞れる
  3. **タイムライン**: buildJournalTimeline の結果を縦のタイムラインで表示。
     改造イベント=🔧アイコン系（カテゴリラベル・パーツ名・メーカー）、
     走行イベント=サーキット名・ベストラップ（自己ベスト更新時は強調タグ「ベスト更新」）
  4. **Mod ROI注釈カード**: computeModImpacts の結果を一覧表示。
     「{パーツ名} 導入後、{サーキット}: {before} → {after}（{delta}秒）」
     費用ありかつ短縮時のみ「約{yenPerSecond}円/秒」を併記。
     セクション全体に注記「参考値（走行条件・ドライバーの上達の影響を含みます）」
  5. データ不足時の空状態: 「改造の装着日とラップタイム付きの走行記録が揃うと、
     ここに変化が表示されます」（偽データ・サンプル表示は禁止）
- ライト/ダークテーマ両対応、モバイルファースト

### 4. テスト — src/lib/buildJournal.test.ts（新規）

- parseLapTimeToSeconds（新設した場合）: "1:08.500"→68.5、不正文字列→null
- buildJournalTimeline: 時系列ソート、installedAt null の除外、isCircuitBest判定
- computeModImpacts:
  - 前後にセッションがあるサーキットのみ注釈生成
  - 片側のみ→生成しない
  - costJPY null → yenPerSecond null
  - タイム悪化 → yenPerSecond null（deltaは正の値で保持）
  - 複数サーキット → サーキットごとに生成
- toJournalSessions: carModel一致のみ抽出、bestLap無し→bestLapSeconds null

## スコープ外（やらないこと）

- CarSetup型・setupSchema・setupService・setup系コンポーネント・shareImage.tsの変更（WP-2と競合）
- vehicleId による紐付け（マージ後にレビュアーが統合）
- 共有・公開機能（所有者専用）
- 気象条件による補正・統計的な有意性判定

## 受け入れ基準

- [ ] `npm run typecheck` / `npm run lint` / `npm run test` 全成功
- [ ] 変更禁止ファイルへの変更が一切ない
- [ ] ROIが「参考値」注記付きでのみ表示される
- [ ] 費用未入力の改造でROIが表示されない（0円/秒が出ない）
- [ ] データ不足時にサンプル値・偽データが表示されない
- [ ] 純粋ロジックのテストが上記ケースを網羅
