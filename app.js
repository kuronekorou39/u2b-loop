// YouTube Looper App

let player = null;
let playerReady = false;
let updateInterval = null;
let loopGapTimeout = null;
let overlayHideTimeout = null;
let countdownInterval = null;

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
    layoutHorizontal: false
};

// DOM要素
const elements = {};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    initLayoutMediaQuery();
    loadHistory();
});

function initElements() {
    elements.container = document.querySelector('.container');
    elements.layoutBtn = document.getElementById('layoutBtn');
    elements.fullscreenBtn = document.getElementById('fullscreenBtn');
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
    elements.ytControlsBtn = document.getElementById('ytControlsBtn');
    elements.muteBtn = document.getElementById('muteBtn');
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
    elements.resetPointABtn = document.getElementById('resetPointABtn');
    elements.resetPointBBtn = document.getElementById('resetPointBBtn');
    elements.loopToggleBtn = document.getElementById('loopToggleBtn');
    elements.gapCountdown = document.getElementById('gapCountdown');
    elements.gapButtons = document.querySelectorAll('.gap-btn');
    elements.saveHistoryBtn = document.getElementById('saveHistoryBtn');
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
    elements.overlayCurrentTime = document.getElementById('overlayCurrentTime');
    elements.overlayDuration = document.getElementById('overlayDuration');
    elements.overlayPlayPauseBtn = document.getElementById('overlayPlayPauseBtn');
    elements.overlayMuteBtn = document.getElementById('overlayMuteBtn');
    elements.overlaySpeedSelect = document.getElementById('overlaySpeedSelect');
    elements.overlayLoopBtn = document.getElementById('overlayLoopBtn');
    elements.overlayExitBtn = document.getElementById('overlayExitBtn');
}

function initEventListeners() {
    // レイアウト切り替え
    elements.layoutBtn.addEventListener('click', toggleLayout);

    // フルスクリーン
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', onFullscreenChange);

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
}

// YouTube APIコールバック
function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API Ready');
}

// フルスクリーン切り替え
function toggleFullscreen() {
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
    elements.toggleUrlBtn.textContent = isShown ? '−' : '+';
}

// レイアウト切り替え
function toggleLayout() {
    state.layoutHorizontal = !state.layoutHorizontal;
    applyLayout();
}

function applyLayout() {
    elements.container.classList.toggle('layout-horizontal', state.layoutHorizontal);
    elements.layoutBtn.classList.toggle('active', state.layoutHorizontal);
    elements.layoutBtn.textContent = state.layoutHorizontal ? '⊞' : '⊟';

    // 横並び時はラベルを短縮
    if (state.layoutHorizontal) {
        elements.loopToggleBtn.querySelector('.loop-text').textContent = state.loopEnabled ? 'ON' : 'OFF';
        elements.setPointABtn.textContent = '現在';
        elements.setPointBBtn.textContent = '現在';
    } else {
        elements.loopToggleBtn.querySelector('.loop-text').textContent = state.loopEnabled ? 'ループ ON' : 'ループ OFF';
        elements.setPointABtn.textContent = '現在位置をセット';
        elements.setPointBBtn.textContent = '現在位置をセット';
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

    // 状態をリセット
    resetPlayerState();

    // URLセクションを閉じる
    elements.urlSection.classList.remove('show');
    elements.toggleUrlBtn.textContent = '+';

    if (player) {
        player.loadVideoById(videoId);
    } else {
        createPlayer(videoId);
    }
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

    // 定期更新開始
    startUpdateInterval();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        elements.playPauseBtn.textContent = '⏸';
        elements.overlayPlayPauseBtn.textContent = '⏸';
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
    elements.muteBtn.textContent = '🔊';
    elements.muteBtn.classList.remove('muted');
    elements.overlayMuteBtn.textContent = '🔊';

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

    if (player.isMuted()) {
        player.unMute();
        elements.muteBtn.textContent = '🔊';
        elements.muteBtn.classList.remove('muted');
        elements.overlayMuteBtn.textContent = '🔊';
    } else {
        player.mute();
        elements.muteBtn.textContent = '🔇';
        elements.muteBtn.classList.add('muted');
        elements.overlayMuteBtn.textContent = '🔇';
    }
}

function seekVideo() {
    if (!playerReady) return;
    cancelCountdown();
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

        // オーバーレイのシークバーも更新
        elements.overlaySeekbar.value = currentTime;
        elements.overlayCurrentTime.textContent = formatTime(currentTime, false);

        // AB区間シークバーの現在位置を更新
        if (state.duration > 0) {
            const percent = (currentTime / state.duration) * 100;
            elements.abCurrentPos.style.left = `${percent}%`;
        }

        // ループ処理（再生中のときだけ）
        if (state.loopEnabled && currentTime >= state.pointB && player.getPlayerState() === YT.PlayerState.PLAYING) {
            handleLoopEnd();
        }
    }, 100);
}

