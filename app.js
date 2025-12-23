// U2B-Loop App

const APP_VERSION = '1.3.1';

let player = null;
let playerReady = false;
let updateInterval = null;
let loopGapTimeout = null;
let overlayHideTimeout = null;
let countdownInterval = null;
let pendingLocalRestore = null; // iOS等でローカル履歴復元用

// File System Access API対応チェック
const supportsFileSystemAccess = 'showOpenFilePicker' in window;

// IndexedDB（ファイルハンドル保存用）
let fileHandleDB = null;

async function initFileHandleDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('u2bLoopFileHandles', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            fileHandleDB = request.result;
            resolve(fileHandleDB);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles', { keyPath: 'id' });
            }
        };
    });
}

async function saveFileHandle(historyId, fileHandle) {
    if (!fileHandleDB || !fileHandle) return;

    return new Promise((resolve, reject) => {
        const transaction = fileHandleDB.transaction(['handles'], 'readwrite');
        const store = transaction.objectStore('handles');
        const request = store.put({ id: historyId, handle: fileHandle });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getFileHandle(historyId) {
    if (!fileHandleDB) return null;

    return new Promise((resolve, reject) => {
        const transaction = fileHandleDB.transaction(['handles'], 'readonly');
        const store = transaction.objectStore('handles');
        const request = store.get(historyId);

        request.onsuccess = () => resolve(request.result?.handle || null);
        request.onerror = () => reject(request.error);
    });
}

async function deleteFileHandle(historyId) {
    if (!fileHandleDB) return;

    return new Promise((resolve, reject) => {
        const transaction = fileHandleDB.transaction(['handles'], 'readwrite');
        const store = transaction.objectStore('handles');
        const request = store.delete(historyId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// 状態管理
const state = {
    videoId: null,
    duration: 0,
    flipHorizontal: false,
    flipVertical: false,
    pointA: 0,
    pointB: 0,
    loopEnabled: false,
    loopGap: 0,
    isInGap: false,
    showYTControls: false,
    layoutHorizontal: false,
    playerType: null,        // 'youtube' or 'local'
    localFileName: null,     // ローカルファイル名
    currentFileHandle: null  // File System Access API用ファイルハンドル
};

// DOM要素
const elements = {};

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    elements.appVersion.textContent = `v${APP_VERSION}`;
    initEventListeners();
    initLayoutMediaQuery();
    loadTheme();
    loadLayout();
    loadHistory();

    // File System Access API対応の場合、IndexedDBを初期化
    if (supportsFileSystemAccess) {
        try {
            await initFileHandleDB();
            console.log('File System Access API: 対応');
        } catch (e) {
            console.warn('IndexedDB初期化エラー:', e);
        }
    } else {
        console.log('File System Access API: 非対応（従来モード）');
    }

    // URLパラメータから動画・AB区間を読み込み
    loadFromURLParams();
});

// ページ離脱時の確認（作業中の場合）
window.addEventListener('beforeunload', (e) => {
    // 作業中かどうかを判定
    const hasWork = playerReady && (
        state.pointA > 0 ||
        (state.duration > 0 && state.pointB < state.duration)
    );

    if (hasWork) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

// テーマ切り替え
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    elements.themeBtn.querySelector('.btn-icon').textContent = isLight ? '☾' : '☀';
    localStorage.setItem('u2bLoopTheme', isLight ? 'light' : 'dark');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('u2bLoopTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        elements.themeBtn.querySelector('.btn-icon').textContent = '☾';
    }
}

function loadLayout() {
    const savedLayout = localStorage.getItem('u2bLoopLayout');
    if (savedLayout === 'horizontal') {
        state.layoutHorizontal = true;
        applyLayout();
    }
}

function initElements() {
    elements.appVersion = document.getElementById('appVersion');
    elements.container = document.querySelector('.container');
    elements.layoutBtn = document.getElementById('layoutBtn');
    elements.themeBtn = document.getElementById('themeBtn');
    elements.fullscreenBtn = document.getElementById('fullscreenBtn');
    elements.pipBtn = document.getElementById('pipBtn');
    elements.toggleUrlBtn = document.getElementById('toggleUrlBtn');
    elements.urlSection = document.getElementById('urlSection');
    elements.videoUrl = document.getElementById('videoUrl');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.localFileInput = document.getElementById('localFileInput');
    elements.fileNameDisplay = document.getElementById('fileNameDisplay');
    elements.loadFileBtn = document.getElementById('loadFileBtn');
    elements.localVideo = document.getElementById('localVideo');
    elements.playerContainer = document.getElementById('playerContainer');
    elements.dropZone = document.getElementById('dropZone');
    elements.seekbar = document.getElementById('seekbar');
    elements.seekbarABRegion = document.getElementById('seekbarABRegion');
    elements.currentTime = document.getElementById('currentTime');
    elements.duration = document.getElementById('duration');
    elements.playPauseBtn = document.getElementById('playPauseBtn');
    elements.speedSelect = document.getElementById('speedSelect');
    elements.ytControlsBtn = document.getElementById('ytControlsBtn');
    elements.muteBtn = document.getElementById('muteBtn');
    elements.flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
    elements.flipVerticalBtn = document.getElementById('flipVerticalBtn');
    elements.abSeekbar = document.getElementById('abSeekbar');
    elements.waveformCanvas = document.getElementById('waveformCanvas');
    elements.abRegion = document.getElementById('abRegion');
    elements.abCurrentPos = document.getElementById('abCurrentPos');
    elements.pointA = document.getElementById('pointA');
    elements.pointB = document.getElementById('pointB');
    elements.cardA = document.querySelector('.ab-card.card-a');
    elements.cardB = document.querySelector('.ab-card.card-b');
    elements.pointAInput = document.getElementById('pointAInput');
    elements.pointBInput = document.getElementById('pointBInput');
    elements.pointAMinus = document.getElementById('pointAMinus');
    elements.pointAPlus = document.getElementById('pointAPlus');
    elements.pointBMinus = document.getElementById('pointBMinus');
    elements.pointBPlus = document.getElementById('pointBPlus');
    elements.stepSelectA = document.getElementById('stepSelectA');
    elements.stepSelectB = document.getElementById('stepSelectB');
    elements.setPointABtn = document.getElementById('setPointABtn');
    elements.setPointBBtn = document.getElementById('setPointBBtn');
    elements.resetPointABtn = document.getElementById('resetPointABtn');
    elements.resetPointBBtn = document.getElementById('resetPointBBtn');
    elements.loopToggleBtn = document.getElementById('loopToggleBtn');
    elements.gapCountdown = document.getElementById('gapCountdown');
    elements.gapButtons = document.querySelectorAll('.gap-btn');
    elements.saveHistoryBtn = document.getElementById('saveHistoryBtn');
    elements.shareBtn = document.getElementById('shareBtn');
    elements.historyBtn = document.getElementById('historyBtn');
    elements.historyModal = document.getElementById('historyModal');
    elements.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    elements.historyList = document.getElementById('historyList');
    elements.importHistoryInput = document.getElementById('importHistoryInput');
    elements.exportSelectBtn = document.getElementById('exportSelectBtn');
    elements.clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
    elements.selectModeToolbar = document.querySelector('.select-mode-toolbar');
    elements.selectAllBtn = document.getElementById('selectAllBtn');
    elements.deselectAllBtn = document.getElementById('deselectAllBtn');
    elements.selectedCount = document.getElementById('selectedCount');
    elements.cancelSelectBtn = document.getElementById('cancelSelectBtn');
    elements.exportSelectedBtn = document.getElementById('exportSelectedBtn');

    // オーバーレイ要素
    elements.playerWrapper = document.getElementById('playerWrapper');
    elements.overlayControls = document.getElementById('overlayControls');
    elements.overlaySeekbar = document.getElementById('overlaySeekbar');
    elements.overlayABRegion = document.getElementById('overlayABRegion');
    elements.overlayCurrentTime = document.getElementById('overlayCurrentTime');
    elements.overlayDuration = document.getElementById('overlayDuration');
    elements.overlayPlayPauseBtn = document.getElementById('overlayPlayPauseBtn');
    elements.overlayMuteBtn = document.getElementById('overlayMuteBtn');
    elements.overlaySpeedSelect = document.getElementById('overlaySpeedSelect');
    elements.overlayLoopBtn = document.getElementById('overlayLoopBtn');
    elements.overlayExitBtn = document.getElementById('overlayExitBtn');

    // ショートカット一覧（アコーディオン）- 両方のインスタンス
    elements.shortcutAccordionBtns = document.querySelectorAll('.shortcut-accordion-btn');
    elements.shortcutAccordionContents = document.querySelectorAll('.shortcut-accordion-content');

    // ローカルファイル復元モーダル
    elements.localRestoreModal = document.getElementById('localRestoreModal');
    elements.restoreModalMessage = document.getElementById('restoreModalMessage');
    elements.restoreSelectFileBtn = document.getElementById('restoreSelectFileBtn');
    elements.restoreApplyOnlyBtn = document.getElementById('restoreApplyOnlyBtn');
    elements.restoreCancelBtn = document.getElementById('restoreCancelBtn');
}

function initEventListeners() {
    // レイアウト切り替え
    elements.layoutBtn.addEventListener('click', toggleLayout);

    // テーマ切り替え
    elements.themeBtn.addEventListener('click', toggleTheme);

    // フルスクリーン
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // PiP（Picture-in-Picture）
    elements.pipBtn.addEventListener('click', togglePiP);

    // URLセクションのトグル
    elements.toggleUrlBtn.addEventListener('click', toggleUrlSection);

    // URL読み込み
    elements.loadBtn.addEventListener('click', loadVideo);
    elements.videoUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadVideo();
    });

    // ローカルファイル読み込み
    elements.localFileInput.addEventListener('change', handleFileSelect);
    elements.loadFileBtn.addEventListener('click', loadLocalVideo);

    // ファイル選択ラベルのクリック（File System Access API対応）
    elements.fileNameDisplay.parentElement.addEventListener('click', (e) => {
        if (supportsFileSystemAccess) {
            e.preventDefault(); // デフォルトのinput[type="file"]を開く動作を防止
            openFilePicker();
        }
        // 非対応ブラウザはデフォルト動作（input[type="file"]を開く）
    });

    // 再生コントロール
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.speedSelect.addEventListener('change', changeSpeed);
    elements.ytControlsBtn.addEventListener('click', toggleYTControls);
    elements.muteBtn.addEventListener('click', toggleMute);

    // シークバー
    elements.seekbar.addEventListener('input', seekVideo);

    // 反転
    elements.flipHorizontalBtn.addEventListener('click', toggleFlipHorizontal);
    elements.flipVerticalBtn.addEventListener('click', toggleFlipVertical);

    // A-B地点設定
    elements.setPointABtn.addEventListener('click', setPointA);
    elements.setPointBBtn.addEventListener('click', setPointB);
    elements.resetPointABtn.addEventListener('click', resetPointA);
    elements.resetPointBBtn.addEventListener('click', resetPointB);
    elements.pointAInput.addEventListener('change', () => updatePointFromInput('A'));
    elements.pointBInput.addEventListener('change', () => updatePointFromInput('B'));

    // AB カード選択（タッチ操作向け）
    elements.cardA.addEventListener('click', (e) => {
        // 内部のボタンやinputクリック時は無視
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        togglePointSelection('A');
    });
    elements.cardB.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        togglePointSelection('B');
    });

    // ±ボタン
    elements.pointAMinus.addEventListener('click', () => adjustPoint('A', -1));
    elements.pointAPlus.addEventListener('click', () => adjustPoint('A', 1));
    elements.pointBMinus.addEventListener('click', () => adjustPoint('B', -1));
    elements.pointBPlus.addEventListener('click', () => adjustPoint('B', 1));

    // ループ設定
    elements.loopToggleBtn.addEventListener('click', toggleLoop);
    elements.gapButtons.forEach(btn => {
        btn.addEventListener('click', () => setLoopGap(btn));
    });

    // AB区間シークバーのドラッグ
    initABSeekbarDrag();

    // 履歴
    elements.saveHistoryBtn.addEventListener('click', saveToHistory);
    elements.shareBtn.addEventListener('click', copyShareURL);
    elements.historyBtn.addEventListener('click', openHistoryModal);
    elements.closeHistoryBtn.addEventListener('click', closeHistoryModal);
    elements.historyModal.addEventListener('click', (e) => {
        if (e.target === elements.historyModal) closeHistoryModal();
    });
    elements.importHistoryInput.addEventListener('change', importHistory);
    elements.exportSelectBtn.addEventListener('click', enterSelectMode);
    elements.clearAllHistoryBtn.addEventListener('click', clearAllHistory);
    elements.selectAllBtn.addEventListener('click', selectAllHistory);
    elements.deselectAllBtn.addEventListener('click', deselectAllHistory);
    elements.cancelSelectBtn.addEventListener('click', exitSelectMode);
    elements.exportSelectedBtn.addEventListener('click', exportSelectedHistory);

    // ローカルファイル復元モーダル
    elements.restoreSelectFileBtn.addEventListener('click', handleRestoreSelectFile);
    elements.restoreApplyOnlyBtn.addEventListener('click', handleRestoreApplyOnly);
    elements.restoreCancelBtn.addEventListener('click', closeRestoreModal);
    elements.localRestoreModal.addEventListener('click', (e) => {
        if (e.target === elements.localRestoreModal) closeRestoreModal();
    });

    // オーバーレイコントロール
    elements.overlayPlayPauseBtn.addEventListener('click', togglePlayPause);
    elements.overlayMuteBtn.addEventListener('click', toggleMute);
    elements.overlaySpeedSelect.addEventListener('change', (e) => {
        elements.speedSelect.value = e.target.value;
        changeSpeed();
    });
    elements.overlayLoopBtn.addEventListener('click', toggleLoop);
    elements.overlayExitBtn.addEventListener('click', toggleFullscreen);
    elements.overlaySeekbar.addEventListener('input', (e) => {
        elements.seekbar.value = e.target.value;
        seekVideo();
    });

    // オーバーレイの自動非表示
    elements.playerWrapper.addEventListener('mousemove', showOverlayTemporarily);
    elements.playerWrapper.addEventListener('click', showOverlayTemporarily);
    elements.playerWrapper.addEventListener('touchstart', showOverlayTemporarily);

    // ショートカット一覧（アコーディオン）- 両方のボタンにイベント登録
    elements.shortcutAccordionBtns.forEach(btn => {
        btn.addEventListener('click', toggleShortcutAccordion);
    });

    // キーボードショートカット
    document.addEventListener('keydown', handleKeyboardShortcut);

    // ドラッグ&ドロップ
    initDragAndDrop();
}

// ショートカット一覧アコーディオン（両方のインスタンスを連動）
function toggleShortcutAccordion() {
    elements.shortcutAccordionBtns.forEach(btn => {
        btn.classList.toggle('open');
    });
    elements.shortcutAccordionContents.forEach(content => {
        content.classList.toggle('show');
    });
}

// キーボードショートカット処理
function handleKeyboardShortcut(e) {
    // 入力フィールドにフォーカスがある場合は無視
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' ||
                           activeElement.tagName === 'TEXTAREA' ||
                           activeElement.tagName === 'SELECT';

    if (isInputFocused) return;

    // モーダルが開いている場合はEscapeのみ処理
    const isModalOpen = elements.historyModal.classList.contains('show');

    if (e.key === 'Escape') {
        if (elements.historyModal.classList.contains('show')) {
            closeHistoryModal();
            e.preventDefault();
            return;
        }
        if (document.fullscreenElement) {
            document.exitFullscreen();
            e.preventDefault();
            return;
        }
    }

    if (isModalOpen) return;

    switch (e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'arrowleft':
            e.preventDefault();
            seekRelative(-5);
            break;
        case 'arrowright':
            e.preventDefault();
            seekRelative(5);
            break;
        case 'm':
            toggleMute();
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'p':
            togglePiP();
            break;
        case 'a':
            setPointA();
            break;
        case 'b':
            setPointB();
            break;
        case 'l':
            toggleLoop();
            break;
        case 'r':
            resetPoints();
            break;
        case 'h':
            toggleFlipHorizontal();
            break;
        case 'v':
            toggleFlipVertical();
            break;
        case '?':
            toggleShortcutAccordion();
            break;
    }
}

// 相対シーク
function seekRelative(seconds) {
    if (!playerReady) return;
    const currentTime = getCurrentTime();
    const newTime = Math.max(0, Math.min(state.duration, currentTime + seconds));
    seekTo(newTime);
}

// A-B区間両方リセット
function resetPoints() {
    state.pointA = 0;
    state.pointB = state.duration;
    elements.pointAInput.value = formatTime(0);
    elements.pointBInput.value = formatTime(state.duration);
    updateABVisual();
}

// YouTube APIコールバック
function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API Ready');
}

// iOS判定
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// フルスクリーン切り替え
function toggleFullscreen() {
    // iOSはFullscreen API非対応
    if (isIOS) {
        alert('iOSではフルスクリーン機能を利用できません。\nホーム画面にアプリを追加すると、より大きな画面で利用できます。');
        return;
    }

    if (!document.fullscreenElement) {
        // フルスクリーンに入る
        document.documentElement.requestFullscreen().catch(err => {
            console.log('フルスクリーンエラー:', err);
        });
    } else {
        // フルスクリーンを終了
        document.exitFullscreen();
    }
}

function onFullscreenChange() {
    const isFullscreen = !!document.fullscreenElement;
    elements.fullscreenBtn.classList.toggle('active', isFullscreen);
    document.body.classList.toggle('fullscreen-mode', isFullscreen);

    if (isFullscreen) {
        // オーバーレイの状態を同期
        syncOverlayState();
        showOverlayTemporarily();
    }
}

// PiP（Picture-in-Picture）切り替え
async function togglePiP() {
    if (state.playerType !== 'local') return;

    const video = elements.localVideo;

    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
            await video.requestPictureInPicture();
        }
    } catch (err) {
        console.log('PiPエラー:', err);
    }
}

