/* ============================================================
 * 設定檔
 * ============================================================ */

// ⚠️ 請到 https://console.cloud.google.com/apis/credentials
// 建立 OAuth 2.0 用戶端 ID（網頁應用程式），並把 ID 貼在這裡
// 沒填的話會使用「訪客模式」（模擬登入，方便本機測試）
const GOOGLE_CLIENT_ID = '840284354450-qs0h47066lg8veh8tafhcsbrajc4l43c.apps.googleusercontent.com';

// 排行榜每個遊戲保留前幾名
const LEADERBOARD_MAX_ENTRIES = 10;