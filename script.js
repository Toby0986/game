/* ============================================================
 * 兒童遊戲樂園 - 主程式
 * ============================================================ */

// ========== 全域狀態 ==========
let currentPlayerName = '小寶貝';
let soundEnabled = true;
let voiceEnabled = true;
let audioCtx = null;
let speechSynthesis = window.speechSynthesis || null;

// ========== 音效控制 ==========
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function updateSoundButtons() {
    const label = soundEnabled ? '🔊 音效: 開' : '🔇 音效: 關';
    ['sound-toggle-btn-lobby', 'sound-toggle-btn-paint', 'sound-toggle-btn-memory',
 'sound-toggle-btn-guess', 'sound-toggle-btn-mult', 'sound-toggle-btn-calc',
 'sound-toggle-btn-zhuyin', 'sound-toggle-btn-whack'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.innerText = label;
    });
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundButtons();
    if (soundEnabled) initAudio();
}

// ========== 語音朗讀 ==========
const GAME_INTROS = {
    paint: '歡迎來到神奇魔法畫板！你可以用手指或滑鼠在畫布上自由塗鴉。下方有六種顏色可以選擇，畫錯了可以按全部清除。畫完後按完成作品，就會有彩帶慶祝喔！',
    memory: '歡迎來到記憶翻牌！總共有十六張卡片，兩兩配對成八組。每次翻開兩張卡片，如果圖案相同就配對成功，如果不同就會翻回去。把所有八組都配對成功就贏了！',
    guess: '歡迎來到猜數字！我想了一個一到一百之間的整數。你每次輸入一個數字，我會告訴你太大還是太小，直到你猜中為止。看看你總共需要猜幾次！',
    mult: '歡迎來到九九乘法挑戰！總共有五十關，每一題答對得兩分，答錯倒扣兩分。選出正確的乘積，看看你最後能得到幾分！',
    calc: '歡迎來到加減法挑戰！總共有五十關，每一題答對得兩分，答錯倒扣兩分。選出正確的答案，看看你最後能得到幾分！',
    zhuyin: '歡迎來到注音與圖片配對！總共有二十關。我會顯示一張圖片，請從四個注音選項中選出正確的注音。每題答對得五分，答錯不扣分，看看你能得到幾分！',
    whack: '歡迎來到注音打地鼠！總共有六十秒的時間。上方會顯示目標注音，我會唸出來，請從九個地洞中，打正確注音的地鼠。打對得五分，打錯扣三分。時間到看看你能得幾分！'
};

function speakText(text, interrupt = true) {
    if (!voiceEnabled || !speechSynthesis) return;
    if (interrupt) speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-TW';
    utter.rate = 0.95;
    utter.pitch = 1.1;
    const voices = speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang && v.lang.startsWith('zh'));
    if (zhVoice) utter.voice = zhVoice;
    speechSynthesis.speak(utter);
}

function speakGameIntro(gameId) {
    const text = GAME_INTROS[gameId];
    if (text) speakText(text);
}

if (speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {};
}

// ========== 遊戲音效 ==========
function playPopSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(300 + Math.random() * 400, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } catch (e) {}
}

function playFlipSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    } catch (e) {}
}

function playMatchSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        [660, 880].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.15, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.15);
        });
    } catch (e) {}
}

function playWrongSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } catch (e) {}
}

function playWinSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.15, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.25);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.25);
        });
    } catch (e) {}
}

// ========== 視圖切換 ==========
const lobbyView = document.getElementById('lobbyView');
const paintView = document.getElementById('paintView');
const memoryView = document.getElementById('memoryView');
const guessView = document.getElementById('guessView');
const multView = document.getElementById('multView');
const calcView = document.getElementById('calcView');
const zhuyinView = document.getElementById('zhuyinView');
const whackView = document.getElementById('whackView');
const welcomeOverlay = document.getElementById('welcome-overlay');

const ALL_VIEWS = [lobbyView, paintView, memoryView, guessView, multView, calcView, zhuyinView, whackView];

function hideAllViews() {
    ALL_VIEWS.forEach(v => v.classList.add('hidden'));
}

function showLobby() {
    hideAllViews();
    lobbyView.classList.remove('hidden');
    document.getElementById('lobby-username').innerText = currentPlayerName;
}

function launchGame(gameId) {
    hideAllViews();

    switch (gameId) {
        case 'paint':
            paintView.classList.remove('hidden');
            document.getElementById('user-display').innerText = `畫家：${currentPlayerName}`;
            setTimeout(resizeCanvas, 60);
            initAudio();
            setTimeout(() => speakGameIntro('paint'), 300);
            break;
        case 'memory':
            memoryView.classList.remove('hidden');
            document.getElementById('memory-user-display').innerText = `${currentPlayerName} 的記憶翻牌`;
            initAudio();
            startMemoryGame();
            setTimeout(() => speakGameIntro('memory'), 300);
            break;
        case 'guess':
            guessView.classList.remove('hidden');
            document.getElementById('guess-user-display').innerText = `${currentPlayerName} 的猜數字`;
            initAudio();
            resetGuessGame();
            setTimeout(() => speakGameIntro('guess'), 300);
            break;
        case 'mult':
            multView.classList.remove('hidden');
            document.getElementById('mult-user-display').innerText = `${currentPlayerName} 的九九乘法`;
            initAudio();
            resetMultGame();
            setTimeout(() => speakGameIntro('mult'), 300);
            break;
        case 'calc':
            calcView.classList.remove('hidden');
            document.getElementById('calc-user-display').innerText = `${currentPlayerName} 的加減法`;
            initAudio();
            resetCalcGame();
            setTimeout(() => speakGameIntro('calc'), 300);
            break;
        case 'zhuyin':
            zhuyinView.classList.remove('hidden');
            document.getElementById('zhuyin-user-display').innerText = `${currentPlayerName} 的注音與圖片配對`;
            initAudio();
            resetZhuyinGame();
            setTimeout(() => speakGameIntro('zhuyin'), 300);
            break;
        case 'whack':
            whackView.classList.remove('hidden');
            document.getElementById('whack-user-display').innerText = `${currentPlayerName} 的注音打地鼠`;
            initAudio();
            resetWhackGame();
            setTimeout(() => speakGameIntro('whack'), 300);
            break;
    }
}