// プレイヤータイプに応じたボタン表示を更新
function updatePlayerTypeButtons() {
    const isLocal = state.playerType === 'local';
    const isYouTube = state.playerType === 'youtube';

    // PiPボタン: ローカル動画時のみ表示
    const showPiP = isLocal && document.pictureInPictureEnabled;
    elements.pipBtn.style.display = showPiP ? '' : 'none';

    // YTコントローラーボタン: YouTube時のみ表示
    elements.ytControlsBtn.style.display = isYouTube ? '' : 'none';
}

// 後方互換性のため
function updatePiPButton() {
    updatePlayerTypeButtons();
}

// Media Session API（バックグラウンド制御）
function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: state.localFileName || 'ローカル動画',
        artist: 'U2 Looper',
        album: ''
    });

    navigator.mediaSession.setActionHandler('play', () => {
        elements.localVideo.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
        elements.localVideo.pause();
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        elements.localVideo.currentTime = Math.max(elements.localVideo.currentTime - skipTime, 0);
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        elements.localVideo.currentTime = Math.min(elements.localVideo.currentTime + skipTime, state.duration);
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in elements.localVideo) {
            elements.localVideo.fastSeek(details.seekTime);
        } else {
            elements.localVideo.currentTime = details.seekTime;
        }
    });
}

