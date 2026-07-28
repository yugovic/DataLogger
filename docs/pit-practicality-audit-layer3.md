# 層1: 機械検査（ピット実用性オーディット）— 第3ラウンド

検査条件: iPhone 390×844 CSS px、片手親指、グローブ着用、直射日光10,000〜100,000 lux、通信2G相当〜完全断。  
検査日: 2026-07-29。代表入力値: 気温`25°C`、温間圧`FL/FR/RL/RR=220kPa`、ベストラップ`1:58.423`、フィーリング`N`。

確認済みコード: `CarSetup.tsx`、`src/components/setup/QuickEntryModal.tsx`、`TirePressureScene.tsx`、`PitKeypad.tsx`、`StepNumber.tsx`、`DrivingTab.tsx`、`BasicInfoTab.tsx`、`src/index.css`、`src/services/setupService.ts`、`src/lib/firebase.ts`、`offlineCommit.ts`、`pitTheme.ts`、`setupDraft.ts`、`draftStorage.ts`、`quickEntryFlow.ts`、`pitKeypadInput.ts`、`src/schemas/setupSchema.ts`、過去2監査文書。未確認の指定ファイルはない。

実測制約: 接続済みブラウザによる`getBoundingClientRect()`実測は未実施。寸法とviewport上のy座標は、Tailwind既定値、inline style、Ant Design指定、CSS box model、および390×844の固定viewportから算出した。文字列内容で幅が変わる`auto`幅だけは「幅実測未確認」と明記する。

## 判定サマリ

| 検査項目 | 判定 | 根拠(一行) |
|---|---|---|
| 1. タップ数/所要秒数 | 不合格 | 温間質問が出る条件では26〜29タップまで短縮したが、冷間4輪だけが入力済みだと温間質問を省略し、基本記録タスクを完了しない。 |
| 2. ターゲットサイズ | 不合格 | QuickEntry本体は全操作60px以上だが、カードのクリック可能サマリーは高さ28px/52px、DrivingTabのクリアは44pxである。 |
| 3. コントラスト比 | 不合格 | `pitTheme.ts`の登録ペア自体は全て7:1以上だが、実画面の背景との未登録組合せ、進捗fill/rail、カードchevron、保存後警告等が7:1未満である。 |
| 4. 通信断の完走 | 不合格 | 永続キャッシュ有効時は1.2秒でqueued完了するが、永続化なしでは保存未完了であり、保持したdraftも再起動復元時に`sessionDate`が文字列化して画面処理を完走できない。 |
| 5. 親指到達域 | 不合格 | 4輪選択はy=284以降、テンキーはy=480以降へ移動したが、条件付きの「前回値を使う」は上部表示帯y<281に残る。 |

## 詳細

### 1. 総タップ数と推定所要秒数

#### 温間記録経路のコード判定

- `TirePressureScene`は受け取る値を`hot`だけに限定し、確定関数も`onChangeHot`だけを呼ぶ（`src/components/setup/TirePressureScene.tsx:28-37,54-72,101-112`）。
- 呼出側は`hot`へ各輪の`after`を渡し、`onChangeHot`で常に`after`を書き換える（`src/components/setup/QuickEntryModal.tsx:146-155`）。
- よって、**TirePressureSceneが表示された後の入力は必ず温間`after`へ入り、冷間`before`への誤記録はない**。
- ただし起動判定は各輪について`after !== '' || before !== ''`を「入力済み」とする（`src/components/setup/QuickEntryModal.tsx:54-55`）。`CarSetup`側も`after`が全輪空なら`before`を表示モードにし、その4輪が埋まっていればQuickEntryを不要扱いする（`CarSetup.tsx:329-331,439-442`）。したがって、冷間4輪入力済み・温間4輪空欄のセッションでは温間質問が出ず、基本記録タスクは未完了になる。

#### 数値入力方式

