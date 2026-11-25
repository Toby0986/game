/* ============================================================
 * 設定檔
 * ============================================================ */

// ⚠️ 請到 https://console.cloud.google.com/apis/credentials
// 建立 OAuth 2.0 用戶端 ID（網頁應用程式），並把 ID 貼在這裡
// 沒填的話會使用「訪客模式」（模擬登入，方便本機測試）
const GOOGLE_CLIENT_ID = '840284354450-qs0h47066lg8veh8tafhcsbrajc4l43c.apps.googleusercontent.com';

// 排行榜每個遊戲保留前幾名
const LEADERBOARD_MAX_ENTRIES = 100;

// 過關時間加分：總分 = 答題分數 + 時間加分
//   時間加分 = maxBonus × (1 − 用時 ÷ limitSec)，用時越短加分越多，超過 limitSec 就不再加分
//   （九九乘法、加減法、注音配對只計「看題目到作答」的思考時間，不含答完後的固定等待）
// 沒有列在這裡的遊戲（注音打地鼠固定 60 秒）不計時間加分，只依分數排名
const TIME_BONUS_CONFIG = {
    memory: { maxBonus: 100, limitSec: 180 },   // 記憶翻牌：從翻第一張牌到全部配對
    guess:  { maxBonus: 100, limitSec: 120 },   // 猜數字：從開始到猜中
    mult:   { maxBonus: 100, limitSec: 300 },   // 九九乘法：50 題
    calc:   { maxBonus: 100, limitSec: 300 },   // 加減法：50 題
    zhuyin: { maxBonus: 100, limitSec: 120 }    // 注音與圖片配對：20 題
};