// オーバーレイを一時表示
function showOverlayTemporarily() {
    if (!document.fullscreenElement) return;

    elements.playerWrapper.classList.add('show-controls');

    // 既存のタイマーをクリア
    if (overlayHideTimeout) {
        clearTimeout(overlayHideTimeout);
    }

    // 3秒後に非表示
    overlayHideTimeout = setTimeout(() => {
        elements.playerWrapper.classList.remove('show-controls');
    }, 3000);
}

// オーバーレイの状態を同期
function syncOverlayState() {
    elements.overlaySpeedSelect.value = elements.speedSelect.value;
    elements.overlayLoopBtn.textContent = state.loopEnabled ? '↻ ON' : '↻ OFF';
    elements.overlayLoopBtn.classList.toggle('active', state.loopEnabled);
}

// URLセクションのトグル
function toggleUrlSection() {
    const isShown = elements.urlSection.classList.toggle('show');
    elements.toggleUrlBtn.classList.toggle('show', isShown);
}

// レイアウト切り替え
function toggleLayout() {
    state.layoutHorizontal = !state.layoutHorizontal;
    applyLayout();
    localStorage.setItem('u2bLoopLayout', state.layoutHorizontal ? 'horizontal' : 'vertical');
}

function applyLayout() {
    elements.container.classList.toggle('layout-horizontal', state.layoutHorizontal);
    elements.layoutBtn.classList.toggle('active', state.layoutHorizontal);
    elements.layoutBtn.querySelector('.btn-icon').textContent = state.layoutHorizontal ? '⊞' : '⊟';

    // 横並び時はラベルを短縮
    if (state.layoutHorizontal) {
        elements.loopToggleBtn.querySelector('.loop-text').textContent = state.loopEnabled ? 'ON' : 'OFF';
    } else {
        elements.loopToggleBtn.querySelector('.loop-text').textContent = state.loopEnabled ? 'ループ ON' : 'ループ OFF';
    }
}

// ウィンドウ幅監視：900px以下で自動的に縦並びに
function initLayoutMediaQuery() {
    const mediaQuery = window.matchMedia('(max-width: 900px)');

    const handleMediaChange = (e) => {
        if (e.matches && state.layoutHorizontal) {
            // 900px以下になったら縦並びに切り替え
            state.layoutHorizontal = false;
            applyLayout();
        }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    // 初期チェック
    handleMediaChange(mediaQuery);
}

// 動画読み込み
function loadVideo() {
    const url = elements.videoUrl.value.trim();
    const videoId = extractVideoId(url);

    if (!videoId) {
        alert('有効なYouTube URLを入力してください');
        return;
    }

    state.videoId = videoId;
    state.playerType = 'youtube';
    state.localFileName = null;

    // 波形をクリア（YouTube時は表示しない）
    clearWaveform();

    // ボタン表示を更新（PiP非表示、YTコントローラー表示）
    updatePlayerTypeButtons();

    // ローカルビデオを非表示
    elements.localVideo.style.display = 'none';
    elements.localVideo.src = '';
    document.getElementById('player').style.display = 'block';

    // 状態をリセット
    resetPlayerState();

    // URLセクションを閉じる
    elements.urlSection.classList.remove('show');
    elements.toggleUrlBtn.classList.remove('show');

    if (player) {
        player.loadVideoById(videoId);
    } else {
        createPlayer(videoId);
    }
}

// ドラッグ&ドロップ初期化
function initDragAndDrop() {
    const container = document.querySelector('.container');
    let dragCounter = 0;

    // ドラッグ中のデフォルト動作を防止
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        container.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // ドラッグがコンテナに入った時
    container.addEventListener('dragenter', () => {
        dragCounter++;
        if (dragCounter === 1) {
            elements.dropZone.classList.add('active');
        }
    });

    // ドラッグがコンテナから出た時
    container.addEventListener('dragleave', () => {
        dragCounter--;
        if (dragCounter === 0) {
            elements.dropZone.classList.remove('active');
        }
    });

    // ドロップ時
    container.addEventListener('drop', (e) => {
        dragCounter = 0;
        elements.dropZone.classList.remove('active');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                state.localFileName = file.name;
                state.currentFileHandle = null;
                elements.fileNameDisplay.textContent = file.name;
                elements.fileNameDisplay.parentElement.classList.add('has-file');
                playLocalFile(file, null);
            } else {
                alert('動画ファイルをドロップしてください');
            }
        }
    });
}

// ファイル選択時の処理（従来のinput[type="file"]用）
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        state.localFileName = file.name;
        state.currentFileHandle = null; // 従来の方法ではハンドルなし
        elements.fileNameDisplay.textContent = file.name;
        elements.fileNameDisplay.parentElement.classList.add('has-file');
    }
}

// File System Access APIでファイル選択
async function openFilePicker() {
    if (!supportsFileSystemAccess) {
        // 非対応ブラウザは従来のinput[type="file"]をクリック
        elements.localFileInput.click();
        return;
    }

    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: '動画ファイル',
                accept: {
                    'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v']
                }
            }],
            multiple: false
        });

        const file = await fileHandle.getFile();

        // 状態を保存
        state.currentFileHandle = fileHandle;
        state.localFileName = file.name;
        elements.fileNameDisplay.textContent = file.name;
        elements.fileNameDisplay.parentElement.classList.add('has-file');

        // 自動的に読み込み開始
        playLocalFile(file, fileHandle);
    } catch (e) {
        // ユーザーがキャンセルした場合は何もしない
        if (e.name !== 'AbortError') {
            console.error('ファイル選択エラー:', e);
        }
    }
}

// ローカル動画読み込み（読込ボタンから）
function loadLocalVideo() {
    // File System Access APIでファイルを選択済みの場合
    if (state.currentFileHandle) {
        (async () => {
            try {
                const file = await state.currentFileHandle.getFile();
                playLocalFile(file, state.currentFileHandle);
            } catch (e) {
                alert('ファイルの読み込みに失敗しました');
                console.error(e);
            }
        })();
        return;
    }

    // 従来のinput[type="file"]から
    const file = elements.localFileInput.files[0];
    if (!file) {
        alert('動画ファイルを選択してください');
        return;
    }

    playLocalFile(file, null);
}

// ローカルファイルを再生（共通処理）
function playLocalFile(file, fileHandle = null) {
    // YouTubeプレーヤーを破棄・非表示
    if (player) {
        player.destroy();
        player = null;
        playerReady = false;
    }
    document.getElementById('player').style.display = 'none';

    // 状態を設定
    state.playerType = 'local';
    state.videoId = null;
    state.localFileName = file.name;
    state.currentFileHandle = fileHandle;

    // ボタン表示を更新（PiP表示、YTコントローラー非表示）
    updatePlayerTypeButtons();
    elements.ytControlsBtn.classList.remove('active');
    state.showYTControls = false;

    // 状態をリセット
    resetPlayerState();

    // ローカルビデオを表示
    const videoElement = elements.localVideo;
    videoElement.style.display = 'block';

    // ファイルURLを作成
    const fileURL = URL.createObjectURL(file);
    videoElement.src = fileURL;

    // 波形解析を開始（バックグラウンドで）
    analyzeAndDrawWaveform(file);

    // イベントリスナー設定
    videoElement.onloadedmetadata = () => {
        playerReady = true;
        state.duration = videoElement.duration;
        state.pointB = state.duration;

        elements.duration.textContent = formatTime(state.duration, false);
        elements.seekbar.max = state.duration;
        elements.pointBInput.value = formatTime(state.duration);

        // オーバーレイ用
        elements.overlayDuration.textContent = formatTime(state.duration, false);
        elements.overlaySeekbar.max = state.duration;

        updateABVisual();
        applyFlip();
        startUpdateInterval();

        // バックグラウンド再生用のMedia Sessionを設定
        setupMediaSession();

        // 履歴からの復元（iOS等でファイル再選択後）
        if (pendingLocalRestore) {
            state.pointA = pendingLocalRestore.pointA;
            state.pointB = Math.min(pendingLocalRestore.pointB, state.duration);
            elements.pointAInput.value = formatTime(state.pointA);
            elements.pointBInput.value = formatTime(state.pointB);
            updateABVisual();
            seekTo(state.pointA, true);
            pendingLocalRestore = null;
        }
    };

    videoElement.onplay = () => {
        elements.playPauseBtn.textContent = '❚❚';
        elements.overlayPlayPauseBtn.textContent = '❚❚';
        startUpdateInterval();
    };

    videoElement.onpause = () => {
        elements.playPauseBtn.textContent = '▶';
        elements.overlayPlayPauseBtn.textContent = '▶';
    };

    videoElement.onended = () => {
        elements.playPauseBtn.textContent = '▶';
        elements.overlayPlayPauseBtn.textContent = '▶';
    };

    // URLセクションを閉じる
    elements.urlSection.classList.remove('show');
    elements.toggleUrlBtn.classList.remove('show');
}

