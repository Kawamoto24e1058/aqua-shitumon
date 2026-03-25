import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Firestoreを追加
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebaseの初期化（二重初期化防止）
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestoreの初期化とエクスポート（ここが重要！）
export const db = getFirestore(app);

// Analyticsはブラウザ環境のみで動作させる（SSRエラー防止）
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && getAnalytics(app));
}