| 記録値 | ステッパー連打 | キーボード直接入力 | PitKeypad | グローブ条件で採用 |
|---|---:|---:|---:|---|
| 気温25 | 対象ステッパーなし | 入力欄1+`2`,`5`=3タップ、キーボード待ち1.0秒 | `2`,`5`,`次へ`=3タップ、待ちなし | PitKeypad |
| 温間220、1輪 | 初期基準200から`+5`×4=4タップ | 入力欄1+`2`,`2`,`0`=4タップ、1輪ごとに待ち1.0秒 | `2`,`2`,`0`,`輪確定`=4タップ、待ちなし | PitKeypad |
| ベストラップ1:58.423 | 対象ステッパーなし | 入力欄1+記号面切替1+8文字=10タップ、待ち1.0秒 | `1`,`5`,`8`,`4`,`2`,`3`,`次へ`=7タップ | PitKeypad |
| フィーリングN | 5択ボタン1回 | 該当なし | 5択ボタン1回 | 5択ボタン |

根拠: PitKeypadは空気圧を最大3桁、ラップを最大7桁まで受け、ラップ数字列を`m:ss.mmm`へ整形する（`src/components/setup/QuickEntryModal.tsx:131-139,174-182`; `src/lib/pitKeypadInput.ts:11-50,65-74`）。直接経路の`StepNumber`はcoarse pointerでボタン60×60、入力高60pxとなる（`src/index.css:8-25`）。

#### 最短経路: 26タップ、約27.9秒

前提: 気温が自動取得済み、温間4輪が空欄でQuickEntryのタイヤ質問が表示される。

1. QuickEntry起動（1）
2. FL温間: `2`,`2`,`0`,`FLを確定`（4）
3. FR温間: `2`,`2`,`0`,`FRを確定`（4）
4. RL温間: `2`,`2`,`0`,`RLを確定`（4）
5. RR温間: `2`,`2`,`0`,`RRを確定`（4）
6. ベストラップ: `1`,`5`,`8`,`4`,`2`,`3`,`次へ`（7）
7. フィーリング`N`（1）
8. 固定`保存`（1）

合計: `1+16+7+1+1=26タップ`。

時間積算: タップ`26×0.6=15.6秒`、画面遷移5回`5×0.3=1.5秒`、思考/照準12群`12×0.8=9.6秒`、合計`26.7秒`。完全断時のqueued/unsafe判定最大`1.2秒`を加えて**約27.9秒**。

#### 現実的経路: 29タップ、約32.4秒

通信条件が2G相当〜完全断なのでautoWeather失敗を採用し、最初に気温`2`,`5`,`次へ`（3）を追加する。

合計: `3+26=29タップ`。  
時間積算: タップ`29×0.6=17.4秒`、画面遷移6回`1.8秒`、思考/照準15群`12.0秒`、queued/unsafe判定`1.2秒`、合計**約32.4秒**。

4輪をOSキーボードで直接入力する場合も1輪4タップで操作数は同じだが、キーボード出現4回で`+4.0秒`となる。さらに気温とラップでも`+2.0秒`の出現待ちがあるため、グローブ条件では採用しない。

#### 第2ラウンドとの差分

| 比較 | 第2ラウンド | 第3ラウンド | 減少 |
|---|---:|---:|---:|
| 基本記録を完了できる最短（温間質問が表示される条件） | 34 | 26 | **8手減** |
| 現実的経路 | 35 | 29 | **6手減** |
| QuickEntry自体の操作量 | 26〜29（冷間へ誤記録するため無効） | 26〜29（表示時は温間へ記録） | 0手 |

操作量は短縮したが、冷間4輪だけが埋まった状態で温間質問を省略するため、項目1の総合判定は不合格とする。

### 2. 全操作ターゲットのサイズ列挙

390px幅でQuickEntry keypadは左右padding各12px、列gap 8px×2である。1列幅は`(390-24-16)/3=116.67px`、2列spanは`116.67×2+8=241.33px`。coarse pointerのAnt入力・ボタンは`src/index.css:8-38`を適用する。

