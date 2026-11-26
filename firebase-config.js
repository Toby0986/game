/* ============================================================
 * Firebase 設定（只用 Firestore 當共用排行榜）
 *
 * 1. 到 https://console.firebase.google.com 建立專案
 * 2. 專案設定 → 一般 → 「您的應用程式」→ 新增網頁應用程式，複製設定值貼到下面
 * 3. Build → Firestore Database → 建立資料庫
 * 4. Firestore → 規則：貼上 firestore.rules 的內容並發布
 *
 * 還沒填（仍是 YOUR_ 開頭）時，排行榜會自動改用本機儲存，遊戲照常可玩。
 * ============================================================ */

const firebaseConfig = {
    apiKey: "AIzaSyBxzdVBwis0IyBhvigO8Ng7dq8jCYhsQ44",
    authDomain: "app-g-81f83.firebaseapp.com",
    projectId: "app-g-81f83",
    storageBucket: "app-g-81f83.firebasestorage.app",
    messagingSenderId: "411037045907",
    appId: "1:411037045907:web:87164e3c4afbb6fa3fe966"
};

let firestoreDb = null;

const FIREBASE_READY = (function () {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK 沒有載入成功，排行榜改用本機儲存');
            return false;
        }
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey.indexOf('YOUR_') === 0) return false;
        firebase.initializeApp(firebaseConfig);
        firestoreDb = firebase.firestore();
        // 手機的 App 內建瀏覽器（LINE、FB 等）常擋住 Firestore 的預設連線方式，
        // 開啟自動偵測後，連不上時會改用長輪詢（long polling）
        try {
            firestoreDb.settings({ experimentalAutoDetectLongPolling: true });
        } catch (e) {
            console.warn('Firestore 連線設定失敗', e);
        }
        return true;
    } catch (e) {
        console.error('Firebase 初始化失敗，改用本機排行榜', e);
        return false;
    }
})();
