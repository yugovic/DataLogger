# 層1: 機械検査（ピット実用性オーディット）— 第2ラウンド

検査条件: iPhone 390×844 CSS px、片手親指、グローブ着用、直射日光10,000〜100,000 lux、通信2G相当〜完全断。  
検査日: 2026-07-29。代表入力値: 気温`25°C`、温間圧`FL/FR/RL/RR=220kPa`、ベストラップ`1:58.423`、フィーリング`N`。  
実測制約: in-app Browserの利用可能接続が0件で、`getBoundingClientRect()`による再実測は未実施。サイズは指定されたTailwind値、inline style、Ant Design指定、390px時のボックスモデルから算出した。自動幅で一意に確定できない箇所は「ブラウザ実測未確認」と明記する。

## 判定サマリ

| 検査項目 | 判定 | 根拠(一行) |
|---|---|---|
| 1. タップ数/所要秒数 | 不合格 | 有効な最短経路は34タップのまま。26〜29タップのQuickEntry経路は冷間未入力時に冷間へ記録し、指定された温間記録を完了しない。 |
| 2. ターゲットサイズ | 合格 | タスク操作の必須44×44px基準は全件合格。ただし直接入力の56×60、tab overflow約46×60、段ボタン約52×60はグローブ推奨60×60未達。 |
| 3. コントラスト比 | 不合格 | 文字の主要色は改善したが、境界、進捗rail、Ant active tab、dark時orange-300等が7:1未達。 |
| 4. 通信断の完走 | 不合格 | 通常の永続化成功時は1.2秒後に未同期表示まで進むが、永続化失敗時もqueued表示後にdraftを消去し、再起動後の同期を保証できない。 |
| 5. 親指到達域 | 不合格 | 下端から563px（y=281〜844）を自然到達域とすると、QuickEntryのFL/FR選択は概算y=174〜250で範囲外。温冷切替は存在せず、温間へ変更できない。 |

## 詳細

### 1. 総タップ数と推定所要秒数

#### 入力方式の比較

| 数値 | ステッパー/専用テンキー | OSキーボード直接入力 | グローブ条件の採用 |
|---|---:|---:|---|
| 気温25 | PitKeypad `2`,`5`,`次へ` = 3 | 入力欄、`2`,`5` = 3 + 出現待ち1.0秒 | PitKeypad。ただし自動気象成功時は0 |
| 温間220、1輪 | `+5`を4回 = 4 | 入力欄、`2`,`2`,`0` = 4 + 出現待ち1.0秒 | 60×60の`+5`を採用 |
| ベストラップ1:58.423 | PitKeypad数字6回 + `次へ` = 7 | 入力欄、記号面切替、8文字 = 10 + 出現待ち1.0秒 | PitKeypad |
| フィーリング1件 | 5択の段ボタン1回 | 該当なし | 段ボタン |

根拠: `PitKeypad`は数字を最大桁まで受け、ラップは数字列を`m:ss.mmm`へ整形する（`src/lib/pitKeypadInput.ts:11-50`）。各キー高64px（`src/components/setup/PitKeypad.tsx:25-26,61-125`）。直接入力側の`StepNumber`はcoarse pointer時に増減ボタンを60×60へ上書きする（`src/index.css:8-25`）。

#### コード上の短縮経路: 26〜29タップ。ただし基本記録タスクは未完了

自動気象成功時:

1. QuickEntry起動（1）
2. FL温間圧のつもりで`2`,`2`,`0`,`FL確定`（4）
3. FR 同4回（4）
4. RL 同4回（4）
5. RR 同4回（4）
6. ベストラップ`1`,`5`,`8`,`4`,`2`,`3`,`次へ`（7）
7. フィーリング`N`（1）
8. 固定`保存`（1）

合計`26タップ`。自動気象失敗時は先頭に気温`2`,`5`,`次へ`が加わり`29タップ`。

