#!/usr/bin/env node
/**
 * バージョン一括更新スクリプト
 * 使い方: node scripts/bump-version.js [patch|minor|major|x.y.z]
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 更新対象ファイル
const files = {
    'package.json': {
        pattern: /"version": "([^"]+)"/,
        replace: (v) => `"version": "${v}"`
    },
    'sw.js': {
        pattern: /const CACHE_NAME = 'u2b-loop-v([^']+)'/,
        replace: (v) => `const CACHE_NAME = 'u2b-loop-v${v}'`
    },
    'app.js': {
        pattern: /const APP_VERSION = '([^']+)'/,
        replace: (v) => `const APP_VERSION = '${v}'`
    }
};

// 現在のバージョンを取得
function getCurrentVersion() {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    return pkg.version;
}

// バージョンを計算
function calcNewVersion(current, type) {
    if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type; // 直接指定
    }

    const [major, minor, patch] = current.split('.').map(Number);

    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}

// メイン処理
function main() {
    const type = process.argv[2] || 'patch';
    const current = getCurrentVersion();
    const newVersion = calcNewVersion(current, type);

    console.log(`Version: ${current} -> ${newVersion}`);

    for (const [filename, config] of Object.entries(files)) {
        const filepath = path.join(rootDir, filename);
        let content = fs.readFileSync(filepath, 'utf8');
        content = content.replace(config.pattern, config.replace(newVersion));
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`  Updated: ${filename}`);
    }

    console.log(`\nDone! Run: git add -A && git commit -m "chore: bump to v${newVersion}"`);
}

main();