function goBackToLobby() {
    isDrawing = false;
    if (memoryFlipTimer) { clearTimeout(memoryFlipTimer); memoryFlipTimer = null; }
    if (multLockTimer) { clearTimeout(multLockTimer); multLockTimer = null; }
    if (calcLockTimer) { clearTimeout(calcLockTimer); calcLockTimer = null; }
    if (zhuyinLockTimer) { clearTimeout(zhuyinLockTimer); zhuyinLockTimer = null; }
    if (whackTimerInterval) { clearInterval(whackTimerInterval); whackTimerInterval = null; }
    if (whackMoleTimer) { clearTimeout(whackMoleTimer); whackMoleTimer = null; }
    if (speechSynthesis) speechSynthesis.cancel();
    showLobby();
}

// ========== 暱稱輸入 ==========
const startBtn = document.getElementById('start-btn');

function handleStart(e) {
    e.preventDefault();
    initAudio();
    const nameInput = document.getElementById('player-name');
    currentPlayerName = (nameInput ? nameInput.value.trim() : '') || '小寶貝';
    welcomeOverlay.classList.add('hidden');
    showLobby();

    document.getElementById('user-display').innerText = `畫家：${currentPlayerName}`;
    document.getElementById('lobby-username').innerText = currentPlayerName;
    document.getElementById('memory-user-display').innerText = `${currentPlayerName} 的記憶翻牌`;
    document.getElementById('guess-user-display').innerText = `${currentPlayerName} 的猜數字`;
    document.getElementById('mult-user-display').innerText = `${currentPlayerName} 的九九乘法`;
    document.getElementById('calc-user-display').innerText = `${currentPlayerName} 的加減法`;
    document.getElementById('zhuyin-user-display').innerText = `${currentPlayerName} 的注音與圖片配對`;
    document.getElementById('whack-user-display').innerText = `${currentPlayerName} 的注音打地鼠`;

    speakText(`歡迎 ${currentPlayerName} 來到遊戲樂園！請選擇想玩的遊戲。`);
}
startBtn.addEventListener('click', handleStart);
startBtn.addEventListener('touchend', handleStart);

// ========== 通用工具 ==========
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* ============================================================
 * 畫板邏輯
 * ============================================================ */
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let currentColor = '#ff5252';

function resizeCanvas() {
    const container = document.getElementById('canvas-area');
    if (!container || container.clientWidth === 0) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = currentColor;
}

function setColor(color, e) {
    currentColor = color;
    ctx.strokeStyle = color;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    if (e && e.target) e.target.classList.add('active');
}

function clearCanvas() {
    if (confirm('確定要清空畫布重新開始嗎？')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function finishArt() {
    playPopSound();
    // 畫板不列入排行榜，可選擇跳過
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    speakText('太棒了！這是一幅超棒的魔法藝術品！');
    alert('🎉 太棒了！這是一幅超棒的魔法藝術品！');
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    playPopSound();
});

window.addEventListener('mouseup', () => { isDrawing = false; });

canvas.addEventListener('touchstart', (e) => {
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
});

canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    playPopSound();
    e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', () => { isDrawing = false; });

window.addEventListener('resize', () => {
    if (!paintView.classList.contains('hidden')) {
        resizeCanvas();
    }
});

/* ============================================================
 * 記憶翻牌邏輯
 * ============================================================ */
const EMOJIS = ['🐶', '🐱', '🐼', '🦊', '🐸', '🐵', '🦄', '🐷'];
const TOTAL_PAIRS = EMOJIS.length;

let memoryDeck = [];
let memoryFlipped = [];
let memoryMatched = 0;
let memoryLock = false;
let memoryFlipTimer = null;

const memoryGridEl = document.getElementById('memoryGrid');
const memoryStatusEl = document.getElementById('memoryStatus');
const memoryWinEl = document.getElementById('memoryWin');

function createDeck() {
    let deck = [];
    EMOJIS.forEach((emoji, index) => {
        deck.push({ emoji, pairId: index, id: deck.length });
        deck.push({ emoji, pairId: index, id: deck.length });
    });
    return shuffle(deck);
}

function renderMemoryGrid() {
    memoryGridEl.innerHTML = '';
    memoryDeck.forEach((card) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.cardId = card.id;
        cardEl.dataset.pairId = card.pairId;

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        const front = document.createElement('div');
        front.className = 'card-front';
        front.textContent = '❓';

        const back = document.createElement('div');
        back.className = 'card-back';
        back.textContent = card.emoji;

        inner.appendChild(front);
        inner.appendChild(back);
        cardEl.appendChild(inner);

        cardEl.addEventListener('click', () => handleCardClick(cardEl));
        memoryGridEl.appendChild(cardEl);
    });
}

function handleCardClick(cardEl) {
    if (memoryLock) return;
    if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;
    if (memoryFlipped.length >= 2) return;

    cardEl.classList.add('flipped');
    playFlipSound();
    memoryFlipped.push(cardEl);

    if (memoryFlipped.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    const [card1, card2] = memoryFlipped;
    const pair1 = card1.dataset.pairId;
    const pair2 = card2.dataset.pairId;

    if (pair1 === pair2) {
        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            memoryMatched++;
            updateMemoryStatus();
            playMatchSound();
            memoryFlipped = [];
            memoryLock = false;

            if (memoryMatched === TOTAL_PAIRS) {
                winMemoryGame();
            }
        }, 350);
        memoryLock = true;
    } else {
        memoryLock = true;
        memoryFlipTimer = setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            memoryFlipped = [];
            memoryLock = false;
            memoryFlipTimer = null;
        }, 900);
    }
}

