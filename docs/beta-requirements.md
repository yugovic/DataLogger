# VELOCITY LOGGER ベータ版 要件定義書

作成: 2026-06-12 / 作成者: Fable 5（企画・要件定義担当） / ステータス: 確定

## 1. ベータ版の定義

**「課金を導入する一歩手前」の状態。** BUSINESS_PLAN.md のデータ中心戦略における「集める・保管する」を完全稼働させ、「売る」の直前で止める。

- 含む: Phase 0a（データ品質基盤）/ Phase 0b（記録・振り返り体験）/ Phase 0c（Give-to-Get共有）/ Phase 1 のうち**ロガー連携（ラップタイム証憑）**
- 含まない: Stripe Connect 決済、出品/購入フロー、サブスク課金、ベンチマーク統計（Phase 2）

### ベータの成功条件（事業観点）
1. **偽データ混入ゼロ**: デモ初期値・欠損の0変換が存在しない（事業上の欠陥として扱う）
2. **証憑付きデータが作れる**: ロガーファイル取込 → ラップタイム自動抽出 → セットアップ記録への添付が一気通貫で動く
3. **Give-to-Get が回る**: 共有した人だけが他人の共有データを見られる相互性がセキュリティルールで強制されている
4. **記録が習慣になる体験**: 前回値コピー・比較ビュー・モバイル入力で「走行当日に使える」こと（ノーススター指標: 月1回以上記録するアクティブユーザー）

## 2. 現状把握（2026-06-12 時点、コミット 7d2ac62 基準）

| 領域 | 状態 |
|---|---|
| 認証・保存・読込 | 実装済み（Firebase Auth + Firestore） |
| メイン記録画面 | CarSetup.tsx（1,290行モノリス）。**デモ初期値がハードコード**（気温24℃・空気圧190等） |
| ダッシュボード | 実データ + echarts で実装済み（851行） |
| テレメトリ | パーサープロトタイプあり（TelemetryParserTest.html: AIM CSV / .dtb / NMEA RMC 実装済み、**ラップ検出なし**）。比較UIはハードコードのモック（TelemetryComparison.tsx）。サンプル実データあり（amuse_Z34 .dtb） |
| 共有 | 未実装（firestore.rules はオーナーのみ） |
| 品質ゲート | **なし**（typecheck/lint スクリプト不在、テスト0、CI なし） |

### 既存レビュー指摘（docs/implemented-content-review.html、全件ベータで解消）
1. **[Critical]** 過去データを開いても画面上は"今のセッション"に見える（日時文脈の喪失）→ WP1
2. **[Critical]** 走行前→後コピーが破壊的（確認・Undoなし、4輪一括上書き）→ WP3
3. **[High]** driver がデータ化されていない（保存モデルに無い）→ WP1
4. **[High]** モバイルで2カラム前提のレイアウトが重い → WP5（テレメトリ）+ WP3（記録画面）
5. **[High]** 空気圧UIが記録止まりで「次の判断」に繋がらない → WP7
6. **[Medium]** 履歴カードでセット比較できない → WP3

## 3. データモデル変更（全WP共通の基盤）

```typescript
// 原則: 未入力は null。0 や '' への変換・デモ値での充填を禁止する
type Maybe<T> = T | null;

interface CarSetup {
  // 既存 + 変更
  driver: Maybe<string>;            // 新規（指摘#3）
  date: Date;                       // セッション日時。保存値を表示し、新規時のみ現在日時を初期値（指摘#1）
  weather: { condition: Maybe<WeatherType>; airTemp: Maybe<number>; ... };  // 全数値 Maybe 化
  tireSettings: { fl: { before: Maybe<number>; after: Maybe<number> }; ... }; // diff は導出値（保存しない or 保存時に再計算）
  // 共有（WP6）
  visibility: 'private' | 'shared'; // デフォルト private
  anonymized: boolean;              // 共有時にドライバー特定情報を除外
  // 証憑（WP4/5）
  lapTimeData?: {
    bestLap: Maybe<string>;
    totalLaps: Maybe<number>;
    laps: LapTime[];
    source: 'manual' | 'logger';    // 証憑区分
    evidence?: {                    // ロガー由来の場合のみ
      fileName: string;
      format: 'aim-csv' | 'digispice-dtb' | 'nmea';
      importedAt: Date;
      trackId: Maybe<string>;
    };
  };
}
```

