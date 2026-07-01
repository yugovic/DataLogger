# WP-5 要件定義: 共有画像パイプライン（透かし＋公開リンク＋ランディングページ）

- 日付: 2026-07-02
- 起点: docs/strategy/06-content-differentiation-plan.md（横串: コンテンツフライホイール / WP-5）
- 前提: WP-2完了後に着手（shareImage.ts を共に変更するため）
- 実装担当: codex（implementer） / レビュー: Fable 5
- ステータス: ドラフト（WP-2レビュー完了時に generateSpecCardImage の最終シグネチャを反映して確定）

## 目的

「走る→記録する→自動でコンテンツ生成→SNS共有→新規流入」のフライホイールの起点。
アプリが生成する共有画像すべてに**ブランド透かし＋公開リンクURL**を焼き込み、
リンク先の**公開ランディングページ**で閲覧者を登録に誘導する（Stravaモデル）。

## プロジェクト原則（厳守）

- **公開はユーザーの明示的なオプトイン**（「公開リンクを発行」操作をした場合のみ）
- 公開ページに出すのは**匿名サマリーのみ**（ドライバー名・userIdは出さない）。
  セットアップの数値詳細（内圧・減衰等）は出さない — 詳細はGive-to-Getゲートの内側に保つ
  （無料で全部見えるとGive-to-Get/マーケットの価値が毀損されるため）
- null保存原則・偽データ禁止（未入力項目は公開サマリーにも含めない）

## スコープ

### 1. 公開共有データモデル — publicShares コレクション（新規）

```typescript
// src/types/publicShare.ts（新規）
export interface PublicShare {
  id?: string;               // shareId（ドキュメントID、URL用の不透明ID）
  ownerId: string;           // 作成者（削除権限の判定用）
  setupId: string;           // 元セットアップ
  createdAt: Date;
  summary: {
    circuit: string;
    carModel: string;
    bestLap: string | null;        // 表示用文字列
    sessionDate: Date;
    hasLoggerEvidence: boolean;    // ロガー証憑の有無（信頼マーク表示用）
    vehicleProfileSnapshot: PublicVehicleProfile | null; // WP-2のスナップショット流用
  };
}
```

- shareId は推測困難な不透明ID（`crypto.randomUUID()` のハイフン除去 or 英数12文字以上）。
  連番・setupId流用は禁止（列挙攻撃でsetupIdが漏れるため）
- summary は作成時に非正規化して固定（元setupが後で変更/削除されても公開ページは作成時点の内容。
  ただし削除導線は必須 — 下記4）
- **driver名・anonymizedフラグ関連情報・userIdはsummaryに含めない**（ownerIdはルール用の
  トップレベルフィールドで、ページ表示には使わない）

### 2. Firestoreセキュリティルール — firestore.rules（変更）

- `publicShares/{shareId}`:
  - read: 誰でも可（未認証含む — 公開ランディングページ用）
  - create: 認証済みかつ `request.resource.data.ownerId == request.auth.uid`、
    かつ対象setupが自分のもの
  - delete: `resource.data.ownerId == request.auth.uid`
  - update: 禁止（作り直しのみ）
- **注意: ルールのデプロイは手動**（`firebase deploy --only firestore:rules`）。
  実装後にレビュアーがユーザーへデプロイ要否を報告すること

### 3. サービス — src/services/publicShareService.ts（新規）

- `createPublicShare(setup: CarSetup): Promise<string>` — summaryを構築して保存、shareIdを返す。
  同一setupに既存の共有があれば新規作成せずそのshareIdを返す（重複発行防止。
  クライアント側クエリ: where ownerId == uid && setupId == id）
- `deletePublicShare(shareId: string): Promise<void>`
- `getPublicShare(shareId: string): Promise<PublicShare | null>` — 未認証でも動作すること
- `listMyPublicShares(userId: string): Promise<PublicShare[]>`
- summary構築は純粋関数 `buildShareSummary(setup): PublicShare['summary']` として
  `src/lib/publicShareSummary.ts` に切り出し（テスト対象）

### 4. UI

