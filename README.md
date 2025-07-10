# 🏎️ VELOCITY LOGGER - 車両セットアップ記録システム

サーキット走行時の車両セットアップを詳細に記録・管理するWebアプリケーションです。

## 🚀 特徴

- **Bento UIデザイン**: 情報を視覚的に整理された区画で表示
- **モバイル対応**: レスポンシブデザインで、スマートフォンでも快適に使用可能
- **リアルタイム同期**: Firebaseによるデータの自動保存・読み込み
- **直感的な操作**: ドラッグ＆ドロップやスワイプ操作に対応

## 📋 主な機能

### 基本設定
- タイヤ空気圧の記録（走行前後）
- ダンパー設定（Bump/Rebound）

### サスペンション設定
- アライメント（キャンバー、キャスター、トー）
- スプリングレート
- 車高調整
- スタビライザー設定
- ブレーキバランス

### ドライビングフィードバック
- コーナリング特性の評価
- ブレーキング評価
- アクセルレスポンス
- 走行メモ

## 🛠️ 技術スタック

- **フレームワーク**: React 18.2 + TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **UIライブラリ**: Ant Design
- **バックエンド**: Firebase (Authentication, Firestore)
- **状態管理**: React Context API

## 📦 インストール

```bash
# リポジトリのクローン
git clone https://github.com/YOUR_USERNAME/velocity-logger.git
cd velocity-logger

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してFirebaseの設定を追加
```

## 🔧 環境変数

`.env`ファイルに以下の設定が必要です：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🚀 開発

```bash
# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

## 📱 モバイル対応

768px以下の画面幅で自動的にモバイルビューに切り替わります：
- カードスワイプによるナビゲーション
- 固定タブバーによる素早い画面切り替え
- タッチ操作に最適化されたUI

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容について議論してください。

## 📄 ライセンス

[MIT](https://choosealicense.com/licenses/mit/)

## 👥 作者

- [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)

## 🙏 謝辞

- [Ant Design](https://ant.design/) - UIコンポーネント
- [Tailwind CSS](https://tailwindcss.com/) - スタイリング
- [Firebase](https://firebase.google.com/) - バックエンドサービス