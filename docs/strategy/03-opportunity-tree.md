---
artifact: opportunity-tree
version: "1.0"
created: 2026-06-26
status: draft
---

# Opportunity Solution Tree: データマーケットプレイスの流動性確立

## Desired Outcome

**Outcome Statement:** 主要「サーキット×車種」5マスで流動性20%（出品の30日以内売却率）を達成する
**Current State:** マーケットプレイス未稼働（Phase 0c Give-to-Get共有まで実装済み）
**Target State:** 流動性20%以上（= 事業Go/No-Go判断基準）
**Timeframe:** 12ヶ月（2026-07〜2027-06）
**Owner:** 創業者

### Why This Outcome Matters

VELOCITY LOGGERの事業価値は「検証済みデータ資産」にある。流動性（データが売れる状態）が成立しなければ、売り手は出品をやめ、買い手は離脱し、マーケットプレイスは崩壊する。H3（「実車データに支払い意思がある」）は本事業のGo/No-Go判断点であり、流動性20%はその最低ラインとして設定している。

---

## Visual Tree

```
                        [OUTCOME]
           主要5マスで流動性20%達成
                          |
        ┌─────────────────┼─────────────────┐
        |                 |                 |
   [Opp 1]           [Opp 2]           [Opp 3]
   在庫が足りず       試行錯誤の        データの信頼性
   比較対象がない      コストが高い       が分からない
        |                 |                 |
    ┌───┴───┐         ┌───┴───┐         ┌───┴───┐
    |       |         |       |         |       |
 [GtG共有] [アンカー] [ロガー証憑] [比較V] [レビュー] [証憑付]
 [拡充]   [契約]     [連携]     [ュー]   [機能]   [商品規格]
    |       |         |       |         |       |
 [Test1] [Test2]   [Test3] [Test4]   [Test5] [Test6]
```

---

## Opportunity Branches

### Opportunity 1: 「同じ車種×サーキットのデータが少なく、比較対象がない」

**Description:** 中級ドライバーは自分と同じ車種・同じサーキットのセットアップデータを見たいが、現状では周囲に聞くか、走行会で偶然出会うしかない。マーケットプレイスに十分な在庫がなければ買う理由がない。
**Impact Potential:** High
**Confidence:** High

**Evidence:**
- BUSINESS_PLAN: 「供給不足（売り手が集まらない）」を事業リスクの最上位に位置付け
- シムレーシング: SimRacingSetup.comは10,000+セットアップの在庫で月額課金を成立させている
- 二面市場の定石: 供給側が先に充足しなければ需要側は来ない（chicken-and-egg problem）

#### Solutions

**Solution 1A: Give-to-Get共有の拡充・促進**
- Description: 自分のデータを共有した人だけが他人の共有データを閲覧できる相互性モデルを磨き込み、無料在庫を増やす
- Effort: S（既に実装済み、UX改善が主）
- Riskiest Assumption: ドライバーは自分のデータを共有する動機がある
- Assumption Test: H2検証 — 記録ユーザーの20%が共有するか観察（成功基準: 20%以上）

**Solution 1B: アンカー供給者5〜10名との契約**
- Description: プロ/ショップと個別契約し、検証済みセットアップを初期在庫として確保。レベニューシェアで継続出品を促す
- Effort: M（営業・契約・コンテンツ整備）
- Riskiest Assumption: 上級ドライバーは自分のセットアップを他人に売ることに同意する
- Assumption Test: 5名にアプローチし、3名以上の契約を目指す（成功基準: 60%以上の契約率）

---

### Opportunity 2: 「セットアップの試行錯誤に時間と金がかかりすぎる」

**Description:** サーキット走行は1回2〜3万円。タイヤ交換は数万円。間違ったセットアップで1日を無駄にするコストは高い。「次に何を変えれば速くなるか」の手がかりが欲しいが、テレメトリデータを自分で分析する能力・時間がない。
**Impact Potential:** High
**Confidence:** Medium

**Evidence:**
- BUSINESS_PLAN: 買い手側コアの課題＝「何をどう変えれば速くなるか分からない。試行錯誤は1回数万円」
- 走行会1回分（2〜3万円）に対し、データ数千円は安いという支払い意思の仮説
- Coach Dave Academy（シム）の成功: 検証済みセットアップで試行錯誤を短縮する価値が実証済み

#### Solutions

**Solution 2A: ロガー連携によるラップタイム証憑付きデータ**
- Description: AIM CSV / デジスパイスNMEAとの連携で、セットアップデータにラップタイムの証拠を紐付け。「このセットアップで○分○秒が出た」を商品規格にする
- Effort: L（パーサー開発・テレメトリUI）
- Riskiest Assumption: ラップタイム証憑がデータの購入動機を高める
- Assumption Test: 証憑付きデータと証憑なしデータの購入率を比較（A/Bテスト）

