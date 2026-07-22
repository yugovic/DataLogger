# 機能マザー台帳

2026-07-22 作成（初版）。ソースコード全体を実際に読んで作成した、ユーザーに見える全機能の棚卸し表。

## この台帳の運用ルール

1. **機能の追加・変更・削除時は必ずこの台帳を更新する。** 実装完了の定義に「台帳への反映」を含める。
2. **レビュー時（PR/実装後チェック）はこの台帳と突き合わせる。** 変更したファイルに対応する行のステータスが実態と一致しているか確認する。特に「保存/永続化まで配線したか」「onClick/onChangeが実装されているか」を見る。
3. 状態が変わったら都度この表を更新する。「あとでまとめて更新」は禁止（放置の再発防止が目的のため）。
4. 新しいタブ・モーダル・設定画面を追加したら、必ず1行以上この台帳に追加する。UIから到達不能な `src/services/` の関数を追加した場合も、意図的な準備コード（将来のUIから呼ぶ予定）か死んだコードかを明記して追加する。
5. `docs/testing/regression-checklist.md` の実施と合わせて、実装後にこの台帳の該当行も更新する（CLAUDE.mdのテスト節に追記済み）。
6. ステータス凡例:
   - ✅ 実装済み（保存・永続化まで配線済み）
   - ⚠️ 見せかけ・未配線（UIはあるが保存/動作しない。ボタンにonClickが無い、Formに繋がっていない等）
   - 🚧 プレースホルダー（未実装であることが明示されている。「準備中」表示・disabled化などユーザーを騙さない設計）
   - 🗑️ 廃止済み（過去にあったが削除。CLAUDE.md/git log からの記録）

---

## 要対応リスト（⚠️見せかけ・未配線 / 🚧プレースホルダー） — 最重要成果物

### ⚠️ 見せかけ・未配線（保存/動作しない実装）

| # | 機能 | ファイル:行 | 症状 | 対応方針 |
|---|---|---|---|---|
| 1 | 設定モーダル「通知設定」タブ全体 | `src/components/common/Header.tsx:440-511` | `Switch`/`Checkbox` が `defaultChecked` のみでローカルstateにも紐付いておらず、Firestore等どこにも保存されない。「保存」ボタン（506行）に `onClick` が無い。開いて操作して閉じると設定は消える。 | 通知設定を持たない前提なら、タブ自体を削除するのが最短（Phase再導入まで隠す）。残すなら保存先（例: `users/{uid}` 配下）を新設し配線する。既知の問題として本タスクの発端。 |
| 2 | ヘッダーの「新規記録」アイコンボタン | `src/components/common/Header.tsx:244-246` | `<button>` に `onClick` が無い。押しても何も起きない。 | `navigate('/')`（新規セットアップ画面）へ遷移させるか、ボタン自体を削除する。 |
| 3 | ヘッダーの「通知」ベルアイコン（デスクトップ・モバイル両方） | `src/components/common/Header.tsx:247-249`, `581-583` | `<button>` に `onClick` が無い。通知一覧・通知センターへの導線が存在しない。 | 通知機能が存在しないなら削除。将来実装するなら未読バッジ等の実装後に配線する。 |
| 4 | 設定モーダル「デフォルト設定」「データエクスポート」「ヘルプ&サポート」タブ | `src/components/common/Header.tsx:512-520` | いずれも `t('header.placeholders.default'/'export'/'help')` という一文だけの空タブ。操作要素すら無い。 | CSVエクスポートは既に別導線（`SetupHistory.tsx`）で実装済みのため、「データエクスポート」タブは重複導線として削除が妥当。「デフォルト設定」「ヘルプ」はタブごと削除するか、内容を作り込むまでサイドバーの選択肢自体を出さない。 |

### 🚧 プレースホルダー（意図的・ユーザーに明示済み。実害は小さいが台帳には記載）

