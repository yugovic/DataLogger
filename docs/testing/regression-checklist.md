# テスト実行チェックリスト（回帰確認用）

実装のたびに使い回す汎用チェックリスト。機能追加・改修時はここを更新し続けること。
（プロジェクト固有のUXレビュー成果物である `docs/UX_Review_and_Cross_Review.md` の
「9. テスト・検証チェックリスト」とは別物 — あちらは特定WPレビュー用のスコープ限定版）

## 使い方

1. 実装が一段落したら **A. 自動テスト** を必ず全部実行する。
2. 変更したファイル・機能に応じて **B. 対応表** から該当セクションを選び、手動確認する。
3. リリース前や大規模改修後は **C. データ品質原則チェック** と **D. フルリグレッション** まで通す。
4. 新しい機能領域やタブを追加したら、B に新セクションを追記し、末尾の更新履歴に日付を残す。
5. チェックリスト自体が古くなった（廃止された機能が残っている等）と気づいたら、その場で書き換える。

---

## A. 自動テスト（毎回・必須）

- [ ] `npm run typecheck`
- [ ] `npm run lint`（エラー0件であること。warningは既知のもの＝主に`any`型許容箇所とfast-refresh警告なので新規警告が増えていないか確認）
- [ ] `npm run test`
- [ ] `npm run build`

---

## B. 変更箇所 → 確認セクション対応表

