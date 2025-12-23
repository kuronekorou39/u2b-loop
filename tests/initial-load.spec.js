// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('初期ロード', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正常にロードされる', async ({ page }) => {
    await expect(page).toHaveTitle('U2B-Loop');
  });

  test('ロゴが表示される', async ({ page }) => {
    const logo = page.locator('.header-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('alt', 'U2B-Loop');
  });

  test('ヘッダーボタンが全て表示される', async ({ page }) => {
    await expect(page.locator('#toggleUrlBtn')).toBeVisible();
    await expect(page.locator('#layoutBtn')).toBeVisible();
    await expect(page.locator('#historyBtn')).toBeVisible();
    await expect(page.locator('#themeBtn')).toBeVisible();
  });

  test('URL入力セクションが初期表示される', async ({ page }) => {
    const urlSection = page.locator('#urlSection');
    await expect(urlSection).toHaveClass(/show/);
  });

  test('プレーヤーコンテナが存在する', async ({ page }) => {
    await expect(page.locator('#playerContainer')).toBeVisible();
  });

  test('シークバーが存在する', async ({ page }) => {
    await expect(page.locator('#seekbar')).toBeVisible();
  });

  test('再生ボタンが存在する', async ({ page }) => {
    await expect(page.locator('#playPauseBtn')).toBeVisible();
  });

  test('速度セレクトが1xで初期化される', async ({ page }) => {
    const speedSelect = page.locator('#speedSelect');
    await expect(speedSelect).toHaveValue('1');
  });

  test('ミュートボタンが存在する', async ({ page }) => {
    await expect(page.locator('#muteBtn')).toBeVisible();
  });

  test('反転ボタンが存在する', async ({ page }) => {
    await expect(page.locator('#flipHorizontalBtn')).toBeVisible();
    await expect(page.locator('#flipVerticalBtn')).toBeVisible();
  });

  test('フルスクリーンボタンが存在する', async ({ page }) => {
    await expect(page.locator('#fullscreenBtn')).toBeVisible();
  });

  test('ループセクションが存在する', async ({ page }) => {
    await expect(page.locator('.loop-section')).toBeVisible();
  });

  test('ループトグルボタンがOFF状態で初期化される', async ({ page }) => {
    const loopBtn = page.locator('#loopToggleBtn');
    await expect(loopBtn).toBeVisible();
    await expect(loopBtn).not.toHaveClass(/active/);
    await expect(loopBtn.locator('.loop-text')).toHaveText('ループ OFF');
  });

  test('A地点・B地点の入力欄が存在する', async ({ page }) => {
    await expect(page.locator('#pointAInput')).toBeVisible();
    await expect(page.locator('#pointBInput')).toBeVisible();
  });

  test('履歴モーダルが初期非表示', async ({ page }) => {
    const modal = page.locator('#historyModal');
    await expect(modal).not.toHaveClass(/show/);
  });
});
