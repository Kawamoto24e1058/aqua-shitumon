import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Firestoreを追加
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyARw6Gf_s56bQd6HhPnoOl6y58QTRm716s",
  authDomain: "aqua-shitumon.firebaseapp.com",
  projectId: "aqua-shitumon",
  storageBucket: "aqua-shitumon.firebasestorage.app",
  messagingSenderId: "983478802486",
  appId: "1:983478802486:web:c48c0432a3bcfeda43a097",
  measurementId: "G-C9BFY8TXRR"
};

// Firebaseの初期化（二重初期化防止）
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestoreの初期化とエクスポート（ここが重要！）
export const db = getFirestore(app);

// Analyticsはブラウザ環境のみで動作させる（SSRエラー防止）
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && getAnalytics(app));
}