- 単位は `src/lib/units.ts` に定数化: 空気圧 kPa / 車高 mm / バネレート kgf/mm / 角度 deg / 温度 ℃。UIラベルに必ず併記
- zod スキーマ（`src/schemas/setupSchema.ts`）を保存経路の唯一の関門にする。読込側は旧データ（数値0埋め時代）を許容するゆるい後方互換スキーマで受け、画面表示時に「0=旧データの可能性」を区別しない（既存データはそのまま表示。新規保存からクリーン化）

## 4. ワークパッケージ（WP）

実行順序: **WP1 → WP2 → (WP3 ∥ WP4) → (WP5 ∥ WP6) → WP7 → 最終レビュー**
各WP完了時に Fable がレビュー（typecheck/build green + 受入基準充足が合格条件）。

### WP1: データ品質基盤【実装: Sonnet 4.6】
- CarSetup.tsx・useSetupState.ts のデモ初期値全廃（空気圧190/215、気温24等）→ null/空値スタート
- 保存時: 未入力フィールドは null のまま Firestore へ。0変換・既定値充填の禁止
- `driver` フィールド追加（state → 保存 → 読込 → 表示の一貫）
- セッション日時の文脈保持: 過去データ表示時は保存済み日時、新規時のみ today。編集可否をUIで明示
- zod スキーマ + `src/lib/units.ts`。useSetupState.ts が未使用なら削除（dead code 確認）
- **受入基準**: 新規作成画面の全入力が空であること / 未入力保存→Firestore上で null / 過去データを開くと保存時日時が表示される / build green

### WP2: 品質ゲート + 計測【実装: Sonnet 4.6】
- `npm run typecheck`（tsc --noEmit）・`npm run lint`（ESLint flat config + typescript-eslint）・`npm run test`（vitest）
- GitHub Actions: push/PR で typecheck + lint + test + build
- `src/lib/analytics.ts`: Firebase Analytics ラッパー。イベント: setup_saved / setup_shared / telemetry_imported / comparison_viewed（計測はベータのKPI＝ノーススター測定の生命線）
- **受入基準**: 4コマンド全部 green / CI ワークフローが有効 / 主要操作でイベント発火

### WP3: 記録・振り返り体験【実装: Opus 4.8】
- 比較ビュー: 同一車両（または車種）の2セットアップを並べ、差分項目をハイライト。「前回 vs 今回」をワンタップで
- 前回値コピー: 新規作成時「前回のセットアップから引き継ぐ」(タイヤ銘柄・サス設定等)。履歴からの ?copy= 動線も維持
- 破壊的コピー対策（指摘#2): 確認 + 実行後Undoトースト。「空欄のみコピー」オプション
- 履歴強化（指摘#6): カードに主要数値サマリー（ベストラップ・空気圧範囲）、サーキット/車種フィルタ、2件選択→比較への導線
- CSVエクスポート（自分のデータの逃げ道確保 = プラットフォーム依存リスク対策）
- **受入基準**: 比較画面で差分が視認できる / コピーがUndo可能 / フィルタが機能 / CSV出力が開ける

### WP4: ロガー連携コア【実装: Fable 5（高難度）】
- `src/lib/telemetry/` 新設: TelemetryParserTest.html のプロトタイプを TypeScript 製品コードへ
  - `parseAimCsv.ts` / `parseDigiSpiceDtb.ts` / `parseNmeaRmc.ts` / `types.ts`（TelemetryPoint: time/lat/lon/speed/heading）
  - 派生計算: 累積距離（Haversine）・前後G
- ラップ検出: `detectLaps.ts` — スタート/フィニッシュライン（2点で定義する線分）と GPS 軌跡の交差判定 + 補間でラップタイム算出。ノイズ対策（最小ラップ時間・進行方向チェック）
- `src/lib/tracks.ts`: 国内主要サーキットDB（筑波2000・鈴鹿・富士・もてぎ・岡山・SUGO・大井松田等）— 名称・基準線座標・最小ラップ秒。GPS軌跡からの自動サーキット推定
- vitest: サンプル .dtb（amuse_Z34_Ooi）を固定データとして回帰テスト。NMEA チェックサム・日跨ぎ・異常系
- **受入基準**: サンプル .dtb のパース・ラップ検出がテストで再現可能 / 3形式すべてユニットテスト付き / UIに依存しない純粋ロジック

