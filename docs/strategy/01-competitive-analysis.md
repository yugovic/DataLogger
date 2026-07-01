---
artifact: competitive-analysis
version: "1.0"
created: 2026-06-26
status: draft
---

# Competitive Analysis: 実車セットアップデータ記録・売買市場

## Overview

**Analysis Scope:** サーキット走行における車両セットアップの記録・管理・売買プラットフォーム
**Target Segment:** 日本のサーキット走行愛好者（スポーツ走行・タイムアタック・草レース層、約10万人）
**Date:** 2026-06-26
**Analyst:** VELOCITY LOGGER プロダクトチーム

## Market Context

**Market Size:**
- TAM: 約10〜30億円/年（日本のサーキット走行層10万人 × セットアップ関連支出1〜3万円）
- SAM: 約3〜5万人（データロガー保有者、デジスパイス2.1万台超 + AIM/RaceChrono等）
- SOM: 1,000〜2,000人（初期18ヶ月、フォーカスマス内シェア20%）

**Growth Trend:** 微成長（ロガー普及で拡大 vs モータースポーツ人口の高齢化で微減）

**Key Trends:**
- デジスパイス等GPSロガーの普及により、アマチュアでも「データ」が手元にある時代に
- シムレーシングで「セットアップを買う」文化が確立済み（Coach Dave Academy等）
- Track Titanが2025年12月に$5M調達 — 投資家がモータースポーツデータ市場に関心
- AI開発コスト低下により、ニッチ市場でも小規模チームでプロダクト構築が可能に

## Competitors Analyzed

| Competitor | Type | Target Market | Founded | Funding/Size |
|---|---|---|---|---|
| Track Titan | Direct（テレメトリ分析） | 英語圏トラックデイ層 | 2020頃 | $5M（2025/12） |
| MyRaceLab | Direct（テレメトリ分析） | 英語圏アマチュアレーサー | 2020頃 | ブートストラップ（2〜3名） |
| Coach Dave Academy | Indirect（シムセットアップ販売） | シムレーサー | 2017頃 | ブートストラップ |
| Laptimizer | Indirect（セットアップ記録） | 英語圏トラックデイ層 | 不明 | 不明 |
| Excel / スプレッドシート | Indirect（汎用代替） | 全層 | - | - |

## Feature Comparison Matrix

| Feature | VELOCITY LOGGER | Track Titan | MyRaceLab | Coach Dave | Laptimizer |
|---|---|---|---|---|---|
| セットアップ記録（詳細） | Full | None | None | None | Full |
| テレメトリ分析 | Partial（端末内処理） | Full | Full | Partial（シムのみ） | None |
| マルチロガー対応 | Partial（AIM CSV/デジスパイス） | Partial | Full | N/A | None |
| デジスパイス対応 | Partial（計画中） | None | None | N/A | None |
| データ売買 C2C | Partial（計画中） | None | None | Full（シムのみ） | None |
| 日本語対応 | Full | None | None | None | None |
| 比較ビュー（差分） | Full | Full | Full | None | Partial |
| Give-to-Get共有 | Full（実装済み） | None | None | None | None |
| モバイル対応 | Full | Full | Full | None | Partial |
| AI分析・提案 | None | Partial | Partial | None | None |

## Pricing Comparison

| Competitor | Entry Price | Mid-Tier | Premium | Pricing Model |
|---|---|---|---|---|
| VELOCITY LOGGER | 無料 | 月額¥1,500〜3,000（計画） | セットアップ購入¥500〜2,000/件 | Freemium + Marketplace |
| Track Titan | 無料 | £9.99/月 | £19.99/月 | Freemium + Subscription |
| MyRaceLab | 無料 | 不明 | 不明 | Freemium |
| Coach Dave Academy | - | ~¥1,600/月 | ~¥1,100/件 | Subscription + 個別購入 |
| Laptimizer | 無料 | 不明 | 不明 | Freemium |

## Positioning Map

**Axis X:** セットアップ記録の深さ（浅い → 深い）
**Axis Y:** データ共有・売買エコシステム（なし → 成熟）

```
              [成熟したエコシステム]
                       |
                       |    Coach Dave
                       |    (シムのみ)
                       |
[浅い記録] ────────────+──────────────── [深い記録]
                       |
         Track Titan   |    ★ VELOCITY LOGGER
         MyRaceLab     |    (ここを狙う)
                       |
                       |    Laptimizer
              [エコシステムなし]
```

**White Space Identified:** 「深いセットアップ記録 × 実車データ売買エコシステム」は世界的に空白。シムでは Coach Dave 等が成立済みだが、実車では誰も手をつけていない。

## Competitor Deep Dives

### Track Titan

**Overview:** 「モータースポーツのStrava」を標榜する英国発テレメトリ分析プラットフォーム。約20万ユーザー。
**Target Customer:** 英語圏のトラックデイ参加者・クラブレーサー
**Key Differentiator:** ソーシャル機能（ラップタイム共有・リーダーボード）と$5M調達による開発スピード

**Strengths:**
- $5M調達済みで開発リソースが豊富
- 約20万ユーザーのネットワーク効果
- テレメトリ分析の完成度が高い

**Weaknesses:**
- セットアップ記録機能がない（テレメトリのみ）
- データ売買機能なし
- 日本語非対応、デジスパイス非対応
- 日本市場への進出の気配なし

**Recent Moves:** 2025年12月に$5Mシード調達。テレメトリ分析とソーシャル機能の強化に注力中。

---

### MyRaceLab

**Overview:** マルチロガー対応のテレメトリ分析モバイルアプリ。AI分析機能を搭載。
**Target Customer:** 複数ロガーを使い分ける英語圏アマチュアレーサー
**Key Differentiator:** 最多のロガー対応（AIM, MoTeC, RaceChrono, TrackAddict, Alfano等）

