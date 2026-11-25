/* ============================================================
 * 遊戲排行榜
 *
 * 兩種儲存方式（自動選擇）：
 *   1. 雲端 Firestore：firebase-config.js 填好真實設定時使用，所有人共用同一份榜單
 *   2. 本機 localStorage：尚未設定 Firebase 時使用，只有這台裝置看得到
 *
 * 隱私：玩家若沒有勾選「公開我的資訊」，學校、年齡、縣市、頭像
 *       根本不會寫進排行榜資料（不是只是隱藏而已）。
 * ============================================================ */

const STORAGE_KEY_LEADERBOARD = 'gameLobby_leaderboard';

// 有分數的遊戲（畫板沒有分數）
const LEADERBOARD_SCORE_GAMES = ['memory', 'guess', 'mult', 'calc', 'zhuyin', 'whack'];

const LEADERBOARD_GAME_NAMES = {
    paint: '🎨 神奇魔法畫板',
    memory: '🃏 記憶翻牌',
    guess: '🔢 猜數字',
    mult: '✖️ 九九乘法',
    calc: '➕ 加減法',
    zhuyin: '🖼️ 注音與圖片配對',
    whack: '🔨 注音打地鼠'
};

// ---------- 共用工具 ----------
function useCloudLeaderboard() {
    return typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY && !!firestoreDb;
}

// 玩家唯一識別（Firestore 文件 ID 不能含 /）
function getPlayerKey(player) {
    const raw = player.googleId || player.email || player.name || 'unknown';
    return 'p_' + String(raw).replace(/[\/\s.]/g, '_').slice(0, 100);
}

function cloudEntriesRef(gameId) {
    return firestoreDb.collection('leaderboards').doc(gameId).collection('entries');
}

/**
 * 組出要寫進排行榜的資料。
 * 玩家沒有選擇公開時，不放入學校、年齡、縣市、頭像。
 */
function buildEntryData(player, score, mode) {
    const data = {
        playerId: getPlayerKey(player),
        playerName: String(player.name || '玩家').slice(0, 30),
        score: Number(score) || 0,
        mode: mode || '',
        showInfo: !!player.showInfo
    };
    if (data.showInfo) {
        data.age = parseInt(player.age, 10) || null;
        data.school = String(player.school || '').slice(0, 40);
        data.city = String(player.city || '').slice(0, 10);
        data.picture = String(player.picture || '').slice(0, 500);
    }
    return data;
}

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isSafeImageUrl(url) {
    return typeof url === 'string' && /^https:\/\//i.test(url);
}

// ---------- 本機儲存 ----------
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

function submitScoreLocal(gameId, score, player, mode) {
    const board = loadLeaderboard();
    const list = board[gameId] || [];
    const entry = Object.assign(buildEntryData(player, score, mode), {
        date: new Date().toISOString()
    });

    // 每位玩家每個遊戲只保留最高分
    const idx = list.findIndex(e => e.playerId === entry.playerId);
    if (idx >= 0) {
        if (list[idx].score >= entry.score) return list;
        list[idx] = entry;
    } else {
        list.push(entry);
    }

    list.sort((a, b) => b.score - a.score);
    board[gameId] = list.slice(0, LEADERBOARD_MAX_ENTRIES);
    saveLeaderboard(board);
    return board[gameId];
}

// ---------- 提交分數 ----------
/**
 * @param {string} gameId 遊戲代號
 * @param {number} score 分數
 * @param {object} player 玩家資料（name, age, school, city, showInfo ...）
 * @param {string} mode 模式/難度標籤（可選）
 * 每位玩家每個遊戲只保留最高分。永遠不會丟出錯誤（失敗只記在 console）。
 */
async function submitScore(gameId, score, player, mode = '') {
    try {
        if (!useCloudLeaderboard()) {
            return submitScoreLocal(gameId, score, player, mode);
        }
        const data = buildEntryData(player, score, mode);
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = cloudEntriesRef(gameId).doc(data.playerId);

        await firestoreDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (snap.exists && snap.data().score >= data.score) return; // 沒破自己的紀錄
            tx.set(ref, data);
        });
        return true;
    } catch (e) {
        console.error('提交分數失敗', e);
        return false;
    }
}

// ---------- 讀取排行榜 ----------
/**
 * 取得某遊戲排行榜（高分在前）。雲端讀取失敗時會丟出錯誤。
 */
async function getLeaderboard(gameId) {
    if (!useCloudLeaderboard()) {
        return loadLeaderboard()[gameId] || [];
    }
    const snap = await cloudEntriesRef(gameId)
        .orderBy('score', 'desc')
        .limit(LEADERBOARD_MAX_ENTRIES)
        .get();
    return snap.docs.map(d => d.data());
}

/**
 * 取得玩家在該遊戲的名次（1-based），不在前 N 名則回傳 0
 */
async function getPlayerRank(gameId, player) {
    try {
        const list = await getLeaderboard(gameId);
        const key = getPlayerKey(player);
        const idx = list.findIndex(e => e.playerId === key);
        return idx >= 0 ? idx + 1 : 0;
    } catch (e) { return 0; }
}