| # | 機能 | ファイル:行 | 状態 |
|---|---|---|---|
| 5 | ラップタイム入力モーダルの「OCR（写真からラップタイム読取）」タブ | `src/components/setup/modals/LapTimeModal.tsx:901-923` | タブ自体が `disabled: true`、内部の「カメラを起動」ボタンも `disabled`、文言も「OCR機能は現在準備中です」と明示。ユーザーを騙さない設計になっている。将来実装時はこの台帳のステータスを✅に更新すること。 |
| 6 | パスワードリセット機能 | なし（未着手） | `SPECIFICATION.md` に「実装予定」と明記の通り、Login画面に「パスワードを忘れた方」リンク自体が存在しない（見せかけボタンではなく、機能そのものが未着手）。`authService.ts` に `resetPassword()` 関数は実装済みだがどのUIからも呼ばれていない。 |
| 7 | Google認証ボタン（ログイン/新規登録） | `src/components/auth/Login.tsx:100`, `src/components/auth/SignUp.tsx:129` | ボタンは表示されているが、`onClick` の実装内容を要確認（SPECIFICATION.mdには「準備済み・未有効化」と記載）。押下時の挙動が「未対応です」等の明示なしにエラーになる場合は⚠️に格上げが必要。次回実装時に要確認。 |

---

## 機能一覧（画面/ルート単位）

凡例: 状態列は上記参照。データ行き先の「Firestore: パス」はコレクション構造の要点のみ記載。

### 認証（`/auth`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-001 | メール/パスワード新規登録 | `src/components/auth/SignUp.tsx` → `services/authService.ts: signUpWithEmail` | ✅ | Firebase Auth + `users/{uid}` | SPEC 1.1 |
| F-002 | メール/パスワードログイン | `src/components/auth/Login.tsx` → `signInWithEmail` | ✅ | Firebase Auth | SPEC 1.2 |
| F-003 | Google認証ボタン | `Login.tsx:100`, `SignUp.tsx:129` | 🚧要確認（表7参照） | Firebase Auth | SPEC「準備済み・未有効化」 |
| F-004 | ログアウト | `Header.tsx` ヘッダーアイコン / モバイルメニュー | ✅ | Firebase Auth セッション破棄 | SPEC 1.3 |
| F-005 | パスワードリセット | なし（未実装、UI導線なし） | 🚧（表6） | `authService.resetPassword` はUI未接続 | SPEC 1.4「実装予定」 |
| F-006 | 未ログイン時のルートガード | `src/components/auth/PrivateRoute.tsx` | ✅ | - | - |
| F-007 | 初回ログイン時オンボーディング | `src/components/onboarding/OnboardingWizard.tsx`, `App.tsx: OnboardingGate` | ✅ | `users/{uid}` の完了フラグ | - |

