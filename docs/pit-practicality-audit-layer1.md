# 層1: 機械検査（ピット実用性オーディット）

検査条件: iPhone 390×844 CSS px、片手親指、グローブ着用、直射日光、通信2G相当〜完全断。  
実測条件: Chromium mobile context `390×844`、`isMobile=true`、`hasTouch=true`、coarse pointer。2026-07-29時点のワークツリーを検査した。  
時間計算用の代表入力値: 気温 `25°C`、温間圧 `FL/FR/RL/RR=220kPa`、ベストラップ `1:58.423`、フィーリング「低速進入=N」。

## 判定サマリ

| 検査項目 | 判定 | 根拠(一行) |
|---|---|---|
| 1. タップ数/所要秒数 | 不合格 | 最短34タップ・下限約32.4秒、連続入力の現実的経路47タップ・約51.9秒にサーバーACK待ちが加わる。 |
| 2. ターゲットサイズ | 不合格 | 閉じる94×20、温冷切替96×26、InputNumber高42、Slider高12/handle 10×10など44px未満がある。 |
| 3. コントラスト比 | 不合格 | 直射日光基準7:1に対し、gray-400は2.43〜5.78:1、白/blue-500は3.68:1など多数が未達。 |
| 4. 通信断の完走 | 不合格 | `setDoc`/`updateDoc`を`await`し、Promise解決後にしか成功表示しないため完全断では無言の保存中状態から完走しない。 |
| 5. 親指到達域 | 不合格 | 自然到達域をy=281〜844pxとすると、温冷切替y=75、前輪選択y=134、閉じるy=12が範囲外。 |

## 詳細

### 1. 総タップ数と推定所要秒数

前提:

- セッション作成済みなのでサーキット・車両などの必須セッション情報は入力済みとする。
- 数字キー、記号切替キー、Enterキーも1タップとして数える。
- スクロールはタップ数に含めない。
- 保存通信時間はコードから定数化できないため、以下は `+ T_ack` とする。完全断では `T_ack=∞`。
- `StepNumber` は空値で `+5` を押すと既定値200に5を加えた205になるため、220には各輪4回必要（`StepNumber.tsx:58-66`、`BasicInfoTab.tsx:206-223`）。

#### 最短経路: 34タップ

QuickEntryを使わず、メインカードと基本設定タブを直接使う。同じ代表値をキーボード入力しても、タイヤを各輪 `+5×4` で入力しても合計34タップ。

1. 環境カード見出しを展開（1）
2. 気温入力をタップ（1）
3. `2`、`5`（2）
4. ラップカード見出しを展開（1）
5. ベストラップ入力をタップ（1）
6. 記号キーボードへ切替（1）
7. `1:58.423` の8文字（8）
8. 基本設定タブの温間FL `+5` を4回（4）
9. 温間FR `+5` を4回（4）
10. 温間RL `+5` を4回（4）
11. 温間RR `+5` を4回（4）
12. 「ドライバーフィードバック」タブ（1）
13. 低速進入スライダーのN位置（1）
14. 固定「保存」（1）

合計: `34タップ`。

時間下限:

- タップ: `34×0.6=20.4秒`
- キーボード出現: 気温・ラップの2回、タイヤも直接入力する最短キーボード案では計3回。ステッパー案を採用し `2×1.0=2.0秒`
- UI状態変化: カード展開2回、タブ切替1回、保存完了表示1回、`4×0.3=1.2秒`
- 思考/照準: 11操作群、`11×0.8=8.8秒`
- 合計下限: `20.4+2.0+1.2+8.8=32.4秒 + T_ack`

スクロール時間を式に含めていないため実時間は32.4秒を上回る。キーボードで4輪を直接入力する場合は、各輪「入力欄1＋数字3」で同じ16タップだが、実測入力欄は56×42pxで60px推奨未達のため、グローブ条件の現実的手段には採用しない。

#### 現実的経路: 47タップ

連続入力モーダルを使い、4輪は44×44以上のステッパーを使用する。タブは初期状態で右端がクリップされるため、overflowボタン経由を採用する。

1. 「未入力の項目を入力する」（1）
2. 天候を未入力のまま「次へ」（1）
3. 気温入力をタップ、`2`、`5`（3）
4. 「次へ」（1）
5. 路温、湿度、気圧を各「スキップ」（3）
6. 「温間(走行後)」切替（1）
7. 空の4輪を `+5` で1回ずつ入力し205にする（4）
8. FLを選択し `+5×3`（4）
9. FRを選択し `+5×3`（4）
10. RLを選択し `+5×3`（4）
11. RRを選択し `+5×3`（4）
12. 「次のタイヤへ」（1）
13. ベストラップ入力をタップ（1）
14. 記号キーボード切替（1）
15. `1:58.423` の8文字（8）
16. Enterで次へ（1）
17. 総周回数を「スキップ」（1）
18. タブoverflowボタン（1）
19. 「ドライバーフィードバック」（1）
20. 低速進入スライダーのN位置（1）
21. 固定「保存」（1）

