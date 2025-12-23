// YouTube Looper App

let player = null;
let playerReady = false;
let updateInterval = null;
let loopGapTimeout = null;

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
    wideMode: false
};

// DOM要素
const elements = {};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    loadSettings();
});

function initElements() {
    elements.layoutToggleBtn = document.getElementById('layoutToggleBtn');
    elements.toggleUrlBtn = document.getElementById('toggleUrlBtn');
    elements.urlSection = document.getElementById('urlSection');
    elements.videoUrl = document.getElementById('videoUrl');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.playerContainer = document.getElementById('playerContainer');
    elements.seekbar = document.getElementById('seekbar');
    elements.currentTime = document.getElementById('currentTime');
    elements.duration = document.getElementById('duration');
    elements.playPauseBtn = document.getElementById('playPauseBtn');
    elements.speedSelect = document.getElementById('speedSelect');
    elements.flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
    elements.flipVerticalBtn = document.getElementById('flipVerticalBtn');
    elements.abSeekbar = document.getElementById('abSeekbar');
    elements.abRegion = document.getElementById('abRegion');
    elements.abCurrentPos = document.getElementById('abCurrentPos');
    elements.pointA = document.getElementById('pointA');
    elements.pointB = document.getElementById('pointB');
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
    elements.loopToggleBtn = document.getElementById('loopToggleBtn');
    elements.gapButtons = document.querySelectorAll('.gap-btn');
    elements.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    elements.downloadSettingsBtn = document.getElementById('downloadSettingsBtn');
    elements.importSettingsInput = document.getElementById('importSettingsInput');
}

function initEventListeners() {
    // レイアウト切り替え
    elements.layoutToggleBtn.addEventListener('click', toggleLayout);

    // URLセクションのトグル
    elements.toggleUrlBtn.addEventListener('click', toggleUrlSection);

    // URL読み込み
    elements.loadBtn.addEventListener('click', loadVideo);
    elements.videoUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadVideo();
    });

    // 再生コントロール
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.speedSelect.addEventListener('change', changeSpeed);

    // シークバー
    elements.seekbar.addEventListener('input', seekVideo);

    // 反転
    elements.flipHorizontalBtn.addEventListener('click', toggleFlipHorizontal);
    elements.flipVerticalBtn.addEventListener('click', toggleFlipVertical);

    // A-B地点設定
    elements.setPointABtn.addEventListener('click', setPointA);
    elements.setPointBBtn.addEventListener('click', setPointB);
    elements.pointAInput.addEventListener('change', () => updatePointFromInput('A'));
    elements.pointBInput.addEventListener('change', () => updatePointFromInput('B'));

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

    // 設定
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.downloadSettingsBtn.addEventListener('click', downloadSettings);
    elements.importSettingsInput.addEventListener('change', importSettings);
}

// YouTube APIコールバック
function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API Ready');
}

// レイアウト切り替え
function toggleLayout() {
    const isWide = document.body.classList.toggle('wide-mode');
    elements.layoutToggleBtn.classList.toggle('active', isWide);
    state.wideMode = isWide;
}

// URLセクションのトグル
function toggleUrlSection() {
    const isShown = elements.urlSection.classList.toggle('show');
    elements.toggleUrlBtn.textContent = isShown ? '−' : '+';
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

    // URLセクションを閉じる
    elements.urlSection.classList.remove('show');
    elements.toggleUrlBtn.textContent = '+';

    if (player) {
        player.loadVideoById(videoId);
    } else {
        createPlayer(videoId);
    }
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
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0
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

    updateABVisual();
    applyFlip();

    // 定期更新開始
    startUpdateInterval();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        elements.playPauseBtn.textContent = '⏸';
        startUpdateInterval();
    } else {
        elements.playPauseBtn.textContent = '▶';
        if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            // 一時停止時も更新を続ける（位置表示のため）
        }
    }
}

