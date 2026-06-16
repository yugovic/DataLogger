# テレメトリ比較機能 実装仕様

作成: 2026-06-13 / 対象: AIM・DigiSpice 等のロガー取込、過去自己比較、共有・マーケット参照比較

本書は `docs/telemetry-ux-strategy.md` の実装向け仕様である。目的は、現行の「取込ファイル内の2ラップ比較」を、
「過去の自分」「購入/共有されたリファレンス」「将来のマーケット商品」と比較できる継続利用機能へ拡張すること。

---

## 1. 現行ソースコードの到達点

### できていること

- `src/lib/telemetry/` に、AIM CSV / DigiSpice .dtb / NMEA RMC のパーサー、フォーマット判定、ラップ検出、距離軸リサンプル、デルタT、指標計算、ルールベース注釈がある。
- `src/components/telemetry/TelemetryTraceList.tsx` は `/telemetry` の起点画面として、保存済み走行ログを車種・コース別に確認し、デブリーフ/比較/セットアップ記録へ遷移できる。
- `src/components/telemetry/TelemetryAnalysis.tsx` は `/telemetry/import` で、ロガーファイルを端末内で読み込み、1ラップ確認または同一ファイル内の2ラップを `ComparisonCockpit` で比較できる。
- `src/components/telemetry/SingleLapTelemetryView.tsx` は、比較相手がない1ラップでも速度、G、走行ライン、主要指標を確認できる。
- `src/components/telemetry/TelemetryFileCompare.tsx` は、A/B それぞれに別ファイルを読み込み、前回ファイルと今回ファイル、または今回ファイルと受領/サンプルファイルを保存前に比較できる。
- `src/components/telemetry/TelemetryImport.tsx` は、セットアップ記録へ `lapTimeData.evidence` を添付できる。
- `/telemetry/compare?aTrace=&bTrace=` は保存済みトレース同士の比較に加え、保存済みAに対してアップロードしたローカルファイルをBとして差し込める。
- `CarSetup.lapTimeData.evidence` は、ロガー由来ラップタイムの証憑メタデータとして保存される。
- `setups.visibility` と Firestore rules により、Give-to-Get の共有閲覧は実装済み。
- `SetupCompare` はセットアップ静的項目の比較に対応済み。

### まだ足りないこと

- 比較用の間引きトレースは保存できるが、ローカルBファイル、比較結果、選択した比較相手をセッション資産として残す導線はまだ限定的。
- セットアップ記録本体にはラップタイム証憑とトレース参照のみを持つ。生ロガー全量やAIM等のCANチャンネルはまだ保持しない。
- 保存済み走行ログの一覧はあるが、比較対象2本を明示的に選ぶピッカー、共有/購入リファレンス探索、比較結果の保存はまだ限定的。
- ローカルファイル2本比較は保存前の一時比較であり、比較結果や選択したBファイルはまだセッション資産として保存されない。
- 共有セットアップは読めるが、共有/購入された「比較用テレメトリ資産」の権限モデルがない。
- 現行 `TelemetryPoint` は GPS・速度・方位・高度のみ。AIM 等で取れるスロットル/ブレーキ/舵角/RPM/CAN チャンネルを保持できない。
- サーキットDBは鈴鹿以外のS/Fラインが未校正。公式セクター、コーナー名がない。

---

## 2. 作るべき体験

### 2.1 セッション保存時の体験

ユーザーはセットアップ記録にロガーファイルを添付するだけで、以下が自動作成される。

1. ロガーファイル解析
2. サーキット判定、S/Fライン決定
3. ラップ検出
4. ベスト/有効ラップ選択
5. 比較用の間引きトレース保存
6. セットアップ記録とトレースの紐付け
7. 直近自己ベスト/前回セッションとの自動比較

画面上は「ラップタイムを添付」ではなく、**「この走行を分析可能なセッションとして保存」**に見せる。

### 2.2 過去の自分と比較する体験

入口は4つにする。

1. セッション詳細: 「前回と比較」「自己ベストと比較」
2. 走行履歴: 同じ車種×サーキットの過去ログ候補を自動提示
3. 走行ログ: 保存済みラップを車種・コース別に見て、デブリーフ、前回比較、自己ベスト比較へ入る
4. ローカルファイル比較: Aに前回ファイル、Bに今回ファイルを読み込み、保存前に比較する