// プレイヤー状態をリセット
function resetPlayerState() {
    // カウントダウンをキャンセル
    cancelCountdown();

    // 状態をリセット
    state.duration = 0;
    state.pointA = 0;
    state.pointB = 0;

    // UI表示をリセット
    elements.seekbar.value = 0;
    elements.seekbar.max = 100;
    elements.currentTime.textContent = '0:00';
    elements.duration.textContent = '0:00';
    elements.pointAInput.value = '0:00.000';
    elements.pointBInput.value = '0:00.000';

    // オーバーレイも更新
    elements.overlaySeekbar.value = 0;
    elements.overlaySeekbar.max = 100;
    elements.overlayCurrentTime.textContent = '0:00';
    elements.overlayDuration.textContent = '0:00';

    // AB区間の表示をリセット
    elements.abCurrentPos.style.left = '0%';
    elements.pointA.style.left = '0%';
    elements.pointB.style.left = '100%';
    elements.abRegion.style.left = '0%';
    elements.abRegion.style.width = '100%';
    elements.seekbarABRegion.style.left = '0%';
    elements.seekbarABRegion.style.width = '100%';
}

function extractVideoId(url) {
    // 様々なYouTube URL形式に対応
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function createPlayer(videoId) {
    player = new YT.Player('player', {
        videoId: videoId,
        playerVars: {
            controls: 0,           // コントロール非表示
            disablekb: 1,          // キーボード操作無効
            modestbranding: 1,     // YouTubeロゴ控えめ
            rel: 0,                // 関連動画を同チャンネルのみに
            showinfo: 0,           // 動画情報非表示
            fs: 0,                 // フルスクリーンボタン非表示
            iv_load_policy: 3,     // アノテーション非表示
            playsinline: 1         // インライン再生（iOS用）
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    playerReady = true;
    state.duration = player.getDuration();
    state.pointB = state.duration;

    elements.duration.textContent = formatTime(state.duration, false);
    elements.seekbar.max = state.duration;
    elements.pointBInput.value = formatTime(state.duration);

    // オーバーレイ用
    elements.overlayDuration.textContent = formatTime(state.duration, false);
    elements.overlaySeekbar.max = state.duration;

    updateABVisual();
    applyFlip();

    // URLパラメータからAB区間を適用
    applyPendingURLParams();

    // 定期更新開始
    startUpdateInterval();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        elements.playPauseBtn.textContent = '❚❚';
        elements.overlayPlayPauseBtn.textContent = '❚❚';
        startUpdateInterval();
        // 新しい動画が再生開始したらdurationを更新
        updateDurationIfNeeded();
    } else if (event.data === YT.PlayerState.CUED) {
        // 動画がキューされた時もdurationを更新
        updateDurationIfNeeded();
    } else {
        elements.playPauseBtn.textContent = '▶';
        elements.overlayPlayPauseBtn.textContent = '▶';
        if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            // 一時停止時も更新を続ける（位置表示のため）
        }
    }
}

// 新しい動画のdurationを更新
function updateDurationIfNeeded() {
    if (!playerReady) return;

    const newDuration = player.getDuration();
    if (newDuration > 0 && newDuration !== state.duration) {
        state.duration = newDuration;

        // pointBが未設定または前の動画のdurationのままなら更新
        if (state.pointB === 0 || state.pointB > newDuration) {
            state.pointB = newDuration;
        }

        // UI更新
        elements.duration.textContent = formatTime(newDuration, false);
        elements.seekbar.max = newDuration;
        elements.pointBInput.value = formatTime(state.pointB);

        // オーバーレイ用
        elements.overlayDuration.textContent = formatTime(newDuration, false);
        elements.overlaySeekbar.max = newDuration;

        updateABVisual();
    }
}

// 再生コントロール
function togglePlayPause() {
    if (!playerReady) return;
    cancelCountdown();

    if (state.playerType === 'local') {
        const video = elements.localVideo;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    } else {
        const playerState = player.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }
}

function changeSpeed() {
    if (!playerReady) return;
    const speed = parseFloat(elements.speedSelect.value);
    if (state.playerType === 'local') {
        elements.localVideo.playbackRate = speed;
    } else {
        player.setPlaybackRate(speed);
    }
}

// YouTubeコントローラーの表示/非表示切り替え
function toggleYTControls() {
    if (!state.videoId) return;

    state.showYTControls = !state.showYTControls;
    elements.ytControlsBtn.classList.toggle('active', state.showYTControls);

    // 現在の状態を保存
    const currentTime = playerReady ? player.getCurrentTime() : 0;
    const isPlaying = playerReady && player.getPlayerState() === YT.PlayerState.PLAYING;
    const speed = playerReady ? player.getPlaybackRate() : 1;

    // プレーヤーを破棄
    if (player) {
        player.destroy();
        player = null;
        playerReady = false;
    }

    // ミュート状態をリセット（iframe再作成でミュート解除されるため）
    elements.muteBtn.textContent = '♪';
    elements.muteBtn.classList.remove('muted');
    elements.overlayMuteBtn.textContent = '♪';
    elements.overlayMuteBtn.classList.remove('muted');

    // 新しいプレーヤーを作成
    player = new YT.Player('player', {
        videoId: state.videoId,
        playerVars: {
            controls: state.showYTControls ? 1 : 0,
            disablekb: state.showYTControls ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            iv_load_policy: 3,
            playsinline: 1,
            start: Math.floor(currentTime)
        },
        events: {
            onReady: (event) => {
                playerReady = true;
                state.duration = player.getDuration();

                // 状態を復元
                player.seekTo(currentTime, true);
                player.setPlaybackRate(speed);
                if (isPlaying) {
                    player.playVideo();
                }
                applyFlip();
                startUpdateInterval();
            },
            onStateChange: onPlayerStateChange
        }
    });
}

function toggleMute() {
    if (!playerReady) return;

    if (state.playerType === 'local') {
        const video = elements.localVideo;
        video.muted = !video.muted;
        if (video.muted) {
            elements.muteBtn.textContent = '♪';
            elements.muteBtn.classList.add('muted');
            elements.overlayMuteBtn.textContent = '♪';
            elements.overlayMuteBtn.classList.add('muted');
        } else {
            elements.muteBtn.textContent = '♪';
            elements.muteBtn.classList.remove('muted');
            elements.overlayMuteBtn.textContent = '♪';
            elements.overlayMuteBtn.classList.remove('muted');
        }
    } else {
        if (player.isMuted()) {
            player.unMute();
            elements.muteBtn.textContent = '♪';
            elements.muteBtn.classList.remove('muted');
            elements.overlayMuteBtn.textContent = '♪';
            elements.overlayMuteBtn.classList.remove('muted');
        } else {
            player.mute();
            elements.muteBtn.textContent = '♪';
            elements.muteBtn.classList.add('muted');
            elements.overlayMuteBtn.textContent = '♪';
            elements.overlayMuteBtn.classList.add('muted');
        }
    }
}

function seekVideo() {
    if (!playerReady) return;
    cancelCountdown();
    const time = parseFloat(elements.seekbar.value);
    if (state.playerType === 'local') {
        elements.localVideo.currentTime = time;
    } else {
        player.seekTo(time, true);
    }
}

// 現在の時間を取得（プレーヤータイプに応じて）
function getCurrentTime() {
    if (state.playerType === 'local') {
        return elements.localVideo.currentTime;
    } else {
        return player.getCurrentTime();
    }
}

// 再生中かどうか（プレーヤータイプに応じて）
function isPlaying() {
    if (state.playerType === 'local') {
        return !elements.localVideo.paused;
    } else {
        return player.getPlayerState() === YT.PlayerState.PLAYING;
    }
}

// 指定位置にシーク（プレーヤータイプに応じて）
let lastSeekTime = 0;
let pendingSeek = null;
const SEEK_THROTTLE_MS = 250; // YouTubeシークの最小間隔

function seekTo(time, force = false) {
    if (state.playerType === 'local') {
        elements.localVideo.currentTime = time;
    } else {
        const now = Date.now();
        if (force || now - lastSeekTime >= SEEK_THROTTLE_MS) {
            // 即座にシーク
            player.seekTo(time, true);
            lastSeekTime = now;
            pendingSeek = null;
        } else {
            // 保留して後でシーク
            if (pendingSeek) clearTimeout(pendingSeek);
            pendingSeek = setTimeout(() => {
                player.seekTo(time, true);
                lastSeekTime = Date.now();
                pendingSeek = null;
            }, SEEK_THROTTLE_MS - (now - lastSeekTime));
        }
    }
}

// 定期更新
function startUpdateInterval() {
    if (updateInterval) return;

    updateInterval = setInterval(() => {
        if (!playerReady || state.isInGap) return;

        const currentTime = getCurrentTime();
        elements.seekbar.value = currentTime;
        elements.currentTime.textContent = formatTime(currentTime, false);

        // オーバーレイのシークバーも更新
        elements.overlaySeekbar.value = currentTime;
        elements.overlayCurrentTime.textContent = formatTime(currentTime, false);

        // AB区間シークバーの現在位置を更新
        if (state.duration > 0) {
            const percent = (currentTime / state.duration) * 100;
            elements.abCurrentPos.style.left = `${percent}%`;
        }

        // ループ処理（再生中のときだけ）
        if (state.loopEnabled && currentTime >= state.pointB && isPlaying()) {
            handleLoopEnd();
        }
    }, 100);
}

function handleLoopEnd() {
    if (state.loopGap > 0) {
        state.isInGap = true;
        if (state.playerType === 'local') {
            elements.localVideo.pause();
        } else {
            player.pauseVideo();
        }

        // カウントダウン開始
        let remaining = state.loopGap;
        elements.gapCountdown.textContent = remaining;
        elements.gapCountdown.classList.add('active');

        countdownInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                elements.gapCountdown.textContent = remaining;
            } else {
                clearInterval(countdownInterval);
                elements.gapCountdown.classList.remove('active');
            }
        }, 1000);

        loopGapTimeout = setTimeout(() => {
            state.isInGap = false;
            elements.gapCountdown.classList.remove('active');
            clearInterval(countdownInterval);
            seekTo(state.pointA, true);
            if (state.playerType === 'local') {
                elements.localVideo.play();
            } else {
                player.playVideo();
            }
        }, state.loopGap * 1000);
    } else {
        seekTo(state.pointA, true);
    }
}

