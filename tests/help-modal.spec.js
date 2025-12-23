// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('使い方モーダル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('モーダル開閉', () => {
    test('ヘルプボタンが表示される', async ({ page }) => {
      const helpBtn = page.locator('#helpBtn');
      await expect(helpBtn).toBeVisible();
      await expect(helpBtn).toContainText('?');
    });

    test('ヘルプボタンクリックでモーダルが開く', async ({ page }) => {
      const helpBtn = page.locator('#helpBtn');
      const modal = page.locator('#helpModal');

      await helpBtn.click();
      await expect(modal).toHaveClass(/show/);
    });

    test('閉じるボタンでモーダルが閉じる', async ({ page }) => {
      const helpBtn = page.locator('#helpBtn');
      const modal = page.locator('#helpModal');
      const closeBtn = page.locator('#closeHelpBtn');

      await helpBtn.click();
      await expect(modal).toHaveClass(/show/);

      await closeBtn.click();
      await expect(modal).not.toHaveClass(/show/);
    });

    test('モーダル背景クリックで閉じる', async ({ page }) => {
      const helpBtn = page.locator('#helpBtn');
      const modal = page.locator('#helpModal');

      await helpBtn.click();
      await expect(modal).toHaveClass(/show/);

      // モーダル背景をクリック
      await modal.click({ position: { x: 10, y: 10 } });
      await expect(modal).not.toHaveClass(/show/);
    });
  });

  test.describe('モーダル内容', () => {
    test('タイトルが表示される', async ({ page }) => {
      await page.locator('#helpBtn').click();

      const title = page.locator('.help-modal-header h2');
      await expect(title).toHaveText('使い方');
    });

    test('3つのステップが表示される', async ({ page }) => {
      await page.locator('#helpBtn').click();

      const steps = page.locator('.help-step');
      await expect(steps).toHaveCount(3);
    });

    test('ステップ1: 動画を読み込む', async ({ page }) => {
      await page.locator('#helpBtn').click();

      const step1 = page.locator('.help-step').first();
      await expect(step1.locator('.help-step-num')).toHaveText('1');
      await expect(step1).toContainText('動画を読み込む');
    });

    test('ステップ2: A・B地点をセット', async ({ page }) => {
      await page.locator('#helpBtn').click();

      const step2 = page.locator('.help-step').nth(1);
      await expect(step2.locator('.help-step-num')).toHaveText('2');
      await expect(step2).toContainText('A・B地点をセット');
    });

    test('ステップ3: ループON', async ({ page }) => {
      await page.locator('#helpBtn').click();

      const step3 = page.locator('.help-step').nth(2);
      await expect(step3.locator('.help-step-num')).toHaveText('3');
      await expect(step3).toContainText('ループON');
    });

    test('GitHubリンクが表示される', async ({ page }) => {
      await page.locator('#helpBtn').click();

      const githubLink = page.locator('.help-footer a');
      await expect(githubLink).toBeVisible();
      await expect(githubLink).toHaveText('GitHub');
      await expect(githubLink).toHaveAttribute('href', 'https://github.com/kuronekorou39/u2b-loop');
      await expect(githubLink).toHaveAttribute('target', '_blank');
    });
  });
});