ただし、`initialTireMode`は冷間4輪が未入力なら`cold`を返し（`src/lib/quickEntryFlow.ts:92-98`）、`TirePressureScene`はその値を変更不能なstateとして保持する（`src/components/setup/TirePressureScene.tsx:69-79`）。新規セッションで冷間が空なら上記16タップは`before`へ入り、要求された温間`after`には入らない。温冷切替UIもない。したがって26〜29タップ経路は本監査の完了タップ数に採用しない。

参考時間:

- 自動気象成功: タップ`26×0.6=15.6秒`、遷移5回`1.5秒`、思考/照準12群`9.6秒`、queued判定最大`1.2秒`、計`27.9秒`
- 自動気象失敗: タップ`29×0.6=17.4秒`、遷移6回`1.8秒`、思考/照準15群`12.0秒`、queued判定最大`1.2秒`、計`32.4秒`

いずれも温間未記録なので判定対象外。

#### 有効な最短経路: 34タップ、約32.4秒 + 保存前読取/ACK

1. 環境カード見出しを展開（1）
2. 気温Inputをタップ、`2`,`5`（3）
3. 基本設定タブの温間FL `+5`を4回（4）
4. 温間FR `+5`を4回（4）
5. 温間RL `+5`を4回（4）
6. 温間RR `+5`を4回（4）
7. ラップカード見出しを展開（1）
8. ベストラップInputをタップ（1）
9. 記号面切替（1）
10. `1:58.423`の8文字（8）
11. ドライバーフィードバックtab（1）
12. `低速進入=N`段ボタン（1）
13. 固定`保存`（1）

合計`34タップ`。

時間:

- タップ: `34×0.6=20.4秒`
- キーボード出現: 気温・ラップの2回、`2×1.0=2.0秒`
- UI遷移: カード展開2、tab切替1、保存結果1、`4×0.3=1.2秒`
- 思考/照準: 11群、`11×0.8=8.8秒`
- 合計: `32.4秒 + T_pre-read + T_save`

`T_save`は書込開始後最大1.2秒で`queued`へ進む（`src/lib/offlineCommit.ts:37-71`）。ただし車両選択済みでは書込前に`getVehicle`があり（`src/services/setupService.ts:46-77,92`、`src/services/vehicleService.ts:212-226`）、キャッシュmiss時の所要時間はコードから定数化できない。

#### 現実的経路: 35タップ、約33.8秒 + 保存前読取/ACK

グローブでは60×60の`+5`を採用する。390pxで右端tabがoverflowへ入る場合、手順11を`overflow`→`ドライバーフィードバック`の2タップとし`35タップ`。

- タップ: `35×0.6=21.0秒`
- キーボード出現: `2.0秒`
- UI遷移: `1.2秒`
- 思考/照準: 12群、`9.6秒`
- 合計: `33.8秒 + T_pre-read + T_save`

4輪をキーボード直接入力する案はタップ数16で同じだが、キーボード出現4回ぶん`+4.0秒`となり、入力幅も56pxのため採用しない。

#### 前回との差分

| 比較 | 前回 | 今回 | 減少 |
|---|---:|---:|---:|
| 基本記録を実際に完了する最短 | 34 | 34 | **0手** |
| 現実的経路 | 47 | 35 | **12手** |
| QuickEntryの意図された操作量（参考、温間バグを除外できた場合） | 47 | 26〜29 | **18〜21手** |

### 2. 全操作ターゲットのサイズ列挙

390px幅でQuickEntryのgridは左右padding各12px、gap 8px×2なので1列`(390-24-16)/3=116.67px`。`col-span-2`は`241.33px`。

