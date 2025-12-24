// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * 統合テスト
 * 実際に動画を読み込んで、AB区間設定・ループ・履歴保存の動作を確認
 */

test.describe('統合テスト: ローカル動画', () => {
  const testVideoPath = path.join(__dirname, 'fixtures', 'test-video.mp4');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // LocalStorageをクリア（履歴をリセット）
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('動画読込とループセクション活性化', () => {
    test('動画読込前はループセクションが非活性', async ({ page }) => {
      const loopSection = page.locator('.loop-section');
      await expect(loopSection).toHaveClass(/inactive/);
    });

    test('ローカル動画を読み込むとループセクションがアクティブになる', async ({ page }) => {
      const loopSection = page.locator('.loop-section');
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      const duration = page.locator('#duration');

      // 動画ファイルを選択
      await fileInput.setInputFiles(testVideoPath);
      // 読込ボタンをクリック
      await loadFileBtn.click();

      // 動画が読み込まれるまで待機（durationが変わるのを確認）
      await expect(duration).not.toHaveText('0:00', { timeout: 15000 });

      // ループセクションがアクティブになっている
      await expect(loopSection).not.toHaveClass(/inactive/);
    });

    test('動画読込後にdurationが設定される', async ({ page }) => {
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      const duration = page.locator('#duration');

      await fileInput.setInputFiles(testVideoPath);
      await loadFileBtn.click();

      // durationが0:00以外になるまで待機
      await expect(duration).not.toHaveText('0:00', { timeout: 10000 });
    });
  });

  test.describe('AB区間設定', () => {
    test.beforeEach(async ({ page }) => {
      // 動画を読み込み
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      await fileInput.setInputFiles(testVideoPath);
      await loadFileBtn.click();
      // ループセクションがアクティブになるまで待機
      await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
    });

    test('A地点を入力できる', async ({ page }) => {
      const pointAInput = page.locator('#pointAInput');
      await pointAInput.fill('0:01.000');
      await pointAInput.press('Enter');

      await expect(pointAInput).toHaveValue('0:01.000');
    });

    test('B地点を入力できる', async ({ page }) => {
      const pointBInput = page.locator('#pointBInput');
      await pointBInput.fill('0:03.000');
      await pointBInput.press('Enter');

      await expect(pointBInput).toHaveValue('0:03.000');
    });

    test('ループボタンをONにできる', async ({ page }) => {
      const loopBtn = page.locator('#loopToggleBtn');

      await loopBtn.click();

      await expect(loopBtn).toHaveClass(/active/);
      await expect(loopBtn.locator('.loop-text')).toHaveText('ループ ON');
    });

    test('A地点の+/-ボタンで値を調整できる', async ({ page }) => {
      const pointAInput = page.locator('#pointAInput');
      const plusBtn = page.locator('#pointAPlus');
      const minusBtn = page.locator('#pointAMinus');

      // 初期値は0:00.000
      await expect(pointAInput).toHaveValue('0:00.000');

      // +ボタンでインクリメント（デフォルトステップ0.1s）
      await plusBtn.click();
      await expect(pointAInput).toHaveValue('0:00.100');

      // もう一度+
      await plusBtn.click();
      await expect(pointAInput).toHaveValue('0:00.200');

      // -ボタンでデクリメント
      await minusBtn.click();
      await expect(pointAInput).toHaveValue('0:00.100');
    });
  });

  test.describe('履歴保存と復元', () => {
    test.beforeEach(async ({ page }) => {
      // 動画を読み込み
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      await fileInput.setInputFiles(testVideoPath);
      await loadFileBtn.click();
      await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
    });

    test('履歴に保存できる', async ({ page }) => {
      const pointAInput = page.locator('#pointAInput');
      const pointBInput = page.locator('#pointBInput');
      const saveBtn = page.locator('#saveHistoryBtn');
      const historyBtn = page.locator('#historyBtn');
      const historyModal = page.locator('#historyModal');

      // AB区間を設定
      await pointAInput.fill('0:01.000');
      await pointAInput.press('Enter');
      await pointBInput.fill('0:03.000');
      await pointBInput.press('Enter');

      // 履歴に保存（メモモーダルが表示される）
      await saveBtn.click();
      // メモモーダルの保存ボタンをクリック
      await page.locator('.memo-modal-btn.save').click();

      // 履歴モーダルを開いて確認
      await historyBtn.click();
      await expect(historyModal).toHaveClass(/show/);

      // 履歴アイテムが存在する
      const historyItems = historyModal.locator('.history-item');
      await expect(historyItems).toHaveCount(1);

      // AB区間が正しく保存されている
      const historyMeta = historyModal.locator('.history-meta');
      await expect(historyMeta).toContainText('0:01.000');
      await expect(historyMeta).toContainText('0:03.000');
    });

    test('保存した履歴を削除できる', async ({ page }) => {
      const saveBtn = page.locator('#saveHistoryBtn');
      const historyBtn = page.locator('#historyBtn');
      const historyModal = page.locator('#historyModal');
      const deleteAllBtn = page.locator('#clearAllHistoryBtn');

      // 履歴に保存（メモモーダルが表示される）
      await saveBtn.click();
      await page.locator('.memo-modal-btn.save').click();

      // 履歴モーダルを開く
      await historyBtn.click();
      await expect(historyModal).toHaveClass(/show/);

      // 履歴アイテムが存在することを確認
      const historyItems = historyModal.locator('.history-item');
      await expect(historyItems).toHaveCount(1);

      // ダイアログを自動的に承認するように設定
      page.on('dialog', dialog => dialog.accept());

      // 全削除
      await deleteAllBtn.click();

      // 履歴が空になる
      await expect(historyItems).toHaveCount(0);
    });
  });

  test.describe('ループ動作', () => {
    test.beforeEach(async ({ page }) => {
      // 動画を読み込み
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      await fileInput.setInputFiles(testVideoPath);
      await loadFileBtn.click();
      await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
    });

    test('動画読込後に自動再生される', async ({ page }) => {
      const playBtn = page.locator('#playPauseBtn');

      // 自動再生で再生状態になっている
      await page.waitForTimeout(500);
      await expect(playBtn).toHaveText('❚❚');
    });

    test('再生中にクリックで一時停止できる', async ({ page }) => {
      const playBtn = page.locator('#playPauseBtn');

      // 自動再生中
      await page.waitForTimeout(500);
      await expect(playBtn).toHaveText('❚❚');

      // 一時停止
      await playBtn.click();
      await expect(playBtn).toHaveText('▶');

      // 再度クリックで再生
      await playBtn.click();
      await expect(playBtn).toHaveText('❚❚');
    });

    test('シークバーで再生位置を変更できる', async ({ page }) => {
      const seekbar = page.locator('#seekbar');
      const currentTime = page.locator('#currentTime');

      // シークバーの値を変更
      await seekbar.evaluate((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        input.value = '2';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // 現在時間が更新される（少し待つ）
      await page.waitForTimeout(500);
      const timeText = await currentTime.textContent();
      expect(timeText).toMatch(/0:0[12]/); // 0:01 or 0:02
    });
  });

  test.describe('速度変更', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      await fileInput.setInputFiles(testVideoPath);
      await loadFileBtn.click();
      await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
    });

    test('再生速度を変更できる', async ({ page }) => {
      const speedSelect = page.locator('#speedSelect');

      // 1.5xに変更
      await speedSelect.selectOption('1.5');
      await expect(speedSelect).toHaveValue('1.5');

      // 0.5xに変更
      await speedSelect.selectOption('0.5');
      await expect(speedSelect).toHaveValue('0.5');
    });
  });

  test.describe('反転機能', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      await fileInput.setInputFiles(testVideoPath);
      await loadFileBtn.click();
      await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
    });

    test('左右反転を適用できる', async ({ page }) => {
      const flipHBtn = page.locator('#flipHorizontalBtn');
      const localVideo = page.locator('#localVideo');

      await flipHBtn.click();

      // ボタンがアクティブになる
      await expect(flipHBtn).toHaveClass(/active/);

      // 動画にscaleX(-1)が適用される
      const transform = await localVideo.evaluate((el) => getComputedStyle(el).transform);
      expect(transform).toContain('-1');
    });

    test('上下反転を適用できる', async ({ page }) => {
      const flipVBtn = page.locator('#flipVerticalBtn');
      const localVideo = page.locator('#localVideo');

      await flipVBtn.click();

      await expect(flipVBtn).toHaveClass(/active/);

      const transform = await localVideo.evaluate((el) => getComputedStyle(el).transform);
      expect(transform).toContain('-1');
    });
  });

  test.describe('ミュート機能', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('#localFileInput');
      const loadFileBtn = page.locator('#loadFileBtn');
      await fileInput.setInputFiles(testVideoPath);
      await loadFileBtn.click();
      await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
    });

    test('ミュートを切り替えできる', async ({ page }) => {
      const muteBtn = page.locator('#muteBtn');

      // 初期状態（ミュートOFF）
      await expect(muteBtn).toHaveText('♪');

      // ミュートON（アイコンが変わる）
      await muteBtn.click();
      await expect(muteBtn).toHaveClass(/muted/);

      // ミュートOFF
      await muteBtn.click();
      await expect(muteBtn).not.toHaveClass(/muted/);
    });
  });
});