| 経路/要素 | 個数 | 算出CSSサイズ(px) | 44×44 | 60×60 | 根拠 |
|---|---:|---:|---|---|---|
| QuickEntry起動 | 1 | 358×64 | 合格 | 合格 | `CarSetup.tsx:1807-1816` |
| PitKeypad数字1〜9 | 9 | 116.67×64 | 合格 | 合格 | `PitKeypad.tsx:44-58` |
| PitKeypad `0` | 1 | 241.33×64 | 合格 | 合格 | `PitKeypad.tsx:60-76` |
| PitKeypad backspace | 1 | 116.67×64 | 合格 | 合格 | `PitKeypad.tsx:78-86` |
| PitKeypad中断 | 1 | 116.67×64 | 合格 | 合格 | `PitKeypad.tsx:88-97` |
| PitKeypad確定/次へ | 1 | 241.33×64 | 合格 | 合格 | `PitKeypad.tsx:98-108` |
| FL/FR/RL/RR選択 | 4 | 76×76 | 合格 | 合格 | `TirePressureScene.tsx:175-206` |
| 前回値を使う（条件付き） | 1 | 幅auto×60以上 | 高さ合格、幅実測未確認 | 高さ合格、幅実測未確認 | `TirePressureScene.tsx:163-171` |
| QuickEntryフィーリング5択 | 5 | 366×64 | 合格 | 合格 | `QuickEntryModal.tsx:195-213` |
| QuickEntryフィーリング中断 | 1 | 366×64 | 合格 | 合格 | `QuickEntryModal.tsx:214-221` |
| 固定`保存` | 1 | 幅auto×60以上（min-content約94） | 合格 | 高さ合格、幅は文言依存 | `CarSetup.tsx:1958-1971` |
| 環境カード見出し | 1 | 310×60以上 | 合格 | 合格 | `CarSetup.tsx:1355-1367` |
| タイヤカード見出し | 1 | 310×60以上 | 合格 | 合格 | `CarSetup.tsx:1452-1464` |
| ラップカード見出し | 1 | 幅auto×60以上 | 合格 | 高さ合格、幅実測未確認 | `CarSetup.tsx:1681-1690` |
| 環境カードのクリック可能サマリー | 1 | 310×28概算 | **不合格** | **不合格** | text-sm line-height20+py-1上下8、`CarSetup.tsx:1375-1393` |
| タイヤカードのクリック可能サマリー | 1 | 310×52 | 合格 | **不合格** | 内部ミニカー`h-[52px]`が高さを決定、`CarSetup.tsx:1465-1516` |
| ラップカードのクリック可能サマリー | 1 | 310×28概算 | **不合格** | **不合格** | text-sm line-height20+py-1上下8、`CarSetup.tsx:1718-1732` |
| 気温Input（直接経路） | 1 | 147×60以上 | 合格 | 合格 | 310pxの2列・gap16、`CarSetup.tsx:1406-1415`; `index.css:20-25` |
| ベストラップInput（直接経路） | 1 | 310×60以上 | 合格 | 合格 | `CarSetup.tsx:1772-1782`; `index.css:20-25` |
| 温間`−5/−1/+1/+5`（直接経路） | 各輪4 | 60×60以上 | 合格 | 合格 | `StepNumber.tsx:94-175`; `index.css:8-14` |
| 温間InputNumber（直接経路） | 4 | 72×60以上 | 合格 | 合格 | `BasicInfoTab.tsx:203-223`; `index.css:15-25` |
| Tabs各tab | 4 | 幅auto×60以上 | 高さ合格 | 高さ合格、幅実測未確認 | `CarSetup.tsx:1834-1939`; `index.css:30-33` |
| Tabs overflow | 1 | 60×60以上 | 合格 | 合格 | `index.css:34-38` |
| DrivingTab各段ボタン | 5/行 | 最小60×60、狭幅時wrap | 合格 | 合格 | `DrivingTab.tsx:70-90` |
| DrivingTabクリア（値入力後） | 1 | 幅auto×44以上 | 合格 | **不合格** | `DrivingTab.tsx:58-66` |
| 下書き復元/破棄 | 2 | 各約171×60 | 合格 | 合格 | `CarSetup.tsx:1180-1202` |