| 状態/要素 | 個数 | 算出CSSサイズ(px) | 44×44 | 60×60 | 根拠 |
|---|---:|---:|---|---|---|
| 環境カード展開見出し | 1 | 約310×60以上 | 合格 | 合格 | `CarSetup.tsx:1342-1346` |
| ラップカード展開見出し | 1 | 幅auto・高60以上 | 合格 | 高さ合格、幅は実測未確認 | `CarSetup.tsx:1669-1677` |
| QuickEntry起動 | 1 | 358×64 | 合格 | 合格 | `CarSetup.tsx:1794-1803` |
| PitKeypad数字1〜9 | 9 | 116.67×64 | 合格 | 合格 | `PitKeypad.tsx:61-75` |
| PitKeypad `0` | 1 | 241.33×64 | 合格 | 合格 | `PitKeypad.tsx:77-93` |
| PitKeypad backspace | 1 | 116.67×64 | 合格 | 合格 | `PitKeypad.tsx:95-103` |
| PitKeypad中断 | 1 | 116.67×64 | 合格 | 合格 | `PitKeypad.tsx:107-114` |
| PitKeypad確定/次へ | 1 | 241.33×64 | 合格 | 合格 | `PitKeypad.tsx:115-125` |
| FL/FR/RL/RR選択 | 4 | 76×76 | 合格 | 合格 | `TirePressureScene.tsx:181-214` |
| 前回値を使う（条件付き） | 1 | 幅auto×60以上 | 合格 | 高さ合格、幅は実測未確認 | `TirePressureScene.tsx:169-177` |
| QuickEntryフィーリング5択 | 5 | 366×64 | 合格 | 合格 | `QuickEntryModal.tsx:196-214` |
| QuickEntryフィーリング中断 | 1 | 366×64 | 合格 | 合格 | `QuickEntryModal.tsx:215-222` |
| 温間`−5/−1/+1/+5` | 各輪4 | 60×60以上 | 合格 | 合格 | `StepNumber.tsx:94-175`; `index.css:8-14` |
| 温間InputNumber | 4 | 56×60以上 | 合格 | **不合格** | `BasicInfoTab.tsx:203-223`; `index.css:15-25` |
| 気温Input | 1 | 約147×60以上 | 合格 | 合格 | `CarSetup.tsx:1388-1395`; `index.css:20-25` |
| ベストラップInput | 1 | 約310×60以上 | 合格 | 合格 | `CarSetup.tsx:1763-1769`; `index.css:20-25` |
| Tabs各tab | 4 | 幅auto×60以上 | 合格 | 幅は一部実測未確認 | `CarSetup.tsx:1808-1925`; `index.css:30-33` |
| Tabs overflow | 1 | 約46×60 | 合格 | **不合格** | Ant Tabs + `index.css:30-33`; 幅は前回実測46 |
| DrivingTab各段ボタン | 5/行 | 約52.4×60 | 合格 | **不合格** | `DrivingTab.tsx:69-89`; 278px内、gap計16px |
| DrivingTabクリア（値入力後表示） | 1 | 幅auto×44以上 | 合格 | **不合格** | `DrivingTab.tsx:57-65` |
| 固定`直近を複製` | 1 | 前回幅約128×60以上 | 合格 | 合格 | `CarSetup.tsx:1931-1944` |
| 固定`保存` | 1 | 前回幅約84×60以上 | 合格 | 合格 | `CarSetup.tsx:1945-1958` |
| 下書き復元/破棄（再起動時） | 2 | 各約171×60 | 合格 | 合格 | `CarSetup.tsx:1167-1187` |

44×44未満: **なし**。  
60×60推奨未達: 温間InputNumber幅56、Tabs overflow幅約46、DrivingTab段ボタン幅約52、クリア高44。自動幅のラップ見出し、前回値ボタン、tab幅はブラウザ実測未確認。

### 3. 屋外照度でのコントラスト比

WCAG相対輝度式`(L1+0.05)/(L2+0.05)`、Tailwind 3既定RGBを使用。7:1未満を不合格とした。文字サイズによる緩和は行わない。

#### 7:1未達の全組合せ（基本記録経路）