### メイン記録画面（`/`, `/setup/:id`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-010 | 新規セットアップ作成・保存 | `CarSetup.tsx: handleSave` | ✅ | `users/{uid}/setups/{id}` | SPEC 3.1 / BUSINESS Phase0a |
| F-011 | 既存セットアップ閲覧・編集・更新 | `CarSetup.tsx`（`isViewMode`） | ✅ | 同上 `updateSetup` | - |
| F-012 | セットアップ削除（閲覧画面から） | `CarSetup.tsx: handleDeleteSetup` | ✅ | `deleteSetup` | - |
| F-013 | セッション基本情報（日時/サーキット/車両/ドライバー/セッション種別） | `CarSetup.tsx` 上部フォーム | ✅ | 上記ドキュメント内フィールド | SPEC 2.1 |
| F-014 | サーキット選択のオートコンプリート候補 | `CarSetup.tsx:1006-1018`（ハードコード5件: 鈴鹿/富士/もてぎ/岡山/オートポリス） | ⚠️軽微な不整合 | 自由入力可なので機能は動くが、`src/lib/tracks.ts`（国内13サーキットDB、テレメトリ機能で使用）と候補が同期していない。同一の地名DBを共有していないため保守性が低い。 | SPEC「13サーキットDB」との整合性課題 |
| F-015 | 車両選択（登録車両セレクト/自由入力） | `CarSetup.tsx: handleRegisteredVehicleSelect` | ✅ | `vehicleId`参照 or 自由入力文字列 | - |
| F-016 | 未登録車種の保存時の登録確認モーダル | `CarSetup.tsx:1600-1657` | ✅ | `vehicles/{id}` 新規作成 or 復元 | - |
| F-017 | 天候情報入力（天気/気温/路面温度/湿度/気圧） | `CarSetup.tsx` 環境データカード | ✅ | セットアップドキュメント | SPEC 2.1 |
| F-018 | タイヤ情報（銘柄/製品名/コンパウンド/前後サイズ） | `CarSetup.tsx` + `src/lib/tireCatalog.ts` | ✅ | 同上 | SPEC 2.1 |
| F-019 | タイヤセット紐付け・使用量表示（距離/ラップ/熱履歴） | `CarSetup.tsx` + `services/tireSetService.ts` + `lib/tireSetUsage.ts` | ✅ | `users/{uid}/tireSets/{id}` | バックログ解消済み項目 |
| F-020 | 走行距離・燃料搭載量（StepNumber入力） | `CarSetup.tsx` + `src/components/common/StepNumber.tsx` | ✅ | セットアップドキュメント | SPEC 2.1 |
| F-021 | タイヤ空気圧（前後左右・走行前後・差分自動計算・目標圧との色分け表示） | `src/components/setup/tabs/BasicInfoTab.tsx` | ✅ | セットアップドキュメント `tireSettings` | SPEC 2.1 / Phase0b判断支援 |
| F-022 | 走行前→走行後 空気圧コピー（全上書き/空欄のみ） | `BasicInfoTab.tsx:263-281`（Dropdownメニュー） | ✅ | ローカルdraft経由 | Phase0b「前回値コピー」 |
| F-023 | ダンパー設定（フロント/リア、圧側/伸び側） | `BasicInfoTab.tsx` or `SuspensionTab.tsx`（車両のdamperAdjustable設定に応じ表示切替） | ✅ | セットアップドキュメント | SPEC 2.2 |
| F-024 | サスペンション（スプリングレート/車高/スタビライザー） | `src/components/setup/tabs/SuspensionTab.tsx` | ✅ | 同上 | SPEC 2.2 |
| F-025 | アライメント（キャンバー/トー/キャスター） | `src/components/setup/tabs/AlignmentTab.tsx` | ✅ | 同上 | SPEC 2.3 |
| F-026 | 車両固有調整タブ（ブレーキパッド/ローター/バランス、アエロ、ECU/ブースト） | `src/components/setup/tabs/VehicleAdjustmentsTab.tsx` | ✅ | 同上 | 車両登録時のsetupConfigに応じ表示 |
| F-027 | 動的セットアップ項目（車両ごとにカスタム定義した調整項目） | `src/components/setup/tabs/DynamicSetupTab.tsx` + `lib/setupAdjustments.ts` | ✅ | セットアップドキュメント `adjustmentValues` | VehicleModal「カスタム調整項目」と対 |
| F-028 | ドライバーフィードバック（評価・自由記述・ナレッジ） | `src/components/setup/tabs/DrivingTab.tsx` | ✅ | セットアップドキュメント | SPEC 2.4 |
| F-029 | ラップタイム簡易入力＋詳細入力モーダル | `CarSetup.tsx` + `src/components/setup/modals/LapTimeModal.tsx` | ✅ | セットアップドキュメント `lapTimeData` | - |
| F-030 | ラップタイムCSV貼付インポート | `LapTimeModal.tsx`（`activeTab==='csv'`） | ✅ | ローカル解析→draft | - |
| F-030b | ラップタイムOCR（カメラ読取） | `LapTimeModal.tsx:901-923` | 🚧（表5） | 未実装 | - |
| F-031 | ロガーファイル取込（AIM CSV/デジスパイス.dtb/NMEA RMC）してラップに証憑添付 | `CarSetup.tsx: handleTelemetryAttach` + `src/components/telemetry/TelemetryImport.tsx` + `src/lib/telemetry/*` | ✅ | セットアップの`lapEvidence`/`telemetryRefs` + `telemetryTraces/{id}` | BUSINESS Phase1 / SPEC Phase1 12-14 |
| F-032 | ラップ証憑バッジ・証憑の手動編集時の降格確認・証憑デタッチ | `CarSetup.tsx` + `src/components/telemetry/EvidenceBadge.tsx` + `evidence.ts` | ✅ | - | 「証憑整合性ルール」（SPEC Phase1） |
| F-033 | 保存後のベストラップ更新判定・お祝いメッセージ | `CarSetup.tsx: handleSave` 内 | ✅ | - | - |
| F-034 | 保存後のセッションハイライトモーダル（新規保存時のみ） | `src/components/setup/SessionHighlightModal.tsx` + `lib/sessionHighlights.ts` | ✅ | - | - |
| F-035 | 直近セッション複製（実行前プレビュー・候補10件選択） | `CarSetup.tsx: openDuplicatePreview/confirmPendingLoad/openSourcePicker` | ✅ | - | Phase0b |
| F-036 | 同車種設定引き継ぎ（実測値等は引き継がない） | `CarSetup.tsx: openInheritPreview` + `lib/setupLoadPreview.ts` | ✅ | - | Phase0b |
| F-037 | 未保存離脱ガード（ページ離脱時の確認） | `src/hooks/useUnsavedChangesGuard.ts` + `App.tsx` のコメント通りdata router必須 | ✅ | - | - |
| F-038 | テレメトリ保存後の比較候補提示モーダル | `CarSetup.tsx:1881-1919` + `services/telemetryTraceService.ts: getComparableTraceCandidates` | ✅ | `/telemetry/compare` への遷移 | 比較コックピット段階A |
| F-039 | コピーとして新規作成（`?copy=id`導線） | `CarSetup.tsx` copy useEffect + `lib/setupNavigation.ts` | ✅ | - | - |
| F-040 | 連続入力フロー（環境データ・タイヤ情報・ラップタイムの3カードを休止状態ではサマリーチップ化し、未入力項目だけを1問1画面で流すQuickEntryModal。タイヤ空気圧は車両俯瞰図上のTirePressureSceneで輪ごとに入力） | `CarSetup.tsx`（サマリー/展開トグル） + `src/components/setup/QuickEntryModal.tsx` + `src/components/setup/TirePressureScene.tsx` + `src/lib/quickEntryFlow.ts` | ✅ | 既存の `useSetupDraft`（`setField`経由）にそのまま書き込み。保存経路は無改修。スキップ項目は`null`のまま | 第1弾（環境・タイヤ・ラップの3カードのみ）。2026-07-22実装 |

