import { useEffect } from 'react';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ThemedView } from '@/components/themed-view';

export default function Index() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ログイン済み → Homescreen へ
        router.replace('/(tabs)/Homescreen');
      } else {
        // 未ログイン → login へ
        router.replace('/(tabs)/login');
      }
    });

    return () => unsubscribe();
  }, []);

  // ローディング画面を表示
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    </ThemedView>
  );
}