比較の初期候補は自動で出す。

- 同じ `userId + carModel + trackId` の直近セッション
- 同じ `userId + carModel + trackId` の自己ベスト
- 同じ日/イベント内の予選・決勝ラップ
- タイヤ条件、気温、路温が近いラップ

ユーザーが最初に見るのはチャートではなく、次の要約。

- 自己ベスト比: `+0.432s`
- 最大ロス区間: `T1進入 -0.18s`
- 最大ゲイン区間: `最終コーナー +0.11s`
- 次走アクション: 1つだけ
- 条件差の注意: 気温/路温/タイヤ/燃料/ラップ有効性

詳細へ進むと、現行 `ComparisonCockpit` のデルタT、速度/G、コースマップ、指標デルタ、コーチ読み解きを表示する。

ロガーUXでは「保存済み比較」と「ローカル一時比較」を明確に分ける。ユーザーの代表ケースは次の通り。

- 今回 vs 前回: 両方が保存済みなら `/telemetry/compare?aTrace=&bTrace=`、保存前なら `/telemetry/files` で2ファイルを読み込む。
- 今回 vs アップロードデータ: 今回が保存済みなら `/telemetry/compare?aTrace=` でBファイルをアップロード、両方が未保存なら `/telemetry/files`。
- 同一走行内のベスト vs 2番手: `/telemetry/import` で1ファイル内の2ラップを比較する。
- 1ラップだけの確認: `/telemetry/import`、`/telemetry/files`、`/telemetry/compare`、`/telemetry/debrief` の各画面で、比較相手が無い場合でも単独ラップビューを出す。

単独ラップビューは比較ではない。特にDigiSpice公式ソフト等が出力する1ラップ切り出しログでは、ファイル内でS/Fライン交差が1回しか観測されず、`NORMAL` として証明できない場合がある。この場合は `OUT` または `IN` のまま、次のように扱う。

- 表示可: ラップ時間、速度プロファイル、前後G/横G、主要指標、走行ライン（保存済みトレースの場合）
- 比較/保存可: 原則 `NORMAL` ラップのみ
- UI表示: `NORMAL` ではない場合、「切り出しログの確認用」と明示する

### 2.3 マーケット/共有データと比較する体験

ユーザーは自分のラップを基準A、共有/購入済み/販売中プレビューのリファレンスを比較Bとして重ねる。

比較対象の階層は明確に分ける。

| 種別 | 例 | 読める内容 | 用途 |
|---|---|---|---|
| 自分の保存済み | 過去走行、自己ベスト | 全トレース、セット、メモ | 成長・再現性 |
| Give-to-Get共有 | 他人の shared セットアップ | 匿名セット概要、ラップ、公開トレース | 無料共有期の価値体験 |
| 購入済み | 検証済みリファレンス | 商品規格に応じた詳細トレース、解説、セット | 本命の比較価値 |
| 販売プレビュー | 未購入商品 | 匿名サマリー、ベストタイム、区間優位の一部 | 購入判断 |
| チーム内共有 | チームメイト、ショップ顧客 | 権限範囲内の詳細 | 競技・ショップ運用 |

未購入データでは、トレース全体を出さない。プレビューは「買う価値が分かるが、データを抜き取れない」粒度にする。

- 表示可: 車種、コース、タイヤ、気温帯、ベストラップ、証憑、売り手実績、区間ごとの自分との差の概略
- 表示不可: 距離軸の詳細速度トレース、コーナーごとの具体的な操作タイミング、フルセット詳細

---

## 3. 情報設計

### 3.1 中心オブジェクト

中心は `CarSetup` ではなく、以下の関連を持つ「セッション」として扱う。

```txt
CarSetup
  └─ TelemetryTraceSummary[]  // 保存済み比較トレースの参照
       └─ TelemetryTrace      // ラップ単位の間引きトレース
            └─ MarketProduct? // 販売/購入/共有状態
```

`CarSetup` は現在の記録フォームと互換性を保つため、肥大化させない。比較に必要な配列データは別コレクションに出す。