function updateMemoryStatus() {
    memoryStatusEl.innerText = `找到 ${memoryMatched} / ${TOTAL_PAIRS} 組配對`;
}

function winMemoryGame() {
    memoryWinEl.classList.add('show');
    playMatchSound();
        // 以剩餘時間或翻牌次數計分，簡單起見用 100 分基礎
    submitScore('memory', 100, currentPlayer || { name: currentPlayerName, age: '', school: '' });
    speakText('恭喜你！全部配對成功！你太厲害了！');
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    setTimeout(() => {
        confetti({ particleCount: 100, spread: 120, origin: { y: 0.4 } });
    }, 300);
}

function startMemoryGame() {
    if (memoryFlipTimer) {
        clearTimeout(memoryFlipTimer);
        memoryFlipTimer = null;
    }
    memoryDeck = createDeck();
    memoryFlipped = [];
    memoryMatched = 0;
    memoryLock = false;
    memoryWinEl.classList.remove('show');
    updateMemoryStatus();
    renderMemoryGrid();
}

function resetMemoryGame() {
    playFlipSound();
    startMemoryGame();
}

/* ============================================================
 * 猜數字邏輯
 * ============================================================ */
let guessTarget = 0;
let guessAttempts = 0;
let guessFinished = false;

const guessInput = document.getElementById('guessInput');
const guessHistory = document.getElementById('guessHistory');
const guessResult = document.getElementById('guessResult');
const guessResultTitle = document.getElementById('guessResultTitle');
const guessResultText = document.getElementById('guessResultText');
const guessInputRow = document.getElementById('guessInputRow');
const guessTip = document.getElementById('guessTip');

function resetGuessGame() {
    guessTarget = Math.floor(Math.random() * 100) + 1;
    guessAttempts = 0;
    guessFinished = false;
    guessHistory.innerHTML = '';
    guessResult.classList.remove('show');
    guessInputRow.style.display = 'flex';
    guessTip.style.display = 'block';
    guessInput.value = '';
    guessInput.disabled = false;
    guessInput.focus();
}

function submitGuess() {
    if (guessFinished) return;
    const raw = guessInput.value.trim();
    if (raw === '') return;
    const guess = Number(raw);
    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
        playWrongSound();
        alert('請輸入 1 ~ 100 的整數喔！');
        guessInput.value = '';
        guessInput.focus();
        return;
    }

    guessAttempts++;
    let hintText = '';
    let hintClass = '';
    let isCorrect = false;

    if (guess === guessTarget) {
        hintText = '🎯 猜對了！';
        hintClass = 'correct';
        isCorrect = true;
    } else if (guess > guessTarget) {
        hintText = '📉 太大了，再小一點';
        hintClass = 'too-high';
    } else {
        hintText = '📈 太小了，再大一點';
        hintClass = 'too-low';
    }

    const item = document.createElement('div');
    item.className = 'guess-item';
    item.innerHTML = `<span class="num">${guess}</span><span class="hint ${hintClass}">${hintText}</span>`;
    guessHistory.prepend(item);

    guessInput.value = '';
    guessInput.focus();

    if (isCorrect) {
        guessFinished = true;
        playWinSound();
            // 猜越少次分數越高（基礎 110 減去次數 * 10，最低 10）
    const guessScore = Math.max(10, 110 - guessAttempts * 10);
    submitScore('guess', guessScore, currentPlayer || { name: currentPlayerName, age: '', school: '' });
        guessInputRow.style.display = 'none';
        guessTip.style.display = 'none';
        guessResultTitle.textContent = `🎉 太厲害了！答案是 ${guessTarget}`;
        guessResultText.textContent = `你總共猜了 ${guessAttempts} 次就答對了！`;
        guessResult.classList.add('show');
        speakText(`太厲害了！答案是 ${guessTarget}，你總共猜了 ${guessAttempts} 次就答對了！`);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
        setTimeout(() => {
            confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 } });
        }, 300);
    } else {
        playWrongSound();
            // 猜越少次分數越高（基礎 110 減去次數 * 10，最低 10）
    const guessScore = Math.max(10, 110 - guessAttempts * 10);
    submitScore('guess', guessScore, currentPlayer || { name: currentPlayerName, age: '', school: '' });
    }
}

guessInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess();
    }
});

/* ============================================================
 * 九九乘法邏輯
 * ============================================================ */
const MULT_TOTAL = 50;
const MULT_POINTS = 2;

let multScore = 0;
let multCorrect = 0;
let multWrong = 0;
let multCurrent = 0;
let multAnswer = 0;
let multLock = false;
let multLockTimer = null;
let multFinished = false;

const multAEl = document.getElementById('multA');
const multBEl = document.getElementById('multB');
const multOptionsEl = document.getElementById('multOptions');
const multFeedbackEl = document.getElementById('multFeedback');
const multCorrectEl = document.getElementById('multCorrect');
const multWrongEl = document.getElementById('multWrong');
const multScoreEl = document.getElementById('multScore');
const multRoundEl = document.getElementById('multRound');
const multWinEl = document.getElementById('multWin');
const multWinTitle = document.getElementById('multWinTitle');
const multWinText = document.getElementById('multWinText');
const multQuestionEl = document.getElementById('multQuestion');

