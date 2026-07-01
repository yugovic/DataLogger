# WP-2 要件定義: マシンスペックカードUI

- 日付: 2026-07-02
- 起点: docs/strategy/06-content-differentiation-plan.md（柱B / WP-2）、前提: WP-1完了（コミット35182a0）
- 実装担当: codex（implementer） / レビュー: Fable 5

## 目的

車両の改造申告リスト（VehicleProfile）をトレカ風の「マシンスペックカード」として可視化し、
比較・共有のすべてのタイム表示に「車両の文脈」を添付する。カードは比較の公平性の道具であると
同時に、オーナーの自己表現メディア（みんカラ的表明文化の受け皿）。

## プロジェクト原則（厳守）

- null保存原則: 未入力はnull。表示は「—」（0変換禁止）。**未入力項目はカードに表示しない**
- パワー・車重は自己申告値。カード上で必ず「申告値」と明示（証憑付きラップタイムと視覚的に区別）
- Tailwindはダークモード対応必須（全クラスに dark: プレフィックス、既存規約どおり）
- コメント・UIテキストは日本語

## スコープ

### 1. Setup⇄Vehicle紐付けとスナップショット非正規化

他ユーザーのvehiclesドキュメントはFirestoreルール上読めないため、**保存時に公開用プロフィールを
setupドキュメントへ埋め込む**（非正規化）。走行当時の車両仕様が固定される＝履歴としても正しい。

- `src/types/setup.ts` の `CarSetup` に追加:
  ```typescript
  vehicleId?: string | null;                          // 登録車両との紐付け（任意）
  vehicleProfileSnapshot?: PublicVehicleProfile | null; // 保存時点の公開用プロフィール
  ```
  （`PublicVehicleProfile` は src/lib/vehicleProfilePublic.ts から import。carModelとの循環参照に注意）
- `src/schemas/setupSchema.ts` の `carSetupSchema` に対応フィールドを追加（両方 nullable + optional。
  snapshotの中身は publicVehicleProfile 用のzodスキーマを新設して検証）
- `src/services/setupService.ts` の保存経路: `vehicleId` が指定されていれば `getVehicle(vehicleId)` で
  自分の車両を取得し、`profile` があれば `toPublicVehicleProfile()` でスナップショット化して保存。
  vehicleIdがnull/undefinedならスナップショットも保存しない。**vehicleIdはあるがprofile未設定なら
  snapshot は null**（勝手に空オブジェクトを作らない）
- `BasicInfoTab.tsx`（車種入力欄の近く）に「登録車両から選択」セレクトを追加:
  - `getUserVehicles(userId)` で自分の車両一覧を取得し、選択すると `carModel` を
    `${make} ${model}` で自動入力し `vehicleId` をセット
  - 従来どおり自由文字列入力も可能（その場合 vehicleId は null）
  - 選択解除（「選択しない」オプション）も用意
  - 既存のフォーム状態管理（useSetupState等）の流儀に従うこと

### 2. VehicleProfile編集UI — VehicleModal「プロフィール」タブ

`src/components/vehicle/VehicleModal.tsx` に既存タブ形式へ「チューニング」タブを追加。

- **改造パーツリスト**: 行の追加・編集・削除
  - 各行: カテゴリ（Select、MOD_CATEGORY_LABELS使用）/ パーツ名（必須）/ メーカー（任意）/
    装着日（DatePicker、任意）/ 費用（InputNumber円、任意）/ メモ（任意）
  - 「取外し」操作: removedAt に日付をセット（行削除とは別。履歴として残す）。
    取外し済み行はグレーアウト表示＋「取外し済み」タグ
  - 行IDは `crypto.randomUUID()`
  - 費用・メモ欄に「非公開（共有時に含まれません）」の注記を表示
- **タイヤ区分**: Select（TIRE_CLASS_LABELS）、未選択可（null）
- **申告スペック**: powerPs / weightKg の InputNumber（任意、placeholder「未入力」）。
  「自己申告値として表示されます」の注記
- 保存時は `vehicleProfileSchema` でバリデーション（既存 vehicleService の検証が効く）。
  エラーはフォーム上に日本語表示
- **改造度バッジのプレビュー**: タブ内に現在の estimateModLevel 結果をリアルタイム表示

### 3. スペックカードコンポーネント — src/components/vehicle/SpecCard.tsx（新規）

- Props:
  ```typescript
  interface SpecCardProps {
    carModel: string;
    profile: PublicVehicleProfile;
    variant: 'full' | 'compact';
    ownerLabel?: string | null; // 匿名化時はnull（表示しない）
  }
  ```
