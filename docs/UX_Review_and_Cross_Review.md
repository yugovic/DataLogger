# Velocity Logger UX レビュー資料

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
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/tabs/DrivingTab.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/share/ShareToggle.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/share/PublicShareButton.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/share/PublicShareManager.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/SetupHistory.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/setup/SetupCard.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/services/setupService.ts`
- `/Users/Yugox/Documents/Program/CarSetup6/src/services/publicShareService.ts`
- `/Users/Yugox/Documents/Program/CarSetup6/src/common/StepNumber.tsx`
- `/Users/Yugox/Documents/Program/CarSetup6/src/components/common/MobileShell.tsx`
