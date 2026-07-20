import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
}

test('390pxでログインと新規登録が横にはみ出さない', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: /ログイン|Log in/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: /新規アカウント作成|Create account/i }).click();
  await expect(page.getByRole('heading', { name: /新規アカウント作成|Create account/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: '/tmp/carsetup-trust-mobile-playwright.png', fullPage: true });
});

test('無効な公開リンクはローディングのまま残らずエラー表示になる', async ({ page }) => {
  await page.goto('/s/invalid-share-id');
  await expect(page.getByRole('heading')).toBeVisible({ timeout: 12_000 });
  await expectNoHorizontalOverflow(page);
});