function resetMultGame() {
    if (multLockTimer) { clearTimeout(multLockTimer); multLockTimer = null; }
    multScore = 0;
    multCorrect = 0;
    multWrong = 0;
    multCurrent = 0;
    multLock = false;
    multFinished = false;
    multScoreEl.innerText = '0';
    multCorrectEl.innerText = '0';
    multWrongEl.innerText = '0';
    multRoundEl.innerText = '1';
    multFeedbackEl.innerText = '';
    multFeedbackEl.className = 'mult-feedback';
    multWinEl.classList.remove('show');
    multQuestionEl.style.display = 'block';
    multOptionsEl.style.display = 'grid';
    nextMultQuestion();
}

function nextMultQuestion() {
    if (multCurrent >= MULT_TOTAL) {
        finishMultGame();
        return;
    }
    multCurrent++;
    multRoundEl.innerText = multCurrent;
    multLock = false;

    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    multAnswer = a * b;

    multAEl.textContent = a;
    multBEl.textContent = b;

    const options = new Set([multAnswer]);
    while (options.size < 4) {
        let offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? -1 : 1);
        let fake = multAnswer + offset;
        if (fake < 2 || fake > 90) continue;
        options.add(fake);
    }
    const optArr = shuffle(Array.from(options));

    multOptionsEl.innerHTML = '';
    optArr.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'mult-option';
        btn.textContent = val;
        btn.addEventListener('click', () => handleMultAnswer(btn, val));
        multOptionsEl.appendChild(btn);
    });

    multFeedbackEl.innerText = '';
    multFeedbackEl.className = 'mult-feedback';
}

function handleMultAnswer(btn, val) {
    if (multLock || multFinished) return;
    multLock = true;

    const isCorrect = val === multAnswer;
    document.querySelectorAll('.mult-option').forEach(b => b.disabled = true);

    if (isCorrect) {
        btn.classList.add('correct');
        multCorrect++;
        multCorrectEl.innerText = multCorrect;
        multScore += MULT_POINTS;
        multScoreEl.innerText = multScore;
        multFeedbackEl.innerText = `✅ 答對了！+${MULT_POINTS} 分`;
        multFeedbackEl.className = 'mult-feedback ok';
        playMatchSound();
    } else {
        btn.classList.add('wrong');
        multWrong++;
        multWrongEl.innerText = multWrong;
        multScore -= MULT_POINTS;
        multScoreEl.innerText = multScore;
        multFeedbackEl.innerText = `❌ 答錯了，正確答案是 ${multAnswer}，-${MULT_POINTS} 分`;
        multFeedbackEl.className = 'mult-feedback no';
        playWrongSound();
        document.querySelectorAll('.mult-option').forEach(b => {
            if (Number(b.textContent) === multAnswer) b.classList.add('correct');
        });
    }

    multLockTimer = setTimeout(() => {
        multLockTimer = null;
        nextMultQuestion();
    }, 1200);
}

function finishMultGame() {
    multFinished = true;
    multQuestionEl.style.display = 'none';
    multOptionsEl.style.display = 'none';
    multFeedbackEl.innerText = '';
    multWinTitle.textContent = `🏆 完成 50 關！總得分：${multScore} 分`;
    multWinText.innerHTML = `答對 ${multCorrect} 題，答錯 ${multWrong} 題。<br>
        每題 ${MULT_POINTS} 分，答錯倒扣 ${MULT_POINTS} 分。<br>
        滿分 ${MULT_TOTAL * MULT_POINTS} 分。`;
    if (multScore === MULT_TOTAL * MULT_POINTS) {
        multWinText.innerHTML += '<br>🌟 滿分！你是乘法小天才！';
    } else if (multScore >= 80) {
        multWinText.innerHTML += '<br>💪 表現很棒，繼續加油！';
    } else if (multScore >= 50) {
        multWinText.innerHTML += '<br>👍 不錯喔，再練習會更厲害！';
    } else {
        multWinText.innerHTML += '<br>😊 別灰心，多練習幾次一定可以的！';
    }
    multWinEl.classList.add('show');
    playWinSound();
    submitScore('mult', multScore, currentPlayer || { name: currentPlayerName, age: '', school: '' });
    speakText(`完成五十關！你總共得到 ${multScore} 分，答對 ${multCorrect} 題，答錯 ${multWrong} 題。`);
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    setTimeout(() => {
        confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 } });
    }, 300);
}

/* ============================================================
 * 加減法邏輯
 * ============================================================ */
const CALC_TOTAL = 50;
const CALC_POINTS = 2;

let calcScore = 0;
let calcCorrect = 0;
let calcWrong = 0;
let calcCurrent = 0;
let calcAnswer = 0;
let calcLock = false;
let calcLockTimer = null;
let calcFinished = false;

const calcAEl = document.getElementById('calcA');
const calcBEl = document.getElementById('calcB');
const calcOpEl = document.getElementById('calcOp');
const calcOptionsEl = document.getElementById('calcOptions');
const calcFeedbackEl = document.getElementById('calcFeedback');
const calcCorrectEl = document.getElementById('calcCorrect');
const calcWrongEl = document.getElementById('calcWrong');
const calcScoreEl = document.getElementById('calcScore');
const calcRoundEl = document.getElementById('calcRound');
const calcWinEl = document.getElementById('calcWin');
const calcWinTitle = document.getElementById('calcWinTitle');
const calcWinText = document.getElementById('calcWinText');
const calcQuestionEl = document.getElementById('calcQuestion');

function resetCalcGame() {
    if (calcLockTimer) { clearTimeout(calcLockTimer); calcLockTimer = null; }
    calcScore = 0;
    calcCorrect = 0;
    calcWrong = 0;
    calcCurrent = 0;
    calcLock = false;
    calcFinished = false;
    calcScoreEl.innerText = '0';
    calcCorrectEl.innerText = '0';
    calcWrongEl.innerText = '0';
    calcRoundEl.innerText = '1';
    calcFeedbackEl.innerText = '';
    calcFeedbackEl.className = 'calc-feedback';
    calcWinEl.classList.remove('show');
    calcQuestionEl.style.display = 'block';
    calcOptionsEl.style.display = 'grid';
    nextCalcQuestion();
}