// カウントダウンをキャンセル
function cancelCountdown() {
    if (state.isInGap) {
        state.isInGap = false;
        clearTimeout(loopGapTimeout);
        clearInterval(countdownInterval);
        elements.gapCountdown.classList.remove('active');
    }
}

// ループトグル
function toggleLoop() {
    cancelCountdown();

    state.loopEnabled = !state.loopEnabled;
    elements.loopToggleBtn.classList.toggle('active', state.loopEnabled);

    // 横並び時は短縮ラベル
    if (state.layoutHorizontal) {
        elements.loopToggleBtn.querySelector('.loop-text').textContent = state.loopEnabled ? 'ON' : 'OFF';
    } else {
        elements.loopToggleBtn.querySelector('.loop-text').textContent = state.loopEnabled ? 'ループ ON' : 'ループ OFF';
    }

    // オーバーレイも更新
    elements.overlayLoopBtn.textContent = state.loopEnabled ? '↻ ON' : '↻ OFF';
    elements.overlayLoopBtn.classList.toggle('active', state.loopEnabled);

    // ループONにしたとき、現在位置がB地点を超えていたらA地点に戻す（空白なし）
    if (state.loopEnabled && playerReady) {
        const currentTime = getCurrentTime();
        if (currentTime >= state.pointB) {
            seekTo(state.pointA, true);
        }
    }
}

// 空白時間設定
function setLoopGap(btn) {
    state.loopGap = parseFloat(btn.dataset.gap);
    elements.gapButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// 反転
function toggleFlipHorizontal() {
    state.flipHorizontal = !state.flipHorizontal;
    applyFlip();
    elements.flipHorizontalBtn.classList.toggle('active', state.flipHorizontal);
}

function toggleFlipVertical() {
    state.flipVertical = !state.flipVertical;
    applyFlip();
    elements.flipVerticalBtn.classList.toggle('active', state.flipVertical);
}

function applyFlip() {
    elements.playerContainer.classList.toggle('flip-horizontal', state.flipHorizontal);
    elements.playerContainer.classList.toggle('flip-vertical', state.flipVertical);
}

// A-B地点設定
function setPointA() {
    if (!playerReady) return;
    state.pointA = getCurrentTime();
    elements.pointAInput.value = formatTime(state.pointA);
    updateABVisual();
}

function setPointB() {
    if (!playerReady) return;
    state.pointB = getCurrentTime();
    elements.pointBInput.value = formatTime(state.pointB);
    updateABVisual();
}

function resetPointA() {
    state.pointA = 0;
    elements.pointAInput.value = formatTime(0);
    updateABVisual();
    if (playerReady) {
        seekTo(0);
    }
}

function resetPointB() {
    state.pointB = state.duration;
    elements.pointBInput.value = formatTime(state.duration);
    updateABVisual();
    if (playerReady) {
        seekTo(state.duration);
    }
}

// ABポイント選択（タッチ操作向け拡大表示）
let selectedPoint = null;

function togglePointSelection(point) {
    if (selectedPoint === point) {
        // 同じカードを再クリックで解除
        clearPointSelection();
    } else {
        // 選択を切り替え
        clearPointSelection();
        selectedPoint = point;
        if (point === 'A') {
            elements.pointA.classList.add('selected');
            elements.cardA.classList.add('selected');
        } else {
            elements.pointB.classList.add('selected');
            elements.cardB.classList.add('selected');
        }
    }
}

function clearPointSelection() {
    selectedPoint = null;
    elements.pointA.classList.remove('selected');
    elements.pointB.classList.remove('selected');
    elements.cardA.classList.remove('selected');
    elements.cardB.classList.remove('selected');
}

// ±ボタンでの微調整
function adjustPoint(point, direction) {
    const stepSelect = point === 'A' ? elements.stepSelectA : elements.stepSelectB;
    const step = parseFloat(stepSelect.value) * direction;

    if (point === 'A') {
        state.pointA = Math.max(0, Math.min(state.duration, state.pointA + step));
        elements.pointAInput.value = formatTime(state.pointA);
    } else {
        state.pointB = Math.max(0, Math.min(state.duration, state.pointB + step));
        elements.pointBInput.value = formatTime(state.pointB);
    }
    updateABVisual();

    // プレビュー表示
    if (playerReady) {
        seekTo(point === 'A' ? state.pointA : state.pointB);
    }
}

function updatePointFromInput(point) {
    const input = point === 'A' ? elements.pointAInput : elements.pointBInput;
    const time = parseTime(input.value);

    if (time !== null && time >= 0 && time <= state.duration) {
        if (point === 'A') {
            state.pointA = time;
        } else {
            state.pointB = time;
        }
        updateABVisual();
    }
}

// AB区間可視化
function updateABVisual() {
    if (state.duration === 0) return;

    const aPercent = (state.pointA / state.duration) * 100;
    const bPercent = (state.pointB / state.duration) * 100;

    elements.pointA.style.left = `${aPercent}%`;
    elements.pointB.style.left = `${bPercent}%`;

    const left = Math.min(aPercent, bPercent);
    const width = Math.abs(bPercent - aPercent);
    elements.abRegion.style.left = `${left}%`;
    elements.abRegion.style.width = `${width}%`;

    // メインシークバーにも反映
    elements.seekbarABRegion.style.left = `${left}%`;
    elements.seekbarABRegion.style.width = `${width}%`;

    // オーバーレイシークバーにも反映
    elements.overlayABRegion.style.left = `${left}%`;
    elements.overlayABRegion.style.width = `${width}%`;
}

// AB区間シークバーのドラッグ
// - ポイント未選択時: 再生位置を相対移動
// - ポイント選択時: 選択ポイントを相対移動
// - 三角マーカー直接ドラッグ: そのポイントを相対移動
function initABSeekbarDrag() {
    let dragMode = null; // 'playback', 'A', 'B'
    let startX = 0;
    let startValue = 0;

    const getClientX = (e) => {
        if (e.clientX !== undefined) return e.clientX;
        if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
        if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
        return null;
    };

    const startDrag = (e, mode) => {
        if (!playerReady) return;

        const x = getClientX(e);
        if (x === null) return;

        dragMode = mode;
        startX = x;

        if (mode === 'playback') {
            startValue = getCurrentTime();
        } else if (mode === 'A') {
            startValue = state.pointA;
        } else if (mode === 'B') {
            startValue = state.pointB;
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', onEnd);
    };

    const onMove = (e) => {
        if (!dragMode) return;

        const currentX = getClientX(e);
        if (currentX === null) return;

        e.preventDefault();
        const deltaX = currentX - startX;

        // ピクセル移動を時間に変換（シークバー幅に対する割合）
        const rect = elements.abSeekbar.getBoundingClientRect();
        const deltaTime = (deltaX / rect.width) * state.duration;

        // 新しい値を計算（0〜duration の範囲内に制限）
        const newValue = Math.max(0, Math.min(state.duration, startValue + deltaTime));

        if (dragMode === 'playback') {
            cancelCountdown();
            seekTo(newValue);
        } else if (dragMode === 'A') {
            state.pointA = newValue;
            elements.pointAInput.value = formatTime(newValue);
            updateABVisual();
            seekTo(newValue);
        } else if (dragMode === 'B') {
            state.pointB = newValue;
            elements.pointBInput.value = formatTime(newValue);
            updateABVisual();
            seekTo(newValue);
        }
    };

    const onEnd = () => {
        dragMode = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
    };

    // 三角マーカーの直接ドラッグ
    elements.pointA.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startDrag(e, 'A');
    });
    elements.pointA.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        startDrag(e, 'A');
    });
    elements.pointB.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startDrag(e, 'B');
    });
    elements.pointB.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        startDrag(e, 'B');
    });

    // シークバー全体でのドラッグ
    elements.abSeekbar.addEventListener('mousedown', (e) => {
        // 三角マーカー上のイベントは除外（stopPropagationで処理済み）
        if (e.target.closest('.ab-point')) return;

        if (selectedPoint) {
            // ポイント選択中: 選択ポイントを移動
            startDrag(e, selectedPoint);
        } else {
            // ポイント未選択: 再生位置を移動
            startDrag(e, 'playback');
        }
    });
    elements.abSeekbar.addEventListener('touchstart', (e) => {
        if (e.target.closest('.ab-point')) return;

        if (selectedPoint) {
            startDrag(e, selectedPoint);
        } else {
            startDrag(e, 'playback');
        }
    });
}

