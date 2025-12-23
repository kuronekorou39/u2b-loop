// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('URL入力セクション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('トグルボタンクリックでセクションが非表示になる', async ({ page }) => {
    const toggleBtn = page.locator('#toggleUrlBtn');
    const urlSection = page.locator('#urlSection');

    await expect(urlSection).toHaveClass(/show/);

    await toggleBtn.click();
    await expect(urlSection).not.toHaveClass(/show/);
  });

  test('トグルボタン再クリックでセクションが表示される', async ({ page }) => {
    const toggleBtn = page.locator('#toggleUrlBtn');
    const urlSection = page.locator('#urlSection');

    await toggleBtn.click();
    await expect(urlSection).not.toHaveClass(/show/);

    await toggleBtn.click();
    await expect(urlSection).toHaveClass(/show/);
  });

  test('トグルボタンのshowクラスが切り替わる', async ({ page }) => {
    const toggleBtn = page.locator('#toggleUrlBtn');

    await expect(toggleBtn).toHaveClass(/show/);

    await toggleBtn.click();
    await expect(toggleBtn).not.toHaveClass(/show/);
  });

  test('矢印が回転する', async ({ page }) => {
    const toggleBtn = page.locator('#toggleUrlBtn');
    const arrow = toggleBtn.locator('.toggle-arrow');

    // 表示時: 矢印が回転状態（親がshowクラス）
    await expect(toggleBtn).toHaveClass(/show/);

    await toggleBtn.click();

    // 非表示時: 矢印が通常状態
    await expect(toggleBtn).not.toHaveClass(/show/);
  });

  test('YouTube URL入力欄が存在する', async ({ page }) => {
    const urlInput = page.locator('#videoUrl');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('placeholder', 'URLを貼り付け');
  });

  test('YouTube URL入力欄にテキストを入力できる', async ({ page }) => {
    const urlInput = page.locator('#videoUrl');
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    await urlInput.fill(testUrl);
    await expect(urlInput).toHaveValue(testUrl);
  });

  test('YouTube読込ボタンが存在する', async ({ page }) => {
    const loadBtn = page.locator('#loadBtn');
    await expect(loadBtn).toBeVisible();
    await expect(loadBtn).toHaveText('読込');
  });

  test('ファイル入力ラベルが存在する', async ({ page }) => {
    const fileLabel = page.locator('#fileNameDisplay');
    await expect(fileLabel).toBeVisible();
    await expect(fileLabel).toHaveText('選択...');
  });

  test('ファイル読込ボタンが存在する', async ({ page }) => {
    const loadFileBtn = page.locator('#loadFileBtn');
    await expect(loadFileBtn).toBeVisible();
    await expect(loadFileBtn).toHaveText('読込');
  });

  test('ファイル入力が非表示で存在する', async ({ page }) => {
    const fileInput = page.locator('#localFileInput');
    await expect(fileInput).toHaveAttribute('type', 'file');
    await expect(fileInput).toHaveAttribute('accept', 'video/*');
  });

  test('ソースラベルが表示される', async ({ page }) => {
    const labels = page.locator('.source-label');
    await expect(labels.first()).toHaveText('YouTube');
    await expect(labels.last()).toHaveText('ファイル');
  });
});