**44×44未満の全件**: 環境カードのクリック可能サマリー、ラップカードのクリック可能サマリー。  
**60×60推奨未達の全件**: 上記2件、タイヤカードのクリック可能サマリー、DrivingTabクリア。auto幅要素の幅はブラウザ実測未確認である。

### 3. 屋外照度でのコントラスト比

計算式はWCAG相対輝度`L=0.2126R+0.7152G+0.0722B`、比率`(L1+0.05)/(L2+0.05)`。Tailwind 3の実RGBを使用し、文字サイズによる緩和はせず7:1を合格線とした。

#### `pitTheme.ts`登録値の検算

| 前景/背景 | RGB | 検算比 | 判定 |
|---|---|---:|---|
| gray-900 / white | 17,24,39 / 255,255,255 | 17.74:1 | 合格 |
| gray-700 / white | 55,65,81 / 255,255,255 | 10.31:1 | 合格 |
| blue-800 / white | 30,64,175 / 255,255,255 | 8.72:1 | 合格 |
| green-800 / white | 22,101,52 / 255,255,255 | 7.13:1 | 合格 |
| orange-800 / white | 154,52,18 / 255,255,255 | 7.31:1 | 合格 |
| white / blue-800 | 255,255,255 / 30,64,175 | 8.72:1 | 合格 |
| white / gray-700 | 255,255,255 / 55,65,81 | 10.31:1 | 合格 |
| gray-50 / gray-700 | 249,250,251 / 55,65,81 | 9.86:1 | 合格 |
| gray-200 / gray-700 | 229,231,235 / 55,65,81 | 8.33:1 | 合格 |
| blue-200 / gray-700 | 191,219,254 / 55,65,81 | 7.25:1 | 合格 |
| green-300 / gray-700 | 134,239,172 / 55,65,81 | 7.34:1 | 合格 |
| orange-200 / gray-700 | 254,215,170 / 55,65,81 | 7.62:1 | 合格 |

`src/lib/pitTheme.ts:13-50`に登録された全ペアは正しい。ただし、同ファイルのテスト対象は白/gray-700面だけであり、実際のQuickEntry全画面背景`gray-50`/`gray-900`や進捗fill/railの組合せを網羅していない。

#### 7:1未達の全組合せ（基本記録経路と直接入力代替）

