// lib/firebase.ts

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// analytics は Web のときだけ使う
let analytics: any = undefined;

const firebaseConfig = {
  apiKey: "AIzaSyBxprGIcqfv5OTd5pmJg5oZpDJYHmz8HtQ",
  authDomain: "study-app-525e8.firebaseapp.com",
  projectId: "study-app-525e8",
  storageBucket: "study-app-525e8.firebasestorage.app",
  messagingSenderId: "241701972988",
  appId: "1:241701972988:web:f7ab5d519b3f55f4452079",
  measurementId: "G-Y85YJLNB65",
};

// ① 二重初期化防止（超重要）
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ② window があるときだけ analytics を import & 初期化
if (typeof window !== 'undefined') {
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

const auth = getAuth(app);
const db = getFirestore(app);

export { analytics, app, auth, db };

