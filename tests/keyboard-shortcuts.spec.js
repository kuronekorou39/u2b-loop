// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('キーボードショートカット', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // ページにフォーカスを当てる
    await page.locator('body').click();
  });

  // 注: ミュートショートカットは動画読込後のみ動作するためスキップ
  test.describe('ミュート (M)', () => {
    test.skip('Mキーでミュートが切り替わる（要動画）', async ({ page }) => {
      const muteBtn = page.locator('#muteBtn');

      await page.keyboard.press('m');
      await expect(muteBtn).toHaveClass(/muted/);

      await page.keyboard.press('m');
      await expect(muteBtn).not.toHaveClass(/muted/);
    });

    test.skip('大文字Mでも動作する（要動画）', async ({ page }) => {
      const muteBtn = page.locator('#muteBtn');

      await page.keyboard.press('M');
      await expect(muteBtn).toHaveClass(/muted/);
    });
  });

  test.describe('ループ (L)', () => {
    test('Lキーでループが切り替わる', async ({ page }) => {
      const loopBtn = page.locator('#loopToggleBtn');

      await page.keyboard.press('l');
      await expect(loopBtn).toHaveClass(/active/);

      await page.keyboard.press('l');
      await expect(loopBtn).not.toHaveClass(/active/);
    });
  });

  test.describe('左右反転 (H)', () => {
    test('Hキーで左右反転が切り替わる', async ({ page }) => {
      const flipHBtn = page.locator('#flipHorizontalBtn');
      const playerContainer = page.locator('#playerContainer');

      await page.keyboard.press('h');
      await expect(flipHBtn).toHaveClass(/active/);
      await expect(playerContainer).toHaveClass(/flip-horizontal/);

      await page.keyboard.press('h');
      await expect(flipHBtn).not.toHaveClass(/active/);
      await expect(playerContainer).not.toHaveClass(/flip-horizontal/);
    });
  });

  test.describe('上下反転 (V)', () => {
    test('Vキーで上下反転が切り替わる', async ({ page }) => {
      const flipVBtn = page.locator('#flipVerticalBtn');
      const playerContainer = page.locator('#playerContainer');

      await page.keyboard.press('v');
      await expect(flipVBtn).toHaveClass(/active/);
      await expect(playerContainer).toHaveClass(/flip-vertical/);

      await page.keyboard.press('v');
      await expect(flipVBtn).not.toHaveClass(/active/);
      await expect(playerContainer).not.toHaveClass(/flip-vertical/);
    });
  });

  test.describe('入力フィールドでは無効', () => {
    test('URL入力中はショートカットが無効', async ({ page }) => {
      const urlInput = page.locator('#videoUrl');
      const muteBtn = page.locator('#muteBtn');

      await urlInput.focus();
      await page.keyboard.press('m');

      // ミュートは切り替わらない
      await expect(muteBtn).not.toHaveClass(/muted/);
    });

    test('A地点入力中はショートカットが無効', async ({ page }) => {
      const pointAInput = page.locator('#pointAInput');
      const loopBtn = page.locator('#loopToggleBtn');

      await pointAInput.focus();
      await page.keyboard.press('l');

      // ループは切り替わらない
      await expect(loopBtn).not.toHaveClass(/active/);
    });

    test('B地点入力中はショートカットが無効', async ({ page }) => {
      const pointBInput = page.locator('#pointBInput');
      const loopBtn = page.locator('#loopToggleBtn');

      await pointBInput.focus();
      await page.keyboard.press('l');

      // ループは切り替わらない
      await expect(loopBtn).not.toHaveClass(/active/);
    });
  });

  test.describe('ショートカット一覧の表示確認', () => {
    test('縦並び時にヘッダーのショートカットアコーディオンをクリックで開く', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(100);

      const shortcutBtn = page.locator('#shortcutAccordionBtn');
      const shortcutContent = page.locator('#shortcutAccordionContent');

      await shortcutBtn.click();
      // ショートカットコンテンツが表示される（またはボタンがopen状態になる）
      await expect(shortcutContent).toBeVisible();
    });

    test('ショートカット一覧に全ての項目が表示される', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(100);

      await page.locator('#shortcutAccordionBtn').click();
      await page.waitForTimeout(100);

      const shortcutItems = page.locator('#shortcutAccordionContent .shortcut-item');
      await expect(shortcutItems).toHaveCount(10);
    });

    test('再クリックでショートカット一覧が閉じる', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(100);

      const shortcutBtn = page.locator('#shortcutAccordionBtn');
      const shortcutContent = page.locator('#shortcutAccordionContent');

      await shortcutBtn.click();
      await expect(shortcutContent).toBeVisible();

      await shortcutBtn.click();
      await expect(shortcutContent).toBeHidden();
    });
  });
});
