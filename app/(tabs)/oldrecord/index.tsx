import { ThemedText } from '@/components/themed-text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';
import { getAllRecords, StudyRecord, Subject } from '../../../lib/recordStore';

/* =====================
   仮データ（初期値）
===================== */
const initialRecords: StudyRecord[] = [
  {
    id: '1',
    date: '2025-12-20',
    subject: '数学',
    material: '青チャート',
    content: '二次関数',
    amount: 15,
    unit: '問',
    point: 15,
  },
  {
    id: '2',
    date: '2025-12-21',
    subject: '英語',
    material: '単語帳',
    content: 'Section1',
    amount: 50,
    unit: '語',
    point: 10,
  },
  {
    id: '3',
    date: '2025-12-21',
    subject: '数学',
    material: '青チャート',
    content: '微分',
    amount: 10,
    unit: '問',
    point: 10,
  },
];

/* =====================
   色
===================== */
const subjectColors: Record<Subject, string> = {
  数学: '#6C7BFA',
  英語: '#4CAF50',
  国語: '#9C27B0',
  理科: '#FF9800',
  社会: '#03A9F4',
};

export default function OldRecordScreen() {
  const { width } = useWindowDimensions();
  const isPC = width >= 768;

  const [records, setRecords] = useState<StudyRecord[]>(initialRecords);
  const [isLoading, setIsLoading] = useState(true);

  // 画面フォーカス時にFirebaseからデータを取得
  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      let allRecords: StudyRecord[] = [];

      // Firebaseからデータ取得
      try {
        const firebaseRecords = await getAllRecords();
        if (firebaseRecords && firebaseRecords.length > 0) {
          allRecords = firebaseRecords;
          console.log('Firebase記録数:', firebaseRecords.length);
        }
      } catch (fbError) {
        console.error('Firebase読込失敗:', fbError);
      }

      // AsyncStorageからバックアップデータも取得
      try {
        const keys = await AsyncStorage.getAllKeys();
        const recordKeys = keys.filter(k => k.startsWith('record_'));
        console.log('AsyncStorage記録数:', recordKeys.length);

        for (const key of recordKeys) {
          const value = await AsyncStorage.getItem(key);
          console.log('[oldrecord] AsyncStorage key:', key, 'value:', value);
          if (value) {
            const record = JSON.parse(value);
            // Firebaseにないデータのみ追加
            if (!allRecords.some(r => r.id === record.id || (r.date === record.date && r.content === record.content))) {
              allRecords.push({
                id: key,
                ...record,
              });
            }
          }
        }

        console.log('[oldrecord] allRecords after merging AsyncStorage:', allRecords);
      } catch (asError) {
        console.error('AsyncStorage読込失敗:', asError);
      }

      if (allRecords.length > 0) {
        setRecords(allRecords);
      } else {
        setRecords(initialRecords);
      }
    } catch (error) {
      console.error('Failed to load records:', error);
      setRecords(initialRecords);
    } finally {
      setIsLoading(false);
    }
  };

  /* =====================
     集計
  ===================== */
  const totalPoint = useMemo(
    () => records.reduce((sum, r) => sum + r.point, 0),
    [records]
  );

  const dailyPoints = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.date] = (map[r.date] || 0) + r.point;
    });
    return Object.entries(map)
      .map(([date, point]) => ({ date, point }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records]);

  const subjectPoints = useMemo(() => {
    const map: Record<Subject, number> = {
      数学: 0,
      英語: 0,
      国語: 0,
      理科: 0,
      社会: 0,
    };
    records.forEach(r => {
      map[r.subject] += r.point;
    });
    return map;
  }, [records]);

  const materialRanking = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.material] = (map[r.material] || 0) + r.point;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const pieData = Object.entries(subjectPoints) as [Subject, number][];

  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>今までの記録</ThemedText>

      {isLoading ? (
        <ThemedText style={styles.loadingText}>読み込み中...</ThemedText>
      ) : (
        <>
          <View style={styles.totalBox}>
            <ThemedText style={styles.totalText}>累計ポイント：{totalPoint} pt</ThemedText>
          </View>

          <View
            style={[
              styles.cardsContainer,
              isPC ? styles.pcLayout : styles.mobileLayout,
            ]}
          >
            {/* 日別 */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                // 最新の日付を取得して遷移
                const latestDate = dailyPoints.length > 0 
                  ? dailyPoints[dailyPoints.length - 1].date 
                  : new Date().toISOString().slice(0, 10);
                router.push({
                  pathname: '/oldrecord/daily',
                  params: { date: latestDate },
                });
              }}
            >
              <ThemedText style={styles.sectionTitle}>日別 推移</ThemedText>
              <Svg width={280} height={120}>
                <Polyline
                  points={dailyPoints
                    .map((d, i) => `${i * 80 + 20},${100 - d.point * 2}`)
                    .join(' ')}
                  fill="none"
                  stroke="#6C7BFA"
                  strokeWidth="2"
                />
                <Line x1="10" y1="100" x2="290" y2="100" stroke="#ccc" />
              </Svg>
            </TouchableOpacity>

            {/* 科目別 */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/oldrecord/subject')}
            >
              <ThemedText style={styles.sectionTitle}>科目別</ThemedText>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                {(() => {
                  const cx = 100;
                  const cy = 100;
                  const radius = 60;
                  let currentAngle = -Math.PI / 2; // 12 o'clock position

                  return pieData.map(([subject, point]) => {
                    if (point === 0) return null;

                    const sliceAngle = (point / totalPoint) * 2 * Math.PI;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + sliceAngle;

                    const largeArc = sliceAngle > Math.PI ? 1 : 0;

                    const pathData = [
                      `M ${cx} ${cy}`,
                      `L ${cx} ${cy}`,
                      `A ${radius} ${radius} 0 ${largeArc} 1 ${cx} ${cy}`,
                      'Z',
                    ].join(' ');

                    currentAngle = endAngle;

                    return (
                      <Path
                        key={subject}
                        d={pathData}
                        fill={subjectColors[subject]}
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    );
                  });
                })()}
              </Svg>
            </TouchableOpacity>

            {/* 教材 */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/oldrecord/material')}
            >
              <ThemedText style={styles.sectionTitle}>教材ランキング</ThemedText>
              {materialRanking.map(([m, p], i) => (
                <ThemedText key={m}>
                  {i + 1}. {m}：{p} pt
                </ThemedText>
              ))}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

/* =====================
   styles
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 20 },

  totalBox: {
    backgroundColor: '#eef0ff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  totalText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  cardsContainer: { gap: 16 },
  pcLayout: { flexDirection: 'row' },
  mobileLayout: { flexDirection: 'column' },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
});
