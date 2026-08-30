import { Analytics, getAnalytics } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, setPersistence } from 'firebase/auth';
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

// 初期化
const auth = getAuth(app);
const db = getFirestore(app);

// iOS/Android (React Native) では AsyncStorage を用いた永続化を設定する
// 注意: 'firebase/auth/react-native' は Web バンドルに存在しないため動的 import を使用する
if (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative') {
  (async () => {
    try {
      // Firebase v12 no longer ships this entry point's type declaration.
      // Keeping the module name dynamic preserves the optional native fallback
      // without making Web/TypeScript builds resolve an unavailable export.
      const reactNativeAuthEntry = 'firebase/auth/react-native';
      const { getReactNativePersistence } = await import(reactNativeAuthEntry);
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await setPersistence(auth, getReactNativePersistence(AsyncStorage));
      console.log('[firebase] React Native auth persistence configured');
    } catch (e) {
      console.warn('[firebase] Failed to configure RN persistence', e);
    }
  })();
}

console.log('[firebase] Auth and Firestore initialized');

export default app
export { analytics, auth, db };