合計: `47タップ`。

時間:

- タップ: `47×0.6=28.2秒`
- キーボード出現: 気温・ラップ、`2×1.0=2.0秒`
- 画面遷移: モーダル開始から終了まで9回、タブ切替、保存完了の計11回、`11×0.3=3.3秒`
- 思考/照準: 23操作群、`23×0.8=18.4秒`
- 合計: `28.2+2.0+3.3+18.4=51.9秒 + T_ack`

QuickEntryが不要項目も質問する根拠は、固定順 `weather→airTemp→trackTemp→humidity→pressure→tirePressure→bestLap→totalLaps` と未入力抽出処理（`src/lib/quickEntryFlow.ts:37-76`）。天候だけはスキップボタンが出ず、次へで未入力のまま進む（`QuickEntryModal.tsx:204-218,232-248`）。

### 2. 全操作ターゲットのサイズ列挙

実測値は390×844/coarse pointerの `getBoundingClientRect()`。同一実装の反復要素は個数を併記した。

| 状態/要素 | 個数 | 実測CSSサイズ(px) | 44×44 | 60×60 | 根拠 |
|---|---:|---:|---|---|---|
| 環境カード展開見出し | 1 | 310×28 | **不合格** | **不合格** | `CarSetup.tsx:1173-1183` |
| タイヤカード展開見出し | 1 | 310×28 | **不合格** | **不合格** | `CarSetup.tsx:1262-1271` |
| ラップカード展開見出し | 1 | 126×84 | 合格 | 合格 | `CarSetup.tsx:1490-1498` |
| QuickEntry起動 | 1 | 358×44 | 合格 | **不合格** | `CarSetup.tsx:1617-1623` |
| QuickEntry「閉じる」 | 各画面1 | 94×20 | **不合格** | **不合格** | `QuickEntryModal.tsx:222-226` |
| 天候チップ | 4 | 171〜198×38 | **不合格** | **不合格** | `QuickEntryModal.tsx:96-116` |
| 下部「次へ」単独 | 1 | 366×44 | 合格 | **不合格** | `QuickEntryModal.tsx:242-248` |
| 下部「スキップ」 | 各数値画面1 | 121×46 | 合格 | **不合格** | `QuickEntryModal.tsx:233-240` |
| 下部「次へ」/「次のタイヤへ」 | 各数値画面1 | 237×46 | 合格 | **不合格** | `QuickEntryModal.tsx:242-248` |
| StepNumber `−5/+5` large | 各2 | 48×44 | 合格 | **不合格** | `StepNumber.tsx:94-107,162-175`; `index.css:8-12` |
| StepNumber `−1/+1` large | 各2 | 44×44 | 合格 | **不合格** | `StepNumber.tsx:109-119,151-161`; `index.css:8-12` |
| 気温等 InputNumber外枠 | 1 | 110×42 | **不合格** | **不合格** | `QuickEntryModal.tsx:127-137`; `StepNumber.tsx:120-145` |
| 気温等 InputNumber input | 1 | 108×40 | **不合格** | **不合格** | `StepNumber.tsx:120-145`; `index.css:13-15` |
| 温冷モード切替 | 2 | 95〜96×26 | **不合格** | **不合格** | `TirePressureScene.tsx:105-128` |
| FL/FR/RL/RR選択 | 4 | 72×56 | 合格 | **不合格** | `TirePressureScene.tsx:157-181` |
| タイヤ InputNumber外枠 | 1 | 90×42 | **不合格** | **不合格** | `TirePressureScene.tsx:186-199`; `StepNumber.tsx:120-145` |
| タイヤ InputNumber input | 1 | 88×40 | **不合格** | **不合格** | 同上 |
| ベストラップInput | 1 | 350×48 | 合格 | **不合格** | `QuickEntryModal.tsx:143-155` |
| 基本設定の温間 `+5` | 4 | 44×44 | 合格 | **不合格** | `BasicInfoTab.tsx:203-223`; `StepNumber.tsx:162-175`; `index.css:8-12` |
| 基本設定の温間Input外枠 | 4 | 56×42 | **不合格** | **不合格** | `BasicInfoTab.tsx:203-223` |
| 基本設定の温間input | 4 | 54×40 | **不合格** | **不合格** | 同上; `index.css:13-15` |
| ドライバーフィードバックtab CSS box | 1 | 163×46 | 合格 | **不合格** | `CarSetup.tsx:1736-1752` |
| 同tabの初期可視クリップ領域 | 1 | 約45×46 | 合格 | **不合格** | 同上、実測x=345〜390 |
| Tabs overflowボタン | 1 | 46×46 | 合格 | **不合格** | Ant Design Tabs、`CarSetup.tsx:1752` |
| Feedback Slider全体 | 1操作対象 | 234×12 | **不合格** | **不合格** | `DrivingTab.tsx:62-72` |
| Slider handle | 1 | 10×10 | **不合格** | **不合格** | 同上 |
| Slider dot | 5 | 8×8 | **不合格** | **不合格** | 同上 |
| 固定「保存」 | 1 | 84×52 | 合格 | **不合格** | `CarSetup.tsx:1771-1783` |
| 同時表示の「直近を複製」 | 1 | 128×44 | 合格 | **不合格** | `CarSetup.tsx:1757-1770` |

