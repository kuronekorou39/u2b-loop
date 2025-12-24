// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('ショートカットアコーディオン', () => {
  test.describe('縦並びレイアウト（ヘッダー内）', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
    });

    test('ヘッダー内ショートカットが表示される', async ({ page }) => {
      const headerShortcut = page.locator('.shortcut-in-header');
      await expect(headerShortcut).toBeVisible();
    });

    test('パネル内ショートカットが非表示', async ({ page }) => {
      const panelShortcut = page.locator('.shortcut-in-panel');
      await expect(panelShortcut).toBeHidden();
    });

    test('Keysボタンがヘッダーに存在する', async ({ page }) => {
      const keysBtn = page.locator('#shortcutAccordionBtn');
      await expect(keysBtn).toBeVisible();
      await expect(keysBtn.locator('.btn-label')).toHaveText('Keys');
    });

    test('アコーディオンが初期状態で閉じている', async ({ page }) => {
      const content = page.locator('#shortcutAccordionContent');
      await expect(content).not.toHaveClass(/show/);
    });

    test('クリックで開く', async ({ page }) => {
      const btn = page.locator('#shortcutAccordionBtn');
      const content = page.locator('#shortcutAccordionContent');

      await btn.click();
      await expect(content).toHaveClass(/show/);
    });

    test('開いた状態でボタンがopenクラスを持つ', async ({ page }) => {
      const btn = page.locator('#shortcutAccordionBtn');

      await btn.click();
      await expect(btn).toHaveClass(/open/);
    });

    test('ショートカット項目が正しく表示される', async ({ page }) => {
      await page.locator('#shortcutAccordionBtn').click();

      const items = page.locator('#shortcutAccordionContent .shortcut-item');
      const expectedKeys = ['Space', '←→', 'A', 'B', 'L', 'R', 'M', 'F', 'H', 'V'];
      const expectedLabels = ['再生', '5秒', 'A地点', 'B地点', 'ループ', 'リセット', 'ミュート', '全画面', '左右反転', '上下反転'];

      for (let i = 0; i < expectedKeys.length; i++) {
        const item = items.nth(i);
        await expect(item.locator('kbd')).toHaveText(expectedKeys[i]);
        await expect(item.locator('span')).toHaveText(expectedLabels[i]);
      }
    });
  });

  test.describe('横並びレイアウト（パネル内）', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      // 横並びに切り替え
      await page.locator('#layoutBtn').click();
    });

    test('ヘッダー内ショートカットが非表示', async ({ page }) => {
      const headerShortcut = page.locator('.shortcut-in-header');
      await expect(headerShortcut).toBeHidden();
    });

    test('パネル内ショートカットが表示される', async ({ page }) => {
      const panelShortcut = page.locator('.shortcut-in-panel');
      await expect(panelShortcut).toBeVisible();
    });

    test('パネル内Keysボタンが存在する', async ({ page }) => {
      const keysBtn = page.locator('.shortcut-in-panel [data-shortcut-toggle]');
      await expect(keysBtn).toBeVisible();
    });

    test('パネル内アコーディオンをクリックで開く', async ({ page }) => {
      const btn = page.locator('.shortcut-in-panel [data-shortcut-toggle]');
      const content = page.locator('.shortcut-in-panel [data-shortcut-content]');

      await btn.click({ force: true });
      await expect(content).toHaveClass(/show/);
    });

    test('パネル内のショートカット項目が2列グリッドで表示される', async ({ page }) => {
      const btn = page.locator('.shortcut-in-panel [data-shortcut-toggle]');
      await btn.click({ force: true });

      const listCompact = page.locator('.shortcut-in-panel .shortcut-list-compact');

      // grid-template-columns が repeat(2, 1fr) であることを確認
      const gridColumns = await listCompact.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('grid-template-columns')
      );
      // 2列なのでスペースで区切られた2つの値がある
      expect(gridColumns.split(' ').length).toBe(2);
    });
  });

});

