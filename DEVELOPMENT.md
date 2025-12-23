# 開発ガイド

## 技術スタック

- HTML / CSS / JavaScript（バニラ）
- YouTube IFrame API
- Service Worker（PWA）
- Playwright（E2Eテスト）

## セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/kuronekorou39/u2-looper.git
cd u2-looper

# 依存関係をインストール
npm install

# Playwrightブラウザをインストール
npx playwright install
```

## ローカル実行

```bash
# http-serverで起動
npx http-server -p 8080
```

ブラウザで http://localhost:8080 を開く

## テスト

```bash
# テスト実行
npm test

# UIモードでテスト（デバッグ用）
npm run test:ui

# ブラウザ表示付きでテスト
npm run test:headed

# テストレポート表示
npm run test:report
```

## ファイル構成

```
u2-looper/
├── index.html      # メインHTML
├── style.css       # スタイル
├── app.js          # アプリケーションロジック
├── sw.js           # Service Worker
├── manifest.json   # PWAマニフェスト
├── assets/
│   ├── icon-512.png  # PWAアイコン
│   ├── favicon.png   # ファビコン
│   └── logo.png      # ヘッダーロゴ
└── tests/          # Playwrightテスト
    ├── initial-load.spec.js
    ├── controls.spec.js
    ├── loop-section.spec.js
    └── ...
```

## Service Worker

キャッシュバージョンを更新する場合は `sw.js` の `CACHE_NAME` を変更：

```javascript
const CACHE_NAME = 'u2b-loop-v6';  // バージョンを上げる
```

## テストカバレッジ

- 初期ロード
- プレーヤーコントロール（再生、ミュート、反転など）
- ループセクション（AB地点設定、Gap設定）
- 履歴モーダル
- キーボードショートカット
- レイアウト切替
- テーマ切替
- URL入力セクション
- ショートカットアコーディオン