44×44未満の全グループ: 環境カード見出し、タイヤカード見出し、閉じる、天候チップ、全InputNumber外枠/内部input、温冷切替、Slider全体/handle/dot。  
60×60基準では上表の「固定保存」を含む全要素が少なくとも一辺で未達。ラップカード見出しだけが60×60を満たす。

### 3. 屋外照度でのコントラスト比

計算はWCAG相対輝度式 `(L1+0.05)/(L2+0.05)`。Tailwind既定RGBと `src/index.css` の `!important` 上書きを使用した。7:1未満を不合格とした。

#### 不合格の全色組合せ

| 使用箇所 | 前景RGB | 背景RGB | 比率 | L/D | ファイル:行 |
|---|---:|---:|---:|---|---|
| `text-gray-400`（進捗、ヒント、FRONT/REAR、輪名、空値、単位、差分）/gray-50 | 156,163,175 | 249,250,251 | 2.43:1 | L | `QuickEntryModal.tsx:118,138,223`; `TirePressureScene.tsx:132-180`; `StepNumber.tsx:146-149` |
| `text-gray-400` / white | 156,163,175 | 255,255,255 | 2.54:1 | L | `TirePressureScene.tsx:169-180`; `DrivingTab.tsx:49` |
| `text-gray-500`（質問ラベル、閉じる、subtitle、目標）/gray-50 | 107,114,128 | 249,250,251 | 4.63:1 | L | `QuickEntryModal.tsx:98,126,145,224`; `TirePressureScene.tsx:102,200` |
| 選択chip/mode `text-blue-600` / `bg-blue-50` | 37,99,235 | 239,246,255 | 4.75:1 | L | `QuickEntryModal.tsx:108-112`; `TirePressureScene.tsx:109-123` |
| 白文字 / `bg-blue-500`（起動、次へ） | 255,255,255 | 59,130,246 | 3.68:1 | L/D | `CarSetup.tsx:1620`; `QuickEntryModal.tsx:245` |
| `text-blue-500` / white（active tab等） | 59,130,246 | 255,255,255 | 3.68:1 | L | `DrivingTab.tsx:54`; Ant Tabs at `CarSetup.tsx:1752` |
| `text-green-600` / white（圧力レンジ内） | 22,163,74 | 255,255,255 | 3.30:1 | L | `TirePressureScene.tsx:144-146,205-207` |
| `text-orange-500` / white（圧力レンジ外） | 249,115,22 | 255,255,255 | 2.80:1 | L | `TirePressureScene.tsx:144-146,205-207` |
| Slider未選択mark `rgba(0,0,0,.45)`合成 / white | 約140,140,140 | 255,255,255 | 約3.36:1 | L | Ant Slider、`DrivingTab.tsx:62-72` |
| gray-300境界 / white（非テキストUI） | 209,213,219 | 255,255,255 | 1.47:1 | L | `QuickEntryModal.tsx:108-112,237`; `TirePressureScene.tsx:161-167` |
| dark global gray文字 / gray-700 modal root | 156,163,175 | 55,65,81 | 4.06:1 | D | `index.css:560-578`; QuickEntry/TirePressureSceneの上記gray行 |
| dark global gray文字 / gray-800 card | 156,163,175 | 31,41,55 | 5.78:1 | D | `index.css:560-574`; `DrivingTab.tsx:47-49,120` |
| 選択mode `text-blue-300` / blue-900 40%合成 | 147,197,253 | 45,62,104 | 5.82:1 | D | `TirePressureScene.tsx:109-123` |
| `text-blue-400` / gray-800 | 96,165,250 | 31,41,55 | 5.77:1 | D | `DrivingTab.tsx:54`; dark link系 |
| Ant active tab #4096ff / gray-800 | 64,150,255 | 31,41,55 | 4.91:1 | D | Ant Tabs、`CarSetup.tsx:1752` |
| `text-green-400` / gray-700 | 74,222,128 | 55,65,81 | 5.92:1 | D | `TirePressureScene.tsx:145,205` |
| `text-orange-400` / gray-700 | 251,146,60 | 55,65,81 | 4.55:1 | D | `TirePressureScene.tsx:146,205` |
| Slider active mark/track blue-500 / gray-800 | 59,130,246 | 31,41,55 | 3.99:1 | D | `index.css:480-495`; `DrivingTab.tsx:62-72` |
| Slider rail gray-600 / gray-800（非テキストUI） | 75,85,99 | 31,41,55 | 1.94:1 | D | `index.css:484-505` |

