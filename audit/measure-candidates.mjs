// best-of-n 候補（単一HTML）を、ピット要件に対して実測する。
// 自己申告のコントラスト比を信用せず、実際に描画して計算する。
//
// 判定:
//   - 全タップターゲットが 60x60px 以上
//   - 全テキストが背景に対して 7:1 以上
//   - 触る操作が y>=281px（片手親指の到達域）
//   - 390x844 に収まり、縦スクロールが出ない
import { chromium } from '@playwright/test';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = process.argv[2] ?? '.bon-work';
const MIN_TARGET = 60;
const MIN_CONTRAST = 7;
const THUMB_Y = 281;

const MEASURE = ({ MIN_TARGET, MIN_CONTRAST, THUMB_Y }) => {
  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const blend = (fg, bg) => {
    const a = fg[3] === undefined ? 1 : fg[3];
    return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
  };
  // 実際に見えている背景色を、祖先をたどって合成する
  const effBg = (el) => {
    let n = el;
    const stack = [];
    while (n && n.nodeType === 1) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0)) stack.push(c);
      if ((c[3] === undefined || c[3] >= 1) && c.length >= 3) break;
      n = n.parentElement;
    }
    let base = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base);
    return base;
  };
  const ratio = (f, b) => {
    const a = [lum(...f.slice(0, 3)), lum(...b.slice(0, 3))].sort((x, y) => y - x);
    return (a[0] + 0.05) / (a[1] + 0.05);
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const targets = [...document.querySelectorAll('button, input, select, textarea, a[href], [role="button"], [onclick], [tabindex]:not([tabindex="-1"])')]
    .filter(visible)
    .map((e) => {
      const r = e.getBoundingClientRect();
      return {
        label: (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 22).replace(/\s+/g, ' '),
        w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
        // 親指到達域の例外。属性で理由を宣言したものだけ除外する。
        // 判定を黙って緩めず、除外したことと理由を必ず出力に残す。
        reachExempt: e.getAttribute('data-reach-exempt'),
      };
    });

  const texts = [...document.querySelectorAll('*')]
    .filter((e) => {
      if (!visible(e)) return false;
      const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
      return own.length > 0;
    })
    .map((e) => {
      const cs = getComputedStyle(e);
      const fg = parse(cs.color);
      const bg = effBg(e);
      return {
        text: e.textContent.trim().slice(0, 22).replace(/\s+/g, ' '),
        fontSize: cs.fontSize,
        color: cs.color,
        ratio: +ratio(blend(fg, bg), bg).toFixed(2),
      };
    });

  return {
    scrollH: document.documentElement.scrollHeight,
    targetCount: targets.length,
    under60: targets.filter((t) => t.w < MIN_TARGET || t.h < MIN_TARGET),
    outOfReach: targets.filter((t) => t.top < THUMB_Y && !t.reachExempt),
    reachExempted: targets.filter((t) => t.top < THUMB_Y && t.reachExempt),
    minW: targets.length ? Math.min(...targets.map((t) => t.w)) : 0,
    minH: targets.length ? Math.min(...targets.map((t) => t.h)) : 0,
    textCount: texts.length,
    contrastUnder7: texts.filter((t) => t.ratio < MIN_CONTRAST),
    minContrast: texts.length ? Math.min(...texts.map((t) => t.ratio)) : 0,
  };
};

// best-of-n の候補 (cN.html) でも、採用後の単体HTMLでも測れるようにする
const files = readdirSync(DIR).filter((f) => f.endsWith('.html')).sort();
if (!files.length) { console.log(`${DIR} に .html がありません`); process.exit(1); }

const browser = await chromium.launch();
let anyFail = false;

for (const file of files) {
  const path = resolve(DIR, file);
  if (!existsSync(path)) continue;
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const failedRequests = [];
  page.on('requestfailed', (r) => failedRequests.push(r.url()));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('about:')) failedRequests.push(`外部リクエスト: ${u}`);
  });

  await page.goto(`file://${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(DIR, file.replace('.html', '.png')) });
  const r = await page.evaluate(MEASURE, { MIN_TARGET, MIN_CONTRAST, THUMB_Y });
  await ctx.close();

  const bad = [];
  if (r.under60.length) bad.push(`60px未満 ${r.under60.length}`);
  if (r.outOfReach.length) bad.push(`到達域外 ${r.outOfReach.length}`);
  if (r.contrastUnder7.length) bad.push(`7:1未満 ${r.contrastUnder7.length}`);
  if (r.scrollH > 860) bad.push(`縦あふれ ${r.scrollH}px`);
  if (failedRequests.length) bad.push(`外部依存 ${failedRequests.length}`);
  if (bad.length) anyFail = true;

  console.log(
    `${bad.length ? 'NG' : 'OK'} ${file.padEnd(9)} ` +
    `対象${String(r.targetCount).padStart(3)} 最小${r.minW}x${r.minH} ` +
    `文字${String(r.textCount).padStart(3)} 最小コントラスト${String(r.minContrast).padStart(6)}  ${bad.join(' / ')}`,
  );
  for (const t of r.under60) console.log(`     小さい: ${t.label} ${t.w}x${t.h}`);
  for (const t of r.outOfReach) console.log(`     届かない: ${t.label} top=${t.top}`);
  // 例外は合格扱いだが、見えなくならないよう毎回出す
  for (const t of r.reachExempted) console.log(`     到達域外(申告済み): ${t.label} top=${t.top} — ${t.reachExempt}`);
  for (const t of r.contrastUnder7) console.log(`     薄い: "${t.text}" ${t.fontSize} ${t.color} ${t.ratio}:1`);
  for (const u of failedRequests.slice(0, 3)) console.log(`     ${u}`);
}

await browser.close();
console.log(anyFail ? '\n制約違反あり' : '\n全候補が制約を満たす');
