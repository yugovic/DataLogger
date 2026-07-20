# Velocity Logger UX レビュー資料

> **更新状況: 2026-07-19 現行ソース再監査済み**
>
> 本文の初回レビュー・クロスレビューは調査履歴として保持する。実装判断と作業順は、末尾の「6. 現行ソース再監査による最終判定」以降を正とする。

この資料は、Velocity Logger（React + TypeScript + Ant Design + Firestore）の UI/UX について実施した**初回 UX レビュー**と、それに対する**クロスレビュー**をまとめたものです。

---

## 1. 初回 UX レビュー（概要）

### 1.1 強み

- **機能の充実性**: セットアップ記録、前回引き継ぎ、コピー、テレメトリー連携、公開シェア、比較、CSV エクスポートまで一気通貫の導線がある。
- **入力の構造化**: 基本情報 / サスペンション / 走行フィードバックをタブで分離し、長いフォームでも把握しやすい。
- **実装の堅牢性**: Zod によるセットアップデータのスキーマ検証、Firestore 連携、認証フローが整備されている。
- **シェア機能の配慮**: 公開シェア時にユーザー同意と匿名化を経由し、プライバシー配慮が含まれている。
- **モバイル対応の土台**: `MobileShell` を使ったモバイル用レイアウトがある。

### 1.2 主な UX 課題

- **未保存データ保護の不足**
  - 車両設定モーダル (`VehicleModal.tsx`) には `beforeunload` による保護があるが、メインのセットアップ入力画面 (`CarSetup.tsx`) には未実装。
  - 大量の数値入力がリロードや誤操作で失われる可能性がある。

- **「前回読み込み」と「前回から引き継ぎ」の使い分けが不明確**
  - 両者は内部的に明確に分かれているが、ボタンラベルではその違いが伝わりにくい。
  - ユーザーが意図しない項目まで上書きする恐れがある。

- **「新規コピー」ボタンの URL パラメータ不備**
  - `?copy=` パラメータが不足しており、コピー機能が正しく動作しない可能性がある。

- **オンボーディングデータの活用不足**
  - `OnboardingWizard.tsx` で収集したホームサーキット、目標タイム、目標タイプが、その後の画面で参照・活用されていない。
  - 動機付けや目標導線の UX 機会損失となっている。

- **モバイル入力の操作性**
  - サスペンションタブの多数の `AutoComplete` や `StepNumber` はスマホで密集しており、タップミスしやすい。

---

## 2. クロスレビュー

前記の指摘事項に対し、ソースコードを再確認し、事実関係・優先度・追加観点を整理した。

### 2.1 検証済み：正しいと判断した指摘

#### A. `CarSetup.tsx` の未保存データ保護がない
- `VehicleModal.tsx` では `beforeunload` + ダーティ判定がある。
- `CarSetup.tsx` 側には同様の保護がないため、未保存の入力喪失リスクが高い。
- **優先度：高**

#### B. 「新規コピー」ボタンの `?copy=` URL パラメータ不備
- `SetupCard.tsx` 側の URL 生成に不足がある可能性も含めて確認が必要。
- `CarSetup.tsx` の `copyId` 取得部分も合わせて動作確認が必要。
- **優先度：高**

#### C. 「前回読み込み」vs「前回から引き継ぎ」の分岐
- `handleLoadPrevious`: 直近のセットアップ全体をコピー（天気、タイヤ空気圧、ラップタイムなども含む）。
- `handleInheritFromPrevious`: 同じ車種の最新セットアップから、セッション非依存項目（タイヤブランド・コンパウンド、サスペンション、アライメント、ダンパー）のみコピー。
- ラベルだけではユーザーが誤選択しやすい。
- **優先度：中〜高**

#### D. オンボーディング目標データの未活用
- `handleComplete` で `homeCircuit`, `goalType`, `targetLapTime` を Firestore に保存する。
- `Dashboard.tsx` などで参照されていない。
- **優先度：中**

### 2.2 追加で発見した UX 課題

#### E. 編集時のコピー URL の動作確認
- `SetupCard.tsx` の「コピー」アクションが `?copy=<id>` 付き URL に遷移するが、`CarSetup.tsx` 内でその URL パラメータを取得しているか確認が必要。
- `useSearchParams` などの取得処理が抜けていると、コピー機能が完全に機能しない。
- **優先度：高**