// 再生コントロール
function togglePlayPause() {
    if (!playerReady) return;

    const playerState = player.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function changeSpeed() {
    if (!playerReady) return;
    const speed = parseFloat(elements.speedSelect.value);
    player.setPlaybackRate(speed);
}

function seekVideo() {
    if (!playerReady) return;
    const time = parseFloat(elements.seekbar.value);
    player.seekTo(time, true);
}

// 定期更新
function startUpdateInterval() {
    if (updateInterval) return;

    updateInterval = setInterval(() => {
        if (!playerReady || state.isInGap) return;

        const currentTime = player.getCurrentTime();
        elements.seekbar.value = currentTime;
        elements.currentTime.textContent = formatTime(currentTime, false);

        // AB区間シークバーの現在位置を更新
        if (state.duration > 0) {
            const percent = (currentTime / state.duration) * 100;
            elements.abCurrentPos.style.left = `${percent}%`;
        }

        // ループ処理
        if (state.loopEnabled && currentTime >= state.pointB) {
            handleLoopEnd();
        }
    }, 100);
}

function handleLoopEnd() {
    if (state.loopGap > 0) {
        state.isInGap = true;
        player.pauseVideo();

        loopGapTimeout = setTimeout(() => {
            state.isInGap = false;
            player.seekTo(state.pointA, true);
            player.playVideo();
        }, state.loopGap * 1000);
    } else {
        player.seekTo(state.pointA, true);
    }
}

// ループトグル
function toggleLoop() {
    state.loopEnabled = !state.loopEnabled;
    elements.loopToggleBtn.classList.toggle('active', state.loopEnabled);
    elements.loopToggleBtn.querySelector('.loop-text').textContent =
        state.loopEnabled ? 'ループ ON' : 'ループ OFF';
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
    state.pointA = player.getCurrentTime();
    elements.pointAInput.value = formatTime(state.pointA);
    updateABVisual();
}

function setPointB() {
    if (!playerReady) return;
    state.pointB = player.getCurrentTime();
    elements.pointBInput.value = formatTime(state.pointB);
    updateABVisual();
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
        player.seekTo(point === 'A' ? state.pointA : state.pointB, true);
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
}

// AB区間シークバーのドラッグ
function initABSeekbarDrag() {
    let dragging = null;

    const getTimeFromEvent = (e) => {
        const rect = elements.abSeekbar.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        return percent * state.duration;
    };

    const onMove = (e) => {
        if (!dragging) return;
        e.preventDefault();

        const time = getTimeFromEvent(e);
        if (dragging === 'A') {
            state.pointA = time;
            elements.pointAInput.value = formatTime(time);
        } else {
            state.pointB = time;
            elements.pointBInput.value = formatTime(time);
        }
        updateABVisual();

        // ドラッグ中はプレイヤーをその位置にシークしてプレビュー
        if (playerReady) {
            player.seekTo(time, true);
        }
    };

    const onEnd = () => {
        dragging = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    };

    elements.pointA.addEventListener('mousedown', (e) => {
        dragging = 'A';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    });

    elements.pointB.addEventListener('mousedown', (e) => {
        dragging = 'B';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    });

    // タッチ対応
    elements.pointA.addEventListener('touchstart', (e) => {
        dragging = 'A';
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    });

    elements.pointB.addEventListener('touchstart', (e) => {
        dragging = 'B';
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    });

    // シークバークリックでその位置にジャンプ
    elements.abSeekbar.addEventListener('click', (e) => {
        if (e.target === elements.pointA || e.target === elements.pointB) return;
        if (!playerReady) return;

        const time = getTimeFromEvent(e);
        player.seekTo(time, true);
    });
}

// 設定保存
function saveSettings() {
    const settings = getCurrentSettings();
    localStorage.setItem('u2LooperSettings', JSON.stringify(settings));
    alert('設定を保存しました');
}

function loadSettings() {
    const saved = localStorage.getItem('u2LooperSettings');
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);
        applySettings(settings);
    } catch (e) {
        console.error('設定の読み込みに失敗しました', e);
    }
}

function downloadSettings() {
    const settings = getCurrentSettings();
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `u2looper-settings-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function importSettings(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const settings = JSON.parse(event.target.result);
            applySettings(settings);
            alert('設定をインポートしました');
        } catch (err) {
            alert('設定ファイルの読み込みに失敗しました');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function getCurrentSettings() {
    return {
        videoUrl: elements.videoUrl.value,
        flipHorizontal: state.flipHorizontal,
        flipVertical: state.flipVertical,
        pointA: state.pointA,
        pointB: state.pointB,
        loopEnabled: state.loopEnabled,
        loopGap: state.loopGap,
        speed: elements.speedSelect.value,
        wideMode: state.wideMode
    };
}

function applySettings(settings) {
    if (settings.videoUrl) {
        elements.videoUrl.value = settings.videoUrl;
    }
    if (settings.speed) {
        elements.speedSelect.value = settings.speed;
    }
    if (settings.flipHorizontal !== undefined) {
        state.flipHorizontal = settings.flipHorizontal;
        elements.flipHorizontalBtn.classList.toggle('active', state.flipHorizontal);
    }
    if (settings.flipVertical !== undefined) {
        state.flipVertical = settings.flipVertical;
        elements.flipVerticalBtn.classList.toggle('active', state.flipVertical);
    }
    if (settings.loopEnabled !== undefined) {
        state.loopEnabled = settings.loopEnabled;
        elements.loopToggleBtn.classList.toggle('active', settings.loopEnabled);
        elements.loopToggleBtn.querySelector('.loop-text').textContent =
            settings.loopEnabled ? 'ループ ON' : 'ループ OFF';
    }
    if (settings.loopGap !== undefined) {
        state.loopGap = settings.loopGap;
        elements.gapButtons.forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.gap) === settings.loopGap);
        });
    }
    if (settings.pointA !== undefined) {
        state.pointA = settings.pointA;
        elements.pointAInput.value = formatTime(settings.pointA);
    }
    if (settings.pointB !== undefined) {
        state.pointB = settings.pointB;
        elements.pointBInput.value = formatTime(settings.pointB);
    }
    if (settings.wideMode !== undefined) {
        state.wideMode = settings.wideMode;
        document.body.classList.toggle('wide-mode', settings.wideMode);
        elements.layoutToggleBtn.classList.toggle('active', settings.wideMode);
    }

    applyFlip();
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
