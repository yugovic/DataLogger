// 層1（機械検査）のブラウザ実測。ハーネスページを 390x844 で開き、
// 全タップターゲットの実寸・親指到達域・全テキストのコントラスト比を測って JSON で出す。
// スクリーンショットも同時に保存する。
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5180/audit/pit-harness.html';
const OUT = 'audit/shots';
mkdirSync(OUT, { recursive: true });

const SCENES = [
  ['tire', 'タイヤ空気圧（未入力）'],
  ['carry', 'タイヤ空気圧（前回値の提案あり）'],
  ['tire-filled', 'タイヤ空気圧（一部入力済み）'],
  ['lap', 'ベストラップ'],
  ['feeling', 'フィーリング5択'],
  ['driving', 'ドライバーフィードバック（段ボタン）'],
  ['skin', 'スキン層の見本（履歴・比較・ダッシュボードの配色）'],
];

const MEASURE = () => {
  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const effBg = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const b = parse(getComputedStyle(n).backgroundColor);
      if (b.length >= 3 && (b[3] === undefined || b[3] > 0)) return b;
      n = n.parentElement;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    return root.length >= 3 && root[3] !== 0 ? root : [255, 255, 255];
  };
  const ratio = (f, b) => {
    const a = [lum(...f.slice(0, 3)), lum(...b.slice(0, 3))].sort((x, y) => y - x);
    return (a[0] + 0.05) / (a[1] + 0.05);
  };

  const targets = [...document.querySelectorAll('button, input, select, textarea, [role="button"]')]
    .map((e) => {
      const r = e.getBoundingClientRect();
      return {
        label: (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 20).replace(/\s+/g, ' '),
        w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
        reachExempt: e.getAttribute('data-reach-exempt'),
      };
    })
    .filter((t) => t.w > 0 && t.h > 0);

  const texts = [...document.querySelectorAll('*')]
    .filter((e) => {
      const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
      return own.length > 0 && e.getBoundingClientRect().width > 0;
    })
    .map((e) => {
      const cs = getComputedStyle(e);
      return {
        text: e.textContent.trim().slice(0, 20).replace(/\s+/g, ' '),
        fontSize: cs.fontSize,
        ratio: +ratio(parse(cs.color), effBg(e)).toFixed(2),
      };
    });

  // 親指到達域の判定は「スクロールで対象を下へ動かせない画面」にだけ適用する。
  // 縦スクロールできるページは、ユーザーが対象を到達域へ送れるため対象外とする。
  const scrollable = document.documentElement.scrollHeight > window.innerHeight + 4;

  return {
    scrollable,
    targetCount: targets.length,
    under44: targets.filter((t) => t.w < 44 || t.h < 44),
    under60: targets.filter((t) => t.w < 60 || t.h < 60),
    outOfThumbReach: scrollable ? [] : targets.filter((t) => t.top < 281 && !t.reachExempt),
    reachExempted: targets.filter((t) => t.top < 281 && t.reachExempt),
    minTargetH: Math.min(...targets.map((t) => t.h)),
    minTargetW: Math.min(...targets.map((t) => t.w)),
    textCount: texts.length,
    contrastUnder7: texts.filter((t) => t.ratio < 7),
    minContrast: Math.min(...texts.map((t) => t.ratio)),
  };
};

const browser = await chromium.launch();
const results = {};

// ベーシックは light/dark、洗練モードは単一（暗い地色が前提）
const MODES = [
  ['light', ''], ['dark', ''],
  ['refined', '&appearance=refined'],
];

for (const [theme, extra] of MODES) {
  for (const [scene, title] of SCENES) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}?scene=${scene}&theme=${theme}${extra}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${theme}-${scene}.png` });
    results[`${theme}/${scene}`] = { title, ...(await page.evaluate(MEASURE)) };
    await ctx.close();
  }
}
await browser.close();

writeFileSync('audit/measurements.json', JSON.stringify(results, null, 2));

let fails = 0;
for (const [key, r] of Object.entries(results)) {
  const bad = [];
  if (r.under44.length) bad.push(`44px未満 ${r.under44.length}件`);
  if (r.under60.length) bad.push(`60px未満 ${r.under60.length}件`);
  if (r.outOfThumbReach.length) bad.push(`到達域外 ${r.outOfThumbReach.length}件`);
  const reachNote = r.scrollable ? '(スクロール可のため到達域は対象外)' : '';
  if (r.contrastUnder7.length) bad.push(`7:1未満 ${r.contrastUnder7.length}件`);
  if (bad.length) fails++;
  console.log(
    `${bad.length ? 'NG' : 'OK'} ${key.padEnd(22)} ` +
    `対象${String(r.targetCount).padStart(2)} 最小${r.minTargetW}x${r.minTargetH} ` +
    `最小コントラスト${r.minContrast} ${bad.join(' / ')}${reachNote}`,
  );
  for (const t of [...r.under60, ...r.outOfThumbReach]) console.log(`     - ${t.label} ${t.w}x${t.h} top=${t.top}`);
  for (const t of (r.reachExempted || [])) console.log(`     到達域外(申告済み): ${t.label} top=${t.top} — ${t.reachExempt}`);
  for (const t of r.contrastUnder7) console.log(`     - "${t.text}" ${t.fontSize} ${t.ratio}:1`);
}
console.log(fails === 0 ? '\n全シーン合格' : `\n${fails} シーンが不合格`);
process.exit(fails === 0 ? 0 : 1);