// 履歴機能
let historyData = [];
let isSelectMode = false;
let selectedHistoryIds = new Set();

// 履歴モーダル
function openHistoryModal() {
    elements.historyModal.classList.add('show');
}

function closeHistoryModal() {
    elements.historyModal.classList.remove('show');
    // 選択モードを解除
    if (isSelectMode) {
        exitSelectMode();
    }
}

// ローカルファイル復元モーダル用の一時データ
let pendingRestoreData = null;

function showRestoreModal(item) {
    pendingRestoreData = {
        pointA: item.pointA,
        pointB: item.pointB,
        fileName: item.fileName
    };

    // メッセージを設定
    elements.restoreModalMessage.textContent = `「${item.fileName}」の復元`;

    // 同じファイルが読み込まれているか確認
    const isSameFile = state.localFileName === item.fileName;
    elements.restoreApplyOnlyBtn.style.display = isSameFile ? 'block' : 'none';

    elements.localRestoreModal.classList.add('show');
}

function closeRestoreModal() {
    elements.localRestoreModal.classList.remove('show');
    pendingRestoreData = null;
}

function handleRestoreSelectFile() {
    if (!pendingRestoreData) return;

    // ファイル選択後にAB区間を復元するためのデータを設定
    pendingLocalRestore = {
        pointA: pendingRestoreData.pointA,
        pointB: pendingRestoreData.pointB,
        fileName: pendingRestoreData.fileName
    };

    closeRestoreModal();
    closeHistoryModal();

    // ファイル選択を開く
    elements.localFileInput.click();
}

function handleRestoreApplyOnly() {
    if (!pendingRestoreData) return;

    // 現在の動画にAB区間だけ適用
    state.pointA = pendingRestoreData.pointA;
    state.pointB = Math.min(pendingRestoreData.pointB, state.duration);
    elements.pointAInput.value = formatTime(state.pointA);
    elements.pointBInput.value = formatTime(state.pointB);
    updateABVisual();

    // A地点にシーク
    seekTo(state.pointA, true);

    closeRestoreModal();
    closeHistoryModal();
}

function loadHistory() {
    const saved = localStorage.getItem('u2bLoopHistory');
    if (saved) {
        try {
            historyData = JSON.parse(saved);
        } catch (e) {
            historyData = [];
        }
    }
    renderHistoryList();
}

function saveHistoryData() {
    localStorage.setItem('u2bLoopHistory', JSON.stringify(historyData));
}

function saveToHistory() {
    if (!playerReady) {
        alert('動画を読み込んでください');
        return;
    }

    if (state.playerType === 'local') {
        // ローカルファイルの場合
        const title = state.localFileName || '無題の動画';
        const hasFileHandle = !!state.currentFileHandle;

        showMemoModal('', async (memo) => {
            const historyId = Date.now();

            const historyItem = {
                id: historyId,
                isLocal: true,
                hasFileHandle: hasFileHandle, // File System Access API対応
                fileName: state.localFileName,
                title: title,
                thumbnail: null,
                pointA: state.pointA,
                pointB: state.pointB,
                memo: memo,
                createdAt: Date.now()
            };

            // ファイルハンドルをIndexedDBに保存
            if (hasFileHandle && state.currentFileHandle) {
                try {
                    await saveFileHandle(historyId, state.currentFileHandle);
                } catch (e) {
                    console.warn('ファイルハンドル保存エラー:', e);
                    historyItem.hasFileHandle = false;
                }
            }

            historyData.unshift(historyItem);
            saveHistoryData();
            renderHistoryList();
            showSaveSuccess();
        });
    } else {
        // YouTubeの場合
        if (!state.videoId) {
            alert('動画を読み込んでください');
            return;
        }

        const videoData = player.getVideoData();
        const title = videoData.title || '無題の動画';

        showMemoModal('', (memo) => {
            const historyItem = {
                id: Date.now(),
                isLocal: false,
                videoId: state.videoId,
                title: title,
                thumbnail: `https://img.youtube.com/vi/${state.videoId}/mqdefault.jpg`,
                pointA: state.pointA,
                pointB: state.pointB,
                memo: memo,
                createdAt: Date.now()
            };

            historyData.unshift(historyItem);
            saveHistoryData();
            renderHistoryList();
            showSaveSuccess();
        });
    }
}

function showSaveSuccess() {
    const btn = elements.saveHistoryBtn;
    const originalText = btn.textContent;
    btn.textContent = '✓ 保存しました！';
    btn.classList.add('saved');

    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('saved');
    }, 2000);
}

function loadFromHistory(item) {
    // ローカルファイルの場合
    if (item.isLocal) {
        // ファイルハンドルがある場合は再読み込みを試みる
        if (item.hasFileHandle) {
            loadLocalFromHistory(item);
            return;
        }

        // ファイルハンドルがない場合は従来通り
        alert(`ローカルファイル「${item.fileName}」の履歴です。\n同じファイルを再度選択してA-B区間を手動で設定してください。\n\nA: ${formatTime(item.pointA)}\nB: ${formatTime(item.pointB)}`);
        return;
    }

    // URLをセット
    elements.videoUrl.value = `https://youtu.be/${item.videoId}`;

    // ローカルビデオを非表示
    elements.localVideo.style.display = 'none';
    elements.localVideo.src = '';
    document.getElementById('player').style.display = 'block';

    state.playerType = 'youtube';
    state.localFileName = null;

    // 波形をクリア（YouTube時は表示しない）
    clearWaveform();

    // ボタン表示を更新（PiP非表示、YTコントローラー表示）
    updatePlayerTypeButtons();

    // 動画を読み込み
    if (state.videoId !== item.videoId) {
        state.videoId = item.videoId;
        resetPlayerState();

        if (player) {
            player.loadVideoById(item.videoId);
        } else {
            createPlayer(item.videoId);
        }
    }

    // A-B地点を復元（動画読み込み後に設定）
    const restorePoints = () => {
        if (playerReady && state.duration > 0) {
            state.pointA = item.pointA;
            state.pointB = Math.min(item.pointB, state.duration);
            elements.pointAInput.value = formatTime(state.pointA);
            elements.pointBInput.value = formatTime(state.pointB);
            updateABVisual();

            // A地点にシーク
            seekTo(state.pointA, true);
        } else {
            setTimeout(restorePoints, 100);
        }
    };
    restorePoints();

    // URLセクションを閉じる
    elements.urlSection.classList.remove('show');
    elements.toggleUrlBtn.classList.remove('show');

    // 履歴モーダルを閉じる
    closeHistoryModal();
}

// ローカルファイルを履歴から読み込み
async function loadLocalFromHistory(item) {
    try {
        // IndexedDBからファイルハンドルを取得
        const fileHandle = await getFileHandle(item.id);

        if (!fileHandle) {
            // ファイルハンドルがない場合（iOS等）、選択モーダルを表示
            showRestoreModal(item);
            return;
        }

        // 権限を確認・要求
        const permission = await fileHandle.queryPermission({ mode: 'read' });
        if (permission !== 'granted') {
            const newPermission = await fileHandle.requestPermission({ mode: 'read' });
            if (newPermission !== 'granted') {
                alert('ファイルへのアクセスが許可されませんでした。');
                return;
            }
        }

        // ファイルを取得
        const file = await fileHandle.getFile();

        // 履歴モーダルを閉じる
        closeHistoryModal();

        // ファイルを再生
        playLocalFile(file, fileHandle);

        // A-B地点を復元（動画読み込み後に設定）
        const restorePoints = () => {
            if (playerReady && state.duration > 0) {
                state.pointA = item.pointA;
                state.pointB = Math.min(item.pointB, state.duration);
                elements.pointAInput.value = formatTime(state.pointA);
                elements.pointBInput.value = formatTime(state.pointB);
                updateABVisual();

                // A地点にシーク
                seekTo(state.pointA, true);
            } else {
                setTimeout(restorePoints, 100);
            }
        };
        restorePoints();

    } catch (e) {
        console.error('ファイル読み込みエラー:', e);

        // ファイルが見つからない場合など
        if (e.name === 'NotFoundError') {
            alert(`ファイル「${item.fileName}」が見つかりません。\nファイルが移動または削除された可能性があります。`);
        } else {
            alert(`ファイルの読み込みに失敗しました。\n同じファイルを再度選択してください。\n\nA: ${formatTime(item.pointA)}\nB: ${formatTime(item.pointB)}`);
        }
    }
}

