// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('ローカルファイル復元モーダル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('モーダル要素', () => {
    test('復元モーダルが初期非表示', async ({ page }) => {
      const modal = page.locator('#localRestoreModal');
      await expect(modal).not.toHaveClass(/show/);
    });

    test('復元モーダルの要素が存在する', async ({ page }) => {
      const modal = page.locator('#localRestoreModal');
      await expect(modal).toBeAttached();

      const message = page.locator('#restoreModalMessage');
      await expect(message).toBeAttached();

      const selectFileBtn = page.locator('#restoreSelectFileBtn');
      await expect(selectFileBtn).toBeAttached();

      const applyOnlyBtn = page.locator('#restoreApplyOnlyBtn');
      await expect(applyOnlyBtn).toBeAttached();

      const cancelBtn = page.locator('#restoreCancelBtn');
      await expect(cancelBtn).toBeAttached();
    });

    test('復元モーダルに注意書きがある', async ({ page }) => {
      const note = page.locator('.restore-modal-note');
      await expect(note).toBeAttached();
      await expect(note).toContainText('ファイルパスは保持できません');
    });
  });

  test.describe('履歴からのローカルファイル復元', () => {
    const testLocalHistory = [
      {
        id: 1,
        type: 'local',
        isLocal: true,
        fileName: 'test-video.mp4',
        title: 'test-video.mp4',
        thumbnail: null,
        pointA: 10.5,
        pointB: 30.0,
        memo: '',
        savedAt: '2025-01-01T00:00:00.000Z'
      }
    ];

    test.beforeEach(async ({ page }) => {
      // テスト用ローカル履歴データをセット
      await page.evaluate((data) => {
        localStorage.setItem('u2bLoopHistory', JSON.stringify(data));
      }, testLocalHistory);
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('ローカル履歴アイテムをクリックで復元モーダルが開く', async ({ page }) => {
      // 履歴モーダルを開く
      await page.locator('#savedBtn').click();
      const historyModal = page.locator('#savedModal');
      await expect(historyModal).toHaveClass(/show/);

      // ローカル履歴アイテムをクリック
      const historyItem = page.locator('.history-item').first();
      await historyItem.click();

      // 復元モーダルが開く
      const restoreModal = page.locator('#localRestoreModal');
      await expect(restoreModal).toHaveClass(/show/);
    });

    test('復元モーダルにファイル名が表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();
      await page.locator('.history-item').first().click();

      const message = page.locator('#restoreModalMessage');
      await expect(message).toContainText('test-video.mp4');
    });

    test('キャンセルボタンで復元モーダルが閉じる', async ({ page }) => {
      await page.locator('#savedBtn').click();
      await page.locator('.history-item').first().click();

      const restoreModal = page.locator('#localRestoreModal');
      await expect(restoreModal).toHaveClass(/show/);

      await page.locator('#restoreCancelBtn').click();
      await expect(restoreModal).not.toHaveClass(/show/);
    });

    test('ファイル選択ボタンが表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();
      await page.locator('.history-item').first().click();

      const selectFileBtn = page.locator('#restoreSelectFileBtn');
      await expect(selectFileBtn).toBeVisible();
      await expect(selectFileBtn).toHaveText('ファイルを選択');
    });
  });
});
