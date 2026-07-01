---
artifact: adr
version: "1.0"
created: 2026-06-26
status: proposed
---

# ADR-001: Stripe Connect によるC2Cデータ売買決済基盤の採用

## Status

Proposed

**Date:** 2026-06-26
**Deciders:** 創業者（プロダクト・開発・事業兼務）

## Context

VELOCITY LOGGERはPhase 1でC2Cマーケットプレイス（セットアップデータの売買）を実装する。この決済基盤の選択は以下の要素に影響する:

**ビジネス上の制約:**
- 資金決済法の「資金移動業」登録を回避したい（登録コスト・審査期間が個人事業には過大）
- データの単価は¥500〜3,000/件と少額。手数料率が事業性に直結する
- 売り手への分配（レベニューシェア）をリアルタイムまたは迅速に行いたい
- 初期はブートストラップ（自己資金）のため、初期費用を最小化したい

**技術上の制約:**
- 単独開発体制（バス係数1）のため、決済連携の複雑さを最小化したい
- 既存技術スタック: React + Firebase。サーバーサイドはFirebase Cloud Functionsで対応可能
- 将来のサブスクリプション（Phase 2）にも同一基盤で対応したい

**法務上の制約:**
- C2C売買で「運営が売買代金を一時預かる」構造は資金移動業に該当するリスクがある
- Stripe Connectの「ダイレクトペイメント」は、買い手→売り手に直接決済し、プラットフォームは手数料のみ受領する構造のため、資金移動業の該当リスクを回避できる

## Decision

We will use **Stripe Connect（Standard accounts）** をC2Cデータ売買の決済基盤として採用する。

具体的には:
- 売り手は Stripe Connect の Standard account を作成し、直接決済を受ける
- プラットフォーム（VELOCITY LOGGER）は application_fee_amount パラメータで手数料（15〜20%）のみを徴収する
- 買い手の決済は Stripe Checkout または Payment Intents API で処理する
- Firebase Cloud Functions で Webhook を受け取り、Firestore 上の取引ステータスを更新する
- Phase 2 のサブスクリプションは Stripe Billing で同一基盤上に追加する

## Consequences

### Positive

- **資金移動業の回避**: ダイレクトペイメント構造により、運営が資金を預からない。法務リスクを構造的に排除
- **開発コストの最小化**: Stripe の SDK・ダッシュボード・Webhook が成熟しており、単独開発でも実装可能
- **スケーラビリティ**: Standard account はグローバル対応。将来の海外展開時にも同一基盤で対応可能
- **サブスク対応**: Stripe Billing をそのまま追加でき、Phase 2 への移行がスムーズ
- **売り手体験**: Standard account は売り手が自分の Stripe ダッシュボードで売上を確認でき、信頼性が高い

### Negative

- **売り手のオンボーディング負荷**: Standard account の作成には Stripe のKYC（本人確認）が必要。売り手の離脱ポイントになりうる
- **Stripe 依存**: 決済基盤を Stripe に一本化するため、プラットフォームリスクがある（Stripe の料金改定・規約変更）
- **手数料コスト**: Stripe の基本手数料（3.6%）+ Connect 手数料が少額決済では利益を圧迫する可能性がある（¥500の商品で約18円）

### Neutral

- Firebase Cloud Functions の cold start（コールドスタート）が Webhook 処理に影響する可能性があるが、リアルタイム性は必須ではないため許容範囲
- 既存の Firebase Authentication とは別に、売り手の Stripe account ID を Firestore で管理する必要がある

## Alternatives Considered

### Alternative 1: 自前決済（銀行振込 + 手動分配）

最小コストで開始できるが、振込確認・分配の手動運用が単独体制では持続不可能。また、資金の一時預かりが発生するため資金移動業に該当するリスクがある。H3検証の手動テスト（数件）には使えるが、スケーラブルではない。

### Alternative 2: PAY.JP Marketplace

日本市場特化の決済サービス。Stripeより日本語サポートが手厚い。しかし、Connect相当の分配機能（Marketplace API）のドキュメント・事例がStripeに比べて少なく、海外展開時の対応も不明。単独開発での実装難度を考慮しStripeを選択。

### Alternative 3: Stripe Connect（Express accounts）

Standard よりオンボーディングが簡単だが、売り手が自分のStripeダッシュボードを持てず透明性が低い。売り手の信頼を得ることがマーケットプレイスの生命線のため、Standardを選択。

## References

- BUSINESS_PLAN.md — 収益モデル・法務リスク分析
- docs/data-marketplace-business-analysis.md — 法的リスク評価（§4.3 決済・資金移動業）
- Stripe Connect documentation — ダイレクトペイメントの資金フロー
- 資金決済法 — 資金移動業の定義と該当要件