| 使用箇所 | 前景RGB | 背景RGB | 比率 | L/D | ファイル:行 |
|---|---:|---:|---:|---|---|
| QuickEntry進捗fill `blue-800` / rail `gray-700` | 30,64,175 | 55,65,81 | 1.18:1 | L | `QuickEntryModal.tsx:240-242` |
| QuickEntry進捗fill `blue-200` / rail `gray-200` | 191,219,254 | 229,231,235 | 1.15:1 | D | 同上 |
| 大型圧力表示・範囲内 `green-800` / 画面`gray-50` | 22,101,52 | 249,250,251 | 6.82:1 | L | `TirePressureScene.tsx:123-142`; `QuickEntryModal.tsx:234` |
| 大型圧力表示・警告 `orange-800` / 画面`gray-50` | 154,52,18 | 249,250,251 | 6.99:1 | L | 同上 |
| 未同期/永続化不可bannerの文字・border `orange-800` / `orange-50` | 154,52,18 | 255,247,237 | 6.88:1 | L | `CarSetup.tsx:1154-1169` |
| タイヤカードchevron `gray-400` / white | 156,163,175 | 255,255,255 | 2.54:1 | L | `CarSetup.tsx:1463` |
| タイヤカードchevron `gray-400` / gray-800 | 156,163,175 | 31,41,55 | 5.78:1 | D | 同上、`index.css:615-617` |
| ラップカードchevron `gray-400` / white | 156,163,175 | 255,255,255 | 2.54:1 | L | `CarSetup.tsx:1689` |
| ラップカードchevron `gray-400` / gray-800 | 156,163,175 | 31,41,55 | 5.78:1 | D | 同上、`index.css:615-617` |
| ラップInput label `gray-400` / gray-800 | 156,163,175 | 31,41,55 | 5.78:1 | D | `CarSetup.tsx:1775,1785`; `index.css:615-617` |
| 温間ラベル`text-xs gray-500` / blue-50 | 107,114,128 | 239,246,255 | 4.44:1 | L | `BasicInfoTab.tsx:203-206,249` |
| 温間ラベル`gray-400` / dark blue panel概算31,44,72 | 156,163,175 | 31,44,72 | 5.47:1 | D | 同上、`index.css:611-617` |
| StepNumber/Ant default button border `#d9d9d9` / light面 | 217,217,217 | 255,255,255 | 1.41:1 | L | `StepNumber.tsx:94-175`; Ant default |
| dark StepNumber button border`gray-600` / gray-700 | 75,85,99 | 55,65,81 | 1.29:1 | D | `index.css:242-250` |
| dark Input focus border`blue-500` / gray-700 | 59,130,246 | 55,65,81 | 2.80:1 | D | `index.css:76-83,326-329` |

`text-[10px]`は基本記録の主経路にはない。`text-xs`はカード件数、温間ラベル、段ボタン等に存在するが、本監査ではサイズによる基準緩和をしていない。

検証コマンド`npm test -- --run src/lib/pitTheme.test.ts src/lib/offlineCommit.test.ts`は37件中1件失敗した。失敗は`PIT.surfaceActive`の`dark:active:bg-gray-600`を禁止文字列として検出したもの。ただし実際の`gray-50/gray-600`は7.23:1で、当該文字色との組合せ自体は合格する。テストの禁止色判定が用途を区別していない。

### 4. 通信断シナリオの完走判定

**二値判定: 完走しない。**

#### 永続キャッシュが有効な環境

1. 固定保存が`handleSave`を呼び、呼出側は`await saveSetup`/`await updateSetup`する（`CarSetup.tsx:641-653,733-741`）。
2. 車両snapshot取得は`await getVehicle`するが、圏外失敗をcatchしてsnapshotなしで保存を続行する（`src/services/setupService.ts:47-77`）。
3. サービスは生の`setDoc`/`updateDoc` Promiseを`commitWithoutBlocking`へ渡す（`setupService.ts:99-135,225-257`）。
4. Firestore Web SDKの書込PromiseがオフラインでサーバーACK待ちのまま解決しなくても、最大1.2秒で`queued`を返す（`src/lib/offlineCommit.ts:44-84`）。
5. UIは「端末に保存しました（電波が戻ったら自動で送信します）」を表示し、未同期badgeを出し、spinnerを解除する（`CarSetup.tsx:743-750,882-885,1154-1161`; `src/i18n/resources.ts:269,273`）。
6. Firestoreは`persistentLocalCache`+`persistentMultipleTabManager`で初期化されるため、mutation queueは再起動後も残り、電波回復後に同期対象となる（`src/lib/firebase.ts:45-78`）。

この条件だけなら、無言ハングせず**完走する**。

#### 永続キャッシュが使えない環境