**Strengths:**
- マルチロガー対応の幅が最も広い
- AI分析機能の先行実装
- モバイルファーストの操作性

**Weaknesses:**
- セットアップ記録機能なし（チェックリスト程度）
- データ売買なし
- デジスパイス非対応
- 小規模チーム（2〜3名）のため開発スピードに限界

**Recent Moves:** ロガー対応の拡充を継続中。

---

### Coach Dave Academy

**Overview:** シムレーシング（ACC/iRacing/LMU）のセットアップ販売プラットフォーム。「セットアップを買う文化」の先駆者。
**Target Customer:** 競技志向のシムレーサー
**Key Differentiator:** プロシムレーサーによる検証済みセットアップの販売モデル

**Strengths:**
- 「セットアップ購入」の心理的ハードルを下げた実績
- サブスク＋個別購入の二軸収益モデルが実証済み
- 強固なコミュニティ

**Weaknesses:**
- シムレーシング専用で実車への展開なし
- テレメトリ分析は限定的
- 実車の複雑さ（天候・路面温度・タイヤ劣化等）へのノウハウがない

**Recent Moves:** 対応タイトルの拡充。実車市場への参入の兆候は現時点でなし。

---

### Laptimizer

**Overview:** 車両セットアップの記録に特化したWebアプリ。
**Target Customer:** 英語圏のトラックデイ参加者
**Key Differentiator:** セットアップ記録に特化したシンプルなUI

**Strengths:**
- セットアップ記録に特化しており入力項目が整理されている
- 無料で利用可能

**Weaknesses:**
- テレメトリ連携なし
- データ共有・売買なし
- 日本語非対応
- 開発の活発さが不明

**Recent Moves:** 特になし（静的な状態）。

---

### Excel / スプレッドシート

**Overview:** 多くのドライバーが現状使っている汎用的な記録手段。
**Target Customer:** 全層（最大の間接競合）
**Key Differentiator:** 自由度が高く、追加コストなし

**Strengths:**
- 完全に自由なフォーマット
- 追加コスト不要
- 既存の習慣・学習コストなし

**Weaknesses:**
- 比較・分析が手動で面倒
- 共有・売買の仕組みがない
- モバイルでの入力が困難
- データの標準化ができない

**Recent Moves:** N/A

## Competitive Gaps and Opportunities

| Gap | Opportunity | Strategic Value | Difficulty |
|---|---|---|---|
| 実車セットアップの C2C売買が世界に存在しない | 世界初の実車セットアップマーケットプレイス | High | High |
| 日本語×デジスパイス対応のツールが皆無 | 日本市場の独占的ポジション | High | Medium |
| セットアップ記録とテレメトリの統合製品がない | 記録＋証憑のセット＝商品規格の基盤 | High | Medium |
| 「セットアップ記録→共有→売買」の一気通貫フローがない | 記録体験から売買までのシームレスな導線 | Medium | Medium |
| 既存ツールはすべて「個人完結型」 | Give-to-Get相互共有による在庫構築 | High | Low |

## Strategic Recommendations

### Where to Compete Head-On
1. **セットアップ記録の深さ**: Laptimizer以上の詳細記録（空気圧4輪・サスペンション・アライメント）を維持・強化し、記録体験で最高を目指す
2. **テレメトリ連携**: Track Titan/MyRaceLab水準のテレメトリ分析を段階的に構築（まずデジスパイス・AIM CSV）

### Where to Differentiate
1. **データマーケットプレイス**: 競合が誰も手をつけていない「実車データ売買」で独自ポジションを確立
2. **日本市場特化**: 日本語×デジスパイス×国内サーキットDBで海外勢が参入しにくい堀を構築
3. **Give-to-Get共有モデル**: 競合にない「相互性」の仕組みでコールドスタート問題を解決

### Messaging Implications
- 「記録ツール」ではなく「データで速くなるプラットフォーム」としてポジショニング
- シムの「セットアップ購入」文化を引き合いに出し、実車での価値を説明
- 「走るたびに上達を実感できる」成長体験を前面に

### Watch List
- **Track Titan の日本進出・データ売買参入**: $5M調達後の戦略方向を四半期ごとに監視
- **Coach Dave Academy の実車市場参入**: シム→実車の橋渡しが最大の脅威シナリオ
- **デジスパイスの公式エコシステム開放**: メーカー自身がプラットフォーム化する可能性
- **RaceChrono / Drogger のマーケットプレイス機能追加**: ロガーアプリが直接売買機能を持つリスク

## Sources and Confidence

| Information Type | Source | Confidence |
|---|---|---|
| Track Titan ユーザー数・調達額 | 公式発表・TechCrunch報道 | High |
| MyRaceLab 機能・対応ロガー | 公式サイト・App Store | High |
| Coach Dave 価格・モデル | 公式サイト | High |
| デジスパイス台数（2.1万超） | メーカー公開情報 | High |
| 日本市場規模（10万人） | 業界推計・走行会データ | Medium |
| 競合の今後の戦略方向 | 推測 | Low |

## Next Steps

- [ ] Track Titan の四半期動向レビュー体制を確立する
- [ ] Coach Dave Academy の実車参入の兆候を監視する（SNS・求人等）
- [ ] 日本市場のユーザーインタビュー（5〜10名）で競合認知・代替手段を確認する
- [ ] デジスパイスメーカーへの事前コンタクト（CSV/NMEAでのデータ利用確認）

---

*Analysis valid as of 2026-06-26. Competitive landscape changes frequently; recommend quarterly updates.*
