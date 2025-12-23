// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('レイアウト切替', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('初期状態は縦並びレイアウト', async ({ page }) => {
    const container = page.locator('.container');
    await expect(container).not.toHaveClass(/layout-horizontal/);
  });

  test('レイアウトボタンクリックで横並びに切り替わる', async ({ page }) => {
    // 画面幅を広くして横並びボタンが表示されるようにする
    await page.setViewportSize({ width: 1200, height: 800 });

    const layoutBtn = page.locator('#layoutBtn');
    const container = page.locator('.container');

    await layoutBtn.click();
    await expect(container).toHaveClass(/layout-horizontal/);
  });

  test('レイアウトボタン再クリックで縦並びに戻る', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const layoutBtn = page.locator('#layoutBtn');
    const container = page.locator('.container');

    await layoutBtn.click();
    await expect(container).toHaveClass(/layout-horizontal/);

    await layoutBtn.click();
    await expect(container).not.toHaveClass(/layout-horizontal/);
  });

  test('横並び時にアイコンが変わる', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const layoutBtn = page.locator('#layoutBtn');
    const icon = layoutBtn.locator('.btn-icon');

    // 縦並び時のアイコン
    const verticalIcon = await icon.textContent();

    await layoutBtn.click();

    // 横並び時のアイコン
    const horizontalIcon = await icon.textContent();

    expect(verticalIcon).not.toBe(horizontalIcon);
  });

  test('レイアウト設定がLocalStorageに保存される', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const layoutBtn = page.locator('#layoutBtn');
    await layoutBtn.click();

    const savedLayout = await page.evaluate(() => localStorage.getItem('u2bLoopLayout'));
    expect(savedLayout).toBe('horizontal');
  });

  test('保存されたレイアウト設定がリロード後も維持される', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const layoutBtn = page.locator('#layoutBtn');
    const container = page.locator('.container');

    await layoutBtn.click();
    await expect(container).toHaveClass(/layout-horizontal/);

    await page.reload();
    await expect(container).toHaveClass(/layout-horizontal/);
  });

  test('狭い画面ではレイアウトボタンが非表示', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });

    const layoutBtn = page.locator('#layoutBtn');
    await expect(layoutBtn).toBeHidden();
  });

  test('横並び時にショートカットがパネル内に表示される', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const layoutBtn = page.locator('#layoutBtn');
    await layoutBtn.click();

    const panelShortcut = page.locator('.shortcut-in-panel');
    await expect(panelShortcut).toBeVisible();
  });

  test('縦並び時にショートカットがヘッダー内に表示される', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const headerShortcut = page.locator('.shortcut-in-header');
    await expect(headerShortcut).toBeVisible();
  });
});
