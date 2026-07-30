// 変更前後の画面を同じデータ・同じ幅で撮り比べる。
//
// 前提:
//   - Firebase Emulator が起動していて npm run demo:seed 済み
//   - 新: http://localhost:5180（このワークツリー、VITE_USE_EMULATOR=1）
//   - 旧: http://localhost:5190（git worktree で取り出した変更前のコミット）
//
// デモアカウントは Emulator 上のもので、実サービスの認証情報ではない。
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const DEMO_EMAIL = 'demo.velocity@example.com';
const DEMO_PASSWORD = 'DemoPass123!';

const VERSIONS = [
  ['before', 'http://localhost:5190'],
  ['after', 'http://localhost:5180'],
];

/** 撮る画面。path はログイン後の遷移先 */
const SCREENS = [
  ['setup', '/', 'セットアップ記録'],
  ['dashboard', '/dashboard', 'ダッシュボード'],
  ['history', '/history', '履歴一覧'],
  ['vehicles', '/vehicles', '車両管理'],
];

const WIDTHS = [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
];

const OUT = 'audit/compare';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const [label, base] of VERSIONS) {
  for (const [wname, width, height] of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile: wname === 'mobile',
      hasTouch: wname === 'mobile',
      locale: 'ja-JP',
    });
    const page = await ctx.newPage();

    // ── ログイン（Emulator 上のデモアカウント）──
    // Firestore が接続を保つので networkidle は来ない。load で待つ
    await page.goto(`${base}/auth`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    try {
      await page.getByPlaceholder(/メールアドレス|Email/i).first().fill(DEMO_EMAIL);
      await page.getByPlaceholder(/パスワード|Password/i).first().fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: /ログイン|Log in/i }).first().click();
      await page.waitForTimeout(3500);
    } catch (e) {
      console.log(`  ${label}/${wname}: ログイン操作に失敗 — ${e.message.split('\n')[0]}`);
    }

    for (const [key, path, title] of SCREENS) {
      try {
        await page.goto(`${base}${path}`, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(2200);
        const file = `${OUT}/${wname}-${key}-${label}.png`;
        await page.screenshot({ path: file, fullPage: false });
        const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 60);
        console.log(`OK ${label}/${wname}/${key.padEnd(10)} ${title} — ${body}`);
      } catch (e) {
        console.log(`NG ${label}/${wname}/${key} — ${e.message.split('\n')[0]}`);
      }
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${OUT}/ に出力しました`);
