import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

/* =====================
   科目型
===================== */
type Subject = '数学' | '英語' | '国語' | '理科' | '社会';

/* =====================
   学習記録型
===================== */
type StudyRecord = {
  id: string;
  date: string;
  subject: Subject;
  material: string;
  content: string;
  amount: number;
  unit: string;
  point: number;
};

/* =====================
   仮データ
===================== */
const records: StudyRecord[] = [
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
   科目カラー
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

  /* =====================
     合計ポイント
  ===================== */
  const totalPoint = useMemo(() => {
    return records.reduce((sum, r) => sum + r.point, 0);
  }, []);

  /* =====================
     日別集計
  ===================== */
  const dailyPoints = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.date] = (map[r.date] || 0) + r.point;
    });
    return Object.entries(map).map(([date, point]) => ({ date, point }));
  }, []);

  /* =====================
     科目別集計
  ===================== */
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
  }, []);

  /* =====================
     教材ランキング
  ===================== */
  const materialRanking = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.material] = (map[r.material] || 0) + r.point;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);

  /* =====================
     円グラフ用データ
  ===================== */
  const pieData = Object.entries(subjectPoints) as [Subject, number][];

  /* =====================
     円グラフ描画（★重要）
  ===================== */
  let startAngle = 0;

  const pieCircles = pieData.map(([subject, point]) => {
    const ratio = point / totalPoint;
    const angle = ratio * Math.PI * 2;

    const circle = (
      <Circle
        key={subject}
        cx="100"
        cy="100"
        r="60"
        stroke={subjectColors[subject]}
        strokeWidth="30"
        fill="none"
        strokeDasharray={`${angle * 100} ${Math.PI * 2 * 100}`}
        strokeDashoffset={-startAngle * 100}
      />
    );

    startAngle += angle;
    return circle;
  });

  /* =====================
     画面
  ===================== */
  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>今までの記録</ThemedText>

      <View style={styles.totalBox}>
        <ThemedText style={styles.totalText}>
          累計ポイント：{totalPoint} pt
        </ThemedText>
      </View>

      <View
        style={[
          styles.cardsContainer,
          isPC ? styles.pcLayout : styles.mobileLayout,
        ]}
      >
        {/* ① 日別推移 */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/oldrecord/daily')}
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

        {/* ② 科目別 */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/oldrecord/subject')}
        >
          <ThemedText style={styles.sectionTitle}>科目別</ThemedText>
          <Svg width={200} height={200} viewBox="0 0 200 200">
            {pieCircles}
          </Svg>
        </TouchableOpacity>

        {/* ③ 教材ランキング */}
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
    </ScrollView>
  );
}

/* =====================
   styles
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#aaacf5ff', marginBottom: 10 },

  totalBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#aaacf5ff',
  },
  totalText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#6d3f7f' },

  cardsContainer: {},
  pcLayout: { flexDirection: 'row' },
  mobileLayout: { flexDirection: 'column' },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 14,
  },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#aaacf5ff' },
});
