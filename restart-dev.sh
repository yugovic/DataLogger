#!/bin/bash

echo "🔄 開発サーバーを再起動します..."
echo ""

# 既存のプロセスを終了
echo "既存のサーバープロセスを終了中..."
pkill -f "vite" || echo "既存のプロセスは見つかりませんでした"

# ディレクトリを移動
cd /Users/Yugox/Documents/Program/CarSetup6

# キャッシュをクリア
echo "キャッシュをクリア中..."
rm -rf node_modules/.vite

# 開発サーバーを起動
echo ""
echo "🚀 開発サーバーを起動中..."
npm run dev