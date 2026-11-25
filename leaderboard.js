/* ============================================================
 * 遊戲排行榜（總分 = 答題分數 + 過關時間加分，最多顯示前 N 名）
 *
 * 兩種儲存方式（自動選擇）：
 *   1. 雲端 Firestore：firebase-config.js 填好真實設定時使用，所有人共用同一份榜單
 *   2. 本機 localStorage：尚未設定 Firebase 時使用，只有這台裝置看得到
 *
 * 排名規則：總分高者在前；總分相同時，用時短者在前。
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

const MAX_TIME_MS = 9999999;   // 計時上限（約 2.7 小時），同時是排名鍵的時間欄寬

// ---------- 共用工具 ----------
function useCloudLeaderboard() {
    return typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY && !!firestoreDb;
}

// 玩家唯一識別（Firestore 文件 ID 不能含 /）
function getPlayerKey(player) {
    const raw = player.googleId || player.email || player.name || 'unknown';
    return 'p_' + String(raw).replace(/[\/\s.]/g, '_').slice(0, 100);
}

// 提交分數時使用的玩家資料（沒登入時的備用）
function getScoringPlayer() {
    if (typeof currentPlayer !== 'undefined' && currentPlayer) return currentPlayer;
    return { name: (typeof currentPlayerName !== 'undefined' ? currentPlayerName : '玩家'), age: '', school: '' };
}

function cloudEntriesRef(gameId) {
    return firestoreDb.collection('leaderboards').doc(gameId).collection('entries');
}

function isTimedGame(gameId) {
    return typeof TIME_BONUS_CONFIG !== 'undefined' && !!TIME_BONUS_CONFIG[gameId];
}

/**
 * 排名鍵：總分越高越大；總分相同時，用時越短越大。
 * 這樣 Firestore 只要依 rankKey 排序即可，不需要建立複合索引。
 */
function makeRankKey(score, timeMs) {
    const t = Math.min(Math.max(Math.round(timeMs) || 0, 0), MAX_TIME_MS);
    return Math.round(score) * 10000000 + (MAX_TIME_MS - t);
}

function entryRankKey(e) {
    return typeof e.rankKey === 'number' ? e.rankKey : makeRankKey(e.score || 0, e.timeMs || 0);
}

// ---------- 時間加分 ----------
/**
 * 依用時計算總分。沒有設定時間加分的遊戲，總分 = 基礎分數。
 * @returns {{score:number, baseScore:number, bonus:number, timeMs:number}}
 */
function computeTimedResult(gameId, baseScore, elapsedMs) {
    const base = Math.round(Number(baseScore) || 0);
    const timeMs = Math.min(Math.max(Math.round(Number(elapsedMs) || 0), 0), MAX_TIME_MS);
    let bonus = 0;
    if (isTimedGame(gameId)) {
        const cfg = TIME_BONUS_CONFIG[gameId];
        const ratio = 1 - timeMs / (cfg.limitSec * 1000);
        bonus = Math.round(cfg.maxBonus * Math.max(0, ratio));
    }
    return { score: base + bonus, baseScore: base, bonus, timeMs };
}

/** 計算時間加分並提交分數，回傳計算結果（可用來顯示在過關畫面） */
function submitTimedScore(gameId, baseScore, elapsedMs, player) {
    const r = computeTimedResult(gameId, baseScore, elapsedMs);
    submitScore(gameId, r.score, player, '', { baseScore: r.baseScore, timeMs: r.timeMs });
    return r;
}