### ヘッダー・共通UI

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-050 | メインナビゲーション（ダッシュボード/記録/履歴/車両/テレメトリ/共有） | `Header.tsx`（デスクトップ・モバイル両方） | ✅ | - | - |
| F-051 | ダークモード切替 | `Header.tsx` + `contexts/ThemeContext.tsx` | ✅ | ローカル（localStorage想定） | - |
| F-052 | 言語切替（ロケール選択） | `src/components/common/LocaleSelect.tsx` + `contexts/LocaleContext.tsx` | ✅ | ローカル | i18nレディネス関連 |
| F-053 | 新規記録ボタン（ヘッダーアイコン） | `Header.tsx:244` | ⚠️（表2） | なし | - |
| F-054 | 通知ベルアイコン | `Header.tsx:247,581` | ⚠️（表3） | なし | - |
| F-055 | 設定モーダル: アカウント設定タブ | `Header.tsx:322-336`（`LocaleSelect`表示のみ） | ✅（機能は言語設定のみ。プロフィール編集自体は無い） | ローカル | SPEC 4.1「プロフィール編集」は未実装（見せかけではなく非搭載） |
| F-056 | 設定モーダル: 車両設定タブ（登録車両の選択・新規登録・編集保存） | `Header.tsx:337-439` + `services/vehicleService.ts` | ✅ | `users/{uid}/vehicles/{id}`（推定パス） | - |
| F-057 | 設定モーダル: 通知設定タブ | `Header.tsx:440-511` | ⚠️（表1） | なし | 既知の問題（本タスク発端） |
| F-058 | 設定モーダル: デフォルト設定/データエクスポート/ヘルプタブ | `Header.tsx:512-520` | ⚠️（表4） | なし | - |
| F-059 | ログアウト | `Header.tsx` | ✅ | Firebase Auth | - |
| F-060 | モバイルハンバーガーメニュー | `Header.tsx` | ✅ | - | - |
| F-061 | 単位設定（タイヤ空気圧 kPa/psi、気温 ℃/°F の表示切替） | `Header.tsx` 設定モーダル + `contexts/UnitsContext.tsx` + `src/lib/units.ts` | ✅ | ローカル（localStorage `unit-preferences`）。Firestore保存値は常にkPa/℃（変換は表示境界のみ） | 2026-07-22実装。適用: SetupCard（履歴カード）、SetupCompare（比較ビュー）、Dashboard（タイヤ空気圧チャート）。未適用（意図的、kPa/℃固定）: BasicInfoTabのタイヤ空気圧入力、CarSetup.tsxの気温入力、CSVエクスポート、テレメトリ取込、共有画面 |

