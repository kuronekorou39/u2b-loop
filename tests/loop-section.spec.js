// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('ループセクション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('ループトグル', () => {
    test('ループボタンが表示される', async ({ page }) => {
      const loopBtn = page.locator('#loopToggleBtn');
      await expect(loopBtn).toBeVisible();
    });

    test('初期状態でOFF', async ({ page }) => {
      const loopBtn = page.locator('#loopToggleBtn');
      await expect(loopBtn).not.toHaveClass(/active/);
      await expect(loopBtn.locator('.loop-text')).toHaveText('ループ OFF');
    });

    test('クリックでONになる', async ({ page }) => {
      const loopBtn = page.locator('#loopToggleBtn');

      await loopBtn.click();
      await expect(loopBtn).toHaveClass(/active/);
      await expect(loopBtn.locator('.loop-text')).toHaveText('ループ ON');
    });

    test('再クリックでOFFになる', async ({ page }) => {
      const loopBtn = page.locator('#loopToggleBtn');

      await loopBtn.click();
      await loopBtn.click();

      await expect(loopBtn).not.toHaveClass(/active/);
      await expect(loopBtn.locator('.loop-text')).toHaveText('ループ OFF');
    });
  });

  test.describe('空白（Gap）ボタン', () => {
    test('Gapボタンが全て表示される', async ({ page }) => {
      const gapButtons = page.locator('.gap-btn');
      await expect(gapButtons).toHaveCount(5);
    });

    test('初期状態で0が選択されている', async ({ page }) => {
      const gap0Btn = page.locator('.gap-btn[data-gap="0"]');
      await expect(gap0Btn).toHaveClass(/active/);
    });

    test('他のGapボタンをクリックすると選択が切り替わる', async ({ page }) => {
      const gap0Btn = page.locator('.gap-btn[data-gap="0"]');
      const gap5Btn = page.locator('.gap-btn[data-gap="5"]');

      await gap5Btn.click();

      await expect(gap5Btn).toHaveClass(/active/);
      await expect(gap0Btn).not.toHaveClass(/active/);
    });

    test('全てのGap値が正しい', async ({ page }) => {
      const expectedValues = ['0', '2', '5', '10', '30'];

      for (const value of expectedValues) {
        const btn = page.locator(`.gap-btn[data-gap="${value}"]`);
        await expect(btn).toBeVisible();
        await expect(btn).toHaveText(value);
      }
    });
  });

  test.describe('AB区間シークバー', () => {
    test('AB区間シークバーが表示される', async ({ page }) => {
      const abSeekbar = page.locator('#abSeekbar');
      await expect(abSeekbar).toBeVisible();
    });

    test('A地点マーカーが存在する', async ({ page }) => {
      const pointA = page.locator('#pointA');
      // position: absolute要素なのでtoBeAttachedで確認
      await expect(pointA).toBeAttached();
    });

    test('B地点マーカーが存在する', async ({ page }) => {
      const pointB = page.locator('#pointB');
      await expect(pointB).toBeAttached();
    });

    test('AB区間表示が存在する', async ({ page }) => {
      const abRegion = page.locator('#abRegion');
      await expect(abRegion).toBeAttached();
    });

    test('現在位置マーカーが存在する', async ({ page }) => {
      const currentPos = page.locator('#abCurrentPos');
      await expect(currentPos).toBeAttached();
    });
  });

  test.describe('A地点カード', () => {
    test('A地点入力欄が表示される', async ({ page }) => {
      const pointAInput = page.locator('#pointAInput');
      await expect(pointAInput).toBeVisible();
      await expect(pointAInput).toHaveAttribute('placeholder', '0:00.000');
    });

    test('A地点の-ボタンが表示される', async ({ page }) => {
      const minusBtn = page.locator('#pointAMinus');
      await expect(minusBtn).toBeVisible();
      await expect(minusBtn).toHaveText('−');
    });

    test('A地点の+ボタンが表示される', async ({ page }) => {
      const plusBtn = page.locator('#pointAPlus');
      await expect(plusBtn).toBeVisible();
      await expect(plusBtn).toHaveText('+');
    });

    test('A地点のステップセレクトが表示される', async ({ page }) => {
      const stepSelect = page.locator('#stepSelectA');
      await expect(stepSelect).toBeVisible();
    });

    test('A地点のステップセレクト初期値が0.1s', async ({ page }) => {
      const stepSelect = page.locator('#stepSelectA');
      await expect(stepSelect).toHaveValue('0.1');
    });

    test('A地点の「現在位置」ボタンが表示される', async ({ page }) => {
      const setBtn = page.locator('#setPointABtn');
      await expect(setBtn).toBeVisible();
      await expect(setBtn).toHaveText('現在');
    });

    test('A地点のリセットボタンが表示される', async ({ page }) => {
      const resetBtn = page.locator('#resetPointABtn');
      await expect(resetBtn).toBeVisible();
    });

    test('A地点入力欄に時間を入力できる', async ({ page }) => {
      const pointAInput = page.locator('#pointAInput');
      await pointAInput.fill('1:30.500');
      await expect(pointAInput).toHaveValue('1:30.500');
    });

    test('ステップセレクトの値を変更できる', async ({ page }) => {
      const stepSelect = page.locator('#stepSelectA');

      await stepSelect.selectOption('1');
      await expect(stepSelect).toHaveValue('1');

      await stepSelect.selectOption('0.001');
      await expect(stepSelect).toHaveValue('0.001');
    });
  });

  test.describe('B地点カード', () => {
    test('B地点入力欄が表示される', async ({ page }) => {
      const pointBInput = page.locator('#pointBInput');
      await expect(pointBInput).toBeVisible();
      await expect(pointBInput).toHaveAttribute('placeholder', '0:00.000');
    });

    test('B地点の-ボタンが表示される', async ({ page }) => {
      const minusBtn = page.locator('#pointBMinus');
      await expect(minusBtn).toBeVisible();
      await expect(minusBtn).toHaveText('−');
    });

    test('B地点の+ボタンが表示される', async ({ page }) => {
      const plusBtn = page.locator('#pointBPlus');
      await expect(plusBtn).toBeVisible();
      await expect(plusBtn).toHaveText('+');
    });

    test('B地点のステップセレクトが表示される', async ({ page }) => {
      const stepSelect = page.locator('#stepSelectB');
      await expect(stepSelect).toBeVisible();
    });

    test('B地点のステップセレクト初期値が0.1s', async ({ page }) => {
      const stepSelect = page.locator('#stepSelectB');
      await expect(stepSelect).toHaveValue('0.1');
    });

    test('B地点の「現在位置」ボタンが表示される', async ({ page }) => {
      const setBtn = page.locator('#setPointBBtn');
      await expect(setBtn).toBeVisible();
      await expect(setBtn).toHaveText('現在');
    });

    test('B地点のリセットボタンが表示される', async ({ page }) => {
      const resetBtn = page.locator('#resetPointBBtn');
      await expect(resetBtn).toBeVisible();
    });

    test('B地点入力欄に時間を入力できる', async ({ page }) => {
      const pointBInput = page.locator('#pointBInput');
      await pointBInput.fill('2:45.000');
      await expect(pointBInput).toHaveValue('2:45.000');
    });
  });

  test.describe('履歴に保存ボタン', () => {
    test('保存ボタンが表示される', async ({ page }) => {
      const saveBtn = page.locator('#saveHistoryBtn');
      await expect(saveBtn).toBeVisible();
      await expect(saveBtn).toHaveText('履歴に保存');
    });
  });

  test.describe('共有ボタン', () => {
    test('共有ボタンが表示される', async ({ page }) => {
      const shareBtn = page.locator('#shareBtn');
      await expect(shareBtn).toBeVisible();
    });

    test('共有ボタンにアイコンとラベルがある', async ({ page }) => {
      const shareBtn = page.locator('#shareBtn');
      const icon = shareBtn.locator('.btn-icon');
      const label = shareBtn.locator('.btn-label');
      await expect(icon).toHaveText('🔗');
      await expect(label).toHaveText('共有');
    });

    test('共有ボタンにツールチップがある', async ({ page }) => {
      const shareBtn = page.locator('#shareBtn');
      await expect(shareBtn).toHaveAttribute('title', 'AB区間の共有URLをコピー');
    });
  });
});