function handleLoopEnd() {
    if (state.loopGap > 0) {
        state.isInGap = true;
        player.pauseVideo();

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
            player.seekTo(state.pointA, true);
            player.playVideo();
        }, state.loopGap * 1000);
    } else {
        player.seekTo(state.pointA, true);
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
        const currentTime = player.getCurrentTime();
        if (currentTime >= state.pointB) {
            player.seekTo(state.pointA, true);
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

function resetPointA() {
    state.pointA = 0;
    elements.pointAInput.value = formatTime(0);
    updateABVisual();
    if (playerReady) {
        player.seekTo(0, true);
    }
}

function resetPointB() {
    state.pointB = state.duration;
    elements.pointBInput.value = formatTime(state.duration);
    updateABVisual();
    if (playerReady) {
        player.seekTo(state.duration, true);
    }
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

        cancelCountdown();
        const time = getTimeFromEvent(e);
        player.seekTo(time, true);
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

function loadHistory() {
    const saved = localStorage.getItem('u2LooperHistory');
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
    localStorage.setItem('u2LooperHistory', JSON.stringify(historyData));
}

function saveToHistory() {
    if (!playerReady || !state.videoId) {
        alert('動画を読み込んでください');
        return;
    }

    // 動画のタイトルを取得
    const videoData = player.getVideoData();
    const title = videoData.title || '無題の動画';

    // メモ入力モーダルを表示
    showMemoModal('', (memo) => {
        const historyItem = {
            id: Date.now(),
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

        // 保存成功フィードバック
        showSaveSuccess();
    });
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
    // URLをセット
    elements.videoUrl.value = `https://youtu.be/${item.videoId}`;

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
            player.seekTo(state.pointA, true);
        } else {
            setTimeout(restorePoints, 100);
        }
    };
    restorePoints();

    // URLセクションを閉じる
    elements.urlSection.classList.remove('show');
    elements.toggleUrlBtn.textContent = '+';

    // 履歴モーダルを閉じる
    closeHistoryModal();
}

function deleteFromHistory(id) {
    if (!confirm('この履歴を削除しますか？')) return;

    historyData = historyData.filter(item => item.id !== id);
    saveHistoryData();
    renderHistoryList();
}

function clearAllHistory() {
    if (historyData.length === 0) {
        alert('削除する履歴がありません');
        return;
    }

    if (!confirm(`全ての履歴（${historyData.length}件）を削除しますか？`)) return;

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

        if (isSelectMode) {
            const isSelected = selectedHistoryIds.has(item.id);
            div.classList.toggle('selected', isSelected);
            div.innerHTML = `
                <div class="history-checkbox ${isSelected ? 'checked' : ''}">
                    ${isSelected ? '✓' : ''}
                </div>
                <img src="${item.thumbnail}" alt="" class="history-thumbnail" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22><rect fill=%22%23333%22 width=%2216%22 height=%229%22/></svg>'">
                <div class="history-info">
                    <div class="history-title">${escapeHtml(item.title)}</div>
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
                <img src="${item.thumbnail}" alt="" class="history-thumbnail" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22><rect fill=%22%23333%22 width=%2216%22 height=%229%22/></svg>'">
                <div class="history-info">
                    <div class="history-title">${escapeHtml(item.title)}</div>
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
    a.download = `u2looper-history-${timestamp}.json`;
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

                // videoId: 文字列、11文字、英数字とハイフン・アンダースコアのみ
                if (typeof item.videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(item.videoId)) {
                    skippedCount++;
                    return;
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

                // thumbnail: YouTubeのサムネイルURLのみ許可、それ以外は再生成
                let thumbnail = `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
                if (typeof item.thumbnail === 'string' &&
                    /^https:\/\/img\.youtube\.com\/vi\/[a-zA-Z0-9_-]{11}\/[a-z]+\.jpg$/.test(item.thumbnail)) {
                    thumbnail = item.thumbnail;
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
                    videoId: item.videoId,
                    title: title,
                    thumbnail: thumbnail,
                    pointA: item.pointA,
                    pointB: item.pointB,
                    memo: memo,
                    createdAt: createdAt
                };

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
