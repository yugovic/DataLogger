// スマホ幅でのレイアウト崩れ（はみ出し・重なり）を検出する。
//
// 実機は pointer:coarse なので index.css の @media (pointer: coarse) が効く。
// ブラウザのプレビューは fine のことがあり、そこでは崩れが再現しない。
// Playwright の isMobile/hasTouch で coarse を再現して測る。
//
// 検出するもの:
//   1. 子要素が親のボックスから横／縦にはみ出している
//   2. 兄弟要素どうしが重なっている（ラベルと入力欄が被る等）
//   3. body 全体が横スクロールする
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5180/audit/pit-harness.html';
const SCENES = (process.argv[2] ?? 'session,tire,lap,feeling,skin,driving').split(',');
const TOLERANCE = 2; // 端数丸めぶんは許容する

const CHECK = ({ TOLERANCE }) => {
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    const t = (own || el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.innerText || '').trim();
    return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : ''}` +
           (t ? ` "${t.replace(/\s+/g, ' ').slice(0, 18)}"` : '');
  };

  const overflow = [];
  const overlap = [];

  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const p = el.parentElement;
    if (!p || p === document.documentElement || p === document.body) continue;
    const pcs = getComputedStyle(p);
    // スクロールできる親、はみ出しを意図的に許した親は対象外
    if (/auto|scroll|hidden/.test(pcs.overflow + pcs.overflowX + pcs.overflowY)) continue;
    if (pcs.position === 'relative' && getComputedStyle(el).position === 'absolute') continue;
    if (getComputedStyle(el).position === 'fixed') continue;

    const r = el.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const dx = Math.round(r.right - pr.right);
    const dy = Math.round(r.bottom - pr.bottom);
    if (dx > TOLERANCE || dy > TOLERANCE) {
      overflow.push({ el: name(el), parent: name(p), dx, dy });
    }
  }

  // 兄弟どうしの重なり（グリッド／フローの崩れ）
  const containers = [...document.querySelectorAll('.grid, form, section, div')].filter(visible);
  const seen = new Set();
  for (const c of containers) {
    const kids = [...c.children].filter((k) => visible(k) && getComputedStyle(k).position !== 'absolute');
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect();
        const b = kids[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > TOLERANCE && oy > TOLERANCE) {
          const key = name(kids[i]) + '|' + name(kids[j]);
          if (seen.has(key)) continue;
          seen.add(key);
          overlap.push({ a: name(kids[i]), b: name(kids[j]), ox: Math.round(ox), oy: Math.round(oy) });
        }
      }
    }
  }

  return {
    pointerCoarse: matchMedia('(pointer: coarse)').matches,
    horizontalScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    overflow: overflow.slice(0, 12),
    overlap: overlap.slice(0, 12),
  };
};

const browser = await chromium.launch();
let failed = 0;

for (const scene of SCENES) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}?scene=${scene}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(CHECK, { TOLERANCE });
  await page.screenshot({ path: `audit/shots/layout-${scene}.png`, fullPage: true });
  await ctx.close();

  const bad = [];
  if (r.overflow.length) bad.push(`はみ出し ${r.overflow.length}`);
  if (r.overlap.length) bad.push(`重なり ${r.overlap.length}`);
  if (r.horizontalScroll > TOLERANCE) bad.push(`横スクロール ${r.horizontalScroll}px`);
  if (!r.pointerCoarse) bad.push('coarse を再現できていない');
  if (bad.length) failed++;

  console.log(`${bad.length ? 'NG' : 'OK'} ${scene.padEnd(14)} ${bad.join(' / ') || '崩れなし'}`);
  for (const o of r.overflow) console.log(`     はみ出し: ${o.el} が ${o.parent} から 右${o.dx}px 下${o.dy}px`);
  for (const o of r.overlap) console.log(`     重なり: ${o.a} ／ ${o.b}（${o.ox}x${o.oy}px）`);
}

await browser.close();
console.log(failed === 0 ? '\n崩れなし' : `\n${failed} シーンで崩れを検出`);
process.exit(failed === 0 ? 0 : 1);
