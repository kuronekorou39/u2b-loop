// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

// テスト用動画ファイルのパス
const TEST_VIDEO_PATH = path.join(__dirname, 'fixtures', 'test-video.mp4');

/**
 * 動画読込パターンテスト
 * 全パターンで以下を確認:
 * 1. 読み込み後に自動再生される
 * 2. ローディング表示（ぐるぐる）が出ない
 */
test.describe('動画読込パターン', () => {

  // ヘルパー: URLセクションを開く
  async function ensureUrlSectionOpen(page) {
    const urlSection = page.locator('#urlSection');
    if (!(await urlSection.evaluate((el) => el.classList.contains('show')))) {
      await page.locator('#toggleUrlBtn').click();
      await expect(urlSection).toHaveClass(/show/);
    }
  }

  // ヘルパー: ローカル動画を読み込む
  async function loadLocalVideo(page, videoPath = TEST_VIDEO_PATH) {
    await ensureUrlSectionOpen(page);
    const fileInput = page.locator('#localFileInput');
    const loadFileBtn = page.locator('#loadFileBtn');
    await fileInput.setInputFiles(videoPath);
    await loadFileBtn.click();
    // ループセクションがアクティブになるまで待機
    await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
  }

  test.describe('ローカル動画のテスト', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    // パターン: 無→動画
    test('無→動画: 自動再生される', async ({ page }) => {
      await loadLocalVideo(page);

      // 動画が読み込まれた
      const video = page.locator('#localVideo');
      await expect(video).toBeVisible();

      // 再生状態を確認
      await page.waitForTimeout(500);
      const isPlaying = await video.evaluate((v) => !v.paused);
      expect(isPlaying).toBe(true);

      // 一時停止アイコンが表示されている（再生中：❚❚）
      const playBtn = page.locator('#playPauseBtn');
      await expect(playBtn).toHaveText('❚❚');
    });

    // パターン: 動画再生→動画
    test('動画再生→動画: 2つ目も自動再生される', async ({ page }) => {
      // 1つ目の動画を読み込む（自動再生される）
      await loadLocalVideo(page);

      const video = page.locator('#localVideo');
      const playBtn = page.locator('#playPauseBtn');

      // 再生中であることを確認
      await page.waitForTimeout(500);
      await expect(playBtn).toHaveText('❚❚');

      // 2つ目の動画を読み込む
      await loadLocalVideo(page);

      // 再生状態を確認
      await page.waitForTimeout(500);
      const isPlaying = await video.evaluate((v) => !v.paused);
      expect(isPlaying).toBe(true);

      // 一時停止アイコンが表示されている
      await expect(playBtn).toHaveText('❚❚');
    });

    // パターン: 動画停止→動画
    test('動画停止→動画: 自動再生される', async ({ page }) => {
      // 1つ目の動画を読み込む（自動再生される）
      await loadLocalVideo(page);

      const video = page.locator('#localVideo');
      const playBtn = page.locator('#playPauseBtn');

      // 一時停止する
      await playBtn.click();
      await page.waitForTimeout(300);
      await expect(playBtn).toHaveText('▶');

      // 2つ目の動画を読み込む
      await loadLocalVideo(page);

      // 再生状態を確認
      await page.waitForTimeout(500);
      const isPlaying = await video.evaluate((v) => !v.paused);
      expect(isPlaying).toBe(true);

      // 一時停止アイコンが表示されている
      await expect(playBtn).toHaveText('❚❚');
    });
  });

  // YouTubeテストはPlaywrightではYouTube IFrame APIの制限により実行できない
});
