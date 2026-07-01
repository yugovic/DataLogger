# WP-1 要件定義: VehicleProfile（改造パーツ申告リスト・タイヤ区分・改造度バッジ）

- 日付: 2026-07-02
- 起点: docs/strategy/06-content-differentiation-plan.md（柱B / WP-1）
- 種別: データモデル＋純粋ロジック＋サービス層（**UIは含まない** — UIはWP-2）
- 実装担当: codex（implementer） / レビュー: Fable 5

## 目的

タイム比較・共有・将来のマーケット商品に「車両の文脈」を添付するための基盤。
みんカラ的な「何をどう改造したか」の申告文化を構造化して受け止める。
パワー・車重は**任意の自己申告**（実測強制なし）。

## 背景（実装者が守るべきプロジェクト原則）

- **null保存原則**: 未入力は null。0変換・デモ初期値・推定値の保存は禁止（CLAUDE.md / 事業上の欠陥扱い）
- 既存の zod 規約は src/schemas/setupSchema.ts の `nullableNum` パターンに従う
- 型定義は src/types/、純粋ロジックは src/lib/、Firestoreアクセスは src/services/
- コメント・エラーメッセージは日本語

## スコープ

### 1. 型定義の拡張 — src/types/vehicle.ts

既存 `Vehicle` に `profile?: VehicleProfile` を追加し、以下の型を新設する。

```typescript
// タイヤ区分（クラス判定の主軸）
export type TireClass = 'S_TIRE' | 'HIGH_GRIP_RADIAL' | 'RADIAL';

// 改造カテゴリ
export type ModCategory =
  | 'intake_exhaust'     // 吸排気
  | 'forced_induction'   // 過給
  | 'suspension'         // 足回り
  | 'brake'              // ブレーキ
  | 'aero'               // エアロ
  | 'weight_reduction'   // 軽量化
  | 'ecu'                // ECU・電装
  | 'drivetrain'         // 駆動系
  | 'engine_internal'    // エンジン内部
  | 'tire_wheel'         // タイヤ・ホイール
  | 'body_reinforcement' // ボディ補強
  | 'other';             // その他

// 改造パーツ申告エントリ（タイムスタンプ付き配列 — WP-8ビルドジャーナルの基盤）
export interface ModificationEntry {
  id: string;                 // クライアント生成の一意ID（crypto.randomUUID）
  category: ModCategory;
  partName: string;           // パーツ名（自由記述、必須）
  maker: string | null;       // メーカー名（任意）
  installedAt: Date | null;   // 装着日（任意 — 不明なら null）
  removedAt: Date | null;     // 取外し日（null = 現在も装着中）
  costJPY: number | null;     // 費用（任意・非公開情報）
  memo: string | null;        // 自由メモ（任意）
}

// 車両プロフィール
export interface VehicleProfile {
  modifications: ModificationEntry[];
  tireClass: TireClass | null;   // 未申告は null
  powerPs: number | null;        // 自己申告パワー（任意）
  weightKg: number | null;       // 自己申告車重（任意）
}
```

- カテゴリの日本語ラベルは `MOD_CATEGORY_LABELS: Record<ModCategory, string>` として同ファイルにエクスポート
- `TIRE_CLASS_LABELS: Record<TireClass, string>` も同様（Sタイヤ / ハイグリップラジアル / ラジアル）

### 2. 改造度バッジ推定 — src/lib/modLevel.ts（新規）

純粋関数のみ。Firebase・React に依存しないこと。

```typescript
export type ModLevel = 'NORMAL' | 'LIGHT' | 'MIDDLE' | 'FULL';
export const MOD_LEVEL_LABELS: Record<ModLevel, string>;
// ノーマル / ライトチューン / ミドルチューン / フルチューン

export function estimateModLevel(modifications: ModificationEntry[]): ModLevel;
```

**推定ルール**（06プラン決定事項: カテゴリ数ベース、暫定ルールとしてコメント明記）:
- 対象は**現在装着中**（removedAt === null）のエントリのみ
- 'other' と 'tire_wheel' はカテゴリ数にカウントしない（タイヤはtireClass軸で扱うため二重計上を避ける）
- ユニークカテゴリ数: 0 → NORMAL / 1〜2 → LIGHT / 3〜5 → MIDDLE / 6以上 → FULL