async function deleteFromHistory(id) {
    if (!confirm('この履歴を削除しますか？')) return;

    // IndexedDBからファイルハンドルも削除
    try {
        await deleteFileHandle(id);
    } catch (e) {
        console.warn('ファイルハンドル削除エラー:', e);
    }

    historyData = historyData.filter(item => item.id !== id);
    saveHistoryData();
    renderHistoryList();
}

async function clearAllHistory() {
    if (historyData.length === 0) {
        alert('削除する履歴がありません');
        return;
    }

    const youtubeCount = historyData.filter(h => !h.isLocal).length;
    const localCount = historyData.filter(h => h.isLocal).length;

    let message = `全ての履歴を削除しますか？\n\n`;
    message += `合計: ${historyData.length}件\n`;
    if (youtubeCount > 0) message += `  YouTube: ${youtubeCount}件\n`;
    if (localCount > 0) message += `  ローカルファイル: ${localCount}件\n`;
    message += `\nこの操作は取り消せません。`;

    if (!confirm(message)) return;

    // IndexedDBからファイルハンドルも削除
    for (const item of historyData) {
        if (item.hasFileHandle) {
            try {
                await deleteFileHandle(item.id);
            } catch (e) {
                console.warn('ファイルハンドル削除エラー:', e);
            }
        }
    }

    historyData = [];
    saveHistoryData();
    renderHistoryList();
}

function editHistoryMemo(id) {
    const item = historyData.find(h => h.id === id);
    if (!item) return;

    showMemoModal(item.memo, (newMemo) => {
        item.memo = newMemo;
        saveHistoryData();
        renderHistoryList();
    });
}

function renderHistoryList() {
    elements.historyList.innerHTML = '';

    historyData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        if (item.isLocal) {
            div.classList.add('local-file');
        }

        // サムネイル部分の生成
        const thumbnailHtml = item.isLocal
            ? `<div class="history-thumbnail local-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="4" width="30" height="38" rx="2" fill="#555"/><polygon points="19,17 19,31 31,24" fill="#999"/></svg></div>`
            : `<img src="${item.thumbnail}" alt="" class="history-thumbnail" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22><rect fill=%22%23333%22 width=%2216%22 height=%229%22/></svg>'">`;

        // タイプ表示
        let typeLabel = '';
        if (item.isLocal) {
            if (item.hasFileHandle) {
                typeLabel = '<span class="history-type local reloadable">再読込可</span>';
            } else {
                typeLabel = '<span class="history-type local">ローカル</span>';
            }
        }

        if (isSelectMode) {
            const isSelected = selectedHistoryIds.has(item.id);
            div.classList.toggle('selected', isSelected);
            div.innerHTML = `
                <div class="history-checkbox ${isSelected ? 'checked' : ''}">
                    ${isSelected ? '✓' : ''}
                </div>
                ${thumbnailHtml}
                <div class="history-info">
                    <div class="history-title">${typeLabel}${escapeHtml(item.title)}</div>
                    <div class="history-time">A: ${formatTime(item.pointA)} → B: ${formatTime(item.pointB)}</div>
                    ${item.memo ? `<div class="history-memo">${escapeHtml(item.memo)}</div>` : ''}
                </div>
            `;

            // 選択モード時はクリックで選択/解除
            div.addEventListener('click', () => {
                toggleHistorySelection(item.id);
            });
        } else {
            div.innerHTML = `
                ${thumbnailHtml}
                <div class="history-info">
                    <div class="history-title">${typeLabel}${escapeHtml(item.title)}</div>
                    <div class="history-time">A: ${formatTime(item.pointA)} → B: ${formatTime(item.pointB)}</div>
                    ${item.memo ? `<div class="history-memo">${escapeHtml(item.memo)}</div>` : ''}
                </div>
                <div class="history-actions">
                    <button class="history-btn edit" data-id="${item.id}">編集</button>
                    <button class="history-btn delete" data-id="${item.id}">削除</button>
                </div>
            `;

            // クリックで読み込み
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('history-btn')) return;
                loadFromHistory(item);
            });

            // 編集ボタン
            div.querySelector('.history-btn.edit').addEventListener('click', (e) => {
                e.stopPropagation();
                editHistoryMemo(item.id);
            });

            // 削除ボタン
            div.querySelector('.history-btn.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFromHistory(item.id);
            });
        }

        elements.historyList.appendChild(div);
    });
}

// 選択モード
function enterSelectMode() {
    if (historyData.length === 0) {
        alert('保存する履歴がありません');
        return;
    }

    isSelectMode = true;
    selectedHistoryIds.clear();

    // ツールバーを切り替え
    elements.exportSelectBtn.parentElement.style.display = 'none';
    elements.selectModeToolbar.style.display = 'flex';

    updateSelectedCount();
    renderHistoryList();
}

function exitSelectMode() {
    isSelectMode = false;
    selectedHistoryIds.clear();

    // ツールバーを切り替え
    elements.exportSelectBtn.parentElement.style.display = 'flex';
    elements.selectModeToolbar.style.display = 'none';

    renderHistoryList();
}

function toggleHistorySelection(id) {
    if (selectedHistoryIds.has(id)) {
        selectedHistoryIds.delete(id);
    } else {
        selectedHistoryIds.add(id);
    }
    updateSelectedCount();
    renderHistoryList();
}

function selectAllHistory() {
    historyData.forEach(item => selectedHistoryIds.add(item.id));
    updateSelectedCount();
    renderHistoryList();
}

function deselectAllHistory() {
    selectedHistoryIds.clear();
    updateSelectedCount();
    renderHistoryList();
}

function updateSelectedCount() {
    const count = selectedHistoryIds.size;
    elements.selectedCount.textContent = `${count}件選択中`;
    elements.exportSelectedBtn.disabled = count === 0;
}

function exportSelectedHistory() {
    if (selectedHistoryIds.size === 0) return;

    const selectedItems = historyData.filter(item => selectedHistoryIds.has(item.id));
    exportHistoryItems(selectedItems);
    exitSelectMode();
}

// 履歴をJSONファイルとしてダウンロード
function exportHistoryItems(items) {
    const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        items: items
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    // YYYY-MM-DD_HH-MM-SS形式
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    a.download = `u2b-loop-history-${timestamp}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

// 履歴インポート
function importHistory(e) {
    const file = e.target.files[0];
    if (!file) return;

    // ファイルサイズ制限（1MB）
    const MAX_FILE_SIZE = 1 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        alert('ファイルサイズが大きすぎます（最大1MB）');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target.result;

            // JSON パース（プロトタイプ汚染対策）
            const data = JSON.parse(text);
            if (data === null || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('Invalid root format');
            }

            // __proto__ や constructor などの危険なキーをチェック（自身のプロパティのみ）
            const hasOwn = Object.prototype.hasOwnProperty;
            if (hasOwn.call(data, '__proto__') || hasOwn.call(data, 'constructor') || hasOwn.call(data, 'prototype')) {
                throw new Error('Invalid data');
            }

            // バリデーション
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid format: items array required');
            }

            // アイテム数制限（1000件）
            const MAX_ITEMS = 1000;
            if (data.items.length > MAX_ITEMS) {
                throw new Error(`Too many items (max ${MAX_ITEMS})`);
            }

            let addedCount = 0;
            let skippedCount = 0;

            data.items.forEach(item => {
                // アイテムの型チェック
                if (item === null || typeof item !== 'object' || Array.isArray(item)) {
                    skippedCount++;
                    return;
                }

                // 危険なキーチェック（自身のプロパティのみ）
                if (hasOwn.call(item, '__proto__') || hasOwn.call(item, 'constructor') || hasOwn.call(item, 'prototype')) {
                    skippedCount++;
                    return;
                }

                const isLocal = item.isLocal === true;

                // YouTube動画の場合: videoId必須
                if (!isLocal) {
                    if (typeof item.videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(item.videoId)) {
                        skippedCount++;
                        return;
                    }
                }

                // ローカルファイルの場合: fileName必須
                if (isLocal) {
                    if (typeof item.fileName !== 'string' || item.fileName.length === 0 || item.fileName.length > 500) {
                        skippedCount++;
                        return;
                    }
                }

                // pointA, pointB: 数値、0以上、妥当な範囲（24時間以内）
                const MAX_DURATION = 86400; // 24時間
                if (typeof item.pointA !== 'number' || !isFinite(item.pointA) ||
                    item.pointA < 0 || item.pointA > MAX_DURATION) {
                    skippedCount++;
                    return;
                }
                if (typeof item.pointB !== 'number' || !isFinite(item.pointB) ||
                    item.pointB < 0 || item.pointB > MAX_DURATION) {
                    skippedCount++;
                    return;
                }

                // title: 文字列、長さ制限（500文字）
                let title = '無題の動画';
                if (typeof item.title === 'string') {
                    title = item.title.slice(0, 500);
                }

                // memo: 文字列、長さ制限（1000文字）
                let memo = '';
                if (typeof item.memo === 'string') {
                    memo = item.memo.slice(0, 1000);
                }

                // createdAt: 数値、妥当な範囲（2000年〜現在+1日）
                let createdAt = Date.now();
                const MIN_DATE = new Date('2000-01-01').getTime();
                const MAX_DATE = Date.now() + 86400000;
                if (typeof item.createdAt === 'number' && isFinite(item.createdAt) &&
                    item.createdAt >= MIN_DATE && item.createdAt <= MAX_DATE) {
                    createdAt = item.createdAt;
                }

                // 新しいIDを割り当てて追加
                const newItem = {
                    id: Date.now() + Math.random(),
                    isLocal: isLocal,
                    pointA: item.pointA,
                    pointB: item.pointB,
                    title: title,
                    memo: memo,
                    createdAt: createdAt
                };

                if (isLocal) {
                    newItem.fileName = item.fileName.slice(0, 500);
                    newItem.hasFileHandle = false; // インポート時はファイルハンドルなし
                } else {
                    newItem.videoId = item.videoId;
                    // thumbnail: YouTubeのサムネイルURLのみ許可、それ以外は再生成
                    let thumbnail = `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
                    if (typeof item.thumbnail === 'string' &&
                        /^https:\/\/img\.youtube\.com\/vi\/[a-zA-Z0-9_-]{11}\/[a-z]+\.jpg$/.test(item.thumbnail)) {
                        thumbnail = item.thumbnail;
                    }
                    newItem.thumbnail = thumbnail;
                }

                historyData.unshift(newItem);
                addedCount++;
            });

            saveHistoryData();
            renderHistoryList();

            let message = `${addedCount}件の履歴を読み込みました`;
            if (skippedCount > 0) {
                message += `（${skippedCount}件はスキップ）`;
            }
            alert(message);
        } catch (err) {
            alert('ファイルの読み込みに失敗しました: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function showMemoModal(initialMemo, onSave) {
    const modal = document.createElement('div');
    modal.className = 'memo-modal';
    modal.innerHTML = `
        <div class="memo-modal-content">
            <div class="memo-modal-title">メモを入力（任意）</div>
            <textarea class="memo-modal-input" placeholder="例：サビ部分、イントロなど">${escapeHtml(initialMemo)}</textarea>
            <div class="memo-modal-buttons">
                <button class="memo-modal-btn cancel">キャンセル</button>
                <button class="memo-modal-btn save">保存</button>
            </div>
        </div>
    `;

    const textarea = modal.querySelector('.memo-modal-input');
    const cancelBtn = modal.querySelector('.memo-modal-btn.cancel');
    const saveBtn = modal.querySelector('.memo-modal-btn.save');

    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });

    saveBtn.addEventListener('click', () => {
        onSave(textarea.value.trim());
        modal.remove();
    });

    // 背景クリックでキャンセル
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
    textarea.focus();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 波形データ