| 使用箇所 | 前景RGB | 背景RGB | 比率 | L/D | ファイル:行 |
|---|---:|---:|---:|---|---|
| Key境界`gray-400`/white | 156,163,175 | 255,255,255 | 2.54:1 | L | `PitKeypad.tsx:46-49` |
| Key境界`gray-500`/gray-700 | 107,114,128 | 55,65,81 | 約1.31:1 | D | `PitKeypad.tsx:46-49`; `index.css:565-570` |
| 中断境界`gray-500`/white | 107,114,128 | 255,255,255 | 4.83:1 | L | `PitKeypad.tsx:107-111` |
| 中断境界`gray-400`/gray-700 | 156,163,175 | 55,65,81 | 4.06:1 | D | `PitKeypad.tsx:107-111` |
| 進捗rail`gray-300`/gray-50 | 209,213,219 | 249,250,251 | 1.41:1 | L | `QuickEntryModal.tsx:237-243` |
| 進捗rail`gray-600`/gray-900 | 75,85,99 | 17,24,39 | 2.35:1 | D | 同上 |
| 進捗`blue-800`/gray-300 | 30,64,175 | 209,213,219 | 5.92:1 | L | 同上 |
| 非選択輪境界`gray-500`/white | 107,114,128 | 255,255,255 | 4.83:1 | L | `TirePressureScene.tsx:189-198` |
| 選択ring`blue-300`/gray-50 | 147,197,253 | 249,250,251 | 約1.66:1 | L | `TirePressureScene.tsx:193-196` |
| 車体輪郭`gray-500`/gray-50 | 107,114,128 | 249,250,251 | 約4.63:1 | L | `TirePressureScene.tsx:182-183` |
| dark警告`orange-300`/gray-700輪 | 253,186,116 | 55,65,81 | 6.11:1 | D | `PitKeypad.tsx:17-18`; `TirePressureScene.tsx:201-208` |
| 前回値`blue-300`/gray-700 | 147,197,253 | 55,65,81 | 5.72:1 | D | `TirePressureScene.tsx:169-177` |
| disabled確定 白/gray-500 | 255,255,255 | 107,114,128 | 4.83:1 | L/D | `PitKeypad.tsx:115-122` |
| カードicon`blue-500`/white | 59,130,246 | 255,255,255 | 3.68:1 | L | `CarSetup.tsx:1348,1445,1671` |
| カードicon`blue-400`/gray-800 | 96,165,250 | 31,41,55 | 5.77:1 | D | 同上 |
| gray-400 chevron/white | 156,163,175 | 255,255,255 | 2.54:1 | L | `CarSetup.tsx:1450,1676` |
| gray-400/gray-800 | 156,163,175 | 31,41,55 | 5.78:1 | D | 同上、`index.css:582-584` |
| Ant Input境界`#d9d9d9`/white | 217,217,217 | 255,255,255 | 約1.41:1 | L | `CarSetup.tsx:1388-1395,1763-1769`; Ant default |
| StepNumber単位`gray-400`/blue-50 | 156,163,175 | 239,246,255 | 約2.38:1 | L | `StepNumber.tsx:146-149`; `BasicInfoTab.tsx:203-223` |
| StepNumber単位`gray-400`/gray-700 | 156,163,175 | 55,65,81 | 4.06:1 | D | 同上、`index.css:582-584` |
| Ant active tab`#1677ff`/white | 22,119,255 | 255,255,255 | 約4.10:1 | L | `CarSetup.tsx:1925`; Ant default |
| dark active tab`blue-500`/gray-800 | 59,130,246 | 31,41,55 | 3.99:1 | D | `index.css:102-116` |
| 段ボタン境界`gray-500`/white | 107,114,128 | 255,255,255 | 4.83:1 | L | `DrivingTab.tsx:73-84` |
| 段ボタン境界`gray-400`/gray-700 | 156,163,175 | 55,65,81 | 4.06:1 | D | 同上 |
| `text-xs gray-500`凡例/white | 107,114,128 | 255,255,255 | 4.83:1 | L | `DrivingTab.tsx:137-140` |
| `text-xs gray-400`凡例/gray-800 | 156,163,175 | 31,41,55 | 5.78:1 | D | 同上 |

主要合格例:

- `gray-900`/`gray-50` = 16.98:1
- `gray-700`/`gray-50` = 9.86:1
- white/`blue-800` = 8.72:1
- `green-800`/white = 7.13:1
- `orange-800`/white = 7.31:1
- `gray-200`/`gray-700` = 8.33:1
- `green-300`/`gray-700` = 7.34:1
- white/`gray-900`保存ボタン = 17.74:1