- **ビジュアル方針（トレカ風）**: shareImage.ts と同系統のダークグラデーション
  （slate #0f172a→#1e293b）を基調に、青アクセント。ライト/ダークテーマ両対応だが
  カード自体は常にダーク基調（トレカとしての一貫性のため）
- **full**（車両管理・共有詳細・比較画面用）:
  - ヘッダー: 車種名（大）、改造度バッジ（MOD_LEVEL_LABELS、レベル別色: NORMAL=グレー/
    LIGHT=青/MIDDLE=紫/FULL=金系）
  - タイヤ区分タグ（未申告なら非表示）
  - 申告スペック行: パワー・車重（値がある場合のみ。「申告値」ラベル併記）
  - 改造リスト: カテゴリごとにグループ化し、カテゴリ名（日本語ラベル）＋パーツ名（メーカー併記）。
    装着中のみ（publicProfileは既に除外済み）
  - 改造0件なら「ノーマル車両」表示
- **compact**（共有ブラウズ一覧・比較ヘッダー用）:
  - 1〜2行: 改造度バッジ＋タイヤ区分＋改造カテゴリ数（例「ミドルチューン・Sタイヤ・5カテゴリ改造」）
- レスポンシブ（モバイルファースト）

### 4. 画面への組込

- **SetupCompare（/compare）**: ヘッダーの各セットアップ情報ブロック直下に、
  `vehicleProfileSnapshot` があれば SpecCard（compact）を表示。A/B両方にsnapshotがあり
  タイヤ区分または改造度が異なる場合、「車両条件が異なります」の注意バナーを比較表上部に表示
  （タイム差の解釈を助ける — 06プランの核心）
- **SharedBrowse（/shared）**: SharedSetupCard 内の天候/タイヤ情報ブロックの後に
  SpecCard（compact）を表示（snapshotがある場合のみ）
- **SharedSetupDetail（/shared/:id）**: SpecCard（full）を表示（snapshotがある場合のみ）
- **VehicleList（/vehicles）**: 各車両カードに profile がある場合、SpecCard（full）を
  展開表示できる導線（モーダルまたは展開）＋「カード画像を保存」ボタン

### 5. カード画像書き出し — src/utils/shareImage.ts 拡張

- `generateSpecCardImage(data: SpecCardImageData): Promise<Blob>` を追加
  （既存 generateShareImage と同じ Canvas 直描画パターン、1200×630px、同系統ビジュアル）
- 内容: 車種名・改造度バッジ・タイヤ区分・改造カテゴリ別パーツリスト（最大表示数を決め、
  溢れたら「他N件」）・申告スペック（「申告値」注記付き）・アプリ名ロゴテキスト
- VehicleList の「カード画像を保存」から呼び出し（ダウンロード＋Web Share API、既存パターン踏襲）
- 透かし＋短縮URLの本格実装はWP-5スコープ（ここではアプリ名テキストのみ）

### 6. テスト

- SpecCard のレンダリングテスト（既存のコンポーネントテスト規約がなければ、
  カード表示用のデータ整形ロジックを純粋関数 `src/lib/specCardView.ts` に切り出してユニットテスト）:
  - 改造リストのカテゴリグループ化
  - null項目（power/weight/tireClass）が出力に含まれない
  - compact用サマリー文字列の生成（0件→「ノーマル車両」）
- setupSchema拡張のテスト: vehicleId/snapshot が null でも valid、snapshot に costJPY 等の
  非公開フィールドが混入した場合 invalid（strictスキーマ）

## スコープ外（やらないこと）

- Firestoreセキュリティルールの変更（snapshotはsetupドキュメント内なので既存ルールで動く）
- 透かし・短縮URL・公開ランディングページ（WP-5）
- 改造履歴×タイム推移のタイムライン（WP-8）
- 既存セットアップの遡及マイグレーション（snapshotなしの過去データは単にカード非表示）
- マーケット商品ページ（Phase 1で未実装のため）

## 受け入れ基準

- [ ] `npm run typecheck` / `npm run lint` / `npm run test` 全成功
- [ ] 車両にプロフィール登録 → セットアップ保存時に「登録車両から選択」→ /compare と /shared でカード表示、の一連が成立する実装になっている
- [ ] 匿名化共有時にカードへ所有者情報が出ない（ownerLabel=null経路）
- [ ] 未入力項目がカードに「0」や空欄として出ない（非表示になる）
- [ ] snapshotに costJPY / memo / 装着日が含まれない（公開変換を必ず経由）
- [ ] ライト/ダークテーマ両方で表示が破綻しない
- [ ] 既存テストに回帰がない