test.describe('統合テスト: 複数履歴', () => {
  const testVideoPath = path.join(__dirname, 'fixtures', 'test-video.mp4');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('複数の履歴を保存できる', async ({ page }) => {
    const fileInput = page.locator('#localFileInput');
    const loadFileBtn = page.locator('#loadFileBtn');
    const pointAInput = page.locator('#pointAInput');
    const pointBInput = page.locator('#pointBInput');
    const saveBtn = page.locator('#saveHistoryBtn');
    const historyBtn = page.locator('#historyBtn');
    const historyModal = page.locator('#historyModal');

    // 動画を読み込み
    await fileInput.setInputFiles(testVideoPath);
    await loadFileBtn.click();
    await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });

    // 1つ目の履歴
    await pointAInput.fill('0:00.500');
    await pointAInput.press('Enter');
    await pointBInput.fill('0:01.500');
    await pointBInput.press('Enter');
    await saveBtn.click();
    await page.locator('.memo-modal-btn.save').click();

    // 2つ目の履歴
    await pointAInput.fill('0:02.000');
    await pointAInput.press('Enter');
    await pointBInput.fill('0:03.500');
    await pointBInput.press('Enter');
    await saveBtn.click();
    await page.locator('.memo-modal-btn.save').click();

    // 履歴モーダルを開いて確認
    await historyBtn.click();
    await expect(historyModal).toHaveClass(/show/);

    const historyItems = historyModal.locator('.history-item');
    await expect(historyItems).toHaveCount(2);
  });

  test('エクスポート用の選択モードに入れる', async ({ page }) => {
    const fileInput = page.locator('#localFileInput');
    const loadFileBtn = page.locator('#loadFileBtn');
    const saveBtn = page.locator('#saveHistoryBtn');
    const historyBtn = page.locator('#historyBtn');
    const historyModal = page.locator('#historyModal');
    const exportBtn = page.locator('#exportSelectBtn');
    const selectModeToolbar = page.locator('#historyToolbarSelect');

    // 動画を読み込んで履歴保存
    await fileInput.setInputFiles(testVideoPath);
    await loadFileBtn.click();
    await expect(page.locator('.loop-section')).not.toHaveClass(/inactive/, { timeout: 10000 });
    await saveBtn.click();
    await page.locator('.memo-modal-btn.save').click();

    // 履歴モーダルを開く
    await historyBtn.click();
    await expect(historyModal).toHaveClass(/show/);

    // エクスポート（保存）ボタンが表示される
    await expect(exportBtn).toBeVisible();

    // 保存ボタンをクリックすると選択モードに入る
    await exportBtn.click();
    await expect(selectModeToolbar).toBeVisible();

    // キャンセルボタンで選択モードを抜ける
    await page.locator('#cancelSelectBtn').click();
    await expect(selectModeToolbar).not.toBeVisible();
  });
});