### 3.2 画面構成

| 画面 | 役割 | 主要UI |
|---|---|---|
| セッション記録 | ロガー添付と保存 | 取込、ラップ選択、保存、証憑バッジ |
| セッション詳細 | 1走行の振り返り | デブリーフ、セット、ラップ一覧、比較CTA |
| テレメトリ比較 | A/B比較の本体 | 比較対象選択、デルタT、チャンネル、コースマップ、注釈 |
| 自分のトレース一覧 | 過去比較の入口 | 車種/コース/日付/自己ベスト/有効ラップ |
| リファレンス探索 | 共有/購入/販売データ検索 | 車種×コース×条件フィルタ、在庫カード |
| 商品詳細 | 購入判断 | 証憑、匿名サマリー、売り手実績、プレビュー |

`/telemetry` は保存済み走行ログの台帳として扱う。新規ファイル取込は `/telemetry/import`、保存前の前回/今回2ファイル比較は `/telemetry/files` に分け、ユーザーが最初に過去ログを確認してから必要に応じて追加・比較へ進む流れにする。

---

## 4. データモデル案

### 4.1 CarSetup の追加/変更

既存 `lapTimeData.evidence` は維持する。追加するのは参照情報だけに留める。

```ts
interface CarSetup {
  // existing fields...
  telemetry?: {
    traceIds: string[];
    primaryTraceId: string | null; // ベスト/代表ラップ
    importStatus: 'none' | 'attached' | 'trace_saved';
  };
}
```

### 4.2 telemetryTraces コレクション

ラップ単位で比較に使う間引きトレースを保存する。

```ts
interface TelemetryTrace {
  id: string;
  ownerId: string;
  setupId: string;

  visibility: 'private' | 'shared' | 'market_preview' | 'market_paid' | 'team';
  anonymized: boolean;

  carModel: string;
  trackId: string | null;
  circuit: string;
  sessionDate: Date;
  sessionType: 'practice' | 'qualifying' | 'race';

  source: {
    fileName: string;
    fileSizeBytes: number;
    format: 'aim-csv' | 'digispice-dtb' | 'nmea';
    importedAt: Date;
    parserVersion: string;
    sampleRateHz: number | null;
    lineSource: 'track-db' | 'estimated' | 'manual' | null;
  };

  lap: {
    lapNumber: number;
    type: 'NORMAL' | 'OUT' | 'IN';
    timeSeconds: number;
    valid: boolean;
    invalidReason?: string | null; // traffic, pit, yellow, gps, manual
  };

  conditions: {
    weather: CarSetup['weather'];
    tireInfo: CarSetup['tireInfo'];
    tireSettings: CarSetup['tireSettings'];
    targetPressures?: CarSetup['targetPressures'];
    fuel: number | null;
    notes?: string;
  };

  channels: {
    distanceM: number[];      // 5-10m間隔
    elapsedS: number[];
    speedKmh: number[];
    longG?: number[];
    latG?: number[];
    throttlePct?: number[];
    brakePct?: number[];
    steeringDeg?: number[];
    rpm?: number[];
    gear?: number[];
  };

  path?: {
    xM: number[];
    yM: number[];
    origin: { lat: number; lon: number };
  };

  summary: {
    topSpeedKmh: number | null;
    minCornerSpeedKmh: number | null;
    maxBrakeG: number | null;
    maxLatG: number | null;
    sectorTimes?: { sectorId: string; name: string; timeSeconds: number }[];
    coachSummary?: string;
  };

  market?: {
    productId: string | null;
    quality: 'raw' | 'verified' | 'commentary';
    priceJPY?: number;
    sellerId?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

保存方針:

- Firestore には間引きトレースだけ保存する。
- 生ファイルはベータでは保存しない。将来、購入証憑/再解析用に Storage 保存を検討する。
- `channels` は存在するものだけ保存する。取れないチャンネルを 0 で埋めない。
- `parserVersion` を保存し、将来の再解析差分を追跡できるようにする。

### 4.3 telemetryProducts コレクション

マーケットの商品単位。販売/購入/プレビューを `TelemetryTrace` から切り離す。

```ts
interface TelemetryProduct {
  id: string;
  traceId: string;
  setupId: string;
  sellerId: string;