| 変更したもの | 確認セクション |
|---|---|
| BasicInfo/Suspension/Alignment/DrivingTab, SetupCard, CarSetup.tsx | B-1 |
| QuickEntryModal, TirePressureScene, quickEntryFlow.ts（連続入力フロー） | B-1a |
| setupDraft.ts / setupNavigation.ts / setupLoadPreview.ts / setupDraftDirty / useUnsavedChangesGuard | B-2 |
| SetupHistory, specCardView.ts, スペックカードUI | B-3 |
| VehicleList, BuildJournal, buildJournal.ts | B-4 |
| src/lib/telemetry/**, TelemetryAnalysis/Compare/Debrief/TraceList/FileCompare | B-5 |
| src/components/share/**, publicShareSummary.ts, publicShareService.ts | B-6 |
| OnboardingWizard | B-7 |
| SetupCompare | B-8 |
| firestore.rules, firestore.indexes.json | B-9 |
| Login/SignUp/PrivateRoute/AuthContext | B-10 |
| index.css, ThemeContext, レイアウト全般、StepNumber等の共通コンポーネント | B-11 |
| Header.tsx（設定モーダル・ヘッダーボタン） | B-12 |
| null/未入力/コピー/デモ値に関わる変更全般 | **C（必須）** |

---

## B-1. セットアップ入力・保存（BasicInfo / Suspension / Alignment / Driving）

- [ ] 新規作成 → 各タブ入力 → 保存 → 詳細表示で値が一致する
- [ ] 保存済みセットアップを開いて編集 → 更新 → 再読み込みで一致する
- [ ] 未入力項目は保存後も `null` のまま（0や空文字への変換なし）
- [ ] Zodバリデーションエラーが該当項目に正しくフィードバックされる
- [ ] ドロップダウン付き入力（プリセット選択＋手入力併用）が両方機能する
- [ ] FL/FR/RL/RRの4輪配置が視覚的に区別できる
- [ ] 単位表示（`src/lib/units.ts`）が項目ごとに正しい

## B-1a. 連続入力フロー（環境データ・タイヤ情報・ラップタイム／第1弾）

- [ ] 3カード（環境データ／タイヤ情報／ラップタイム）は休止状態でサマリーチップ表示になり、カード見出しに「n/N 入力済み」バッジが出る
- [ ] チップ／カード見出しをタップすると既存フォームが展開され、再タップで折りたたまれる（既存フォームの入力・保存挙動は無改修）
- [ ] 3カードすべて入力済みのときは「未入力の項目を入力する」ボタンが表示されない
- [ ] ボタン押下でフルスクリーンモーダルが開き、未入力の項目だけが 環境→タイヤ→ラップ の順で1問1画面に流れる
- [ ] チップ選択（天候）は選択した瞬間に自動で次の質問へ進む
- [ ] 数値質問（気温・路温・湿度・気圧・総周回数）はプレースホルダのみで初期値が入っておらず、未入力のまま「次へ」を押すと null 保存になる
- [ ] 「スキップ」した項目は null のまま保存される（0埋め・デモ値になっていない）
- [ ] タイヤ空気圧シーン: 車両俯瞰図の四隅にFL/FR/RL/RRが表示され、アクティブ輪が青、入力済み輪が緑枠になる
- [ ] タイヤ空気圧シーン: 値を入力すると次の未入力輪へ自動で進み、ホイールをタップすると任意の輪へ直接移動できる
- [ ] タイヤ空気圧シーン: 冷間が未入力なら冷間タブが初期表示、冷間が4輪とも入力済みなら温間タブが初期表示になる
- [ ] タイヤ空気圧シーン: 温間モードで冷間との差分（vs冷間）が表示される
- [ ] タイヤ空気圧シーン: 目標圧レンジ内は緑、レンジ外は橙で値が色分けされる（`src/lib/pressureAdvice.ts` を流用）
- [ ] タイヤ情報カードの休止状態のミニカー表現: 未入力輪は点線「—」、レンジ外は橙文字になる
- [ ] ラップタイム質問はテキスト入力（例: `1:58.423`）で Enter を押すと次へ進む
- [ ] 3カード内の既存フォーム入力欄で Enter キーを押すと次のフィールドにフォーカスが移動する（PCキーボード動線、3カード外には影響しない）
- [ ] `src/lib/quickEntryFlow.test.ts` が通る（質問前進ロジック・タイヤ空気圧の輪前進ロジックの単体テスト）

## B-2. 離脱ガード・ドラフト・コピー

- [ ] 未保存状態でブラウザバック／リロード／Headerナビゲーションをすると離脱確認が出る
- [ ] 保存済み・変更なしの状態では確認が出ない
- [ ] 履歴カードからコピー: ラップタイム・ロガー証憑・テレメトリ・共有状態が空になる
- [ ] 詳細画面からのコピーも同じ結果になる
- [ ] 新規保存後、同じセットアップへの再保存でIDが継続利用される（重複ドキュメントが増えない）
- [ ] ダーティ判定（setupDraftDirty）が編集直後に true、保存直後に false になる

## B-3. 履歴・スペックカード

- [ ] SetupHistory一覧の表示、フィルタ・並び替え
- [ ] スペックカードのフリップ（表裏）動作
- [ ] 改造明細の折りたたみ／展開
- [ ] Otherメーカーの非表示ロジック
- [ ] カード比率（63:88固定）がレスポンシブ幅でも崩れない

## B-4. 車両・ビルドジャーナル

- [ ] 車両一覧の表示・追加・編集
- [ ] BuildJournalへのエントリ追加・表示が一覧/詳細で整合する

## B-5. テレメトリ

- [ ] AIM CSV／デジスパイス.dtb／NMEA、それぞれの取込が成功する
- [ ] 不正フォーマットの取込でエラーハンドリングされる（クラッシュしない）
- [ ] ラップ自動検出（detectLaps）が妥当な区間を返す
- [ ] トレース比較（compare, resample）の表示が崩れない
- [ ] TelemetryDebriefのハイライト自動生成が動作する
- [ ] ラップタイム・証憑（evidence）が正しく表示される
- [ ] 大容量ファイルでも固まらない（端末内処理であり、Firestore 1MB制限に抵触する保存経路がないこと）

## B-6. 共有機能（Give-to-Get / 匿名公開リンク）

- [ ] Give-to-Get共有: ON/OFFトグルで共有プールへの表示が切り替わる
- [ ] SharedBrowse一覧、SharedSetupDetail詳細の表示が正しい
- [ ] 匿名公開リンク（PublicShareButton/PublicShareLanding）: 発行・アクセス・解除ができる
- [ ] 両者の権限モデルが独立している（片方の設定変更がもう片方に影響しない）
- [ ] UI文言でGive-to-Getと匿名リンクの違いが（アイコンだけでなく）分かる

## B-7. オンボーディング

- [ ] 初回ログイン時にOnboardingWizardが表示される
- [ ] 完了後は再表示されない（checkOnboardingNeeded）
- [ ] 入力値がダッシュボードに安全に反映される

## B-8. セットアップ比較

- [ ] 2件以上選択して比較表示ができる
- [ ] 差分が視覚的にハイライトされる

## B-9. Firestore ルール・インデックス

- [ ] エミュレータでのルールロード検証
- [ ] 他ユーザーのデータにread/writeともアクセスできないことを確認
- [ ] ルール／インデックス変更時は本番デプロイを忘れない: `firebase deploy --only firestore:rules,firestore:indexes`

## B-10. 認証

- [ ] ログイン／新規登録／ログアウトの一連の流れ
- [ ] 未認証で保護ルートに入るとリダイレクトされる
- [ ] 認証エラー時のメッセージ表示が適切

## B-11. レイアウト・レスポンシブ・ダークモード

- [ ] 390px幅（モバイル）で主要フローが操作できる
- [ ] デスクトップ幅で崩れがない
- [ ] ダーク／ライトモード切り替えで配色が破綻しない（ThemeContext）
- [ ] 閲覧モード（read-only）ですべての編集操作が無効化されている

## B-12. ヘッダー・設定モーダル

- [ ] 設定モーダルはサイドバーなしの1画面（言語設定／テーマ切替／車両管理への案内リンク）で開く
- [ ] 言語設定（LocaleSelect）の切替が即座にUIへ反映される
- [ ] テーマ切替トグルがヘッダー右上のダーク/ライト切替と同じ状態を共有する（ThemeContext）
- [ ] 「車両ページを開く」ボタンで `/vehicles` に遷移し、モーダルが閉じる
- [ ] モーダル内フォーム・カードがダークモードで白背景のまま残るなど崩れていない
- [ ] ヘッダーの＋（新規記録）・ベルアイコンボタンが削除されている（デスクトップ・モバイル両方）
- [ ] 通知設定／デフォルト値設定／データエクスポート／ヘルプ＆サポート／車両設定タブが存在しない（旧・見せかけUIの再発なし）
- [ ] 設定モーダルに「単位設定」カードがあり、タイヤ空気圧（kPa/psi）・気温（℃/°F）をそれぞれ切替できる
- [ ] 単位切替後、ページ再読み込み（リロード）しても選択が保持される（localStorage `unit-preferences`）
- [ ] 単位を psi/°F に切り替えても、Firestoreに保存される値は正規単位（kPa/℃）のまま変わらない（DevToolsでFirestore書き込みを確認）
- [ ] 単位切替の適用対象: 走行履歴カードのサマリー（SetupCard）、セットアップ比較画面（SetupCompare、空気圧・気温行）、ダッシュボードのタイヤ空気圧チャート（Dashboard）が選択単位で表示される
- [ ] 単位切替の未適用対象（既知・意図的にkPa/℃のまま）: 基本情報タブのタイヤ空気圧入力（BasicInfoTab）、環境データ入力（CarSetup.tsx の気温欄）、CSVエクスポート、テレメトリ取込、共有画面 — 画面内で単位混在がないことを確認

---

## C. データ品質原則チェック（このプロジェクト最重要・毎回必須）

BUSINESS_PLAN / CLAUDE.md の事業方針により、これを壊す実装は**事業上の欠陥**として扱う。

- [ ] 未入力値がUI上でデフォルト値やデモ値により埋まっていない
- [ ] 欠損値が保存時に `0` へ変換されていない（`null` を保持している）
- [ ] デモ用の初期値がそのまま本番データとして保存されうる経路がない
- [ ] コピー機能で本来引き継いではいけないデータ（ラップタイム・ロガー証憑・テレメトリ・共有状態）が引き継がれていない
- [ ] 未接続（保存経路のない）操作UIを追加していない

---

## D. フルリグレッション（リリース前・大規模変更後）

B-1〜B-11をすべて通しで実施したうえで、以下も確認する。

- [ ] 全ルートを一通り開いてコンソールエラーがないか確認
      （`/`, `/history`, `/dashboard`, `/vehicles`, `/vehicles/:id/journal`, `/setup/:id`,
      `/compare`, `/shared`, `/shared/:id`, `/s/:shareId`, `/telemetry`, `/telemetry/import`,
      `/telemetry/traces`, `/telemetry/compare`, `/telemetry/debrief`, `/telemetry/files`）
- [ ] `npm run build` の成果物を `npm run preview` で動作確認

---

## 現在のベースライン

- 2026-07-19時点: `npm run typecheck` 成功
- 2026-07-19時点: `npm run lint` 0 errors / 42 warnings（既知。主に`any`型許容箇所とreact-refresh警告）
- 2026-07-19時点: `npm run test` 30 files / 360 tests passed
- 2026-07-19時点: `npm run build` 成功（バンドルサイズ警告あり — dist/assets/index-*.js が約3.3MB、要dynamic import分割。既知のバックログ項目）

---

## 更新履歴

- 2026-07-22: 単位設定機能（タイヤ空気圧 kPa/psi、気温 ℃/°F の表示切替、UnitsContext + src/lib/units.ts）を追加。設定モーダルB-12に単位設定カードを追加、SetupCard/SetupCompare/Dashboardのタイヤ空気圧チャートに適用。保存データは常に正規単位（kPa/℃）。`npm run typecheck`成功、`npm run lint` 0 errors / 52 warnings（既存パターンの範囲内）、`npm run test` 39 files / 439 tests passed。
- 2026-07-22: 連続入力フロー（QuickEntryModal / TirePressureScene）を第1弾（環境データ・タイヤ情報・ラップタイムの3カード）に実装、B-1aを新設。`npm run typecheck`成功、`npm run lint` 0 errors / 51 warnings（既存パターンの範囲内）、`npm run test` 39 files / 417 tests passed、`npm run build` 成功を確認。
- 2026-07-22: 設定モーダル再設計（通知設定／デフォルト値設定／データエクスポート／ヘルプ＆サポート／車両設定タブを廃止し、サイドバーなしの1画面に統合）に伴いB-12を新設。`npm run typecheck`成功、`npm run lint` 0 errors / 53 warnings（既存パターンの範囲内）、`npm run test` 38 files / 407 tests passed、`npm run build` 成功を確認。
- 2026-07-20: Firestore本番ルールテストと390pxモバイル回帰テストを追加。Trust Beta hardening後、403ロジックテスト＋6ルールテスト＋2モバイルテストを通過。
- 2026-07-19: 初版作成
