# 車両セットアップ記録システム - VELOCITY LOGGER

## グローバルルール
このプロジェクトはグローバルCLAUDE.md（/Users/Yugox/CLAUDE.md）のAI運用5原則に従います。

## プロジェクト概要
車両のサーキット走行時のセットアップデータを記録・管理するWebアプリケーション。
ドライバーが走行前後のタイヤ空気圧、サスペンション設定、アライメント等を詳細に記録し、
最適なセットアップを見つけるためのツール。

**事業方針（2026-06改訂、詳細は BUSINESS_PLAN.md）**:
データを「集め・保管し・売る」マーケットプレイス型事業。テーマは「データを使ってモータースポーツをより楽しくする」。
- 無料の記録機能＝データの仕入れ部門。記録体験とデータ品質が事業の生命線
- 開発優先順位は SPECIFICATION.md の Phase 0a〜2 に従う（最優先: データ品質基盤）
- 偽データ混入を招く実装（デモ用初期値、欠損の0変換等）は事業上の欠陥として扱う

## 技術スタック
- **フロントエンド**: React 18.2.0 + TypeScript 5.0.0
- **スタイリング**: Tailwind CSS 3.4.1
- **UIライブラリ**: Ant Design 5.12.0
- **認証・DB**: Firebase (Authentication, Firestore, Storage)
- **ビルドツール**: Vite 5.0.0
- **ルーティング**: React Router DOM 6.20.0

## プロジェクト構造
```
CarSetup6/
├── src/
│   ├── components/
│   │   ├── auth/          # 認証関連コンポーネント
│   │   │   ├── Login.tsx
│   │   │   ├── SignUp.tsx
│   │   │   └── PrivateRoute.tsx
│   │   └── setup/
│   │       └── tabs/      # タブコンポーネント
│   │           ├── BasicInfoTab.tsx    # 基本設定
│   │           ├── SuspensionTab.tsx   # サスペンション
│   │           ├── AlignmentTab.tsx    # アライメント
│   │           └── DrivingTab.tsx      # ドライビング
│   ├── contexts/          # Contextプロバイダー
│   │   └── AuthContext.tsx
│   ├── services/          # ビジネスロジック
│   │   ├── authService.ts
│   │   └── setupService.ts
│   ├── hooks/             # カスタムフック
│   │   └── useSetupState.ts
│   └── types/             # 型定義
│       └── setup.ts
```

## コーディング規約

### 命名規則
- **コンポーネント**: PascalCase (例: `BasicInfoTab.tsx`)
- **関数**: camelCase (例: `calculatePressureDiff`)
- **定数**: UPPER_SNAKE_CASE (例: `MAX_PRESSURE_VALUE`)
- **型定義**: PascalCase with suffix (例: `TirePressureType`)

### ファイル構成
- 1ファイル1コンポーネント
- 関連する型定義は同じファイル内に配置
- 再利用可能な型は`types/`ディレクトリに配置

### インポート順序
1. React関連
2. 外部ライブラリ
3. 内部コンポーネント
4. サービス・ユーティリティ
5. 型定義
6. スタイル

## 状態管理方針
- **認証状態**: Context APIで管理（AuthContext）
- **フォーム状態**: 各コンポーネントでuseStateを使用
- **永続化データ**: Firebaseに保存
- **一時データ**: ローカルステートで管理

## Firebase連携の注意点
1. **環境変数**: `.env.local`でFirebase設定を管理
2. **セキュリティルール**: Firestoreルールは別途管理
3. **認証フロー**: Email/Password認証を使用
4. **データ構造**: 
   ```
   users/
     └── {userId}/
         └── setups/
             └── {setupId}/
                 ├── sessionInfo
                 ├── basicInfo
                 ├── suspension
                 ├── alignment
                 └── driving
   ```

## UI/UXガイドライン

### デザイン原則
- **一貫性**: Ant Designのコンポーネントを基本とする
- **レスポンシブ**: モバイルファーストで設計
- **アクセシビリティ**: キーボード操作対応

### カラースキーム
- **プライマリ**: 青系（#1890ff）
- **背景**: 
  - メイン: bg-gray-50
  - カード: bg-white
  - 強調: bg-blue-50
- **テキスト**: 
  - 主要: text-gray-800
  - 補助: text-gray-600
  - リンク: text-blue-500

### レイアウト規則
- **タブ構成**: 基本設定、サスペンション、ドライバーフィードバック
  （エンジン・空力/AIアドバイス/セッション後記録タブは2026-06に廃止 — 保存に未接続の見せかけUIだったため。再導入時は保存経路まで配線すること）
- **入力フィールド**: ドロップダウン付き入力を基本とする。未入力は null 保存（0変換・デモ初期値は禁止）
- **データ表示**: FL/FR/RL/RRの4輪配置を視覚的に表現

## 開発時の注意事項

### パフォーマンス
- 不要な再レンダリングを避ける
- 画像は遅延読み込みを使用
- バンドルサイズを監視

### セキュリティ
- APIキーは環境変数で管理
- ユーザー入力は必ず検証
- XSS対策を実施

### テスト
- コンポーネントの単体テスト
- Firebase連携の統合テスト
- E2Eテストでユーザーフローを確認

## チーム開発ルール
- **プルリクエスト**: 機能単位で作成
- **コミットメッセージ**: 日本語で記述、変更内容を明確に
- **コードレビュー**: 最低1名のレビューを必須
- **ドキュメント**: 新機能追加時は必ずREADMEを更新

## ドキュメント配置ルール

- レビュー資料、設計書、仕様書、参考資料などのドキュメント生成物は、すべて `docs/` ディレクトリ配下に配置する。
- 用途に応じて `docs/ux_reviews/` などのサブフォルダを作成して整理してもよい。
- プロジェクトルートの `README.md` や `CLAUDE.md` などのツール設定ファイルはこの限りではない。

## 頻繁に使用するコマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run typecheck

# リント
npm run lint

# ユニットテスト（vitest）
npm run test

# Firestoreルール・インデックスのデプロイ（共有機能に必須）
firebase deploy --only firestore:rules,firestore:indexes
```

## トラブルシューティング
- **ポート競合**: デフォルトポート5173が使用中の場合は5174を使用
- **Firebase認証エラー**: `.env.local`の設定を確認
- **型エラー**: `tsconfig.json`の設定を確認

## 今後の改善項目（バックログ）

2026-06-13 ベータ実装で解消済み: 単位の明示（src/lib/units.ts）、必須項目の明示とzodバリデーション、
CSVエクスポート、前回値コピー、比較ビュー、ロガー取込（AIM CSV/デジスパイス.dtb/NMEA）、Give-to-Get共有。

### 残バックログ
1. **バンドルサイズ削減**: 2.8MB（echarts/antd/firebase）。dynamic import によるコード分割を検討
2. **モバイルのタッチ最適化**: レスポンシブは対応済みだが、現場（ピット）でのタッチ操作の磨き込みは継続課題
3. **エンジン・空力設定の再導入**: 旧タブは見せかけUIだったため廃止。需要を見て保存経路つきで再設計
4. **生テレメトリの永続化**: 現状は端末内処理のみ（Firestore 1MB制限）。Phase 2でStorage設計とあわせて検討
5. **エラー監視**: Sentry等の導入（BUSINESS_PLAN の技術リスク対策）
6. **Firestoreルールの自動テスト**: @firebase/rules-unit-testing の導入（現状はエミュレータでのロード検証のみ）