### WP5: テレメトリUI統合【実装: Fable 5（デザイン）】
- 取込フロー: ファイルドロップ → パース → サーキット自動推定 → ラップ一覧（ベスト強調） → 「このセッションのセットアップ記録に添付」
- TelemetryComparison を実データ化: echarts で速度/G vs 距離、ラップ重ね比較。ハードコードデータ削除（デモは /demo に隔離 or 削除）
- セットアップ記録・履歴カードに証憑バッジ（ロガー由来ラップタイムの明示）— マーケットプレイスの商品規格の根幹
- モバイル1カラム最適化（指摘#4）
- **受入基準**: サンプル .dtb を画面から取り込んでラップタイムがセットアップに添付できる / モック値が残っていない

### WP6: Give-to-Get 共有【実装: Opus 4.8 / ルールはFableが厳格レビュー】
- visibility（private/shared）+ 匿名化オプション。共有UI（記録画面・履歴から切替）
- firestore.rules: 「sharingActive な利用者のみ、他人の shared セットアップを read 可」の相互性を**ルールで強制**（users/{uid} プロフィールに共有状態を持たせ get() で参照）
- 共有ブラウズ画面: サーキット×車種で探索（在庫マトリクスの原型）。匿名化データはドライバー名非表示
- プロフィール基盤: 表示名・ベスト実績（将来の売り手ポートフォリオの種）
- **受入基準**: 非共有ユーザーが他人のデータを読めないことをルールテストで確認 / 匿名化が機能 / firestore.indexes.json 更新済み

### WP7: 判断支援・仕上げ【実装: Sonnet 4.6】
- 指摘#5: 各輪の目標温間圧（車両 or セットアップ単位で設定）と実測差を表示、目標レンジ内外で状態色分け、次走行の調整推奨（差分から単純計算でよい。AI不要）
- 必須/任意項目の明示、バリデーションフィードバック（zodエラーの画面表示）
- **受入基準**: 目標圧を設定すると4輪の過不足が色で分かる / 必須未入力で保存時に明確なエラー

### 最終統合レビュー【Fable（メイン）】
- 全ゲート green、要件カバレッジ突合、firestore.rules セキュリティ監査、SPECIFICATION.md / CLAUDE.md 更新、コミット整理

## 5. オーケストレーション運用

| 役割 | モデル |
|---|---|
| 企画・要件定義・各WPレビュー・統合判定 | Fable 5（メインエージェント） |
| 通常実装（WP1/2/7） | Sonnet 4.6 |
| 大型実装（WP3/6） | Opus 4.8 |
| 高難度・デザイン（WP4/5） | Fable 5（サブエージェント） |

- 並行実行はファイル境界が交差しないペアのみ（WP3∥WP4、WP5∥WP6）。types/setup.ts 等の共有ファイルは先行WPで確定させる
- 各WP完了ごとに日本語コミット（機能単位）。リベース完了後の main 上で直列に積む
- 共通規律（全エージェントへ指示）: デモ値・プレースホルダ実データの持込禁止 / console.log 直書き禁止（logger 経由）/ 単位ラベル必須 / 既存UIトーン（Tailwind + Ant Design + ダークモード対応）の踏襲

## 6. リスクと対応

| リスク | 対応 |
|---|---|
| CarSetup.tsx モノリスへの多WP接触で衝突 | WP直列化 + 各WPの担当領域を明示。大規模分割リファクタはベータでは行わない（動作優先） |
| 旧データ（0埋め）と新データ（null）の混在 | 読込互換レイヤーで吸収。表示は値をそのまま、統計系（Dashboard）は null 除外で集計 |
| .dtb フォーマットの未知バリエーション | パーサーは防御的に（マジック検証・異常時は明確なエラー）。NMEA/CSV という公式オープン形式を正としてフォールバック |
| 共有ルールの穴（他人の private が読める等） | WP6 はルール単体をFableが行レベル監査 + エミュレータでのルールテストを受入条件に |
| ラップ検出の精度（GPS 1Hz 等の粗いデータ） | 線分交差 + 時間補間で百分の一秒精度を狙うが、ベータでは「証憑=ロガー由来」の明示が本質。精度限界は表示上明記 |