**Solution 2B: 比較ビューの強化（自分 vs 購入データの差分ハイライト）**
- Description: 購入したセットアップと自分のセットアップの差分を視覚的に表示し、「何を変えればよいか」を即座に把握可能に
- Effort: S（既存比較ビューの拡張）
- Riskiest Assumption: 差分ハイライトが「次に何を変えるか」の意思決定を支える
- Assumption Test: 比較ビュー利用後の走行でラップタイム改善率を追跡

---

### Opportunity 3: 「他人のデータが本当に役に立つか分からない」

**Description:** 実車のセットアップは天候・路面温度・タイヤ劣化・ドライバースキル等の変数が多い。シムと違い「同条件」が保証されないため、他人のデータを買っても自分に合うか不安。品質・信頼性の担保がなければ支払いに至らない。
**Impact Potential:** High
**Confidence:** Medium

**Evidence:**
- BUSINESS_PLAN: 「品質不信（偽データ・効果のないデータ）」を事業リスク上位に位置付け
- シムとの違い: 実車はコンディション変数が多く、「同一条件」の保証が困難
- H3仮説の核心: 「実車データに金を払う文化」は世界初の挑戦であり、信頼の担保が鍵

#### Solutions

**Solution 3A: レビュー・売り手実績表示システム**
- Description: 購入者がレビューを投稿でき、売り手のベストタイム・販売実績・評価が公開される仕組み
- Effort: M（レビューUI・レーティングロジック）
- Riskiest Assumption: 購入者はレビューを書く動機がある
- Assumption Test: 購入後のレビュー投稿率を追跡（目標: 購入者の30%以上）

**Solution 3B: 証憑付き商品規格の厳格化**
- Description: ラップタイム＋条件（気温・路温・タイヤ状態）をセットにした商品規格を定義。証憑なしデータは販売不可にする
- Effort: M（データモデル拡張・バリデーション）
- Riskiest Assumption: 売り手は証憑データを準備する手間を許容する
- Assumption Test: アンカー供給者の証憑付き出品率を追跡（目標: 80%以上）

---

## Prioritization

### Current Focus

**Priority Opportunity:** Opportunity 1 — 在庫の確保
**Priority Solution:** Solution 1B — アンカー供給者との契約
**Rationale:** 二面市場では供給が先。在庫がなければ買い手は来ない。Give-to-Get（1A）は既に実装済みだが、「検証済み」の品質を持つデータはアンカー供給者からしか得られない。在庫確保が他のすべての前提条件。

### Opportunity Ranking

| Rank | Opportunity | Impact | Confidence | Effort | Score |
|---|---|---|---|---|---|
| 1 | 在庫不足（比較対象がない） | High | High | Medium | 最優先 |
| 2 | 試行錯誤コストが高い | High | Medium | Large | 次フェーズ |
| 3 | データの信頼性不安 | High | Medium | Medium | 在庫確保と並行 |

### Parking Lot

- **AI分析・自動提案**: 在庫と流動性が成立してからのPhase 2施策。現段階では過剰投資
- **海外展開（英語圏）**: 国内流動性20%未達なら検討すらしない
- **サブスクリプション**: 流通額が一定規模に達するまではC2C個別課金が先

---

## Experiments Backlog

| Solution | Assumption | Test Method | Success Criteria | Status |
|---|---|---|---|---|
| 1A: Give-to-Get拡充 | 記録ユーザーの20%が共有する | H2: Give-to-Get機能リリース後の共有率測定 | 共有率 ≥ 20% | Planned |
| 1B: アンカー供給者契約 | 上級ドライバーが出品に同意する | 5名へのアプローチ | 契約率 ≥ 60% | Planned |
| 2A: ロガー証憑連携 | 証憑がデータの購入動機を高める | 証憑付き vs なしの購入率比較 | 証憑付きの購入率が2倍以上 | Planned |
| 3A: レビューシステム | 購入者がレビューを書く | 購入後のレビュー投稿率追跡 | レビュー率 ≥ 30% | Planned |
| 全体: H3検証 | 実車データに支払い意思がある | アンカー供給データの先行販売 | 購入率 ≥ 5%, リピート率 ≥ 30% | **Go/No-Go** |

---

## Learning Log

| Date | Experiment | Result | Learning | Impact on Tree |
|---|---|---|---|---|
| 2026-06-13 | ベータ版v0.3リリース | Complete | Give-to-Get共有・比較ビュー・ロガー取込（AIM CSV/NMEA）を実装完了 | Solution 1A/2B の技術的前提が実証済み |

---

## Next Steps

- [ ] アンカー供給者候補5〜10名のリストアップと初回コンタクト
- [ ] 走行会主催者2〜3件への無償提供提案
- [ ] H3検証計画の具体化（最小コストでの先行販売テスト設計）
- [ ] Give-to-Get共有率の計測インフラ整備（Firestore Analytics連携）

---

*This is a living document. Update as you learn from experiments and customer feedback.*