`text-[10px]`は基本記録の直接経路にはない。`text-xs`はStepNumber、tab内段ボタン、凡例に存在し、色が7:1未達なら不合格のままとした。

### 4. 通信断シナリオの完走判定

**二値判定: 完走しない。**

標準のIndexedDB永続化が成功し、保存前読取がcache hitする場合だけは完走する:

1. 固定保存が`handleSave`を呼び、`isSaving=true`（`CarSetup.tsx:641-652`）。
2. 呼出側は`await saveSetup`/`await updateSetup`する（`CarSetup.tsx:728-747`）。
3. サービスは生の`setDoc`/`updateDoc`を`commitWithoutBlocking`へ渡す（`src/services/setupService.ts:102-122,225-243`）。
4. Firestore Web SDKの書込Promiseがオフラインで未解決でも、1.2秒で`queued`を返す（`src/lib/offlineCommit.ts:37-71`）。
5. 呼出側は「端末に保存しました（電波が戻ったら自動で送信します）」を表示し、未同期badgeを立てる（`CarSetup.tsx:718-747,1150-1158`; `src/i18n/resources.ts:269-271`）。
6. `finally`へ到達しspinnerを解除する（`CarSetup.tsx:878-881`）。

したがって、前回の「サーバーACK待ちで無言ハング」は解消している。

不合格根拠:

- 書込前に`resolveVehicleProfileSnapshot`が`await getVehicle`する（`setupService.ts:46-77,92`）。cache missの完全断では書込キューへ到達せずエラーになり得る。
- Firestoreは`persistentLocalCache`で初期化するが、失敗時はmemory cacheへfallbackする（`src/lib/firebase.ts:45-78`）。
- `isPersistenceEnabled=false`はexportされるだけで`CarSetup.tsx`から参照されていない。コメントにある「UI側で正直に出す」は未接続。
- memory fallbackでも`commitWithoutBlocking`は1.2秒後に`queued`を返すため、UIは「端末に保存」と表示する。
- その後`clearDraft`を無条件実行する（`CarSetup.tsx:853-858`）。memory queueはアプリ終了で失われ、localStorage draftも消えるため、再起動後に復帰・同期できない。

下書き自体は入力変更から800ms後にlocalStorageへ保存し（`CarSetup.tsx:341-363`、`src/lib/draftStorage.ts:54-79`）、再起動時に明示確認後復元できる（`CarSetup.tsx:349-354,1159-1188`）。ただしqueuedを保存成功扱いした直後に消去するため、永続化失敗ケースの保険にはならない。

### 5. 片手親指の到達範囲

自然到達域を画面下端から上方向2/3と定義する。`844×2/3=562.7px`なので、viewport座標`y=281〜844px`を自然到達域、`y=0〜280px`を持ち替え域とする。対象box全体が自然域内にあることを合格条件とした。

QuickEntryの進捗帯は概算38px、PitKeypadは5行×64 + 4gap×8 + bottom padding12 = 364pxで、下端832px、上端468〜480pxとなる。TirePressureSceneは上部表示約128px、4輪図188px+上下margin16px、残りをauto marginに使う。

| 主要操作 | 390×844概算y範囲 | 判定 |
|---|---:|---|
| QuickEntry起動 | ページスクロール依存 | スクロール後に範囲内 |
| PitKeypad数字/削除/確定/中断 | 約480〜832 | 範囲内 |
| FL選択 | 約174〜250 | **範囲外** |
| FR選択 | 約174〜250 | **範囲外** |
| RL選択 | 約286〜362 | 範囲内 |
| RR選択 | 約286〜362 | 範囲内 |
| 温冷モード切替 | 要素なし | **操作不能** |
| QuickEntryフィーリング5択/中断 | 約408〜832 | 範囲内 |
| 直接経路の温間増減/Input | ページスクロール依存 | スクロール後に範囲内 |
| Tabs/overflow/段ボタン | ページスクロール依存 | スクロール後に範囲内 |
| 固定保存 | 約760〜820 | 範囲内 |
| 固定直近複製 | 約760〜820 | 範囲内 |
| 下書き復元/破棄 | ページ上部、スクロール可能 | 初期位置は実測未確認 |