1. Firebaseはmemory cacheへfallbackし、`isPersistenceEnabled=false`にする（`src/lib/firebase.ts:60-75`）。
2. `commitWithoutBlocking`はtimeout時に`queued`でなく`unsafe`を返す（`src/lib/offlineCommit.ts:51-54,71-78`）。
3. UIは「まだどこにも保存できていません」と10秒表示し、localStorage draftを消さない（`CarSetup.tsx:743-746,856-862`; `src/i18n/resources.ts:270`）。重点項目「unsafeとなり、下書きが消えない」はコード上成立する。
4. ただし`setPendingSync(saveOutcome !== 'synced')`はunsafeでもtrueにし、常設badgeは「電波が戻ると自動で送信します」と表示する（`CarSetup.tsx:743,1154-1161`; `resources.ts:273`）。memory queueはアプリ終了で失われるため、このbadge文言はunsafeの実態と一致しない。
5. unsafeでも`resetBaseline`し、新規保存なら生成済みIDのURLへ遷移する（`CarSetup.tsx:856-870`）。保存完了ではないのに画面状態は保存済み側へ移る。

この条件では**保存完了しない**。

#### アプリ終了後のdraft復帰

- 入力変更は800ms後にlocalStorageへ保存され、起動後に復元/破棄を選べる（`CarSetup.tsx:342-364,1172-1203`; `src/lib/draftStorage.ts:54-115`）。
- unsafe時は`clearDraft`を呼ばないため、入力値のJSON自体は残る（`CarSetup.tsx:860-862`）。
- しかし`saveDraft`は`SetupDraft.sessionDate: Date`をJSON.stringifyし、`loadDraft`はJSON.parse後にDateへ戻さない（`src/lib/draftStorage.ts:58-79,86-101`; `src/lib/setupDraft.ts:53-60`）。
- 復元ボタンはその値をそのまま`replaceDraft`する（`CarSetup.tsx:1181-1186`）。直後の描画で`toLocalDatetimeInput(sessionDate)`が`getFullYear()`等を呼ぶため、文字列化したsessionDateでは処理不能である（`CarSetup.tsx:81-84,1218-1221`）。
- 仮に描画を通しても保存スキーマは`date: z.date()`を要求する（`src/schemas/setupSchema.ts:176-185`）。

したがって、draftは「消えない」が、現行コードのままでは**再起動後に復元して再保存する完走経路にならない**。通信断の総合二値判定は不合格である。

### 5. 片手親指の到達範囲

自然到達域を画面下端から上方向2/3と定義する。`844×2/3=562.7px`なので、viewport座標**y=281〜844px**を自然到達域、**y=0〜280px**を持ち替え域とする。ターゲットbox全体がy=281以降にあることを合格条件とした。

#### TirePressureSceneの算出

- 進捗帯: top padding8 + text-sm line-height20 + margin4 + rail6 = 38px。
- body高さ: `844-38=806px`。
- keypad: 5行×64 + 4gap×8 + bottom padding12 = 364px。
- 4輪図: margin上下8×2 + box188 = 204px。
- 上部表示帯: `806-364-204=238px`（指定minHeight232を上回る）。
- 4輪box上端: `38+238+8=284px`。
- keypad上端: `284+188+8=480px`。

よって4輪選択ボタンとテンキーは要求されたy>=281に入る。

| 主要操作 | 390×844算出y範囲(px) | 判定 |
|---|---:|---|
| QuickEntry起動 | ページスクロール依存 | スクロール後に範囲内 |
| FL/FR選択 | 284〜360 | 範囲内 |
| RL/RR選択 | 396〜472 | 範囲内 |
| テンキー1〜9 | 480〜688 | 範囲内 |
| テンキー0/削除 | 696〜760 | 範囲内 |
| テンキー中断/確定 | 768〜832 | 範囲内 |
| 前回値を使う（条件付き） | 上部表示帯38〜276内 | **範囲外** |
| 気温/ラップのテンキー | 約480〜832 | 範囲内 |
| フィーリング5択/中断 | 約408〜832 | 範囲内 |
| 温冷モード切替 | 要素なし。常時温間のため基本記録では不要 | 対象外 |
| 直接経路の温間増減/Input | ページスクロール依存 | スクロール後に範囲内 |
| Tabs/overflow/Driving段ボタン | ページスクロール依存 | スクロール後に範囲内 |
| 固定保存 | 760〜820 | 範囲内 |
| 下書き復元/破棄 | ページ上部、スクロール可能 | 初期位置はブラウザ実測未確認 |