let waveformData = null;

// 波形を解析してCanvasに描画
async function analyzeAndDrawWaveform(file) {
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 波形データを抽出
        const channelData = audioBuffer.getChannelData(0);
        const samples = channelData.length;
        const canvas = elements.waveformCanvas;
        const width = canvas.offsetWidth || 800;

        // キャンバスのサイズを設定
        canvas.width = width * window.devicePixelRatio;
        canvas.height = 48 * window.devicePixelRatio;
        canvas.style.width = '100%';
        canvas.style.height = '48px';

        const ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // サンプル数をキャンバス幅に合わせて間引き
        const step = Math.ceil(samples / width);
        waveformData = [];

        for (let i = 0; i < width; i++) {
            const start = i * step;
            const end = Math.min(start + step, samples);

            let min = 1;
            let max = -1;

            for (let j = start; j < end; j++) {
                const value = channelData[j];
                if (value < min) min = value;
                if (value > max) max = value;
            }

            waveformData.push({ min, max });
        }

        drawWaveform();
        audioContext.close();
    } catch (err) {
        console.log('波形解析エラー:', err);
        clearWaveform();
    }
}

// 波形を描画
function drawWaveform() {
    if (!waveformData) return;

    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // グラデーションで波形を描画
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(78, 204, 163, 0.8)');
    gradient.addColorStop(0.5, 'rgba(78, 204, 163, 0.4)');
    gradient.addColorStop(1, 'rgba(78, 204, 163, 0.8)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    // 上半分
    for (let i = 0; i < waveformData.length; i++) {
        const x = i;
        const y = centerY + waveformData[i].min * centerY * 0.9;
        ctx.lineTo(x, y);
    }

    // 下半分（逆順）
    for (let i = waveformData.length - 1; i >= 0; i--) {
        const x = i;
        const y = centerY + waveformData[i].max * centerY * 0.9;
        ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
}

// 波形をクリア
function clearWaveform() {
    waveformData = null;
    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ウィンドウリサイズ時に波形を再描画
window.addEventListener('resize', () => {
    if (waveformData && state.playerType === 'local') {
        const canvas = elements.waveformCanvas;
        const width = canvas.parentElement.offsetWidth || 800;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = 48 * window.devicePixelRatio;
        canvas.style.width = '100%';
        canvas.style.height = '48px';
        // canvas.width/height変更でコンテキストがリセットされるため再設定
        const ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        drawWaveform();
    }
});

// URLパラメータから読み込み
let pendingURLParams = null;

function loadFromURLParams() {
    const params = new URLSearchParams(window.location.search);
    let videoId = params.get('v');
    const pointA = params.get('a');
    const pointB = params.get('b');
    const loop = params.get('l');

    // Share Target対応: url または text パラメータからYouTube URLを抽出
    if (!videoId) {
        const sharedUrl = params.get('url') || params.get('text') || '';
        videoId = extractVideoId(sharedUrl);
    }

    if (!videoId) return;

    // URLパラメータをクリア（履歴を汚さない）
    if (window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
    }

    // YouTube動画URLを入力欄にセット
    elements.videoUrl.value = `https://www.youtube.com/watch?v=${videoId}`;

    // AB区間パラメータを保存
    pendingURLParams = { pointA, pointB, loop };

    // YouTube APIが準備できているか確認
    if (typeof YT !== 'undefined' && YT.Player) {
        // APIが既に読み込まれている
        loadVideo();
    } else {
        // APIの読み込みを待つ
        waitForYouTubeAPI(() => loadVideo());
    }
}

// YouTube API読み込み待機
function waitForYouTubeAPI(callback) {
    if (typeof YT !== 'undefined' && YT.Player) {
        callback();
    } else {
        setTimeout(() => waitForYouTubeAPI(callback), 100);
    }
}

// URLパラメータからAB区間を適用
function applyPendingURLParams() {
    if (!pendingURLParams) return;

    const { pointA, pointB, loop } = pendingURLParams;

    if (pointA !== null) {
        state.pointA = parseFloat(pointA);
        elements.pointAInput.value = formatTime(state.pointA);
    }
    if (pointB !== null) {
        state.pointB = parseFloat(pointB);
        elements.pointBInput.value = formatTime(state.pointB);
    }
    if (loop === '1') {
        state.loopEnabled = true;
        elements.loopToggleBtn.classList.add('active');
        if (state.layoutHorizontal) {
            elements.loopToggleBtn.querySelector('.loop-text').textContent = 'ON';
        } else {
            elements.loopToggleBtn.querySelector('.loop-text').textContent = 'ループ ON';
        }
        elements.overlayLoopBtn.textContent = '↻ ON';
        elements.overlayLoopBtn.classList.add('active');
    }
    updateABVisual();

    // A地点にシーク
    seekTo(state.pointA, true);

    pendingURLParams = null;
}

// 共有URL生成
function generateShareURL() {
    if (!state.videoId) {
        alert('YouTube動画を読み込んでから共有URLを生成してください');
        return null;
    }

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('v', state.videoId);
    url.searchParams.set('a', state.pointA.toFixed(3));
    url.searchParams.set('b', state.pointB.toFixed(3));
    if (state.loopEnabled) {
        url.searchParams.set('l', '1');
    }

    return url.toString();
}

// 共有URLをクリップボードにコピー
function copyShareURL() {
    const url = generateShareURL();
    if (!url) return;

    navigator.clipboard.writeText(url)
        .then(() => {
            // 一時的にボタンテキストを変更
            const btn = elements.shareBtn;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="btn-icon">✓</span><span class="btn-label">コピー完了</span>';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('copied');
            }, 2000);
        })
        .catch(() => {
            // フォールバック: プロンプトで表示
            prompt('共有URL:', url);
        });
}

// ユーティリティ
function formatTime(seconds, showMs = true) {
    if (isNaN(seconds)) return '0:00.000';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    let timeStr;
    if (h > 0) {
        timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        timeStr = `${m}:${s.toString().padStart(2, '0')}`;
    }

    if (showMs) {
        timeStr += `.${ms.toString().padStart(3, '0')}`;
    }
    return timeStr;
}

function parseTime(str) {
    if (!str) return null;

    // 小数点を含む場合、秒部分を分離
    let mainPart = str;
    let msPart = 0;

    if (str.includes('.')) {
        const [main, ms] = str.split('.');
        mainPart = main;
        msPart = parseFloat('0.' + ms) || 0;
    }

    const parts = mainPart.split(':').map(p => parseFloat(p.trim()));
    if (parts.some(isNaN)) return null;

    let seconds = 0;
    if (parts.length === 1) {
        seconds = parts[0];
    } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
        return null;
    }

    return seconds + msPart;
}

// グローバルに公開（YouTube API用）
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
