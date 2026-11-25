/* ============================================================
 * 登入與玩家資料管理
 * ============================================================ */

const STORAGE_KEY_PLAYER = 'gameLobby_player';
const STORAGE_KEY_ALL_PLAYERS = 'gameLobby_allPlayers';

// 目前登入的玩家
let currentPlayer = null;   // { googleId, name, email, picture, age, school }

// ---------- 玩家資料儲存 ----------
function loadPlayerFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PLAYER);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function savePlayerToStorage(player) {
    try {
        localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
    } catch (e) {}
}

function loadAllPlayers() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_ALL_PLAYERS);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function saveAllPlayers(players) {
    try {
        localStorage.setItem(STORAGE_KEY_ALL_PLAYERS, JSON.stringify(players));
    } catch (e) {}
}

// 把玩家資料寫進所有玩家表（以 googleId 或 email 為 key）
function upsertPlayerRecord(player) {
    const all = loadAllPlayers();
    const key = player.googleId || player.email || player.name;
    all[key] = {
        ...player,
        lastLogin: new Date().toISOString()
    };
    saveAllPlayers(all);
}

// ---------- Google 登入 ----------
function initGoogleLogin() {
    const loginContainer = document.getElementById('google-login-btn');
    if (!loginContainer) return;

    // 若沒有設定 Client ID，顯示訪客模式按鈕
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
        loginContainer.innerHTML = `
            <button class="guest-login-btn" onclick="guestLogin()">
                👤 訪客登入（本機測試用）
            </button>
            <p class="login-hint">尚未設定 Google Client ID，使用訪客模式</p>
        `;
        return;
    }

    // 載入 GIS
    if (typeof google === 'undefined' || !google.accounts) {
        // 動態載入
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => renderGoogleButton(loginContainer);
        document.head.appendChild(script);
    } else {
        renderGoogleButton(loginContainer);
    }
}

function renderGoogleButton(container) {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false
    });
    google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'zh-TW',
        width: 280
    });
}

function handleGoogleCredentialResponse(response) {
    // 解析 JWT payload
    const payload = parseJwt(response.credential);
    if (!payload) {
        alert('登入失敗，請再試一次');
        return;
    }

    const googleId = payload.sub;
    const email = payload.email || '';
    const name = payload.name || '玩家';
    const picture = payload.picture || '';

    // 檢查是否已有資料（含年齡、學校）
    const all = loadAllPlayers();
    const existing = all[googleId];

    if (existing && existing.age && existing.school) {
        // 舊玩家，直接登入
        currentPlayer = existing;
        savePlayerToStorage(currentPlayer);
        finishLogin();
    } else {
        // 新玩家或資料不全，跳出填寫表單
        showProfileForm({ googleId, name, email, picture });
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

// ---------- 訪客登入（本機測試） ----------
function guestLogin() {
    const guestName = prompt('請輸入你的名字：', '小寶貝');
    if (!guestName) return;
    showProfileForm({
        googleId: 'guest_' + Date.now(),
        name: guestName,
        email: '',
        picture: ''
    });
}

// ---------- 填寫年齡與學校 ----------
function showProfileForm(baseInfo) {
    const overlay = document.getElementById('profile-overlay');
    const nameEl = document.getElementById('profile-name');
    const ageInput = document.getElementById('profile-age');
    const schoolInput = document.getElementById('profile-school');
    const confirmBtn = document.getElementById('profile-confirm-btn');

    nameEl.textContent = baseInfo.name;
    ageInput.value = '';
    schoolInput.value = '';

    // 若已有資料，帶入
    const all = loadAllPlayers();
    const existing = all[baseInfo.googleId];
    if (existing) {
        ageInput.value = existing.age || '';
        schoolInput.value = existing.school || '';
    }

    overlay.classList.remove('hidden');
    setTimeout(() => ageInput.focus(), 100);

    confirmBtn.onclick = () => {
        const age = parseInt(ageInput.value, 10);
        const school = schoolInput.value.trim();

        if (!age || age < 3 || age > 99) {
            alert('請輸入有效的年齡（3~99）');
            ageInput.focus();
            return;
        }
        if (!school) {
            alert('請輸入學校名稱');
            schoolInput.focus();
            return;
        }

        currentPlayer = {
            ...baseInfo,
            age,
            school,
            createdAt: existing ? existing.createdAt : new Date().toISOString()
        };

        upsertPlayerRecord(currentPlayer);
        savePlayerToStorage(currentPlayer);
        overlay.classList.add('hidden');
        finishLogin();
    };
}

// ---------- 登入完成 ----------
function finishLogin() {
    const welcomeOverlay = document.getElementById('welcome-overlay');
    welcomeOverlay.classList.add('hidden');

    // 更新大廳顯示
    const lobbyName = document.getElementById('lobby-username');
    if (lobbyName) lobbyName.textContent = currentPlayer.name;

    const avatarEl = document.getElementById('lobby-avatar');
    if (avatarEl) {
        if (currentPlayer.picture) {
            avatarEl.innerHTML = `<img src="${currentPlayer.picture}" alt="avatar">`;
        } else {
            avatarEl.textContent = currentPlayer.name.charAt(0).toUpperCase();
        }
    }

    const infoEl = document.getElementById('lobby-player-info');
    if (infoEl) {
        infoEl.textContent = `${currentPlayer.school} ｜ ${currentPlayer.age} 歲`;
    }

    // 給主程式用
    if (typeof currentPlayerName !== 'undefined') {
        currentPlayerName = currentPlayer.name;
    }

    showLobby();
    speakText(`歡迎 ${currentPlayer.name} 來到遊戲樂園！`);

    // 顯示登出按鈕
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
}

function logout() {
    if (!confirm('確定要登出嗎？')) return;
    currentPlayer = null;
    localStorage.removeItem(STORAGE_KEY_PLAYER);

    // Google 登出
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }

    // 顯示登入遮罩
    document.getElementById('welcome-overlay').classList.remove('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    initGoogleLogin();
}

// ---------- 初始化 ----------
window.addEventListener('DOMContentLoaded', () => {
    const saved = loadPlayerFromStorage();
    if (saved && saved.name && saved.age && saved.school) {
        currentPlayer = saved;
        finishLogin();
    } else {
        initGoogleLogin();
    }
});