#### F. タブ間遷移・ブラウザバックの状態喪失
- タブ切り替えは同一コンポーネント内で行われるが、ブラウザバックやリロードで入力が失われる。
- `beforeunload` だけでなく、`react-router` の `Prompt` や離脱確認モーダルも検討したい。
- **優先度：中**

#### G. モバイル入力の密集
- `SuspensionTab.tsx` は `AutoComplete` と `StepNumber` が多数密集。
- スマホではキーボードとステッパーが干渉し、誤入力リスクが高い。
- `inputMode` や `type` 属性の最適化、タップ領域の拡大を検討。
- **優先度：中**

#### H. シェア・公開設定の一貫性
- `ShareToggle.tsx`（公開/非公開切替）と `PublicShareButton.tsx`（公開リンク発行）で似た概念が別 UI として存在。
- 「公開シェア」と「内部共有」の区別がユーザーに伝わりにくい。
- 用語統一と導線集約が望ましい。
- **優先度：中**

#### I. ダッシュボードの空状態とオンボーディング連携
- `Dashboard.tsx` には「最初のセットアップを記録する」CTA がある。
- オンボーディングで収集した `homeCircuit` や `targetLapTime` を表示することで、目標に向かう導線が強化できる。
- **優先度：中**

### 2.3 引き続き保持すべき UX 強み

- **コンポーネント分割の明確さ**: `BasicInfoTab.tsx`, `SuspensionTab.tsx`, `DrivingTab.tsx` への責任分離。
- **Zod による保存前バリデーション**: データ品質を守る。
- **匿名化を伴うシェア**: `setupService.ts` の `toggleSetupVisibility` で同意と匿名化を実装。
- **テレメトリー連携**: ラップ比較・トレース保存がエンゲージメント向上に寄与。
- **車両モーダルの未保存保護**: `VehicleModal.tsx` の実装は、他画面への展開例として活用可能。

---

## 3. 優先度まとめ

| 優先度 | 項目 |
|---|---|
| 高 | `CarSetup.tsx` の未保存データ保護を追加 |
| 高 | コピー URL `?copy=<id>` の取得・動作確認 |
| 高 | 新規コピーボタンの URL パラメータ修正 |
| 中〜高 | 「前回読み込み」vs「前回から引き継ぎ」の UI 説明強化 |
| 中 | モバイル入力体験の改善 |
| 中 | オンボーディング目標データのダッシュボード活用 |
| 中 | シェア・公開 UI の概念統一 |
| 低 | タブ間遷移・ブラウザバック時の状態保持確認 |

---

## 4. 推奨する次のアクション

1. `CarSetup.tsx` に `beforeunload` + ダーティ判定を実装する。
2. `SetupCard.tsx` / `CarSetup.tsx` のコピー URL・パラメータ取得を統合し、動作確認する。
3. `handleLoadPrevious` / `handleInheritFromPrevious` のボタンにツールチップまたは説明文を追加する。
4. `Dashboard.tsx` で `targetLapTime` / `homeCircuit` を表示し、目標導線を作る。
5. シェア系コンポーネントの名称・導線を一つの概念に集約するデザイン検討を行う。

---

## 5. 関連ファイル