function nextCalcQuestion() {
    if (calcCurrent >= CALC_TOTAL) {
        finishCalcGame();
        return;
    }
    calcCurrent++;
    calcRoundEl.innerText = calcCurrent;
    calcLock = false;

    const isAdd = Math.random() < 0.5;
    let a, b, answer;
    if (isAdd) {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        answer = a + b;
    } else {
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * (a - 1)) + 1;
        answer = a - b;
    }
    calcAnswer = answer;

    calcAEl.textContent = a;
    calcBEl.textContent = b;
    calcOpEl.textContent = isAdd ? '+' : '−';

    const options = new Set([answer]);
    while (options.size < 4) {
        let offset = (Math.floor(Math.random() * 10) + 1) * (Math.random() < 0.5 ? -1 : 1);
        let fake = answer + offset;
        if (fake < 0 || fake > 120) continue;
        options.add(fake);
    }
    const optArr = shuffle(Array.from(options));

    calcOptionsEl.innerHTML = '';
    optArr.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'calc-option';
        btn.textContent = val;
        btn.addEventListener('click', () => handleCalcAnswer(btn, val));
        calcOptionsEl.appendChild(btn);
    });

    calcFeedbackEl.innerText = '';
    calcFeedbackEl.className = 'calc-feedback';
}

function handleCalcAnswer(btn, val) {
    if (calcLock || calcFinished) return;
    calcLock = true;

    const isCorrect = val === calcAnswer;
    document.querySelectorAll('.calc-option').forEach(b => b.disabled = true);

    if (isCorrect) {
        btn.classList.add('correct');
        calcCorrect++;
        calcCorrectEl.innerText = calcCorrect;
        calcScore += CALC_POINTS;
        calcScoreEl.innerText = calcScore;
        calcFeedbackEl.innerText = `✅ 答對了！+${CALC_POINTS} 分`;
        calcFeedbackEl.className = 'calc-feedback ok';
        playMatchSound();
    } else {
        btn.classList.add('wrong');
        calcWrong++;
        calcWrongEl.innerText = calcWrong;
        calcScore -= CALC_POINTS;
        calcScoreEl.innerText = calcScore;
        calcFeedbackEl.innerText = `❌ 答錯了，正確答案是 ${calcAnswer}，-${CALC_POINTS} 分`;
        calcFeedbackEl.className = 'calc-feedback no';
        playWrongSound();
        document.querySelectorAll('.calc-option').forEach(b => {
            if (Number(b.textContent) === calcAnswer) b.classList.add('correct');
        });
    }

    calcLockTimer = setTimeout(() => {
        calcLockTimer = null;
        nextCalcQuestion();
    }, 1200);
}

function finishCalcGame() {
    calcFinished = true;
    calcQuestionEl.style.display = 'none';
    calcOptionsEl.style.display = 'none';
    calcFeedbackEl.innerText = '';
    calcWinTitle.textContent = `🏆 完成 50 關！總得分：${calcScore} 分`;
    calcWinText.innerHTML = `答對 ${calcCorrect} 題，答錯 ${calcWrong} 題。<br>
        每題 ${CALC_POINTS} 分，答錯倒扣 ${CALC_POINTS} 分。<br>
        滿分 ${CALC_TOTAL * CALC_POINTS} 分。`;
    if (calcScore === CALC_TOTAL * CALC_POINTS) {
        calcWinText.innerHTML += '<br>🌟 滿分！你是加減法小天才！';
    } else if (calcScore >= 80) {
        calcWinText.innerHTML += '<br>💪 表現很棒，繼續加油！';
    } else if (calcScore >= 50) {
        calcWinText.innerHTML += '<br>👍 不錯喔，再練習會更厲害！';
    } else {
        calcWinText.innerHTML += '<br>😊 別灰心，多練習幾次一定可以的！';
    }
    calcWinEl.classList.add('show');
    playWinSound();
    submitScore('calc', calcScore, currentPlayer || { name: currentPlayerName, age: '', school: '' });
    speakText(`完成五十關！你總共得到 ${calcScore} 分，答對 ${calcCorrect} 題，答錯 ${calcWrong} 題。`);
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    setTimeout(() => {
        confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 } });
    }, 300);
}

/* ============================================================
 * 注音與圖片配對邏輯
 * ============================================================ */
const ZHUYIN_TOTAL = 20;
const ZHUYIN_POINTS = 5;

const ZHUYIN_DATA = [
    { emoji: '🍎', answer: 'ㄆㄧㄥˊ ㄍㄨㄛˇ' },
    { emoji: '🍌', answer: 'ㄒㄧㄤ ㄐㄧㄠ' },
    { emoji: '🐶', answer: 'ㄍㄡˇ' },
    { emoji: '🐱', answer: 'ㄇㄠ' },
    { emoji: '🐟', answer: 'ㄩˊ' },
    { emoji: '🌸', answer: 'ㄏㄨㄚ' },
    { emoji: '🌞', answer: 'ㄊㄞˋ ㄧㄤˊ' },
    { emoji: '🌙', answer: 'ㄩㄝˋ ㄌㄧㄤˋ' },
    { emoji: '⭐', answer: 'ㄒㄧㄥ ㄒㄧㄥ' },
    { emoji: '🏠', answer: 'ㄈㄤˊ ㄗˇ' },
    { emoji: '🚗', answer: 'ㄑㄧˋ ㄔㄜ' },
    { emoji: '✈️', answer: 'ㄈㄟ ㄐㄧ' },
    { emoji: '📚', answer: 'ㄕㄨ' },
    { emoji: '✏️', answer: 'ㄑㄧㄢ ㄅㄧˇ' },
    { emoji: '🍰', answer: 'ㄉㄢˋ ㄍㄠ' },
    { emoji: '🥛', answer: 'ㄋㄧㄡˊ ㄋㄞˇ' },
    { emoji: '🐘', answer: 'ㄉㄚˋ ㄒㄧㄤˋ' },
    { emoji: '🦁', answer: 'ㄕ ㄗˇ' },
    { emoji: '🐼', answer: 'ㄒㄩㄥˊ ㄇㄠ' },
    { emoji: '🍉', answer: 'ㄒㄧ ㄍㄨㄚ' },
    { emoji: '🍇', answer: 'ㄆㄨˊ ㄊㄠˊ' },
    { emoji: '🌧️', answer: 'ㄒㄧㄚˋ ㄩˇ' },
    { emoji: '❄️', answer: 'ㄒㄩㄝˇ' },
    { emoji: '🔥', answer: 'ㄏㄨㄛˇ' },
    { emoji: '💧', answer: 'ㄕㄨㄟˇ' }
];

