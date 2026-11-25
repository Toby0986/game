/* ============================================================
 * 遊戲排行榜
 * ============================================================ */

const STORAGE_KEY_LEADERBOARD = 'gameLobby_leaderboard';

// 結構：{ [gameId]: [ {playerName, age, school, score, date}, ... ] }
function loadLeaderboard() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function saveLeaderboard(data) {
    try {
        localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(data));
    } catch (e) {}
}

/**
 * 提交分數
 * @param {string} gameId 遊戲代號
 * @param {number} score 分數
 * @param {object} player 玩家資料（name, age, school）
 * @param {string} mode 模式/難度標籤（可選）
 */
function submitScore(gameId, score, player, mode = '') {
    const board = loadLeaderboard();
    if (!board[gameId]) board[gameId] = [];

    board[gameId].push({
        playerName: player.name,
        age: player.age,
        school: player.school,
        picture: player.picture || '',
        score: score,
        mode: mode,
        date: new Date().toISOString()
    });

    // 排序（高分在前），只留前 N 名
    board[gameId].sort((a, b) => b.score - a.score);
    board[gameId] = board[gameId].slice(0, LEADERBOARD_MAX_ENTRIES);

    saveLeaderboard(board);
    return board[gameId];
}

/**
 * 取得某遊戲排行榜
 */
function getLeaderboard(gameId) {
    const board = loadLeaderboard();
    return board[gameId] || [];
}

/**
 * 取得玩家在該遊戲的最高名次（1-based），沒有則回傳 0
 */
function getPlayerRank(gameId, playerName) {
    const list = getLeaderboard(gameId);
    const idx = list.findIndex(e => e.playerName === playerName);
    return idx >= 0 ? idx + 1 : 0;
}

// ---------- 排行榜 UI ----------
const LEADERBOARD_GAME_NAMES = {
    paint: '🎨 神奇魔法畫板',
    memory: '🃏 記憶翻牌',
    guess: '🔢 猜數字',
    mult: '✖️ 九九乘法',
    calc: '➕ 加減法',
    zhuyin: '🖼️ 注音與圖片配對',
    whack: '🔨 注音打地鼠'
};

function renderLeaderboard(gameId) {
    const listEl = document.getElementById('leaderboard-list');
    const titleEl = document.getElementById('leaderboard-game-title');
    if (!listEl) return;

    titleEl.textContent = LEADERBOARD_GAME_NAMES[gameId] || gameId;

    const list = getLeaderboard(gameId);
    if (list.length === 0) {
        listEl.innerHTML = '<div class="leaderboard-empty">目前還沒有紀錄，快來挑戰成為第一名！</div>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    listEl.innerHTML = list.map((entry, i) => {
        const medal = medals[i] || `${i + 1}.`;
        const avatar = entry.picture
            ? `<img class="lb-avatar" src="${entry.picture}" alt="">`
            : `<div class="lb-avatar lb-avatar-text">${entry.playerName.charAt(0)}</div>`;
        return `
            <div class="leaderboard-row ${i < 3 ? 'top-three' : ''}">
                <div class="lb-rank">${medal}</div>
                ${avatar}
                <div class="lb-info">
                    <div class="lb-name">${escapeHtml(entry.playerName)}</div>
                    <div class="lb-sub">${escapeHtml(entry.school || '')} ｜ ${entry.age || '?'} 歲</div>
                </div>
                <div class="lb-score">${entry.score}</div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---------- 排行榜彈窗 ----------
function openLeaderboard(gameId) {
    const overlay = document.getElementById('leaderboard-overlay');
    if (!overlay) return;
    renderLeaderboard(gameId || 'mult');
    overlay.classList.remove('hidden');
    overlay.dataset.currentGame = gameId || 'mult';
}

function closeLeaderboard() {
    const overlay = document.getElementById('leaderboard-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function switchLeaderboardGame(gameId) {
    const overlay = document.getElementById('leaderboard-overlay');
    if (!overlay) return;
    overlay.dataset.currentGame = gameId;

    // 更新按鈕 active
    document.querySelectorAll('.lb-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.game === gameId);
    });

    renderLeaderboard(gameId);
}

// 提交分數後顯示名次提示
function showScoreSubmitted(gameId, score) {
    const rank = getPlayerRank(gameId, currentPlayer ? currentPlayer.name : currentPlayerName);
    const list = getLeaderboard(gameId);
    const isTop = list.length > 0 && list[0].score === score;

    let msg = `本局得分：${score}`;
    if (rank > 0) {
        msg += `\n目前排名：第 ${rank} 名 🏅`;
    }
    if (isTop) {
        msg += '\n🎉 你是目前的第一名！';
    }
    console.log(msg);
}