# 車両セットアップ記録システム - VELOCITY LOGGER 仕様書

## 📋 目次
1. [システム概要](#システム概要)
2. [技術スタック](#技術スタック)
3. [機能仕様](#機能仕様)
4. [データモデル](#データモデル)
5. [画面構成](#画面構成)
6. [API仕様](#api仕様)
7. [セキュリティ](#セキュリティ)
8. [今後の実装予定](#今後の実装予定)

---

## システム概要

### プロジェクト名
VELOCITY LOGGER（ベロシティ・ロガー）

### 目的
サーキット走行時の車両セットアップ情報を記録・管理し、最適なセッティングを見つけるための支援ツール

### 主な特徴
- 車両セットアップの詳細記録
- マルチユーザー対応
- クラウドベースのデータ保存
- レスポンシブデザイン

### 更新履歴
- 2024-12-24: v0.1 - 初版作成、Firebase認証機能実装

---

## 技術スタック

### フロントエンド
- **フレームワーク**: React 18.2.0
- **ビルドツール**: Vite 5.0.0
- **言語**: TypeScript 5.3.0
- **UIライブラリ**: Ant Design 5.12.0
- **スタイリング**: Tailwind CSS 3.4.0
- **ルーティング**: React Router DOM 7.6.3
- **アイコン**: Ant Design Icons, Font Awesome

### バックエンド/インフラ
- **BaaS**: Firebase
  - Authentication（認証）
  - Firestore（データベース）
  - Storage（ファイルストレージ）
  - Analytics（分析）

### 開発環境
- **パッケージマネージャー**: npm
- **バージョン管理**: Git
- **コード品質**: TypeScript（厳格モード）

---

## 機能仕様

### 1. 認証機能 ✅実装済み

#### 1.1 ユーザー登録
- メールアドレス/パスワードによる新規登録
- 表示名の設定
- パスワード要件：6文字以上
- Google認証（準備済み、未有効化）

#### 1.2 ログイン
- メールアドレス/パスワードによるログイン
- セッション管理（Firebase Auth）
- 自動ログイン維持

#### 1.3 ログアウト
- ヘッダーからワンクリックでログアウト
- セッション破棄

#### 1.4 パスワードリセット
- メールによるパスワードリセット機能（実装予定）

### 2. セットアップ記録機能 🚧実装中

#### 2.1 基本情報タブ
- **天候情報**
  - 天候状態（晴れ/曇り/雨）
  - 気温（℃）
  - 路面温度（℃）
  - 湿度（%）
  - 気圧（hPa）

- **タイヤ情報**
  - ブランド選択
  - コンパウンド選択
  - 空気圧（前後左右）
    - 走行前圧力
    - 走行後圧力
    - 差分自動計算

- **セッション情報**
  - 走行距離（km）
  - 燃料搭載量（L）

#### 2.2 サスペンションタブ
- **ダンパー設定**
  - フロント/リア
  - コンプレッション/リバウンド

- **スプリング**
  - フロント/リアレート

- **車高**
  - フロント/リア

- **スタビライザー**
  - フロント/リア

#### 2.3 アライメントタブ
- キャンバー角（フロント/リア）
- トー角（フロント/リア）
- キャスター角

#### 2.4 ドライビングタブ
- ブレーキング評価
- アクセルレスポンス評価
- 全体的な感触評価
- フリーテキストメモ

### 3. データ管理機能 📋計画中

#### 3.1 保存/読み込み
- Firestoreへの自動保存
- 過去データの読み込み
- テンプレート化

#### 3.2 履歴管理
- 日付別一覧表示
- 車種別フィルタリング
- サーキット別フィルタリング

#### 3.3 データ分析
- セットアップ比較機能
- ベストラップ時の設定参照
- 傾向分析

### 4. 設定機能 ⚙️部分実装

#### 4.1 アカウント設定
- プロフィール編集
- パスワード変更

#### 4.2 表示設定
- 単位切り替え（メトリック/インペリアル）
- テーマ設定
- 言語設定

#### 4.3 データ管理
- エクスポート機能
- インポート機能
- バックアップ設定

---

## データモデル

### Users コレクション
```typescript
interface User {
  uid: string;              // Firebase Auth UID
  email: string;            // メールアドレス
  displayName?: string;     // 表示名
  photoURL?: string;        // プロフィール画像URL
  createdAt: Date;          // アカウント作成日時
  updatedAt: Date;          // 最終更新日時
}
```

### Setups コレクション
```typescript
interface CarSetup {
  id?: string;              // ドキュメントID
  userId: string;           // ユーザーID
  carModel: string;         // 車種
  circuit: string;          // サーキット名
  date: Date;              // 走行日
  sessionType: 'practice' | 'qualifying' | 'race';
  
  // 天候情報
  weather: {
    condition: string;      // 天候状態
    airTemp: number;        // 気温
    trackTemp: number;      // 路面温度
    humidity: number;       // 湿度
    pressure: number;       // 気圧
  };
  
  // タイヤ設定
  tireSettings: {
    fl: TirePressure;      // フロント左
    fr: TirePressure;      // フロント右
    rl: TirePressure;      // リア左
    rr: TirePressure;      // リア右
  };
  
  tireInfo: {
    brand: string;         // タイヤブランド
    compound: string;      // コンパウンド
  };
  
  // セッション情報
  sessionInfo: {
    distance: number;      // 走行距離
    fuel: number;          // 燃料量
  };
  
  // オプション項目
  suspensionSettings?: SuspensionSettings;
  alignmentSettings?: AlignmentSettings;
  notes?: string;          // メモ
  lapTime?: string;        // ラップタイム
  images?: string[];       // 画像URL配列
  
  createdAt: Date;         // 作成日時
  updatedAt: Date;         // 更新日時
}
```

---

## 画面構成

### 1. 認証画面（/auth）
- ログインフォーム
- サインアップフォーム
- パスワードリセットリンク

### 2. メイン画面（/）
- ヘッダー
  - ロゴ
  - ナビゲーションメニュー
  - ユーザーメニュー
  - ログアウトボタン
  
- コンテンツエリア
  - タブ切り替え（基本情報/サスペンション/アライメント/ドライビング）
  - 各種入力フォーム
  
- アクションボタン
  - 保存
  - 読み込み
  - エクスポート

### 3. 履歴画面（/history）※未実装
- セットアップ一覧
- フィルター機能
- 詳細表示

### 4. 設定画面（モーダル）
- アカウント設定
- 通知設定
- データ管理
- ヘルプ

---

## API仕様

### 認証API（Firebase Auth）
- `signUpWithEmail(email, password, displayName)`
- `signInWithEmail(email, password)`
- `signInWithGoogle()`
- `logout()`
- `resetPassword(email)`

### データAPI（Firestore）
- `saveSetup(setup)` - セットアップ保存
- `getSetup(setupId)` - 単一セットアップ取得
- `getUserSetups(userId, limit)` - ユーザーのセットアップ一覧
- `getSetupsByCarModel(userId, carModel)` - 車種別セットアップ
- `updateSetup(setupId, updates)` - セットアップ更新
- `deleteSetup(setupId)` - セットアップ削除

### ストレージAPI（Firebase Storage）※未実装
- `uploadImage(file)` - 画像アップロード
- `deleteImage(url)` - 画像削除

---

## セキュリティ

### 認証
- Firebase Authentication による認証
- メール検証機能（実装予定）
- セッショントークン管理

### データアクセス
- ユーザーは自分のデータのみアクセス可能
- Firestore セキュリティルールによる保護
- APIキーの環境変数管理

### 通信
- HTTPS通信
- CORS設定

---

## 今後の実装予定

### Phase 1（高優先度）
1. ✅ Firebase認証実装
2. ⬜ セットアップデータの保存機能
3. ⬜ セットアップデータの読み込み機能
4. ⬜ 車種マスターデータ作成
5. ⬜ 車種別動的フォーム

### Phase 2（中優先度）
6. ⬜ 画像アップロード機能
7. ⬜ 履歴一覧画面
8. ⬜ データ比較機能
9. ⬜ CSV/PDFエクスポート
10. ⬜ ユーザープリファレンス

### Phase 3（低優先度）
11. ⬜ PWA対応
12. ⬜ 多言語対応
13. ⬜ ダークモード
14. ⬜ データ分析・可視化
15. ⬜ チーム共有機能

---

## 備考
- 本仕様書は開発の進行に応じて随時更新されます
- 最終更新日: 2024-12-24
- バージョン: 0.1.0