自動前進だけなら輪選択を押さずに入力できる。しかし誤入力修正でFL/FRを選び直す操作は到達域外。さらにモード切替が存在せず、冷間未入力の新規セッションでは親指位置に関係なく温間へ切替不能。

## 不合格項目の一覧（修正対象）

| # | 項目 | ファイル:行 | 現状値 | 必要値 |
|---:|---|---|---|---|
| 1 | QuickEntryの記録モード | `src/lib/quickEntryFlow.ts:92-98`; `TirePressureScene.tsx:69-79` | 冷間空欄ならcold固定 | ピット基本記録はhot、または60px以上の温冷切替 |
| 2 | 有効な最短操作量 | `CarSetup.tsx:1342-1395,1669-1769,1925-1958` | 34タップ、前回比0手 | 4種をQuickEntryだけで26〜29タップ以内 |
| 3 | 温間InputNumber幅 | `BasicInfoTab.tsx:203-223` | 56×60px | 推奨60×60px以上 |
| 4 | Tabs overflow幅 | `CarSetup.tsx:1925`; `index.css:30-33` | 約46×60px | 推奨60×60px以上 |
| 5 | DrivingTab段ボタン幅 | `DrivingTab.tsx:69-89` | 約52×60px | 推奨60×60px以上 |
| 6 | QuickEntry key境界 | `PitKeypad.tsx:46-49,107-111` | 1.31〜4.83:1 | 7:1以上 |
| 7 | QuickEntry進捗rail/track | `QuickEntryModal.tsx:237-243` | 1.41〜5.92:1 | 7:1以上 |
| 8 | 4輪図の境界/ring | `TirePressureScene.tsx:181-214` | 約1.31〜4.83:1 | 7:1以上 |
| 9 | dark警告色 | `PitKeypad.tsx:17-18`; `TirePressureScene.tsx:201-208` | orange-300/gray-700=6.11:1 | 7:1以上 |
| 10 | disabled確定 | `PitKeypad.tsx:115-122` | 白/gray-500=4.83:1 | 7:1以上 |
| 11 | カードicon/chevron | `CarSetup.tsx:1348,1450,1671-1676` | 2.54〜5.78:1 | 7:1以上 |
| 12 | Input境界 | `CarSetup.tsx:1388-1395,1763-1769` | 約1.41:1 | 7:1以上 |
| 13 | StepNumber単位 | `StepNumber.tsx:146-149` | 2.38〜4.06:1 | 7:1以上 |
| 14 | active tab | `CarSetup.tsx:1925`; `index.css:102-116` | 3.99〜4.10:1 | 7:1以上 |
| 15 | DrivingTab境界/凡例 | `DrivingTab.tsx:69-89,137-140` | 4.06〜5.78:1 | 7:1以上 |
| 16 | 保存前の車両読取 | `setupService.ts:46-77,92`; `vehicleService.ts:212-226` | 書込前にgetDocをawait | 完全断でもcache missで書込キューへ到達 |
| 17 | 永続化失敗時の誤ったqueued完了 | `src/lib/firebase.ts:58-78`; `offlineCommit.ts:37-71`; `CarSetup.tsx:728-747` | memory fallbackでも「端末に保存」 | 永続化可否を保存結果/UIへ反映 |
| 18 | queued後のdraft消去 | `CarSetup.tsx:853-858`; `draftStorage.ts:104-115` | outcomeに関係なくclear | queuedかつ永続化なしではdraft保持 |
| 19 | FL/FR親指到達 | `TirePressureScene.tsx:181-214` | 概算y=174〜250 | box全体をy=281以降へ |

## 検証

- `npm run typecheck`: 成功
- `npx vitest run src/lib/quickEntryFlow.test.ts src/lib/pitKeypadInput.test.ts src/lib/offlineCommit.test.ts src/lib/draftStorage.test.ts`: 4 files / 58 tests成功
- ブラウザ実測: 未確認（利用可能なbrowser接続0件）
