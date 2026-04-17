from pathlib import Path

content = '''import { FC, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const HomeScreen: FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [testDateText, setTestDateText] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTestDateText('');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, snap => {
      const raw = snap.data()?.testDate;
      setTestDateText(normalizeDateField(raw));
    });

    return () => unsubscribe();
  }, [user]);

  const normalizeDateField = (raw: any) => {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    if (typeof raw === 'string') return raw;
    if (raw?.toDate && typeof raw.toDate === 'function') {
      try {
        return raw.toDate().toISOString().slice(0, 10);
      } catch {
        return '';
      }
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>次回テスト日</Text>
      <View style={styles.dateBox}>
        <Text style={styles.dateText}>{testDateText || '日付が未設定'}</Text>
      </View>
      <Text style={styles.hintText}>testrecordで入力した日付を表示します。</Text>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff3ff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#aaacf5ff',
    marginBottom: 18,
    textAlign: 'center',
  },
  dateBox: {
    width: '85%',
    borderWidth: 2,
    borderColor: '#aaacf5ff',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: '#f7f3ff',
    shadowColor: '#d6d8ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
    marginBottom: 14,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#4f2f63',
  },
  hintText: {
    fontSize: 14,
    color: '#6e3c7a',
    marginTop: 10,
    textAlign: 'center',
  },
});
'''
Path('app/(tabs)/Homescreen.tsx').write_text(content, encoding='utf-8')
