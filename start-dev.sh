#!/bin/bash

echo "🚀 CarSetup6 開発サーバーを起動します..."
echo ""
echo "📋 事前確認："
echo "1. Node.jsがインストールされているか"
echo "2. 依存関係がインストールされているか"
echo ""

# ディレクトリを移動
cd /Users/Yugox/Documents/Program/CarSetup6

# 依存関係のチェック
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules が見つかりません。"
    echo "📦 依存関係をインストールします..."
    npm install
fi

# 開発サーバーの起動
echo ""
echo "🔧 開発サーバーを起動中..."
echo "ブラウザで http://localhost:5173 にアクセスしてください"
echo ""
echo "💡 ヒント："
echo "- 白い画面が表示される場合は、ブラウザの開発者ツール（F12）でコンソールを確認"
echo "- Ctrl+C で開発サーバーを停止"
echo ""

npm run dev