#### 4a. 公開リンク発行導線
- 既存の共有画像生成の呼び出し箇所（SetupCard / LapTimeModal等、実装時に全call siteを調査）に
  「公開リンクを発行して画像に含める」チェックボックスを追加
  - ON: createPublicShare → 画像の透かしに `{origin}/s/{shareId}` を焼き込み、
    URLをクリップボードにコピーするボタンも表示
  - OFF（デフォルト）: 透かしはアプリ名のみ
- 発行済みリンクの管理: 設定画面 or 履歴画面に「公開リンク管理」セクション
  （一覧＋削除ボタン）。最小実装として一覧と削除ができれば配置場所は実装判断でよい

#### 4b. 公開ランディングページ — src/components/share/PublicShareLanding.tsx（新規）
- ルート: `/s/:shareId`（**PrivateRouteの外側**。未認証で閲覧可能）
- 表示内容:
  - サーキット名・車種・セッション日（日付まで。時刻不要）
  - ベストラップ（大きく表示）＋ロガー証憑ありの場合は信頼マーク
    「ロガー計測」タグ
  - スペックカード（WP-2のSpecCard full、snapshotがある場合のみ。ownerLabel=null）
  - CTA: 「あなたの走行も記録しよう」→ /auth へのリンク（ボタン大）
  - フッターにアプリ名・簡単な説明1行
- 存在しない/削除済みshareId: 「この共有リンクは存在しないか、削除されました」＋CTAは表示
- ダーク基調の見栄え重視（共有先から来た初見者向けの顔になるページ）
- ローディング/エラー状態を適切に処理

#### 4c. OGPメタタグ
- Vite SPAのためOGPは**静的**（index.htmlにアプリ共通のog:title/og:description/og:image）。
  共有ごとの動的OGPはSSR/Functionsが必要なためスコープ外（将来課題としてコメントを残す）
- og:image用の静的ブランド画像は `public/og-image.png` として配置
  （1200×630、Canvasで作った初回生成物をコミットでよい。デザインはshareImage系と同トーン）

### 5. 透かしの共通化 — src/utils/shareImage.ts（変更）

- 透かし描画を共通関数 `drawWatermark(ctx, options: { shareUrl?: string })` に切り出し、
  `generateShareImage` と `generateSpecCardImage`（WP-2で追加）の両方に適用
- 内容: 右下にアプリ名「VELOCITY LOGGER」＋ shareUrl があれば短縮表示
  （`{host}/s/{shareId}`）。視認できるが主張しすぎないサイズ・不透明度
- 既存呼び出しの後方互換を保つ（shareUrl未指定でも動く）

### 6. 計測イベント

- 既存 analytics（src/lib/analytics.ts）の流儀に従い追加:
  - `public_share_created`（setupId・証憑有無）
  - `public_share_viewed`（shareId — ランディングページ表示時。未認証でも送れる場合のみ）
  - `public_share_cta_clicked`
- 成功指標「共有成果物経由の新規登録: 月間新規の15%」の計測基盤

### 7. テスト

- `src/lib/publicShareSummary.test.ts`:
  - driver名・userIdがsummaryに含まれない
  - bestLap無し→null（0や"--"への変換禁止）
  - vehicleProfileSnapshot無し→null
  - hasLoggerEvidenceの判定（lapTimeData.evidence の有無）
- shareId生成: 長さ・文字種・連番でないこと
- drawWatermark: 単体テストは不要（Canvas描画）。shareUrl有無の分岐がtypecheckで保証されればよい

## スコープ外（やらないこと）

- 動的OGP（SSR/Cloud Functions）
- 短縮URLの独自ドメイン（originベースでよい）
- 公開ページでのセットアップ数値詳細の表示（Give-to-Getゲートの内側に維持）
- 3Dリプレイクリップ（保留中）
- Firestoreルールの自動テスト（バックログ扱いを維持）

## 受け入れ基準

- [ ] `npm run typecheck` / `npm run lint` / `npm run test` 全成功
- [ ] 公開リンク発行→未認証ブラウザで /s/{shareId} が表示→CTAで/authへ、の一連が成立
- [ ] 公開ページ・summaryにドライバー名/userIdが一切出ない
- [ ] セットアップの数値詳細（内圧・減衰等）が公開ページに出ない
- [ ] リンク削除後は「存在しない」表示になる
- [ ] 透かしがshareUrl有無の両方で正しく描画される
- [ ] firestore.rules の変更内容がレポートに明記されている（デプロイは手動のため）