7:1以上の主要例:

- light `text-gray-600` / white = 7.56:1
- light `text-gray-700` / white = 10.31:1
- fixed保存 white / gray-800 = 14.68:1
- dark gray-200 / gray-700 = 8.33:1
- dark gray-300 / gray-800 = 9.96:1
- dark green-400 / gray-800 = 8.42:1

`text-[10px]` と `text-xs` はサイズによる緩和を本監査では適用していない。該当するgray-400/500の比率は上表どおり不合格。

### 4. 通信断シナリオの完走判定

**二値判定: 完走しない。**

保存経路:

1. 固定保存ボタンが `handleSave` を呼ぶ（`CarSetup.tsx:1771-1783`）。
2. 即時に `savingRef=true`、`isSaving=true` となる（`CarSetup.tsx:542-548`）。
3. 新規は `await saveSetup(setupData)`、更新は `await updateSetup(...)`（`CarSetup.tsx:608-621`）。
4. `saveSetup` は `await setDoc`、`updateSetup` は `await updateDoc`（`src/services/setupService.ts:91-105,204-220`）。
5. 成功メッセージは上記awaitの後だけ表示（`CarSetup.tsx:614,620`）。
6. 基準更新と保存済みURLへの遷移もその後（`CarSetup.tsx:728-740`）。
7. `isSaving=false` はPromiseが成功またはrejectして `finally` に到達した場合だけ（`CarSetup.tsx:741-754`）。

完全断時の結果:

- Firestore Web SDKの`setDoc`/`updateDoc` Promiseはローカルキュー投入だけでは解決せず、サーバーACKを待つ。
- したがって保存ボタンはdisabled＋spinnerのままになり、「セットアップデータを保存しました」は表示されない。
- timeout、`navigator.onLine`判定、オフライン受付表示、ローカル受付完了への状態分離はいずれも保存経路にない。
- `saveSetup`の前に車両snapshot取得が必要な場合は `getVehicle` も先行する（`setupService.ts:45-81`）。キャッシュがなければ書込みキュー到達前に停止/失敗する可能性がある。

再起動後:

- Firestore IndexedDB永続化は本番時に試行する（`src/lib/firebase.ts:45-50`）。成功しており、かつ`setDoc`/`updateDoc`まで到達済みなら、Firestore mutation queueが後で同期する可能性はある。
- ただし永続化失敗はwarningだけで、代替処理はない（同:47-49）。
- `SetupDraft`は`useReducer`のメモリ状態だけで、`localStorage`/IndexedDBへのdraft保存・復元処理がない（`src/lib/setupDraft.ts:575-629`）。新規空draftは再生成される（同:161-220）。
- `serializeDraft`はダーティ比較用の文字列化だけで、保存先へ書いていない（同:559-573）。
- よってアプリを閉じた後、編集中フォームとして入力を復帰できない。後日Firestoreへ同期された可能性があっても、元画面は保存IDを受領しておらず、ユーザーへ「保存できた」と確定表示しない。

### 5. 片手親指の到達範囲

定義: 画面下端から上方向に約2/3を自然到達域とする。390×844では `844×2/3=562.7px` なので、viewport座標 **y=281〜844px** を自然到達域、**y=0〜280px** を持ち替え域とする。判定は要素中心ではなく、ターゲットboxが自然域に入るかで行う。