### ダッシュボード（`/dashboard`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-070 | ダッシュボードの集計・グラフ表示 | `src/components/Dashboard.tsx` | ✅ | `getUserSetups` 等の読み取りのみ | - |

### 履歴（`/history`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-080 | セットアップ一覧表示・サマリー | `src/components/setup/SetupHistory.tsx` | ✅ | Firestore読み取り | SPEC 3.2 |
| F-081 | 車種別/サーキット別フィルタリング・検索 | `SetupHistory.tsx` | ✅ | - | SPEC 3.2 |
| F-082 | 比較モード（2件選択→`/compare`へ） | `SetupHistory.tsx:290-303`（`SwapOutlined`ボタン） | ✅ | `/compare?a=&b=` 等 | Phase0b |
| F-083 | CSVエクスポート | `SetupHistory.tsx:300`付近 + `src/lib/csv.ts` | ✅ | ローカルファイルダウンロード | Phase0bバックログ解消済み |
| F-084 | 共有ブラウズへの導線（`TeamOutlined`ボタン） | `SetupHistory.tsx:303` | ✅ | `/shared`へ遷移 | - |

### 比較ビュー（`/compare`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-090 | 2件のセットアップ差分ハイライト比較 | `src/components/compare/SetupCompare.tsx` | ✅ | 読み取りのみ | Phase0b「セットアップ比較ビュー」 |

### 車両管理（`/vehicles`, `/vehicles/:id/journal`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-100 | 車両一覧表示・カード表示 | `src/components/vehicle/VehicleList.tsx` | ✅ | `vehicles/{id}` | - |
| F-101 | 車両新規登録/編集モーダル（基本情報・プロフィール・setupConfig・改造履歴） | `src/components/vehicle/VehicleModal.tsx`（1000行超） | ✅（Ant Design Formで一括管理。SwitchはFormItem経由で保存に配線済み） | `vehicles/{id}` | - |
| F-102 | 車両のセットアップ調整可能項目のカスタム定義（ラベル/単位/範囲） | `VehicleModal.tsx: Form.List(adjustmentDefinitions)` | ✅ | `vehicles/{id}.setupConfig.adjustmentDefinitions` | F-027と対 |
| F-103 | 車両の改造履歴（modifications）追加・削除・撤去マーク | `VehicleModal.tsx` | ✅ | `vehicles/{id}.profile.modifications` | - |
| F-104 | 車両の論理削除（ソフトデリート、isActive=false） | `VehicleList.tsx: handleDeleteVehicle` → `deleteVehicle` | ✅ | `vehicles/{id}.isActive=false` | - |
| F-105 | 車両の物理削除 | `services/vehicleService.ts: permanentlyDeleteVehicle` | 🚧UI未接続（死んだコード） | 関数は存在するがどのUIからも呼ばれない | 要検討: 使わないなら削除、使うならUI導線を追加 |
| F-106 | 過去セットアップ履歴からの車両登録候補インポート | `VehicleList.tsx: openCandidateModal`（`ImportOutlined`ボタン） | ✅ | 過去データ走査→`addVehicle` | - |
| F-107 | タイヤセット管理モーダル（登録・編集） | `src/components/vehicle/TireSetManagerModal.tsx` | ✅ | `users/{uid}/tireSets/{id}` | F-019と対 |
| F-108 | ビルドジャーナル（改造履歴タイムライン表示） | `src/components/vehicle/BuildJournal.tsx` | ✅ | 読み取り（`vehicles/{id}.profile.modifications`） | - |