let zhuyinScore = 0;
let zhuyinCorrect = 0;
let zhuyinWrong = 0;
let zhuyinCurrent = 0;
let zhuyinAnswer = '';
let zhuyinLock = false;
let zhuyinLockTimer = null;
let zhuyinFinished = false;
let zhuyinQuestions = [];

const zhuyinQuestionEl = document.getElementById('zhuyinQuestion');
const zhuyinOptionsEl = document.getElementById('zhuyinOptions');
const zhuyinFeedbackEl = document.getElementById('zhuyinFeedback');
const zhuyinCorrectEl = document.getElementById('zhuyinCorrect');
const zhuyinWrongEl = document.getElementById('zhuyinWrong');
const zhuyinScoreEl = document.getElementById('zhuyinScore');
const zhuyinRoundEl = document.getElementById('zhuyinRound');
const zhuyinWinEl = document.getElementById('zhuyinWin');
const zhuyinWinTitle = document.getElementById('zhuyinWinTitle');
const zhuyinWinText = document.getElementById('zhuyinWinText');

function resetZhuyinGame() {
    if (zhuyinLockTimer) { clearTimeout(zhuyinLockTimer); zhuyinLockTimer = null; }
    zhuyinScore = 0;
    zhuyinCorrect = 0;
    zhuyinWrong = 0;
    zhuyinCurrent = 0;
    zhuyinLock = false;
    zhuyinFinished = false;
    zhuyinScoreEl.innerText = '0';
    zhuyinCorrectEl.innerText = '0';
    zhuyinWrongEl.innerText = '0';
    zhuyinRoundEl.innerText = '1';
    zhuyinFeedbackEl.innerText = '';
    zhuyinFeedbackEl.className = 'zhuyin-feedback';
    zhuyinWinEl.classList.remove('show');
    zhuyinQuestionEl.style.display = 'flex';
    zhuyinOptionsEl.style.display = 'grid';

    zhuyinQuestions = shuffle(ZHUYIN_DATA.slice()).slice(0, ZHUYIN_TOTAL);
    while (zhuyinQuestions.length < ZHUYIN_TOTAL) {
        zhuyinQuestions = zhuyinQuestions.concat(shuffle(ZHUYIN_DATA.slice()));
    }
    zhuyinQuestions = zhuyinQuestions.slice(0, ZHUYIN_TOTAL);

    nextZhuyinQuestion();
}

function nextZhuyinQuestion() {
    if (zhuyinCurrent >= ZHUYIN_TOTAL) {
        finishZhuyinGame();
        return;
    }
    const q = zhuyinQuestions[zhuyinCurrent];
    zhuyinCurrent++;
    zhuyinRoundEl.innerText = zhuyinCurrent;
    zhuyinLock = false;
    zhuyinAnswer = q.answer;

    zhuyinQuestionEl.textContent = q.emoji;

    const options = new Set([q.answer]);
    const pool = ZHUYIN_DATA.map(d => d.answer).filter(a => a !== q.answer);
    const shuffledPool = shuffle(pool);
    for (const ans of shuffledPool) {
        if (options.size >= 4) break;
        options.add(ans);
    }

    const optArr = shuffle(Array.from(options));

    zhuyinOptionsEl.innerHTML = '';
    optArr.forEach(ans => {
        const btn = document.createElement('button');
        btn.className = 'zhuyin-option';
        btn.textContent = ans;
        btn.addEventListener('click', () => handleZhuyinAnswer(btn, ans));
        zhuyinOptionsEl.appendChild(btn);
    });

    zhuyinFeedbackEl.innerText = '';
    zhuyinFeedbackEl.className = 'zhuyin-feedback';
}

function handleZhuyinAnswer(btn, ans) {
    if (zhuyinLock || zhuyinFinished) return;
    zhuyinLock = true;

    const isCorrect = ans === zhuyinAnswer;
    document.querySelectorAll('.zhuyin-option').forEach(b => b.disabled = true);

    if (isCorrect) {
        btn.classList.add('correct');
        zhuyinCorrect++;
        zhuyinCorrectEl.innerText = zhuyinCorrect;
        zhuyinScore += ZHUYIN_POINTS;
        zhuyinScoreEl.innerText = zhuyinScore;
        zhuyinFeedbackEl.innerText = `✅ 答對了！+${ZHUYIN_POINTS} 分`;
        zhuyinFeedbackEl.className = 'zhuyin-feedback ok';
        playMatchSound();
    } else {
        btn.classList.add('wrong');
        zhuyinWrong++;
        zhuyinWrongEl.innerText = zhuyinWrong;
        zhuyinFeedbackEl.innerText = `❌ 答錯了，正確答案是「${zhuyinAnswer}」`;
        zhuyinFeedbackEl.className = 'zhuyin-feedback no';
        playWrongSound();
        document.querySelectorAll('.zhuyin-option').forEach(b => {
            if (b.textContent === zhuyinAnswer) b.classList.add('correct');
        });
    }

    zhuyinLockTimer = setTimeout(() => {
        zhuyinLockTimer = null;
        nextZhuyinQuestion();
    }, 1400);
}

