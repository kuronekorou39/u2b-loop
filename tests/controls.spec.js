// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('プレーヤーコントロール', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('再生ボタン', () => {
    test('再生ボタンが表示される', async ({ page }) => {
      const playBtn = page.locator('#playPauseBtn');
      await expect(playBtn).toBeVisible();
    });

    test('初期状態で再生アイコン表示', async ({ page }) => {
      const playBtn = page.locator('#playPauseBtn');
      await expect(playBtn).toHaveText('▶');
    });
  });

  test.describe('速度セレクト', () => {
    test('速度セレクトが表示される', async ({ page }) => {
      const speedSelect = page.locator('#speedSelect');
      await expect(speedSelect).toBeVisible();
    });

    test('全ての速度オプションが存在する', async ({ page }) => {
      const speedSelect = page.locator('#speedSelect');
      const options = speedSelect.locator('option');

      await expect(options).toHaveCount(8);

      const values = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'];
      for (let i = 0; i < values.length; i++) {
        await expect(options.nth(i)).toHaveAttribute('value', values[i]);
      }
    });

    test('速度を変更できる', async ({ page }) => {
      const speedSelect = page.locator('#speedSelect');

      await speedSelect.selectOption('0.5');
      await expect(speedSelect).toHaveValue('0.5');

      await speedSelect.selectOption('2');
      await expect(speedSelect).toHaveValue('2');
    });
  });

  test.describe('ミュートボタン', () => {
    test('ミュートボタンが表示される', async ({ page }) => {
      const muteBtn = page.locator('#muteBtn');
      await expect(muteBtn).toBeVisible();
    });

    test('初期状態でミュートアイコン表示', async ({ page }) => {
      const muteBtn = page.locator('#muteBtn');
      await expect(muteBtn).toHaveText('🔇');
    });

    // 注: ミュート切替は動画読込後のみ動作するため、UI状態のみテスト
    test('ミュートボタンがクリック可能', async ({ page }) => {
      const muteBtn = page.locator('#muteBtn');
      await expect(muteBtn).toBeEnabled();
      // クリックしてもエラーにならないことを確認
      await muteBtn.click();
    });
  });

  test.describe('反転ボタン', () => {
    test('左右反転ボタンが表示される', async ({ page }) => {
      const flipHBtn = page.locator('#flipHorizontalBtn');
      await expect(flipHBtn).toBeVisible();
      await expect(flipHBtn).toHaveText('⇄');
    });

    test('上下反転ボタンが表示される', async ({ page }) => {
      const flipVBtn = page.locator('#flipVerticalBtn');
      await expect(flipVBtn).toBeVisible();
      await expect(flipVBtn).toHaveText('⇅');
    });

    test('左右反転ボタンクリックでactive状態になる', async ({ page }) => {
      const flipHBtn = page.locator('#flipHorizontalBtn');
      const playerContainer = page.locator('#playerContainer');

      await flipHBtn.click();
      await expect(flipHBtn).toHaveClass(/active/);
      await expect(playerContainer).toHaveClass(/flip-horizontal/);
    });

    test('上下反転ボタンクリックでactive状態になる', async ({ page }) => {
      const flipVBtn = page.locator('#flipVerticalBtn');
      const playerContainer = page.locator('#playerContainer');

      await flipVBtn.click();
      await expect(flipVBtn).toHaveClass(/active/);
      await expect(playerContainer).toHaveClass(/flip-vertical/);
    });

    test('反転ボタン再クリックで解除される', async ({ page }) => {
      const flipHBtn = page.locator('#flipHorizontalBtn');

      await flipHBtn.click();
      await expect(flipHBtn).toHaveClass(/active/);

      await flipHBtn.click();
      await expect(flipHBtn).not.toHaveClass(/active/);
    });

    test('両方の反転を同時に有効にできる', async ({ page }) => {
      const flipHBtn = page.locator('#flipHorizontalBtn');
      const flipVBtn = page.locator('#flipVerticalBtn');
      const playerContainer = page.locator('#playerContainer');

      await flipHBtn.click();
      await flipVBtn.click();

      await expect(playerContainer).toHaveClass(/flip-horizontal/);
      await expect(playerContainer).toHaveClass(/flip-vertical/);
    });
  });

  test.describe('フルスクリーンボタン', () => {
    test('フルスクリーンボタンが表示される', async ({ page }) => {
      const fullscreenBtn = page.locator('#fullscreenBtn');
      await expect(fullscreenBtn).toBeVisible();
    });
  });

  test.describe('YTコントロールボタン', () => {
    test('YTコントロールボタンが存在する（YouTube読込時のみ表示）', async ({ page }) => {
      const ytControlsBtn = page.locator('#ytControlsBtn');
      // YouTube読込前は非表示だが、要素は存在する
      await expect(ytControlsBtn).toBeAttached();
      await expect(ytControlsBtn).toBeHidden();
    });

    test('初期状態で非アクティブ', async ({ page }) => {
      const ytControlsBtn = page.locator('#ytControlsBtn');
      await expect(ytControlsBtn).not.toHaveClass(/active/);
    });
  });

  test.describe('シークバー', () => {
    test('シークバーが表示される', async ({ page }) => {
      const seekbar = page.locator('#seekbar');
      await expect(seekbar).toBeVisible();
    });

    test('シークバーにAB区間表示が存在する', async ({ page }) => {
      const seekbarABRegion = page.locator('#seekbarABRegion');
      await expect(seekbarABRegion).toBeAttached();
    });

    test('時間表示が存在する', async ({ page }) => {
      const currentTime = page.locator('#currentTime');
      const duration = page.locator('#duration');

      await expect(currentTime).toBeVisible();
      await expect(duration).toBeVisible();
    });

    test('初期時間が0:00', async ({ page }) => {
      const currentTime = page.locator('#currentTime');
      const duration = page.locator('#duration');

      await expect(currentTime).toHaveText('0:00');
      await expect(duration).toHaveText('0:00');
    });
  });
});
