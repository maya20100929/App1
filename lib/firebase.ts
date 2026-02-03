import { Analytics, getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBxprGIcqfv5OTd5pmJg5oZpDJYHmz8HtQ",
  authDomain: "study-app-525e8.firebaseapp.com",
  projectId: "study-app-525e8",
  storageBucket: "study-app-525e8.firebasestorage.app",
  messagingSenderId: "241701972988",
  appId: "1:241701972988:web:f7ab5d519b3f55f4452079",
  measurementId: "G-Y85YJLNB65"
};

const app = initializeApp(firebaseConfig)

let analytics: Analytics | undefined

if (typeof window !== 'undefined') {
  analytics = getAnalytics(app)
}

const auth = getAuth(app);
const db = getFirestore(app);

export default app
export { analytics, auth, db };
