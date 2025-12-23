import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

/* =====================
   型
===================== */
type Subject = '数学' | '英語' | '国語' | '理科' | '社会';

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

  /* =====================
     集計
  ===================== */
  const totalPoint = useMemo(
    () => records.reduce((sum, r) => sum + r.point, 0),
    []
  );

  const dailyPoints = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.date] = (map[r.date] || 0) + r.point;
    });
    return Object.entries(map).map(([date, point]) => ({ date, point }));
  }, []);

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

  const materialRanking = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.material] = (map[r.material] || 0) + r.point;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);

  const pieData = Object.entries(subjectPoints) as [Subject, number][];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>今までの記録</Text>

      <View style={styles.totalBox}>
        <Text style={styles.totalText}>累計ポイント：{totalPoint} pt</Text>
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
          onPress={() => router.push('/oldrecord/daily')}
        >
          <Text style={styles.sectionTitle}>日別 推移</Text>
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
          <Text style={styles.sectionTitle}>科目別</Text>
          <Svg width={200} height={200} viewBox="0 0 200 200">
            {(() => {
              let startAngle = 0;
              return pieData.map(([subject, point]) => {
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
            })()}
          </Svg>
        </TouchableOpacity>

        {/* 教材 */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/oldrecord/material')}
        >
          <Text style={styles.sectionTitle}>教材ランキング</Text>
          {materialRanking.map(([m, p], i) => (
            <Text key={m}>
              {i + 1}. {m}：{p} pt
            </Text>
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
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },

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