### 共有（`/shared`, `/shared/:id`, `/s/:shareId`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-120 | セットアップの公開設定（visibility切替） | `src/components/share/ShareToggle.tsx` | ✅ | セットアップドキュメント `visibility` | Phase0c |
| F-121 | 共有ブラウズ（サーキット×車種絞込み、Give-to-Get相互性ゲート） | `src/components/share/SharedBrowse.tsx` | ✅ | Firestore読み取り（公開データ） | Phase0c |
| F-122 | 共有セットアップ詳細（匿名化表示） | `src/components/share/SharedSetupDetail.tsx` + `lib/vehicleProfilePublic.ts` | ✅ | - | Phase0c匿名化 |
| F-123 | 公開URL発行・コピー（外部共有用） | `src/components/share/PublicShareButton.tsx` + `services/publicShareService.ts` | ✅ | `publicShares/{id}` | - |
| F-124 | 公開URL管理（一覧・再生成・削除） | `src/components/share/PublicShareManager.tsx` | ✅ | 同上 | - |
| F-125 | 公開共有ランディングページ（未ログインでも閲覧可） | `src/components/share/PublicShareLanding.tsx`（`/s/:shareId`） | ✅ | 読み取り専用公開データ | - |
| F-126 | 共有画像生成（SNS共有用画像） | `src/utils/shareImage.ts` + `SessionHighlightModal.tsx`（Web Share API利用） | ✅ | クライアントローカル生成 | i18nレディネス関連で安定化済み |

### テレメトリ（`/telemetry*`）

| ID | 機能 | 画面/コンポーネント | 状態 | データの行き先 | 仕様対応 |
|---|---|---|---|---|---|
| F-140 | テレメトリトレース一覧 | `src/components/telemetry/TelemetryTraceList.tsx` | ✅ | `telemetryTraces/{id}` | Phase1 14 |
| F-141 | ロガーファイル取込・解析（単体） | `src/components/telemetry/TelemetryAnalysis.tsx` + `useTelemetryImport.ts` | ✅ | ローカル解析→保存はセットアップ経由(F-031) | Phase1 12-14 |
| F-142 | ファイル同士の比較（2ファイルアップロード） | `src/components/telemetry/TelemetryFileCompare.tsx` | ✅ | ローカルのみ | - |
| F-143 | 保存済みトレース同士の比較コックピット（デルタT/操作チャンネル重ね/同期カーソル/指標デルタ/コーチ読み解き） | `src/components/telemetry/TelemetryTraceCompare.tsx` + `ComparisonCockpit.tsx` + `CoachPanel.tsx` + `MetricDeltaCards.tsx` | ✅ | 読み取り | Phase1 段階A（2026-06-13） |
| F-144 | ラップデブリーフ（区間分析・注釈） | `src/components/telemetry/TelemetryDebrief.tsx` + `SegmentTable.tsx` + `annotations.ts` | ✅ | 読み取り＋注釈はローカル/セットアップ経由 | - |
| F-145 | ラップ検出・基準線自動推定・GPS処理 | `src/lib/telemetry/detectLaps.ts`, `geo.ts`, `resample.ts` | ✅（UI裏側のロジック、F-031/F-141/F-143から利用） | - | Phase1 13 |

---

## 廃止済み機能（🗑️）

| 旧機能 | 記録の出典 | 廃止理由 |
|---|---|---|
| エンジン・空力タブ | `CLAUDE.md`「レイアウト規則」注記 | 保存に未接続の見せかけUIだったため2026-06に廃止。再導入時は保存経路まで配線すること（F-026「車両固有調整タブ」に一部機能が統合済み） |
| AIアドバイスタブ | 同上 | 同上 |
| セッション後記録タブ | 同上 | 同上 |
| グローバル展開（15言語・30カ国展開計画） | `BUSINESS_PLAN.md`改訂履歴 | 2026-06改訂で流動性実証後の付録扱いに格下げ（実装自体は元々未着手） |

---

## 台帳作成時の調査方法（記録）

- `App.tsx` の `createBrowserRouter` を起点に全ルートを洗い出し、各ページコンポーネントを実際に読了。
- `src/services/*.ts` の `export const` 関数を全列挙し、各関数名を `.tsx` ファイル全体（ルート含む）でgrepして呼び出し元の有無を確認（未使用: `resetPassword`, `getCurrentUser`, `permanentlyDeleteVehicle`）。
- `<button>` / `<Button>` の開始タグに `onClick` が存在するかをヒューリスティックにgrep→目視で全件確認（アイコンJSXのネストで誤検知するため、疑わしい箇所は全て前後行を目視確認）。
- `defaultChecked` 直書き、`Switch`/`Checkbox` に `onChange` が無い箇所を全件grep→目視確認（`VehicleModal.tsx` はAnt Design `Form.Item name=... valuePropName="checked"` 経由で正しく配線されており誤検知と判明）。
- `TODO`/`FIXME`/`準備中`/`coming soon` 等の文言を全文grep。