/** 62500 → 「1分03秒」；不到一分鐘 → 「12.5秒」 */
function formatDuration(ms) {
    const totalSec = Math.max(0, ms) / 1000;
    if (totalSec < 60) return `${totalSec.toFixed(1)} 秒`;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m} 分 ${String(s).padStart(2, '0')} 秒`;
}

function formatTimeSummary(r) {
    return `⏱ 用時 ${formatDuration(r.timeMs)}｜答題 ${r.baseScore} 分 + 時間加分 ${r.bonus} 分`;
}

/**
 * 組出要寫進排行榜的資料。
 * 玩家沒有選擇公開時，不放入學校、年齡、縣市、頭像。
 */
function buildEntryData(player, score, mode, extra) {
    extra = extra || {};
    const finalScore = Math.round(Number(score) || 0);
    const timeMs = Math.min(Math.max(Math.round(Number(extra.timeMs) || 0), 0), MAX_TIME_MS);
    const data = {
        playerId: getPlayerKey(player),
        playerName: String(player.name || '玩家').slice(0, 30),
        score: finalScore,
        baseScore: Math.round(Number(extra.baseScore != null ? extra.baseScore : finalScore) || 0),
        timeMs: timeMs,
        rankKey: makeRankKey(finalScore, timeMs),
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

function submitScoreLocal(gameId, score, player, mode, extra) {
    const board = loadLeaderboard();
    const list = board[gameId] || [];
    const entry = Object.assign(buildEntryData(player, score, mode, extra), {
        date: new Date().toISOString()
    });

    // 每位玩家每個遊戲只保留最好的一次
    const idx = list.findIndex(e => e.playerId === entry.playerId);
    if (idx >= 0) {
        if (entryRankKey(list[idx]) >= entry.rankKey) return list;
        list[idx] = entry;
    } else {
        list.push(entry);
    }

    list.sort((a, b) => entryRankKey(b) - entryRankKey(a));
    board[gameId] = list.slice(0, LEADERBOARD_MAX_ENTRIES);
    saveLeaderboard(board);
    return board[gameId];
}

// ---------- 提交分數 ----------
/**
 * @param {string} gameId 遊戲代號
 * @param {number} score 總分（已含時間加分）
 * @param {object} player 玩家資料（name, age, school, city, showInfo ...）
 * @param {string} mode 模式/難度標籤（可選）
 * @param {object} extra { baseScore, timeMs }（可選）
 * 每位玩家每個遊戲只保留最好的一次。永遠不會丟出錯誤（失敗只記在 console）。
 */
async function submitScore(gameId, score, player, mode = '', extra = {}) {
    try {
        if (!useCloudLeaderboard()) {
            return submitScoreLocal(gameId, score, player, mode, extra);
        }
        const data = buildEntryData(player, score, mode, extra);
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = cloudEntriesRef(gameId).doc(data.playerId);

        await firestoreDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (snap.exists && entryRankKey(snap.data()) >= data.rankKey) return; // 沒有破自己的紀錄
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
 * 取得某遊戲排行榜（名次高的在前，最多 LEADERBOARD_MAX_ENTRIES 名）。
 * 雲端讀取失敗時會丟出錯誤。
 */
async function getLeaderboard(gameId) {
    if (!useCloudLeaderboard()) {
        const list = (loadLeaderboard()[gameId] || []).slice();
        list.sort((a, b) => entryRankKey(b) - entryRankKey(a));
        return list.slice(0, LEADERBOARD_MAX_ENTRIES);
    }
    const snap = await cloudEntriesRef(gameId)
        .orderBy('rankKey', 'desc')
        .limit(LEADERBOARD_MAX_ENTRIES)
        .get();
    return snap.docs.map(d => d.data());
}

/**
 * 取得玩家在該遊戲的名次（1-based），不在榜上則回傳 0
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
                            buildEntryData(player, e.score, e.mode, { baseScore: e.baseScore, timeMs: e.timeMs }),
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
            const data = buildEntryData(player, old.score, old.mode, { baseScore: old.baseScore, timeMs: old.timeMs });
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
        const parts = [];
        if (!useCloudLeaderboard()) parts.push('📱 目前是本機排行榜（只有這台裝置看得到）');
        parts.push(isTimedGame(gameId)
            ? '🏅 總分 = 答題分數 + 時間加分，過關越快加分越多'
            : '🏅 依答題分數排名');
        noticeEl.textContent = parts.join('　');
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

    const timed = isTimedGame(gameId);
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
        const timeLine = (timed && entry.timeMs)
            ? `<div class="lb-sub" style="color:#e65100;">⏱ ${escapeHtml(formatDuration(entry.timeMs))}</div>`
            : '';

        return `
            <div class="leaderboard-row ${i < 3 ? 'top-three' : ''}">
                <div class="lb-rank">${medal}</div>
                ${avatar}
                <div class="lb-info">
                    <div class="lb-name">${name}${meTag}</div>
                    <div class="lb-sub">${sub}</div>
                    ${timeLine}
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
    const rank = await getPlayerRank(gameId, getScoringPlayer());
    let msg = `本局得分：${score}`;
    if (rank > 0) msg += `\n目前排名：第 ${rank} 名 🏅`;
    if (rank === 1) msg += '\n🎉 你是目前的第一名！';
    console.log(msg);
}
