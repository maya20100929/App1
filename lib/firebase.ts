import { Analytics, getAnalytics } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBxprGIcqfv5OTd5pmJg5oZpDJYHmz8HtQ",
  authDomain: "study-app-525e8.firebaseapp.com",
  projectId: "study-app-525e8",
  storageBucket: "study-app-525e8.firebasestorage.app",
  messagingSenderId: "241701972988",
  appId: "1:241101972988:web:f7ab5d519b3f55f4452079",
  measurementId: "G-Y85YJLNB65"
};

console.log('[firebase] Initializing Firebase with config:', firebaseConfig.projectId);

// 二重初期化防止
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let analytics: Analytics | undefined

// Web環境でのみanalyticsを初期化
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app)
    console.log('[firebase] Analytics initialized');
  } catch (error) {
    console.error('[firebase] Failed to initialize analytics:', error);
  }
}

// Expoではfirebase/auth/react-nativeを使わず、getAuth()だけを使用
// 各プラットフォームでのpersistenceは自動的に設定されます
const auth = getAuth(app);
const db = getFirestore(app);

console.log('[firebase] Auth and Firestore initialized');

export default app
export { analytics, auth, db };
