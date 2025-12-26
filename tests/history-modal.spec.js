// @ts-check
const { test, expect } = require('@playwright/test');

// テスト用保存データ
const testSavedData = [
  {
    id: 'test-001',
    type: 'youtube',
    videoId: 'dQw4w9WgXcQ',
    title: 'テスト動画1',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
    pointA: 10.5,
    pointB: 30.0,
    memo: 'テストメモ1',
    savedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'test-002',
    type: 'youtube',
    videoId: 'abc123',
    title: 'テスト動画2',
    thumbnail: 'https://i.ytimg.com/vi/abc123/default.jpg',
    pointA: 0,
    pointB: 60.0,
    memo: '',
    savedAt: '2025-01-02T00:00:00.000Z'
  }
];

test.describe('保存モーダル', () => {
  test.describe('モーダル開閉（保存なし）', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('u2bLoopHistory'));
    });

    test('保存ボタンクリックでモーダルが開く', async ({ page }) => {
      const savedBtn = page.locator('#savedBtn');
      const modal = page.locator('#savedModal');

      await savedBtn.click();
      await expect(modal).toHaveClass(/show/);
    });

    test('閉じるボタンでモーダルが閉じる', async ({ page }) => {
      const savedBtn = page.locator('#savedBtn');
      const modal = page.locator('#savedModal');
      const closeBtn = page.locator('#closeSavedBtn');

      await savedBtn.click();
      await expect(modal).toHaveClass(/show/);

      await closeBtn.click();
      await expect(modal).not.toHaveClass(/show/);
    });

    test('モーダル背景クリックで閉じる', async ({ page }) => {
      const savedBtn = page.locator('#savedBtn');
      const modal = page.locator('#savedModal');

      await savedBtn.click();
      await expect(modal).toHaveClass(/show/);

      // モーダル背景（モーダル自体）をクリック
      await modal.click({ position: { x: 10, y: 10 } });
      await expect(modal).not.toHaveClass(/show/);
    });
  });

  test.describe('モーダルヘッダー', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('タイトルが表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const title = page.locator('#savedModal .history-modal-header h2');
      await expect(title).toHaveText('保存一覧');
    });

    test('閉じるボタンが表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const closeBtn = page.locator('#closeSavedBtn');
      await expect(closeBtn).toBeVisible();
      await expect(closeBtn).toHaveText('✕');
    });
  });

  test.describe('ツールバー', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('読込ボタンが表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const importBtn = page.locator('#savedImportBtn');
      await expect(importBtn).toBeVisible();
      await expect(importBtn).toContainText('読込');
    });

    test('書出ボタンが表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const exportBtn = page.locator('#exportSelectBtn');
      await expect(exportBtn).toBeVisible();
      await expect(exportBtn).toContainText('書出');
    });

    test('全削除ボタンが表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const clearBtn = page.locator('#clearAllSavedBtn');
      await expect(clearBtn).toBeVisible();
      await expect(clearBtn).toContainText('全削除');
    });

    test('インポート用ファイル入力が存在する', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const importInput = page.locator('#importSavedInput');
      await expect(importInput).toHaveAttribute('type', 'file');
      await expect(importInput).toHaveAttribute('accept', '.json');
    });
  });

  test.describe('選択モードツールバー（保存あり）', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      // テスト用保存データをセット
      await page.evaluate((data) => {
        localStorage.setItem('u2bLoopHistory', JSON.stringify(data));
      }, testSavedData);
      // リロードして保存データを反映
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('選択モードツールバーが初期非表示', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const selectToolbar = page.locator('.select-mode-toolbar');
      await expect(selectToolbar).toBeHidden();
    });

    test('保存ボタンクリックで選択モードになる', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const exportBtn = page.locator('#exportSelectBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();

      const selectToolbar = page.locator('.select-mode-toolbar');
      await expect(selectToolbar).toBeVisible();
    });

    test('キャンセルで選択モードが終了する', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const exportBtn = page.locator('#exportSelectBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();

      const cancelBtn = page.locator('#cancelSelectBtn');
      await cancelBtn.click();

      const selectToolbar = page.locator('.select-mode-toolbar');
      await expect(selectToolbar).toBeHidden();
    });

    test('選択モードに全選択・全解除ボタンがある', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const exportBtn = page.locator('#exportSelectBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();

      await expect(page.locator('#selectAllBtn')).toBeVisible();
      await expect(page.locator('#deselectAllBtn')).toBeVisible();
    });

    test('選択件数表示がある', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const exportBtn = page.locator('#exportSelectBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();

      const countDisplay = page.locator('#selectedCount');
      await expect(countDisplay).toBeVisible();
      await expect(countDisplay).toContainText('0件選択中');
    });

    test('保存アイテムが表示される', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const savedList = page.locator('#savedList');
      const items = savedList.locator('.history-item');
      await expect(items).toHaveCount(2);
    });

    test('全選択ボタンで全件選択される', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const exportBtn = page.locator('#exportSelectBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();
      await page.locator('#selectAllBtn').click();

      const countDisplay = page.locator('#selectedCount');
      await expect(countDisplay).toContainText('2件選択中');
    });

    test('全解除ボタンで選択解除される', async ({ page }) => {
      await page.locator('#savedBtn').click();
      const modal = page.locator('#savedModal');
      await expect(modal).toHaveClass(/show/);

      const exportBtn = page.locator('#exportSelectBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();
      await page.locator('#selectAllBtn').click();
      await page.locator('#deselectAllBtn').click();

      const countDisplay = page.locator('#selectedCount');
      await expect(countDisplay).toContainText('0件選択中');
    });
  });

  test.describe('保存リスト（保存なし）', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('u2bLoopHistory'));
    });

    test('保存リストコンテナが存在する', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const savedList = page.locator('#savedList');
      await expect(savedList).toBeVisible();
    });

    test('保存が空の場合アイテムがない', async ({ page }) => {
      await page.locator('#savedBtn').click();

      const savedList = page.locator('#savedList');
      const items = savedList.locator('.history-item');
      await expect(items).toHaveCount(0);
    });
  });
});

test.describe('履歴モーダル', () => {
  test.describe('モーダル開閉', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('履歴ボタンクリックでモーダルが開く', async ({ page }) => {
      const historyBtn = page.locator('#historyBtn');
      const modal = page.locator('#historyModal');

      await historyBtn.click();
      await expect(modal).toHaveClass(/show/);
    });

    test('閉じるボタンでモーダルが閉じる', async ({ page }) => {
      const historyBtn = page.locator('#historyBtn');
      const modal = page.locator('#historyModal');
      const closeBtn = page.locator('#closeHistoryBtn');

      await historyBtn.click();
      await expect(modal).toHaveClass(/show/);

      await closeBtn.click();
      await expect(modal).not.toHaveClass(/show/);
    });

    test('履歴が空の場合、空メッセージが表示される', async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('u2bLoopViewHistory'));
      await page.reload();

      await page.locator('#historyBtn').click();

      const emptyMsg = page.locator('.history-empty');
      await expect(emptyMsg).toBeVisible();
      await expect(emptyMsg).toContainText('履歴がありません');
    });
  });

  test.describe('モーダルヘッダー', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('タイトルが表示される', async ({ page }) => {
      await page.locator('#historyBtn').click();

      const title = page.locator('#historyModal .history-modal-header h2');
      await expect(title).toHaveText('履歴');
    });

    test('説明文が表示される', async ({ page }) => {
      await page.locator('#historyBtn').click();

      const note = page.locator('#historyModal .history-note');
      await expect(note).toBeVisible();
      await expect(note).toContainText('動画読み込み時に自動記録');
    });
  });
});
