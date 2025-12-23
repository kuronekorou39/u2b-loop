// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('バージョン表示と更新通知', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('バージョン表示', () => {
    test('バージョン番号が表示される', async ({ page }) => {
      const version = page.locator('#appVersion');
      await expect(version).toBeVisible();
      // v + 数字.数字.数字 の形式
      await expect(version).toHaveText(/v\d+\.\d+\.\d+/);
    });

    test('バージョンがクリック可能', async ({ page }) => {
      const version = page.locator('#appVersion');
      await expect(version).toBeVisible();
      // クリックしてもエラーにならない
      await version.click();
    });

    test('バージョンステータス要素が存在する', async ({ page }) => {
      const status = page.locator('#versionStatus');
      await expect(status).toBeAttached();
    });
  });

  test.describe('更新リンク', () => {
    test('更新リンクが初期非表示', async ({ page }) => {
      const updateLink = page.locator('#updateLink');
      await expect(updateLink).toBeAttached();
      await expect(updateLink).toBeHidden();
    });

    test('更新リンクのテキストが正しい', async ({ page }) => {
      const updateLink = page.locator('#updateLink');
      await expect(updateLink).toHaveText('更新あり');
    });
  });

  test.describe('ロゴとヘッダー', () => {
    test('ロゴリンクが正しいURLを持つ', async ({ page }) => {
      const logoLink = page.locator('.logo-link');
      await expect(logoLink).toHaveAttribute('href', './');
    });

    test('ロゴ画像が表示される', async ({ page }) => {
      const logoImg = page.locator('.header-logo');
      await expect(logoImg).toBeVisible();
      await expect(logoImg).toHaveAttribute('alt', 'U2B-Loop');
    });
  });
});
