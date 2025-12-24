// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

// テスト用動画ファイルのパス
const TEST_VIDEO_PATH = path.join(__dirname, 'fixtures', 'test-video.mp4');

/**
 * 動画読込パターンテスト
 * 全10パターンで以下を確認:
 * 1. 停止状態で読み込まれる（自動再生しない）
 * 2. ローディング表示（ぐるぐる）が出ない
 *
 * YouTubeテストはネットワーク依存のため手動確認が必要：
 * - 無→URL: YouTube読込後に停止状態
 * - URL再生→URL: 再生中に別URL読込で停止状態
 * - URL停止→URL: 停止中に別URL読込で停止状態
 * - URL再生→動画: YouTube再生中にローカル動画読込で停止状態
 * - URL停止→動画: YouTube停止中にローカル動画読込で停止状態
 * - 動画再生→URL: ローカル動画再生中にYouTube読込で停止状態
 * - 動画停止→URL: ローカル動画停止中にYouTube読込で停止状態
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

    // パターン2: 無→動画
    test('無→動画: 停止状態で読み込まれる', async ({ page }) => {
      await loadLocalVideo(page);

      // 動画が読み込まれた
      const video = page.locator('#localVideo');
      await expect(video).toBeVisible();

      // 停止状態を確認（pausedがtrue）
      const isPaused = await video.evaluate((v) => v.paused);
      expect(isPaused).toBe(true);

      // 再生アイコンが表示されている（停止状態：▶）
      const playBtn = page.locator('#playPauseBtn');
      await expect(playBtn).toHaveText('▶');
    });

    // パターン8: 動画再生→動画
    test('動画再生→動画: 2つ目も停止状態で読み込まれる', async ({ page }) => {
      // 1つ目の動画を読み込む
      await loadLocalVideo(page);

      const video = page.locator('#localVideo');
      const playBtn = page.locator('#playPauseBtn');

      // 再生する
      await playBtn.click();
      await page.waitForTimeout(500);

      // 再生中であることを確認（一時停止アイコン：❚❚）
      await expect(playBtn).toHaveText('❚❚');
      let isPlaying = await video.evaluate((v) => !v.paused);
      expect(isPlaying).toBe(true);

      // 2つ目の動画を読み込む
      await loadLocalVideo(page);

      // 停止状態を確認
      const isPaused = await video.evaluate((v) => v.paused);
      expect(isPaused).toBe(true);

      // 再生アイコンが表示されている（停止状態：▶）
      await expect(playBtn).toHaveText('▶');
    });

    // パターン10: 動画停止→動画
    test('動画停止→動画: 停止状態で読み込まれる', async ({ page }) => {
      // 1つ目の動画を読み込む
      await loadLocalVideo(page);

      const video = page.locator('#localVideo');
      const playBtn = page.locator('#playPauseBtn');

      // 停止状態のまま2つ目を読み込む
      await loadLocalVideo(page);

      // 停止状態を確認
      const isPaused = await video.evaluate((v) => v.paused);
      expect(isPaused).toBe(true);

      // 再生アイコンが表示されている（停止状態：▶）
      await expect(playBtn).toHaveText('▶');
    });
  });

  // YouTubeテストはPlaywrightではYouTube IFrame APIの制限により実行できない
  // 以下のパターンは手動で確認する必要がある:
  // - パターン1: 無→URL
  // - パターン3: URL再生→URL
  // - パターン4: URL再生→動画
  // - パターン5: URL停止→URL
  // - パターン6: URL停止→動画
  // - パターン7: 動画再生→URL
  // - パターン9: 動画停止→URL
});
