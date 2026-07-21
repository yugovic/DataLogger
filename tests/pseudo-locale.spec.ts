/**
 * 疑似ロケール（pseudo-locale）UI 崩れ検出テスト
 * ------------------------------------------------------------------
 * docs/i18n-readiness-plan.md Phase 3「擬似ロケールで長文・文字幅・欠落を確認する」対応。
 *
 * 仕組み:
 *   1. ページロード後、en リソースを機械的に水増し・装飾した疑似ロケールを
 *      ブラウザ側 i18next（window.__i18n。開発ビルドで公開）へ addResourceBundle し、
 *      changeLanguage('en') で全 UI を疑似ロケール表示にする。
 *   2. モバイル幅(390px)とデスクトップ幅(1280px)で各画面をチェックする:
 *      - 横スクロール（ページ全体のはみ出し）の有無
 *      - 代表的なテキスト要素の切り詰め（scrollWidth > clientWidth 等）
 *   3. フルページスクリーンショットを /tmp/carsetup-pseudo-locale/ に保存する。
 *
 * 認証が必要な画面（ダッシュボード・履歴・比較・車両・テレメトリ・共有一覧）は
 * このリポジトリにテスト用ログイン／エミュレータ導線が無いため対象外。
 * 認証不要でアクセスできる画面（ログイン／新規登録／公開共有エラー）を検証する。
 * ベースライン方式: 既知の残存問題は tests/pseudo-locale-baseline.json に記録し、
 * 新規に悪化した画面のみをテスト失敗として扱う。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { buildPseudoBundles } from './pseudo-locale';

const SCREENSHOT_DIR = '/tmp/carsetup-pseudo-locale';
const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'pseudo-locale-baseline.json');
const UPDATE_BASELINE = process.env.UPDATE_PSEUDO_BASELINE === '1';

const WIDTHS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

// 切り詰め検査の対象となる代表的なテキスト要素セレクタ（全要素は膨大なので絞る）
const TEXT_SELECTORS =
  'button, a, h1, h2, h3, h4, label, [role="tab"], .ant-btn, .ant-tabs-tab, .ant-typography, th';

interface OverflowFinding {
  horizontalOverflow: boolean;
  overflowAmount: number;
  truncatedCount: number;
  truncatedSamples: string[];
}

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/** ブラウザ側 i18next へ疑似ロケールを注入して全 UI を疑似表示にする。 */
async function injectPseudoLocale(page: Page): Promise<void> {
  const bundles = buildPseudoBundles();
  const ready = await page.evaluate(async (pseudo) => {
    const w = window as unknown as {
      __i18n?: {
        addResourceBundle: (
          lng: string,
          ns: string,
          resources: unknown,
          deep?: boolean,
          overwrite?: boolean,
        ) => void;
        changeLanguage: (lng: string) => Promise<unknown>;
      };
    };
    if (!w.__i18n) return false;
    for (const [ns, tree] of Object.entries(pseudo)) {
      w.__i18n.addResourceBundle('en', ns, tree, true, true);
    }
    await w.__i18n.changeLanguage('en');
    return true;
  }, bundles);
  expect(ready, 'window.__i18n が公開されていること（開発ビルドで実行しているか確認）').toBe(true);
  // 再レンダリング完了を待つ
  await page.waitForTimeout(400);
}