- `/Users/Yugox/Documents/Program/CarSetup6/CarSetup.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/common/Header.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/onboarding/OnboardingWizard.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/Dashboard.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/vehicle/VehicleModal.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/tabs/BasicInfoTab.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/tabs/SuspensionTab.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/tabs/AlignmentTab.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/tabs/DrivingTab.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/share/ShareToggle.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/share/PublicShareButton.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/share/PublicShareManager.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/SetupHistory.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/SetupCard.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/services/setupService.ts`
- `/Users/Yugox/Documents/Program/CarSetup6/src/services/publicShareService.ts`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/common/StepNumber.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/common/MobileShell.tsx`

---

## 6. 現行ソース再監査による最終判定（2026-07-19）

### 6.1 判定一覧

| レビュー項目 | 最終判定 | 根拠・対応方針 |
|---|---|---|
| `CarSetup.tsx` の未保存データ保護 | **要対応 / P0** | ダーティ判定、`beforeunload`、React Router 内遷移の保護がない |
| 履歴カードからのコピー | **実装済み / 回帰テスト対象** | `SetupCard.tsx` は `/?copy=<id>` を生成し、`CarSetup.tsx` も `copy` を取得・読込している |
| 詳細画面の「コピーして新規作成」 | **要対応 / P0** | `CarSetup.tsx` の詳細画面ボタンは `/` へ移動するだけで `?copy=<id>` がない |
| 「前回読み込み」と「前回から引き継ぎ」 | **部分対応 / P1** | 引き継ぎ側には説明があるが、前回読み込みはアイコン中心で、対象車種・上書き範囲が分かりにくい |
| オンボーディング目標データの活用 | **要対応 / P2** | Firestore へ保存されるが、`profileService.ts` と `Dashboard.tsx` から取得・表示されない |
| タブ切替時の状態喪失 | **単独対応不要** | タブは同じ親コンポーネント内で動くため、通常のタブ切替だけでは親 state は失われない |
| ブラウザバック・他画面への遷移 | **要対応 / P0** | Header、ブラウザバック、リロード等で未保存データを失う可能性がある |
| モバイル入力 | **要改善 / P1** | `StepNumber` は存在するが、タッチ領域と数値キーボード指定が不十分 |
| Give-to-Get 共有と公開リンク | **機能統合は不要 / P2** | 権限と用途が異なる。バックエンドは分離したまま名称・説明・配置を整理する |

### 6.2 コピー機能の正確な現状

- `src/components/setup/SetupCard.tsx` の「コピーして新規作成」は `/?copy=${setup.id}` を生成しており、修正不要。
- `CarSetup.tsx` は `location.search` から `copy` を取得し、コピー元データを読み込んでいる。
- コピー時にラップタイム、ロガー証憑、テレメトリ参照、共有設定を初期化する処理も実装済み。
- 修正対象は、`/setup/:id` の詳細表示中に表示される「コピーして新規作成」ボタンだけである。
- コピー処理は重複コードが多いため、修正時に変換関数へ集約し、コピー対象・除外対象をテストで固定する。

---

## 7. 現行ソースから追加で判明した重大課題

### 7.1 サスペンション・アライメント入力が保存経路へ接続されていない

**優先度: P0 / データ品質上のブロッカー**

- `SuspensionTab.tsx` の props は `Record<string, never>` で、全入力をコンポーネント内部 state に保持している。
- この state は `CarSetup.tsx` の保存処理へ渡されないため、ユーザーが入力しても Firestore に保存されない。
- `BasicInfoTab.tsx` の4輪ダンパー UI は `damperSettings` を変更するが、保存処理は別 state の `frontDamperCompression` 等を参照している。
- `AlignmentTab.tsx` は親 state に接続可能な props を持つが、現在のタブ構成では使用されていない。
- 現行スキーマは前後軸単位のダンパー、スプリング、車高、ARB、アライメントを定義しており、現在の4輪・ヘルパースプリング・バンプストッパー・ブレーキ UI とは一致しない。

**実装方針:**

1. 現行スキーマで保存できる前後軸単位の項目を canonical なフォーム state に接続する。
2. アライメントは同じ controlled form へ接続する。
3. スキーマに存在しない項目は、データモデルの仕様が決まるまで UI から除去する。
4. 4輪独立値が事業要件として必要なら、先に型・Zod・Firestore・比較・CSV・共有時の扱いを設計し、その後 UI を再導入する。

### 7.2 ドライビング評価スライダーが保存されない

**優先度: P0**

- `DrivingTab.tsx` のコーナリング、ブレーキ、アクセル、バランス、信頼感はローカル state のみ。
- 保存されるのは `notes` と `knowledge` だけ。
- スライダーには初期値 1〜3 が入っているため、そのまま保存へ接続すると未入力ユーザーにも評価値が記録され、偽データになる。

**実装方針:**

- `drivingFeedback` を型と Zod スキーマへ追加し、各評価値を `number | null` とする。
- 初期値はすべて `null` とし、ユーザーが操作した項目だけ保存する。
- スキーマ拡張を行わない場合は、未接続スライダーを削除し、保存済みのメモ・知見 UI だけを残す。

### 7.3 新規保存後の再保存で重複レコードを作成し得る

**優先度: P0**

- 新規保存後も URL は `/`、`setupId` は未定義のまま。
- 同じ画面で再び保存すると、更新ではなく `saveSetup` が再実行される。

**実装方針:**

- 新規保存成功後に `navigate(`/setup/${newId}`, { replace: true })` で保存済みレコードへ遷移する。
- 保存後ハイライト、テレメトリ保存、比較候補表示との順序を明示し、途中失敗でセットアップ本体を重複保存しないようにする。
- 「新規保存は1件、以後は同一 ID の更新」となるテストを追加する。

### 7.4 閲覧モードが完全な読み取り専用ではない

**優先度: P1**

- 一部の環境値、タイヤ情報、距離、燃料、ラップ詳細、タブ内入力は閲覧モードでも操作できる。
- 保存ボタンは非表示のため、操作できた変更が保存されず、ユーザーを誤認させる。

**実装方針:**

- 全フォーム部品へ共通の `readOnly` または `disabled` を渡す。
- ラップ詳細、ロガー取込、証憑解除などの編集アクションも閲覧モードでは非表示または無効化する。
- 「編集」押下時だけ編集可能にし、その時点をダーティ判定の基準にする。

### 7.5 Header に未接続・プレースホルダー UI が残っている

**優先度: P1〜P2**

- デスクトップ Header の「新規記録」「通知」アイコンに処理がない。
- 通知設定の Switch、Checkbox、「設定を保存」は永続化されない。
- アカウント、デフォルト値、エクスポート、ヘルプはプレースホルダーテキストのみ。

**実装方針:**

- 動作しない操作部品は一旦非表示にする。
- 新規記録だけは `/` への遷移として実装可能。ただし未保存ガードを経由させる。
- 設定項目は保存先・読込経路・失敗表示まで実装できる単位で再導入する。

---

## 8. 実装ハンドオフ計画

別エージェントは以下の順序で作業すること。既存の作業ツリーには未コミット変更があるため、開始時に `git status --short` と対象ファイルの diff を確認し、無関係な変更を上書きしないこと。

### Work Package 1: canonical form と保存経路の正常化

**優先度:** P0

**主な対象:**

- `CarSetup.tsx`
- `src/components/setup/tabs/BasicInfoTab.tsx`
- `src/components/setup/tabs/SuspensionTab.tsx`
- `src/components/setup/tabs/AlignmentTab.tsx`
- `src/components/setup/tabs/DrivingTab.tsx`
- `src/types/setup.ts`
- `src/schemas/setupSchema.ts`

**作業:**

1. `SetupDraft` と `useSetupDraft`、または同等の reducer を追加する。
2. `setupToDraft`、`draftToSetupInput`、`copySetupToDraft`、`inheritSetupSettings` を純粋関数として分離する。
3. 新規、既存読込、コピー、前回引き継ぎ、保存が同じ変換関数を通るようにする。
4. サスペンション・アライメントを controlled component 化する。
5. 未接続 UI を削除するか、型・Zod・保存・読込まで一気通貫で接続する。
6. ドライビング評価を追加する場合は nullable で実装し、デモ初期値を禁止する。

**受入条件:**

- 画面で変更できる全項目が保存・再読込で一致する。
- 未入力項目が `0` や既定評価値として保存されない。
- コピー・引き継ぎ・既存編集で共有設定やロガー証憑を意図せず消さない。
- 変換関数にユニットテストがある。

### Work Package 2: コピーと保存ライフサイクル

**優先度:** P0

**主な対象:**

- `CarSetup.tsx`
- `src/components/setup/SetupCard.tsx`
- 新規作成するフォーム変換ユーティリティとテスト

**作業:**

1. 詳細画面のコピーボタンを `/?copy=${setupId}` へ修正する。
2. 履歴カードからのコピーが現状どおり動くことを回帰テストする。
3. コピー時に日時を現在へ変更し、ラップ、証憑、テレメトリ、共有設定を初期化する。
4. 新規保存成功後に保存済み ID の URL へ `replace` 遷移する。
5. 保存ボタンの多重押下と、保存後の再保存による重複作成を防止する。

**受入条件:**

- 履歴カードと詳細画面の両方からコピーできる。
- コピー元のセッション実績・公開状態が新規データへ混入しない。
- 新規保存を繰り返しても同内容の新規ドキュメントが増えない。

### Work Package 3: 未保存離脱保護と閲覧モード

**優先度:** P0〜P1

**主な対象:**

- `CarSetup.tsx`
- `src/App.tsx`
- `src/components/common/Header.tsx`
- 必要に応じて新規 `useUnsavedChangesGuard` hook

**作業:**

1. 新規初期化・既存読込・コピー読込完了後の draft を基準スナップショットとして保持する。
2. draft と基準値の差で `isDirty` を求める。
3. `beforeunload` でリロード・タブ終了を保護する。
4. React Router 内遷移とブラウザバックをブロックし、破棄確認を表示する。
5. 現行の `BrowserRouter` で公式 blocker API が利用できない場合は、`createBrowserRouter` / `RouterProvider` への移行を同じ WP 内で行う。
6. 保存成功時だけ基準スナップショットを更新する。
7. 閲覧モードでは全編集操作を無効化する。

**受入条件:**

- リロード、ブラウザバック、Header、モバイルメニューの各遷移で未保存確認が出る。
- 変更がない場合は確認を出さない。
- 保存成功後は確認を出さない。
- 閲覧モードでは値を変更できない。

### Work Package 4: 読込導線とモバイル入力

**優先度:** P1

**主な対象:**

- `CarSetup.tsx`
- `src/components/common/StepNumber.tsx`
- `src/components/setup/tabs/*.tsx`

**作業:**

1. 「前回読み込み」を「直近セッションを複製」等、実際の処理を表す名称へ変更する。
2. 実行前にコピー元の車種・サーキット・日時・対象項目を表示する。
3. 編集中のデータを上書きする場合は確認を表示する。
4. 「同じ車種の設定を引き継ぐ」はセッション非依存値だけを対象とする。
5. `StepNumber` のタッチ領域を最低 44px 相当にする。
6. 数値入力へ `inputMode="numeric"` / `inputMode="decimal"` を設定する。
7. モバイルでは保存・読込操作を短いラベル付きで表示する。

**受入条件:**

- 2種類の読込操作の違いが実行前に分かる。
- 390px 幅で入力・タブ・固定アクションが重ならない。
- 数値項目で適切なモバイルキーボードが開く。

### Work Package 5: オンボーディング・共有・Header 整理

**優先度:** P2

**主な対象:**

- `src/services/profileService.ts`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/Dashboard.tsx`
- `src/lib/tracks.ts`
- `src/components/share/ShareToggle.tsx`
- `src/components/share/PublicShareButton.tsx`
- `src/components/share/PublicShareManager.tsx`
- `src/components/common/Header.tsx`

**作業:**

1. `UserProfile` に typed な `onboardingData` を追加して取得できるようにする。
2. ダッシュボード空状態へホームサーキット、目標種別、目標タイムを表示する。
3. `homeCircuit` は保存済み ID を `TRACKS` の表示名へ解決する。
4. 新規セットアップのサーキット候補へ活用する場合も、自動確定・自動保存はしない。
5. `ShareToggle` を「コミュニティに共有」、`PublicShareButton` を「匿名サマリーリンク」と明記する。
6. 両共有機能のデータモデルと権限は統合しない。
7. Header の未接続ボタンとプレースホルダー設定を非表示または実装済み機能へ置換する。

**受入条件:**

- オンボーディング値がダッシュボードで安全に表示される。
- 共有プールと匿名公開リンクの違いが、アイコンだけでなく文言で分かる。
- クリックしても何も起きない操作部品が残らない。

---

## 9. テスト・検証チェックリスト

### 自動テスト

- `npm run typecheck`
- `npm run test`
- `npm run build`
- 新規・コピー・既存編集の draft 変換テスト
- コピー除外項目のテスト
- nullable 入力と Zod バリデーションのテスト
- 新規保存後の ID 継続利用テスト
- ダーティ判定のテスト

### 手動または E2E

1. 新規入力 → 保存 → 詳細表示 → 編集 → 更新。
2. 履歴カードからコピーし、ラップ・証憑・共有状態が空であることを確認。
3. 詳細画面からコピーし、同じ結果になることを確認。
4. サスペンション、アライメント、ドライビング評価を保存し、再読込して一致を確認。
5. 未保存状態で Header、ブラウザバック、リロードを実行し、離脱確認を確認。
6. 閲覧モードですべての編集操作が無効であることを確認。
7. 390px 幅とデスクトップ幅で主要フローを確認。
8. Give-to-Get 共有と匿名公開リンクをそれぞれ発行・解除し、説明と権限が一致することを確認。

### 現在のベースライン

- 2026-07-19 時点で `npm run typecheck` は成功。
- 2026-07-19 時点で Vitest は **26 files / 319 tests passed**。
- Vite 実行時に `esbuild` オプション非推奨警告が出るが、本 UX 改修のブロッカーではない。

---

## 10. 実装上の禁止事項

- 未接続の操作 UI を残さない。
- 未入力値を `0`、空文字由来の数値、デモ初期値として保存しない。
- コピー時にラップタイム、ロガー証憑、テレメトリ、共有状態を引き継がない。
- Give-to-Get 共有と匿名公開リンクの権限モデルを安易に統合しない。
- 既存の未コミット変更や、対象外ファイルを巻き戻さない。
- 一つの WP で保存経路のない UI だけを先行追加しない。
