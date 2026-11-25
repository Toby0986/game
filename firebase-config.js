/* ============================================================
 * Firebase 設定
 * ============================================================ */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase（使用 compat 版本，方便與現有 script 整合）
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// 排行榜保留前 N 名
const LEADERBOARD_MAX_ENTRIES = 10;