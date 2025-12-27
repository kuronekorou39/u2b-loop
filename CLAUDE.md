# Claude Code 指示書

## コミット時のルール

**重要: コミット前に必ずバージョンを更新すること**

```bash
node scripts/bump-version.js
```

これにより package.json, sw.js, app.js のバージョンが一括更新される。

### コミットの流れ

1. `npm test` - テスト実行
2. `node scripts/bump-version.js` - バージョン更新
3. `git add -A && git commit -m "..."` - コミット
4. `git push` - プッシュ

## プロジェクト概要

- YouTube/ローカル動画のAB区間ループ再生アプリ
- PWA対応（Service Worker でオフライン動作）
- テスト: Playwright

## ファイル構成

- `app.js` - メインアプリケーション（APP_VERSION定義）
- `sw.js` - Service Worker（CACHE_NAME定義）
- `package.json` - npm設定（version定義）
- `scripts/bump-version.js` - バージョン一括更新スクリプト