function finishZhuyinGame() {
    zhuyinFinished = true;
    zhuyinQuestionEl.style.display = 'none';
    zhuyinOptionsEl.style.display = 'none';
    zhuyinFeedbackEl.innerText = '';
    zhuyinWinTitle.textContent = `🏆 完成 20 關！總得分：${zhuyinScore} 分`;
    zhuyinWinText.innerHTML = `答對 ${zhuyinCorrect} 題，答錯 ${zhuyinWrong} 題。<br>
        每題 ${ZHUYIN_POINTS} 分，答錯不扣分。<br>
        滿分 ${ZHUYIN_TOTAL * ZHUYIN_POINTS} 分。`;
    if (zhuyinScore === ZHUYIN_TOTAL * ZHUYIN_POINTS) {
        zhuyinWinText.innerHTML += '<br>🌟 滿分！你是注音小天才！';
    } else if (zhuyinScore >= 70) {
        zhuyinWinText.innerHTML += '<br>💪 表現很棒，繼續加油！';
    } else if (zhuyinScore >= 40) {
        zhuyinWinText.innerHTML += '<br>👍 不錯喔，再練習會更厲害！';
    } else {
        zhuyinWinText.innerHTML += '<br>😊 別灰心，多練習幾次一定可以的！';
    }
    zhuyinWinEl.classList.add('show');
    playWinSound();
    submitScore('zhuyin', zhuyinScore, currentPlayer || { name: currentPlayerName, age: '', school: '' });
    speakText(`完成二十關！你總共得到 ${zhuyinScore} 分，答對 ${zhuyinCorrect} 題，答錯 ${zhuyinWrong} 題。`);
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    setTimeout(() => {
        confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 } });
    }, 300);
}

/* ============================================================
 * 注音打地鼠邏輯
 * ============================================================ */
const WHACK_TIME_LIMIT = 60 * 1000;   // 60 秒
const WHACK_POINTS_CORRECT = 5;
const WHACK_POINTS_WRONG = 3;         // 打錯扣分
const WHACK_HOLE_COUNT = 9;
const WHACK_MOLE_INTERVAL = 800;      // 每 0.8 秒冒出一隻新地鼠
const WHACK_MOLE_DURATION = 1500;     // 地鼠停留 1.5 秒

// 注音符號池（只用單一符號，方便打地鼠辨識）
const WHACK_SYMBOLS = [
    'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ',
    'ㄍ', 'ㄎ', 'ㄏ', 'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ',
    'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ', 'ㄧ', 'ㄨ', 'ㄩ',
    'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ',
    'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'
];

let whackScore = 0;
let whackCorrect = 0;
let whackWrong = 0;
let whackTarget = 'ㄅ';
let whackPlaying = false;
let whackEndTime = 0;
let whackTimerInterval = null;
let whackMoleTimer = null;
let whackHoles = [];          // 每個洞的 DOM 與狀態
let whackActiveMoles = [];    // { holeIndex, symbol, timeoutId }

const whackBoardEl = document.getElementById('whackBoard');
const whackTimerEl = document.getElementById('whackTimer');
const whackScoreEl = document.getElementById('whackScore');
const whackCorrectEl = document.getElementById('whackCorrect');
const whackWrongEl = document.getElementById('whackWrong');
const whackTargetEl = document.getElementById('whackTarget');
const whackWinEl = document.getElementById('whackWin');
const whackWinTitle = document.getElementById('whackWinTitle');
const whackWinText = document.getElementById('whackWinText');

function buildWhackBoard() {
    whackBoardEl.innerHTML = '';
    whackHoles = [];
    for (let i = 0; i < WHACK_HOLE_COUNT; i++) {
        const hole = document.createElement('div');
        hole.className = 'whack-hole';

        const mole = document.createElement('div');
        mole.className = 'whack-mole';
        mole.dataset.holeIndex = i;
        mole.textContent = '';

        mole.addEventListener('click', () => handleWhackClick(i));

        hole.appendChild(mole);
        whackBoardEl.appendChild(hole);

        whackHoles.push({ holeEl: hole, moleEl: mole, symbol: '', active: false });
    }
}

function pickNewWhackTarget() {
    const prev = whackTarget;
    let next = prev;
    while (next === prev && WHACK_SYMBOLS.length > 1) {
        next = WHACK_SYMBOLS[Math.floor(Math.random() * WHACK_SYMBOLS.length)];
    }
    whackTarget = next;
    whackTargetEl.textContent = whackTarget;
    speakWhackTarget();
}

function speakWhackTarget() {
    // 用語音唸出目標注音；注音符號語音不一定準，用「注音 X」提示
    speakText(`請打注音 ${whackTarget}`, false);
}

function replayWhackTarget() {
    if (!whackPlaying) return;
    speakWhackTarget();
}

function spawnWhackMole() {
    if (!whackPlaying) return;

    // 找一個目前沒有地鼠的洞
    const freeIndexes = whackHoles
        .map((h, i) => (h.active ? -1 : i))
        .filter(i => i >= 0);
    if (freeIndexes.length === 0) return;

    const holeIndex = freeIndexes[Math.floor(Math.random() * freeIndexes.length)];

    // 70% 機率放目標注音，30% 放干擾注音
    let symbol;
    if (Math.random() < 0.7) {
        symbol = whackTarget;
    } else {
        let fake = whackTarget;
        while (fake === whackTarget) {
            fake = WHACK_SYMBOLS[Math.floor(Math.random() * WHACK_SYMBOLS.length)];
        }
        symbol = fake;
    }

    const hole = whackHoles[holeIndex];
    hole.symbol = symbol;
    hole.active = true;
    hole.moleEl.textContent = symbol;
    hole.moleEl.classList.remove('hit-correct', 'hit-wrong');
    // 強制 reflow 讓動畫重跑
    void hole.moleEl.offsetWidth;
    hole.moleEl.classList.add('up');

    // 時間到自動收回去
    const timeoutId = setTimeout(() => {
        if (!hole.active) return;
        hole.active = false;
        hole.moleEl.classList.remove('up');
        const idx = whackActiveMoles.findIndex(m => m.holeIndex === holeIndex);
        if (idx >= 0) whackActiveMoles.splice(idx, 1);
    }, WHACK_MOLE_DURATION);

    whackActiveMoles.push({ holeIndex, symbol, timeoutId });
}

