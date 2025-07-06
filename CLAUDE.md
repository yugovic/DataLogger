# 車両セットアップ記録システム - VELOCITY LOGGER

## グローバルルール
このプロジェクトはグローバルCLAUDE.md（/Users/Yugox/CLAUDE.md）のAI運用5原則に従います。

## プロジェクト概要
車両のサーキット走行時のセットアップデータを記録・管理するWebアプリケーション。
ドライバーが走行前後のタイヤ空気圧、サスペンション設定、アライメント等を詳細に記録し、
最適なセットアップを見つけるためのツール。

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
- **タブ構成**: 基本設定、サスペンション（ブレーキ設定含む）、エンジン・空力、ドライビング
- **入力フィールド**: ドロップダウン付き入力を基本とする
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
```

## トラブルシューティング
- **ポート競合**: デフォルトポート5173が使用中の場合は5174を使用
- **Firebase認証エラー**: `.env.local`の設定を確認
- **型エラー**: `tsconfig.json`の設定を確認

## 今後の改善項目（バックログ）

### 3. 単位の不統一
- タイヤ空気圧：kPa
- スプリングレート：k（キログラム？）
- 車高：mm
- 単位の説明や変換機能の追加を検討

### 4. 必須項目の明示
- どの項目が必須でどれがオプションか不明確
- 入力検証（バリデーション）のフィードバックが不足

### 5. データのインポート/エクスポート
- CSV出力機能などがあると、データ分析に便利
- 他のセットアップデータをコピーする機能

### 6. モバイル対応
- レスポンシブデザインは考慮されているが、タッチ操作の最適化が不十分
- スマートフォンでの入力が困難な可能性