| 主要操作 | 実測y範囲(px) | 判定 |
|---|---:|---|
| QuickEntry閉じる | 12〜32 | **範囲外** |
| 天候チップ | 323〜499 | 範囲内 |
| 気温StepNumber | 388〜432 | 範囲内 |
| 各画面スキップ/次へ | 786〜832 | 範囲内 |
| 温冷モード切替 | 75〜101 | **範囲外** |
| FL/FR選択 | 134〜190 | **範囲外** |
| RL/RR選択 | 296〜352 | 範囲内 |
| タイヤ増減 | 381〜425 | 範囲内 |
| ベストラップ入力 | 400〜448 | 範囲内 |
| タブ列（スクロール後） | 492〜538 | 範囲内 |
| 低速進入Slider（スクロール後） | 646〜658 | 範囲内 |
| 固定保存 | 768〜820 | 範囲内 |

到達域外の全主要操作: QuickEntry閉じる、温冷モード切替、FL選択、FR選択。  
基本設定タブの直接経路はページスクロールで対象を自然域へ移せるが、QuickEntryは固定フルスクリーン配置のため、温冷切替と前輪選択のy位置はスクロールで下げられない。

## 不合格項目の一覧（修正対象）

| # | 項目 | ファイル:行 | 現状値 | 必要値 |
|---:|---|---|---:|---:|
| 1 | 基本記録の最短操作量 | `CarSetup.tsx:1173-1185,1490-1590,1736-1783` | 34タップ、約32.4秒+ACK | 対象4種を1経路で記録できる操作量 |
| 2 | QuickEntryの対象外質問 | `src/lib/quickEntryFlow.ts:37-76` | 基本記録外5項目にも遷移/スキップが必要 | 基本記録4種だけの経路 |
| 3 | 環境/タイヤカード見出し | `CarSetup.tsx:1173-1183,1262-1271` | 高28px | 44px以上、推奨60px |
| 4 | QuickEntry閉じる | `QuickEntryModal.tsx:222-226` | 94×20px | 44×44px以上、推奨60×60px |
| 5 | 天候chip | `QuickEntryModal.tsx:96-116` | 高38px | 44px以上、推奨60px |
| 6 | 温冷切替 | `TirePressureScene.tsx:105-128` | 約96×26px | 44×44px以上、推奨60×60px |
| 7 | InputNumber | `StepNumber.tsx:120-145` | 高40〜42px | 44px以上、推奨60px |
| 8 | 4輪選択 | `TirePressureScene.tsx:157-181` | 72×56px | 推奨72×60px以上 |
| 9 | 増減ボタン | `StepNumber.tsx:94-119,151-175`; `index.css:8-12` | 44〜48×44px | 推奨60×60px |
| 10 | 下部アクション | `QuickEntryModal.tsx:232-248` | 高44〜46px | 推奨60px |
| 11 | Feedback Slider | `DrivingTab.tsx:62-72` | rail 234×12、handle 10×10、dot 8×8 | 操作領域高44px以上、推奨60px |
| 12 | 固定保存 | `CarSetup.tsx:1771-1783` | 84×52px | 推奨84×60px以上 |
| 13 | gray-400系コントラスト | `QuickEntryModal.tsx:118,138,223`; `TirePressureScene.tsx:132-180`; `DrivingTab.tsx:49` | 2.43〜5.78:1 | 7:1以上 |
| 14 | gray-500系コントラスト | `QuickEntryModal.tsx:98,126,145,224`; `TirePressureScene.tsx:102,200` | 4.06〜4.63:1 | 7:1以上 |
| 15 | blue-500ボタン | `CarSetup.tsx:1620`; `QuickEntryModal.tsx:245` | 白/青=3.68:1 | 7:1以上 |
| 16 | 圧力状態色 | `TirePressureScene.tsx:141-146,205-207` | 2.80〜5.92:1 | 7:1以上 |
| 17 | Slider色 | `index.css:471-509`; `DrivingTab.tsx:62-72` | 1.94〜4.91:1 | 7:1以上 |
| 18 | オフライン保存ACK待ち | `setupService.ts:100-105,215`; `CarSetup.tsx:608-621` | Promise未解決、成功表示なし | ローカル受付完了を即時表示 |
| 19 | draft端末永続化なし | `src/lib/setupDraft.ts:559-629` | reducerメモリのみ | 再起動可能なdraft保存/復元 |
| 20 | Firestore永続化失敗時の代替なし | `src/lib/firebase.ts:45-50` | warningのみ | ユーザー通知＋代替保存 |
| 21 | 上部固定操作の親指到達 | `TirePressureScene.tsx:105-128,157-181`; `QuickEntryModal.tsx:222-226` | y=12〜190 | y=281以降へ配置または下部操作を提供 |