4輪選択は第2ラウンドのFL/FR概算y=174〜250からy=284〜360へ移動し、全輪が自然到達域に入った。一方、条件付きの「前回値を使う」は`TirePressureScene.tsx:163-171`で上部表示帯の内部にあり、同ファイル冒頭の「触るものはすべて下側」という条件を満たさないため、項目5の総合判定は不合格とする。

## 不合格項目の一覧（修正対象）

| # | 項目 | ファイル:行 | 現状値 | 必要値 |
|---:|---|---|---|---|
| 1 | 温間質問の入力済み判定 | `QuickEntryModal.tsx:54-55`; `CarSetup.tsx:329-331,439-442` | 各輪`after OR before`、冷間4輪だけで完了扱い | 基本記録では4輪全て`after`入力済みのみ完了 |
| 2 | 環境カードのクリック可能サマリー | `CarSetup.tsx:1375-1393` | 約310×28px | 44px以上、推奨60px |
| 3 | タイヤカードのクリック可能サマリー | `CarSetup.tsx:1465-1516` | 約310×52px | 推奨60px以上 |
| 4 | ラップカードのクリック可能サマリー | `CarSetup.tsx:1718-1732` | 約310×28px | 44px以上、推奨60px |
| 5 | DrivingTabクリア | `DrivingTab.tsx:58-66` | 高44px | 推奨60px以上 |
| 6 | QuickEntry進捗fill/rail | `QuickEntryModal.tsx:240-242` | 1.15〜1.18:1 | 7:1以上 |
| 7 | 大型圧力状態色/実画面背景 | `TirePressureScene.tsx:123-142`; `QuickEntryModal.tsx:234` | light 6.82〜6.99:1 | 7:1以上 |
| 8 | 保存状態banner | `CarSetup.tsx:1154-1169` | light 6.88:1 | 7:1以上 |
| 9 | タイヤ/ラップchevron | `CarSetup.tsx:1463,1689`; `index.css:615-617` | 2.54〜5.78:1 | 7:1以上 |
| 10 | ラップInput label（dark） | `CarSetup.tsx:1775,1785`; `index.css:615-617` | 5.78:1 | 7:1以上 |
| 11 | 直接経路の温間ラベル | `BasicInfoTab.tsx:203-206,249`; `index.css:611-617` | 4.44〜5.47:1 | 7:1以上 |
| 12 | StepNumberボタン境界 | `StepNumber.tsx:94-175`; `index.css:242-250` | 1.29〜1.41:1 | 7:1以上 |
| 13 | dark Input focus境界 | `index.css:76-83,326-329` | 2.80:1 | 7:1以上 |
| 14 | unsafe時の状態表示 | `CarSetup.tsx:743-746,856-870,1154-1161` | 「未保存」toast後も自動送信badge・保存済みURLへ遷移 | unsafe専用の未保存状態を維持し再保存可能にする |
| 15 | draftのDate復元 | `draftStorage.ts:58-101`; `CarSetup.tsx:81-84,1181-1186,1218-1221`; `setupSchema.ts:184` | `sessionDate`がJSON文字列のまま | load時に検証済みDateへ復元 |
| 16 | 前回値ボタンの親指到達 | `TirePressureScene.tsx:163-171` | 上部表示帯y<281 | box全体をy=281以降へ |

## 検証

- `npm test -- --run src/lib/pitTheme.test.ts src/lib/offlineCommit.test.ts`: 2 files中1 file失敗、37 tests中36成功。失敗内容は`PIT.surfaceActive`内の`gray-600`文字列禁止判定。
- ブラウザ`getBoundingClientRect()`実測: 未確認。y座標と幅・高さは上記box modelで算出。