function handleWhackClick(holeIndex) {
    if (!whackPlaying) return;
    const hole = whackHoles[holeIndex];
    if (!hole.active) return;

    // 標記為已打
    hole.active = false;
    const idx = whackActiveMoles.findIndex(m => m.holeIndex === holeIndex);
    if (idx >= 0) {
        clearTimeout(whackActiveMoles[idx].timeoutId);
        whackActiveMoles.splice(idx, 1);
    }

    const isCorrect = hole.symbol === whackTarget;

    if (isCorrect) {
        hole.moleEl.classList.add('hit-correct');
        whackCorrect++;
        whackCorrectEl.innerText = whackCorrect;
        whackScore += WHACK_POINTS_CORRECT;
        whackScoreEl.innerText = whackScore;
        playMatchSound();
        speakText('答對了！', false);
    } else {
        hole.moleEl.classList.add('hit-wrong');
        whackWrong++;
        whackWrongEl.innerText = whackWrong;
        whackScore = Math.max(0, whackScore - WHACK_POINTS_WRONG);
        whackScoreEl.innerText = whackScore;
        playWrongSound();
        speakText('答錯了！', false);
    }

    // 動畫結束後收回
    setTimeout(() => {
        hole.moleEl.classList.remove('up', 'hit-correct', 'hit-wrong');
    }, 300);
}

function startWhackTimer() {
    stopWhackTimer();
    whackEndTime = Date.now() + WHACK_TIME_LIMIT;
    whackTimerEl.innerText = '60';
    whackTimerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((whackEndTime - Date.now()) / 1000));
        whackTimerEl.innerText = remaining;
        if (remaining <= 10) {
            whackTimerEl.style.color = '#d32f2f';
        } else {
            whackTimerEl.style.color = '';
        }
        if (remaining <= 0) {
            stopWhackTimer();
            endWhackGame();
        }
    }, 200);
}

function stopWhackTimer() {
    if (whackTimerInterval) {
        clearInterval(whackTimerInterval);
        whackTimerInterval = null;
    }
}

function startWhackMoleLoop() {
    stopWhackMoleLoop();
    spawnWhackMole();
    whackMoleTimer = setInterval(spawnWhackMole, WHACK_MOLE_INTERVAL);
}

function stopWhackMoleLoop() {
    if (whackMoleTimer) {
        clearInterval(whackMoleTimer);
        whackMoleTimer = null;
    }
    // 清掉所有地鼠
    whackHoles.forEach(h => {
        h.active = false;
        h.symbol = '';
        h.moleEl.classList.remove('up', 'hit-correct', 'hit-wrong');
    });
    whackActiveMoles.forEach(m => clearTimeout(m.timeoutId));
    whackActiveMoles = [];
}

function endWhackGame() {
    whackPlaying = false;
    stopWhackTimer();
    stopWhackMoleLoop();

    whackWinTitle.textContent = `🏆 時間到！總得分：${whackScore} 分`;
    whackWinText.innerHTML = `打對 ${whackCorrect} 隻，打錯 ${whackWrong} 隻。<br>
        打對 +${WHACK_POINTS_CORRECT} 分，打錯 -${WHACK_POINTS_WRONG} 分。`;
    if (whackScore >= 100) {
        whackWinText.innerHTML += '<br>🌟 太神了！你是注音打地鼠高手！';
    } else if (whackScore >= 60) {
        whackWinText.innerHTML += '<br>💪 表現很棒，繼續加油！';
    } else if (whackScore >= 30) {
        whackWinText.innerHTML += '<br>👍 不錯喔，再練習會更厲害！';
    } else {
        whackWinText.innerHTML += '<br>😊 別灰心，多練習幾次一定可以的！';
    }
    whackWinEl.classList.add('show');
    playWinSound();
    submitScore('whack', whackScore, currentPlayer || { name: currentPlayerName, age: '', school: '' });
    speakText(`時間到！你總共得到 ${whackScore} 分，打對 ${whackCorrect} 隻，打錯 ${whackWrong} 隻。`);
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    setTimeout(() => {
        confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 } });
    }, 300);
}

function resetWhackGame() {
    stopWhackTimer();
    stopWhackMoleLoop();
    whackScore = 0;
    whackCorrect = 0;
    whackWrong = 0;
    whackPlaying = false;
    whackScoreEl.innerText = '0';
    whackCorrectEl.innerText = '0';
    whackWrongEl.innerText = '0';
    whackTimerEl.innerText = '60';
    whackTimerEl.style.color = '';
    whackWinEl.classList.remove('show');

    buildWhackBoard();

    // 初始目標
    whackTarget = WHACK_SYMBOLS[Math.floor(Math.random() * WHACK_SYMBOLS.length)];
    whackTargetEl.textContent = whackTarget;

    // 小延遲後開始，讓語音先唸完再冒地鼠
    whackPlaying = true;
    startWhackTimer();
    setTimeout(() => {
        if (whackPlaying) {
            speakWhackTarget();
            startWhackMoleLoop();
        }
    }, 600);
}

// ========== 初始化 ==========
updateSoundButtons();