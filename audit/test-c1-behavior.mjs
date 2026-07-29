// 採用した洗練モード案（リングゲージ + 数値の左右で増減）の操作を実ブラウザで検証する。
//
// 注意: 自動化コンテキストの eval からタイマーを測るとスロットリングで
// 1秒単位に間引かれ、加速の速さを誤って読む。ここでは Playwright の
// 実ページ上で、ページ自身に経過時間を計測させる。
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

// 採用案そのものを検証する（一時コピーを介さない）
const URL = 'file://' + resolve('docs/design-candidates/refined-tire-pressure.html');
const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);

const val = () => page.$eval('#bigValue', (e) => parseInt(e.textContent.trim(), 10));
const status = () => page.$eval('#statusState', (e) => e.textContent.trim());
const heading = () => page.$eval('#heading', (e) => e.textContent.trim().replace(/\s+/g, ' '));

// ── 単発タップ ──────────────────────────────────────
const before = await val();
await page.click('#stepMinus');
check('− 単発タップで 1 下がる', (await val()) === before - 1, `${before} -> ${await val()}`);
await page.click('#stepPlus');
check('+ 単発タップで 1 上がる', (await val()) === before, `-> ${await val()}`);

// ── 長押しの加速（ページ内で計測させる）──────────────
// mouse.down/up の間に実時間を置き、ページの値変化を見る
async function hold(sel, ms) {
  const box = await page.locator(sel).boundingBox();
  const start = await val();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(120);
  return Math.abs((await val()) - start);
}

const d1 = await hold('#stepPlus', 1000);
check('1秒長押しで 3〜9 kPa 動く', d1 >= 3 && d1 <= 9, `+${d1} kPa`);
await hold('#stepMinus', 1000);

const d2 = await hold('#stepPlus', 2000);
check('2秒長押しで 12〜26 kPa 動く', d2 >= 12 && d2 <= 26, `+${d2} kPa`);
await hold('#stepMinus', 2000);

const d3 = await hold('#stepPlus', 3000);
check('3秒長押しで 24〜45 kPa 動く（暴走しない）', d3 >= 24 && d3 <= 45, `+${d3} kPa`);
await hold('#stepMinus', 3000);

check('往復して元の値に戻る', (await val()) === before, `${await val()} (期待 ${before})`);

// ── 離したら止まる ──────────────────────────────────
const box = await page.locator('#stepPlus').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(800);
await page.mouse.up();
const atRelease = await val();
await page.waitForTimeout(700);
check('指を離したら止まる', (await val()) === atRelease, `${atRelease} -> ${await val()}`);
const flValue = await val();   // 以降の比較はこの実値を基準にする

// ── レンジ判定とニードル ────────────────────────────
await hold('#stepPlus', 2500);
check('目標レンジを外れると「レンジ外」になる', (await status()) === 'レンジ外', await status());
const needleOut = await page.$eval('#needle', (e) => e.getAttribute('transform'));
await hold('#stepMinus', 2500);
const needleIn = await page.$eval('#needle', (e) => e.getAttribute('transform'));
check('ニードルが値に応じて回る', needleOut !== needleIn, `${needleIn} / ${needleOut}`);

// ── 輪の切り替えと「未入力」の保持 ──────────────────
await page.click('.wheel[data-wheel="RL"]');
check('輪をタップすると見出しが変わる', (await heading()).startsWith('RL'), await heading());
check('未入力の輪は「—」のまま', (await page.$eval('#bigValue', (e) => e.textContent.trim())) === '—', await page.$eval('#bigValue', (e) => e.textContent.trim()));
check('未入力では確定できない', await page.$eval('#confirmBtn', (e) => e.disabled), '');

await page.click('#stepPlus');
// 未入力から押したときは目標中央そのものから始める（+1 して 221 にはしない）
check('未入力の輪は初回操作で目標中央 220 から始まる', (await val()) === 220, `${await val()}`);

await page.click('.wheel[data-wheel="FL"]');
check('別の輪へ戻ると元の値が復帰する', (await val()) === flValue, `${await val()} (期待 ${flValue})`);

// ── テンキー ────────────────────────────────────────
await page.click('.key[data-digit="2"]');
await page.click('.key[data-digit="0"]');
await page.click('.key[data-digit="5"]');
check('テンキー3桁で値が入る', (await val()) === 205, `${await val()}`);

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'OK  ' : 'NG  '}${r.name}${r.detail ? '  — ' + r.detail : ''}`);
}
console.log(failed === 0 ? `\n${results.length} 項目すべて合格` : `\n${failed} / ${results.length} 項目が不合格`);
process.exit(failed === 0 ? 0 : 1);