/** ページ全体の横はみ出しと代表テキスト要素の切り詰めを測定する。 */
async function measure(page: Page): Promise<OverflowFinding> {
  return page.evaluate((selectors) => {
    const viewport = window.innerWidth;
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const truncated: string[] = [];
    const nodes = Array.from(document.querySelectorAll(selectors)) as HTMLElement[];
    for (const el of nodes) {
      if (el.offsetParent === null && el.getClientRects().length === 0) continue;
      const clipsX = el.scrollWidth - el.clientWidth > 1;
      const clipsY = el.scrollHeight - el.clientHeight > 1;
      const style = getComputedStyle(el);
      const hidden = style.overflow !== 'visible' || style.textOverflow === 'ellipsis';
      if ((clipsX || clipsY) && hidden) {
        const text = (el.textContent ?? '').trim().slice(0, 40);
        if (text) truncated.push(text);
      }
    }
    return {
      horizontalOverflow: docWidth - viewport > 1,
      overflowAmount: Math.max(0, docWidth - viewport),
      truncatedCount: truncated.length,
      truncatedSamples: Array.from(new Set(truncated)).slice(0, 8),
    };
  }, TEXT_SELECTORS);
}

function loadBaseline(): Record<string, { horizontalOverflow: boolean; truncatedCount: number }> {
  if (!existsSync(BASELINE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

const collectedBaseline: Record<string, { horizontalOverflow: boolean; truncatedCount: number }> = {};

test.afterAll(() => {
  if (UPDATE_BASELINE) {
    writeFileSync(BASELINE_PATH, JSON.stringify(collectedBaseline, null, 2) + '\n');
    console.log(`[pseudo-locale] baseline updated: ${BASELINE_PATH}`);
  }
});

/**
 * 1 画面を全幅で検証する共通ルーチン。
 * navigate: ページ遷移と主要要素の可視化を行う関数。
 */
async function checkScreen(
  page: Page,
  screen: string,
  navigate: (page: Page) => Promise<void>,
): Promise<void> {
  const baseline = loadBaseline();
  for (const vp of WIDTHS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await navigate(page);
    await injectPseudoLocale(page);

    const finding = await measure(page);
    const key = `${screen}:${vp.name}`;
    collectedBaseline[key] = {
      horizontalOverflow: finding.horizontalOverflow,
      truncatedCount: finding.truncatedCount,
    };

    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${screen}-${vp.name}-${vp.width}.png`),
      fullPage: true,
    });

    console.log(
      `[pseudo-locale] ${key} overflow=${finding.horizontalOverflow}(${finding.overflowAmount}px) ` +
        `truncated=${finding.truncatedCount} ${JSON.stringify(finding.truncatedSamples)}`,
    );

    // ベースライン差分検査: 既知より悪化した場合のみ失敗させる。
    const base = baseline[key] ?? { horizontalOverflow: false, truncatedCount: 0 };
    if (!UPDATE_BASELINE) {
      expect(
        finding.horizontalOverflow && !base.horizontalOverflow,
        `${key}: 疑似ロケールで新規の横はみ出し(${finding.overflowAmount}px)が発生`,
      ).toBe(false);
      expect(
        finding.truncatedCount,
        `${key}: 疑似ロケールで切り詰め要素が悪化 (baseline=${base.truncatedCount})` +
          ` samples=${JSON.stringify(finding.truncatedSamples)}`,
      ).toBeLessThanOrEqual(base.truncatedCount);
    }
  }
}

test('疑似ロケール: ログイン画面', async ({ page }) => {
  await checkScreen(page, 'login', async (p) => {
    await p.goto('/auth');
    await expect(p.getByRole('heading').first()).toBeVisible({ timeout: 12_000 });
  });
});

test('疑似ロケール: 新規登録画面', async ({ page }) => {
  await checkScreen(page, 'signup', async (p) => {
    await p.goto('/auth');
    await expect(p.getByRole('heading').first()).toBeVisible({ timeout: 12_000 });
    const createBtn = p.getByRole('button', { name: /新規アカウント作成|Create account|⟦/ });
    if (await createBtn.count()) {
      await createBtn.first().click();
      await p.waitForTimeout(200);
    }
  });
});

test('疑似ロケール: 公開共有エラー', async ({ page }) => {
  await checkScreen(page, 'public-share-error', async (p) => {
    await p.goto('/s/invalid-share-id');
    await expect(p.getByRole('heading').first()).toBeVisible({ timeout: 12_000 });
  });
});