  status: 'draft' | 'listed' | 'sold_out' | 'hidden';
  productType: 'setup_only' | 'telemetry' | 'commentary' | 'video_overlay';
  quality: 'raw' | 'verified' | 'commentary';

  title: string;
  trackId: string | null;
  circuit: string;
  carModel: string;
  lapTimeSeconds: number;
  tags: string[];

  preview: {
    weatherBand: string;
    tire: string;
    hasThrottle: boolean;
    hasBrake: boolean;
    hasSteering: boolean;
    sectors: { name: string; deltaHint?: string }[];
  };

  priceJPY: number;
  purchaseCount: number;
  ratingAvg?: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### 4.4 telemetryPurchases コレクション

購入権限を表す。将来 Stripe Connect と接続する。

```ts
interface TelemetryPurchase {
  id: string;
  productId: string;
  traceId: string;
  buyerId: string;
  sellerId: string;
  priceJPY: number;
  status: 'paid' | 'refunded' | 'revoked';
  purchasedAt: Date;
}
```

---

## 5. 取込・保存パイプライン

### 5.1 フロー

```txt
File
  -> parseTelemetryFile()
  -> resolveLapDetection()
  -> deriveCompareSeries()
  -> buildLapProfile()
  -> choose laps
  -> downsample/save TelemetryTrace
  -> update CarSetup.telemetry + lapTimeData.evidence
```

### 5.2 UI手順

1. セットアップ記録で「ロガーを取り込む」
2. 解析結果を表示
   - フォーマット
   - 推定コース
   - S/Fラインの出所
   - 検出ラップ一覧
   - 取得できるチャンネル一覧
3. 保存対象ラップを選ぶ
   - デフォルト: NORMAL のベストラップ
   - 追加選択: 上位3ラップ、予選ラップ、決勝中の代表ラップ
4. 「比較用トレースを保存」
5. 保存後に自動でデブリーフを生成

### 5.3 保存時の品質ゲート

保存前に以下を検査する。

- NORMAL ラップが最低1本ある
- `trackId` または自動推定ラインがある
- 距離プロファイルが一定以上ある
- 速度チャンネルが有限値を持つ
- GPS欠損率が高すぎない
- 推定ラインの場合は UI に「自動推定」と明示
- 1ラップ切り出し .dtb の場合、完全周ではない可能性を表示し、比較保存はユーザー確認を必要にする

品質状態は `trace.summary` か別の `qualityFlags` として保存する。

```ts
qualityFlags: {
  gpsDropout: boolean;
  estimatedLine: boolean;
  singleLapFile: boolean;
  lowSampleRate: boolean;
  missingOperationChannels: boolean;
}
```

---

## 6. 比較仕様

### 6.1 比較対象の選び方

比較画面では A/B の対象を同じ `ComparableLap` として扱う。

```ts
type ComparableLapSource = 'own' | 'shared' | 'purchased' | 'preview' | 'uploaded';

interface ComparableLap {
  source: ComparableLapSource;
  traceId?: string;
  setupId?: string;
  label: string;
  ownerLabel: string; // 自分 / 匿名 / 売り手名
  trace: TelemetryTrace | PreviewTrace;
}
```

初期選択:

- A: 現在セッションの代表ラップ
- B: 同じ車種×コースの自己ベスト
- 自己ベストがなければ直近セッション
- マーケットから開いた場合は、B に購入/プレビュー対象を入れる

### 6.2 比較ロジック

現行 `deltaT`, `computeLapMetrics`, `buildCoachingReadout` を保存済みトレースにも使えるよう、入力を `LapProfile` ではなく `ComparableTraceProfile` へ抽象化する。

必要な比較:

- 累積デルタT
- 区間デルタ
- 最高速差
- 最小コーナー速度差
- 減速開始地点差
- 横G/前後G差
- 操作チャンネル差（存在する場合のみ）
- セット差分
- 条件差

### 6.3 表示ルール

- A/B は「どちらが速いか」だけでなく「比較の前提が近いか」を必ず表示する。
- 気温、路温、タイヤ、燃料、路面、セッション種別が大きく違う場合は警告を出す。
- 取得できないチャンネルは非表示。代替推定を使う場合は「推定」と表示する。
- マーケットプレビューでは詳細トレースをぼかすのではなく、最初から詳細データを返さない。

### 6.4 競技デブリーフ

比較結果の最上段に、以下を表示する。

```txt
自己ベスト比 +0.432s
最大ロス: T1進入 +0.18s
推定原因: ブレーキ開始が12m手前 / 最小速度 -3.2km/h
次走アクション: T1のブレーキ開始を10m奥へ。ただし進入速度が高すぎる場合は最小速度を優先。
信頼度: 中（S/Fラインは自動推定、スロットルCHなし）
```

この要約はルールベースを優先する。AIは将来、自然文の整形や人間の注釈補助に限定する。

---

## 7. 権限・公開範囲

### 7.1 読み取りルール

`telemetryTraces/{traceId}` の読み取りは以下。

- owner: 常に可
- shared: `setups` と同じ Give-to-Get 条件を満たす場合のみ可
- purchased: `telemetryPurchases` に `buyerId == request.auth.uid && status == paid` がある場合のみ可
- preview: `telemetryProducts.status == listed` のプレビュー専用データのみ可
- team: `teams/{teamId}/members/{uid}` で許可された場合のみ可

### 7.2 書き込みルール

- `telemetryTraces` の作成/更新/削除は owner のみ。
- `market` 関連フィールドは、商品出品フロー経由でのみ更新する。
- 匿名化時は、ドライバー名、詳細GPS座標、ファイル名、メモの個人情報を除去または丸める。

### 7.3 GPSの扱い

GPS軌跡は個人情報性がある。公開/販売時の粒度を分ける。

- 自分/購入済み: 比較に必要な相対座標 `xM/yM` を提供
- 共有: 原点をずらした相対座標のみ。生緯度経度は出さない
- プレビュー: コース図上の区間ハイライトのみ

---

## 8. 実装フェーズ

### Phase B1: 自己比較を成立させる

目的: 過去の自分と比較できる状態にする。

実装:

- `TelemetryTrace` 型追加
- `telemetryTraceSchema` 追加
- `telemetryTraceService` 追加
- 取込モーダルで保存対象ラップを選択
- 間引きトレース保存
- `CarSetup.telemetry` 更新
- 自己ベスト/前回候補取得
- 保存済みトレース同士を `ComparisonCockpit` で比較

受入基準:

- AIM/DigiSpice/NMEA の既存テストが通る
- ロガー取込後、ページを閉じても比較トレースが残る
- 同じ車種×コースの前回/自己ベストと比較できる
- 欠損チャンネルは表示されない
- Firestore rules で他人の private trace が読めない

### Phase B2: セッション詳細/競技デブリーフ

目的: 比較を現場で使える意思決定画面にする。

実装:

- セッション詳細にデブリーフカード
- 条件差カード
- セット差分ストリップ
- コーナー/セクター名対応
- ラップ有効/無効フラグ
- タイヤ使用履歴、燃料、交通メモ

受入基準:

- 「次走アクション」「信頼度」「注意ラベル」が表示される
- 条件差が大きい比較で警告が出る
- セット差分とデルタTが同じ画面で見える

### Phase C1: Give-to-Get トレース比較

目的: 共有データを比較価値として体験させる。

実装:

- `shared` trace の公開/匿名化
- `/shared` に「比較に使う」CTA
- 自分のラップ vs 共有ラップ比較
- Firestore rules で sharingActive を強制

受入基準:

- 未共有ユーザーは shared trace を読めない
- 匿名共有では driver と生GPSが露出しない
- 共有ラップをBに入れて比較できる

### Phase C2: マーケット比較

目的: 購入済みリファレンスを比較軸にする。

実装:

- `telemetryProducts`
- `telemetryPurchases`
- 商品カード/商品詳細
- 購入済み trace の比較
- 未購入プレビュー

受入基準:

- 未購入ユーザーは詳細トレースを読めない
- 購入済みユーザーは自分のラップと購入ラップを比較できる
- 商品詳細で証憑、条件、売り手実績、プレビューが見える

---

## 9. 技術タスク分解

### 型・スキーマ

- `src/types/telemetryTrace.ts`
- `src/schemas/telemetryTraceSchema.ts`
- `src/services/telemetryTraceService.ts`
- `src/services/telemetryProductService.ts`

### テレメトリ純ロジック

- `src/lib/telemetry/persistedTrace.ts`
  - `buildTraceFromImportResult`
  - `downsampleLapProfile`
  - `traceToLapProfile`
  - `comparePersistedTraces`
- `src/lib/telemetry/channels.ts`
  - AIM の追加チャンネル名マッピング
  - チャンネル可用性判定

### UI

- `src/components/telemetry/TraceSavePanel.tsx`
- `src/components/telemetry/TracePicker.tsx`
- `src/components/telemetry/SessionDebrief.tsx`
- `src/components/telemetry/ConditionDiffCard.tsx`
- `src/components/telemetry/SetupDiffStrip.tsx`
- `src/components/market/ReferenceBrowse.tsx`
- `src/components/market/ReferenceProductDetail.tsx`

### ルーティング

- `/telemetry`
- `/telemetry/traces` （既存リンク互換の一覧エイリアス）
- `/telemetry/import`
- `/telemetry/files`
- `/telemetry/compare?aTrace=&bTrace=`
- `/setups/:id/debrief` または既存 `/setup/:id` 内に統合
- `/references`
- `/references/:productId`

---

## 10. 重要な設計判断

1. **比較用トレースは `CarSetup` に埋め込まない。**
   Firestore 1MB制限、権限、マーケット商品化を考えると別コレクションが必要。

2. **生データ保存は後回し。**
   まず間引きトレースで自己比較とマーケット価値を検証する。生ファイル保存は費用と権利問題が重い。

3. **全チャンネル共通UIにしない。**
   DigiSpice/NMEA はGPS中心、AIM は操作/CANも取れる可能性がある。存在するチャンネルだけを出す。

4. **マーケットプレビューは詳細データを返さない。**
   UIで隠すだけではデータ流出になる。API/Firestore レベルで返す内容を分ける。

5. **公式セクター/コーナーDBは早めに必要。**
   競技者は距離mでは会話しない。自己比較の価値も「どのコーナーか」で大きく上がる。

6. **コーチ文は断定しない。**
   GPS由来のブレーキ推定などは「推定原因」として表示し、信頼度を必ず添える。

---

## 11. 最初に実装すべき最小スコープ

最短で価値を出すなら、以下に絞る。

1. `telemetryTraces` の型・保存・読み込み
2. 取込済みラップ1本を間引き保存
3. 同じ車種×サーキットの自己ベスト候補を取得
4. 保存済みA/Bを `ComparisonCockpit` に流し込む変換関数
5. セットアップ詳細に「自己ベストと比較」CTA
6. Firestore rules の private trace 読み取り保護

この6点で、プロダクトは「その場限りのログビューア」から「走るたびに比較資産が増えるツール」に変わる。

---

## 12. トラックマップ overlay 仕様（2026-06-14 追加）

### 12.1 既存ツール調査メモ

調査は公式ヘルプ/製品ページを優先した。

| ツール | トラック扱い | CarSetup6への示唆 |
|---|---|---|
| AiM RaceStudio 3 | Track はS/F、split、形状、予測リファレンス、ピットレーンを持つ。AnalysisではTrack Map and Segments Selectorでセグメントを管理し、Web/GDI地図、split report、corner/straight reportへ使う。 | `Track` は単なるS/Fラインでは足りない。表示用中心線、split/sector、pit lane、将来のreference lapを同じ trackId に束ねる。 |
| MoTeC i2 | Track Map Report、Rainbow Track Maps、Automatic Track Generation、Track Section Editor、User Defined Track Sectionsを機能比較表に持つ。Track reportはチャンネル値を色勾配で見せ、2ラップの相対位置表示にも使う。 | マップは背景ではなく分析コンポーネント。速度/G/ブレーキ等のチャンネル色分けと、ユーザー定義区間を後で足せる型にする。 |
| RaceChrono | Track Libraryからtrack profileを取得し、custom trackではStart/Finish trap、Start/Finish以外のtrap、方向、幅を編集する。通常のtrap幅は50-75mで、幅を広げると検出は増えるが精度が落ちると明示している。 | ラップ検出用のtrap/lineと、見た目のコース境界は分離する。検出幅の変更は品質警告の対象にする。 |
| VBOX Circuit Tools | Circuit Tools 3はSatellite Track Map、Overhead Car View、sector highlighting、delta time、split-sector analysisを前面に出す。Track Map DatabaseはCircuit Tools/デバイス向けに別更新される。 | まず静的DBを持ち、更新可能なtrack map databaseとして扱う。セクター強調と実走ライン比較を優先する。 |

参照URL:

- AiM RaceStudio 3 manual: https://www.aim-sportline.com/docs/racestudio3/manual/html/index.html
- AiM Tracks for Analysis and Devices: https://www.aim-sportline.com/docs/racestudio3/manual/html/tracks.html
- AiM RaceStudio 3 Analysis: https://www.aim-sportline.com/docs/racestudio3/manual/html/analysis.html
- MoTeC i2: https://www.motec.com.au/i2/i2overview/
- RaceChrono support: https://racechrono.com/support
- RaceChrono custom track tutorial: https://racechrono.com/article/1923
- VBOX Circuit Tools: https://www.vboxmotorsport.co.uk/en/circuit-tools
- VBOX Track Map Database: https://www.vboxmotorsport.co.uk/en/customer-ct-track-database

### 12.2 データモデル

`src/lib/tracks.ts` の `Track` に任意の `map` を追加する。

```ts
interface TrackMap {
  source: 'official' | 'sample-derived' | 'manual';
  widthM: number;
  centerline: { distanceM: number; lat: number; lon: number }[];
  sectors: { id: string; name: string; startDistanceM: number; endDistanceM: number }[];
  markers: { id: string; name: string; distanceM: number; kind: 'corner' | 'sector' | 'reference' }[];
  curbs: { id: string; name: string; startDistanceM: number; endDistanceM: number; side: 'left' | 'right' | 'both' }[];
  notes?: string;
}
```

設計意図:

- `startFinishLine` はラップ検出用、`map` は分析表示用として分離する。
- `centerline + widthM` から左右境界を簡易生成する。公式/測量データが入ったら `boundaries` を追加して置換する。
- sector/corner/curb は距離軸で持つ。GPS座標で持たないことで、中心線の更新時にラベル位置も追従させる。
- `source` を必須にして、実測由来・公式・手入力を混同しない。

### 12.3 段階導入

1. **MVP（今回）**: 鈴鹿だけ、DigiSpice同梱サンプル由来の中心線を使い、平均幅から境界を生成。主要コーナー名、簡易セクター、代表的な縁石区間を表示する。
2. **国内主要コース**: S/F校正済みコースから順に、中心線と主要コーナー/セクターを追加する。未校正コースはS/Fのみのまま。
3. **ユーザー編集**: RaceChronoのtrap編集に近い形で、S/F、split、コーナーラベルを編集できるようにする。ただし変更は `manual` として保存し、公式DBとは分離する。
4. **分析強化**: MoTeC/VBOX型に、速度、前後G、ブレーキ推定、デルタTをトラック上で色分けする。
5. **共有/マーケット**: `TrackMap` は共有資産ではなく公共DBとして扱い、販売/共有トレースには相対パスとtrackIdだけを持たせる。

### 12.4 今回の実装範囲

- `suzuka-full.map` を追加。
- `trackMapOverlay.ts` で中心線、左右境界、縁石、セクター名、コーナー名をECharts seriesへ変換。
- `/telemetry/import`、`/telemetry/files`、`/telemetry/compare` の単独/比較マップに overlay を表示。
- 保存済みサンプルのような1ラップ切り出しログでも、比較用途ではなく単独確認としてコース文脈を見られる。

制限:

- 鈴鹿の境界は平均幅からの簡易生成で、公式測量値ではない。
- 縁石区間とコーナー距離は実ログ中心線に対する表示用概算。正式な走行規則や審判用途には使わない。
- 公式セクタータイムとはまだ連動しない。現時点では視覚上の区間ラベルである。