```typescript
// 「近い仕様」判定の材料（WP-2比較フィルタで使用）
export function getActiveCategories(modifications: ModificationEntry[]): ModCategory[];
```

### 3. zodスキーマ — src/schemas/vehicleProfileSchema.ts（新規）

- setupSchema.ts の規約（nullableNum・日本語メッセージ）に従う
- `modificationEntrySchema`: partName は `.min(1, 'パーツ名を入力してください')`、costJPY は 0〜10,000,000 の nullableNum、installedAt/removedAt は `z.date().nullable()`
- `vehicleProfileSchema`: powerPs 0〜2000、weightKg 300〜3500 の nullableNum、tireClass は `z.enum([...]).nullable()`
- `export type VehicleProfileInput = z.infer<typeof vehicleProfileSchema>`

### 4. 匿名化・公開用変換 — src/lib/vehicleProfilePublic.ts（新規）

共有・将来のマーケット表示用に、公開してよい形へ変換する純粋関数。

```typescript
export interface PublicVehicleProfile {
  modifications: Array<{ category: ModCategory; partName: string; maker: string | null }>;
  tireClass: TireClass | null;
  powerPs: number | null;
  weightKg: number | null;
  modLevel: ModLevel;
}

export function toPublicVehicleProfile(profile: VehicleProfile): PublicVehicleProfile;
```

- **costJPY と memo は公開形に決して含めない**（費用は所有者の私的情報、memoは個人特定リスク）
- installedAt/removedAt も公開形から除外（走行履歴との突合で個人特定し得るため）。取外し済みエントリ自体を除外
- 「申告値である」ことのUI表示はWP-2の責務（本WPではデータに `selfDeclared` 等のフラグは持たせない — 全項目が申告値であるため冗長）

### 5. サービス層 — src/services/vehicleService.ts（修正）

- `addVehicle` / `updateVehicle` が `profile` を保存できることを確認・対応
  - 既存の `cleanedData` ロジック（undefined と空文字を除外）が **profile のネスト内の null を落とさない**ように注意（null保存原則。トップレベルのみの浅い処理なので profile オブジェクトはそのまま通るはずだが、検証すること）
  - Firestore は `Date` を Timestamp として保存する。読込時（getUserVehicles / getVehicle）に `profile.modifications[].installedAt / removedAt` を Timestamp → Date に復元する処理を追加
- 保存前に `vehicleProfileSchema` で検証し、不正時は日本語メッセージの Error を throw

### 6. テスト — vitest（新規）

- `src/lib/modLevel.test.ts`:
  - 空配列 → NORMAL
  - tire_wheel と other のみ → NORMAL（カウント除外）
  - 同一カテゴリ複数エントリ → 1カテゴリとしてカウント
  - removedAt 付きエントリはカウント外
  - 境界値: 2→LIGHT, 3→MIDDLE, 5→MIDDLE, 6→FULL
- `src/schemas/vehicleProfileSchema.test.ts`（または既存テスト規約に合わせた配置）:
  - 全項目 null で valid（null保存原則）
  - partName 空文字で invalid
  - powerPs 負値・2001 で invalid
- `src/lib/vehicleProfilePublic.test.ts`:
  - costJPY / memo / installedAt が出力に含まれない
  - removedAt 付きエントリが除外される
  - modLevel が付与される

## スコープ外（やらないこと）

- UIコンポーネント（WP-2）
- Firestoreセキュリティルールの変更（共有機能接続時に別途）
- 既存 VehicleSetupConfig の変更・リファクタ
- CarSetup（setups コレクション）側への profile 埋め込み

## 受け入れ基準

- [ ] `npm run typecheck` / `npm run lint` / `npm run test` が全て成功
- [ ] 新規テストが上記ケースを網羅
- [ ] null保存原則違反がない（デフォルト値・0埋めの混入なし）
- [ ] 既存機能（車両CRUD）に回帰がない（既存テスト成功で確認）
- [ ] コメント・エラーメッセージが日本語