// ---------- 玩家修改「公開資訊」設定後，同步更新已在榜上的紀錄 ----------
async function updatePlayerInfoOnBoard(player) {
    try {
        const key = getPlayerKey(player);

        if (!useCloudLeaderboard()) {
            const board = loadLeaderboard();
            LEADERBOARD_SCORE_GAMES.forEach(gameId => {
                (board[gameId] || []).forEach((e, i) => {
                    if (e.playerId === key) {
                        board[gameId][i] = Object.assign(
                            buildEntryData(player, e.score, e.mode),
                            { date: e.date }
                        );
                    }
                });
            });
            saveLeaderboard(board);
            return;
        }

        for (const gameId of LEADERBOARD_SCORE_GAMES) {
            const ref = cloudEntriesRef(gameId).doc(key);
            const snap = await ref.get();
            if (!snap.exists) continue;
            const old = snap.data();
            const data = buildEntryData(player, old.score, old.mode);
            data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            await ref.set(data); // 整份覆蓋，隱藏時舊的學校/年齡/縣市就會被清掉
        }
    } catch (e) {
        console.error('同步排行榜資料失敗', e);
    }
}

// ---------- 排行榜 UI ----------
let leaderboardRenderToken = 0;

async function renderLeaderboard(gameId) {
    const listEl = document.getElementById('leaderboard-list');
    const titleEl = document.getElementById('leaderboard-game-title');
    const noticeEl = document.getElementById('leaderboard-notice');
    if (!listEl) return;

    titleEl.textContent = LEADERBOARD_GAME_NAMES[gameId] || gameId;
    if (noticeEl) {
        noticeEl.textContent = useCloudLeaderboard()
            ? ''
            : '📱 目前是本機排行榜（只有這台裝置看得到）';
    }

    const token = ++leaderboardRenderToken;
    listEl.innerHTML = '<div class="leaderboard-empty">載入中…</div>';

    let list;
    try {
        list = await getLeaderboard(gameId);
    } catch (e) {
        console.error('讀取排行榜失敗', e);
        if (token !== leaderboardRenderToken) return;
        listEl.innerHTML = '<div class="leaderboard-empty">暫時無法讀取排行榜，請稍後再試</div>';
        return;
    }
    if (token !== leaderboardRenderToken) return; // 已切換到別的遊戲

    if (list.length === 0) {
        listEl.innerHTML = '<div class="leaderboard-empty">目前還沒有紀錄，快來挑戰成為第一名！</div>';
        return;
    }

    const myKey = (typeof currentPlayer !== 'undefined' && currentPlayer) ? getPlayerKey(currentPlayer) : null;
    const medals = ['🥇', '🥈', '🥉'];

    listEl.innerHTML = list.map((entry, i) => {
        const medal = medals[i] || `${i + 1}.`;
        const name = escapeHtml(entry.playerName || '玩家');
        const showInfo = !!entry.showInfo;

        const avatar = (showInfo && isSafeImageUrl(entry.picture))
            ? `<img class="lb-avatar" src="${escapeHtml(entry.picture)}" alt="">`
            : `<div class="lb-avatar lb-avatar-text">${escapeHtml(String(entry.playerName || '玩').charAt(0))}</div>`;

        const parts = showInfo
            ? [entry.school, entry.age ? `${entry.age} 歲` : '', entry.city].filter(Boolean)
            : [];
        const sub = parts.length ? parts.map(escapeHtml).join(' ｜ ') : '資訊未公開';
        const meTag = (myKey && entry.playerId === myKey) ? '（你）' : '';

        return `
            <div class="leaderboard-row ${i < 3 ? 'top-three' : ''}">
                <div class="lb-rank">${medal}</div>
                ${avatar}
                <div class="lb-info">
                    <div class="lb-name">${name}${meTag}</div>
                    <div class="lb-sub">${sub}</div>
                </div>
                <div class="lb-score">${escapeHtml(entry.score)}</div>
            </div>
        `;
    }).join('');
}

// ---------- 排行榜彈窗 ----------
function openLeaderboard(gameId) {
    const overlay = document.getElementById('leaderboard-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    switchLeaderboardGame(gameId || 'mult');
}

function closeLeaderboard() {
    const overlay = document.getElementById('leaderboard-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function switchLeaderboardGame(gameId) {
    const overlay = document.getElementById('leaderboard-overlay');
    if (!overlay) return;
    overlay.dataset.currentGame = gameId;

    document.querySelectorAll('.lb-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.game === gameId);
    });

    renderLeaderboard(gameId);
}

// 提交分數後顯示名次提示（目前只輸出到 console）
async function showScoreSubmitted(gameId, score) {
    const player = (typeof currentPlayer !== 'undefined' && currentPlayer) ? currentPlayer : { name: currentPlayerName };
    const rank = await getPlayerRank(gameId, player);
    let msg = `本局得分：${score}`;
    if (rank > 0) msg += `\n目前排名：第 ${rank} 名 🏅`;
    if (rank === 1) msg += '\n🎉 你是目前的第一名！';
    console.log(msg);
}
