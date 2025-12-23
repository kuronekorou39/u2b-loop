// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('テーマ切替', () => {
  test.beforeEach(async ({ page }) => {
    // LocalStorageをクリアしてから開始
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('初期状態はダークテーマ', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/light-theme/);
  });

  test('テーマボタンクリックでライトテーマに切り替わる', async ({ page }) => {
    const themeBtn = page.locator('#themeBtn');
    const body = page.locator('body');

    await themeBtn.click();
    await expect(body).toHaveClass(/light-theme/);
  });

  test('テーマボタン再クリックでダークテーマに戻る', async ({ page }) => {
    const themeBtn = page.locator('#themeBtn');
    const body = page.locator('body');

    await themeBtn.click();
    await expect(body).toHaveClass(/light-theme/);

    await themeBtn.click();
    await expect(body).not.toHaveClass(/light-theme/);
  });

  test('ライトテーマでアイコンが変わる', async ({ page }) => {
    const themeBtn = page.locator('#themeBtn');
    const icon = themeBtn.locator('.btn-icon');

    // ダークテーマ時は太陽アイコン
    await expect(icon).toHaveText('☀');

    await themeBtn.click();

    // ライトテーマ時は月アイコン
    await expect(icon).toHaveText('☾');
  });

  test('テーマ設定がLocalStorageに保存される', async ({ page }) => {
    const themeBtn = page.locator('#themeBtn');

    await themeBtn.click();

    const savedTheme = await page.evaluate(() => localStorage.getItem('u2bLoopTheme'));
    expect(savedTheme).toBe('light');
  });

  test('保存されたテーマ設定がリロード後も維持される', async ({ page }) => {
    const themeBtn = page.locator('#themeBtn');
    const body = page.locator('body');

    await themeBtn.click();
    await expect(body).toHaveClass(/light-theme/);

    // LocalStorageに保存されたことを確認
    const savedTheme = await page.evaluate(() => localStorage.getItem('u2bLoopTheme'));
    expect(savedTheme).toBe('light');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(body).toHaveClass(/light-theme/);
  });

  test('ライトテーマで背景色が変わる', async ({ page }) => {
    const body = page.locator('body');
    const themeBtn = page.locator('#themeBtn');

    // ダークテーマの背景色
    const darkBgColor = await body.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('background-color')
    );

    await themeBtn.click();

    // ライトテーマの背景色
    const lightBgColor = await body.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('background-color')
    );

    expect(darkBgColor).not.toBe(lightBgColor);
  });
});
