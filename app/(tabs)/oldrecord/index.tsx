import { ThemedText } from '@/components/themed-text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';
import { getAllRecords, StudyRecord } from '../../../lib/recordStore';

/* =====================
   仮データ（初期値）
===================== */
/* =====================
   色
===================== */
const subjectColors: Record<string, string> = {
  数学: '#6C7BFA',
  英語: '#4CAF50',
  国語: '#9C27B0',
  理科: '#FF9800',
  社会: '#03A9F4',
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}時間${remainingMinutes}分` : `${remainingMinutes}分`;
};

export default function OldRecordScreen() {
  const { width } = useWindowDimensions();
  const isPC = width >= 768;

  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [graphColor, setGraphColor] = useState('#6C7BFA');

  // 画面フォーカス時にFirebaseからデータを取得
  useFocusEffect(
    useCallback(() => {
      loadRecords();
      AsyncStorage.getItem('graphColor').then(color => {
        if (color) setGraphColor(color);
      });
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
          allRecords = firebaseRecords.map(r => ({ ...r, point: isNaN(Number(r.point)) ? 0 : Number(r.point) }));
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
                point: isNaN(Number(record.point)) ? 0 : Number(record.point),
              });
            }
          }
        }

        console.log('[oldrecord] allRecords after merging AsyncStorage:', allRecords);
      } catch (asError) {
        console.error('AsyncStorage読込失敗:', asError);
      }

      setRecords(allRecords);
    } catch (error) {
      console.error('Failed to load records:', error);
      setRecords([]);
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

  const totalDurationMinutes = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0),
    [records]
  );

  const dailyDurations = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(record => {
      map[record.date] = (map[record.date] || 0) + (Number(record.durationMinutes) || 0);
    });
    return Object.entries(map)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records]);

  const monthlyDurations = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(record => {
      const month = record.date.slice(0, 7);
      map[month] = (map[month] || 0) + (Number(record.durationMinutes) || 0);
    });
    return Object.entries(map)
      .map(([month, minutes]) => ({ month, minutes }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [records]);

  const dailyPoints = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.date] = (map[r.date] || 0) + r.point;
    });
    return Object.entries(map)
      .map(([date, point]) => ({ date, point }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records]);

  // 最新の記録日を基準に、直近30日分だけをグラフに表示する。
  const recentDailyPoints = useMemo(() => {
    const latest = dailyPoints.at(-1);
    if (!latest) return [];
    const start = new Date(`${latest.date}T00:00:00`);
    start.setDate(start.getDate() - 29);
    return dailyPoints.filter(item => new Date(`${item.date}T00:00:00`) >= start);
  }, [dailyPoints]);

  const recentDailyDurations = useMemo(() => {
    const latest = dailyDurations[0];
    if (!latest) return [];
    const start = new Date(`${latest.date}T00:00:00`);
    start.setDate(start.getDate() - 29);
    return dailyDurations
      .filter(item => new Date(`${item.date}T00:00:00`) >= start)
      .reverse();
  }, [dailyDurations]);

  // カード内に必ず収まるよう、画面幅に応じてグラフの幅を縮める。
  const summaryChartWidth = Math.max(160, Math.min(isPC ? 190 : width - 64, 280));
  const detailChartWidth = Math.max(200, Math.min(width - 64, 480));

  const subjectPoints = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.subject] = (map[r.subject] || 0) + r.point;
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

  const pieData = Object.entries(subjectPoints) as [string, number][];

  useEffect(() => {
    console.log('dailyPoints:', dailyPoints);
  }, [dailyPoints]);

  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>今までの記録</ThemedText>

      {isLoading ? (
        <ThemedText style={styles.loadingText}>読み込み中...</ThemedText>
      ) : records.length === 0 ? (
        <ThemedText style={styles.emptyText}>記録なし</ThemedText>
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
              <ThemedText style={styles.sectionTitle}>日別 推移（直近1か月）</ThemedText>
              <Svg width={summaryChartWidth} height={120}>
                {(() => {
                  const maxPoint = Math.max(...recentDailyPoints.map(d => d.point), 1);
                  const scale = 80 / maxPoint; // 80px の高さにスケール
                  const xPadding = 10;
                  const xStep = (summaryChartWidth - xPadding * 2) / Math.max(recentDailyPoints.length - 1, 1);
                  return (
                    <>
                      {recentDailyPoints.length > 1 && <Polyline
                        points={recentDailyPoints
                          .map((d, i) => `${xPadding + i * xStep},${100 - d.point * scale}`)
                          .join(' ')}
                        fill="none"
                        stroke={graphColor}
                        strokeWidth="3"
                      />}
                      <Line x1={xPadding} y1="100" x2={summaryChartWidth - xPadding} y2="100" stroke="#ccc" />
                    </>
                  );
                })()}
              </Svg>
            </TouchableOpacity>

            {/* 科目別 */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/subjects')}
            >
              <ThemedText style={styles.sectionTitle}>科目別</ThemedText>
              <View style={styles.subjectList}>
                {pieData.length === 0 ? (
                  <ThemedText style={styles.subjectListEmpty}>記録なし</ThemedText>
                ) : (
                  [...pieData]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([subject, point]) => (
                      <View key={subject} style={styles.subjectRow}>
                        <View
                          style={[
                            styles.subjectDot,
                            { backgroundColor: subjectColors[subject] ?? graphColor },
                          ]}
                        />
                        <ThemedText style={styles.subjectName}>{subject}</ThemedText>
                        <ThemedText style={styles.subjectPoint}>{point} pt</ThemedText>
                      </View>
                    ))
                )}
              </View>
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

          <View style={styles.totalDurationBox}>
            <ThemedText style={styles.totalDurationLabel}>累計学習時間</ThemedText>
            <ThemedText style={styles.totalDurationText}>
              {formatDuration(totalDurationMinutes)}
            </ThemedText>
          </View>

          <View style={styles.timeBreakdownBox}>
            <ThemedText style={styles.timeBreakdownTitle}>1日ごとの学習時間（直近1か月）</ThemedText>
            {(() => {
              const trendData = recentDailyDurations;
              const maxMinutes = Math.max(...trendData.map(item => item.minutes), 1);
              const xPadding = 14;
              const xStep = (detailChartWidth - xPadding * 2) / Math.max(trendData.length - 1, 1);

              return (
                <>
                  <Svg width={detailChartWidth} height={130}>
                    {trendData.length > 1 && <Polyline
                      points={trendData
                        .map((item, index) => `${xPadding + index * xStep},${105 - (item.minutes / maxMinutes) * 80}`)
                        .join(' ')}
                      fill="none"
                      stroke={graphColor}
                      strokeWidth="3"
                    />}
                    <Line x1={xPadding} y1="105" x2={detailChartWidth - xPadding} y2="105" stroke="#d9d3ed" />
                  </Svg>
                  {trendData.length > 0 && (
                    <View style={styles.timeTrendCaption}>
                      <ThemedText style={styles.timeTrendDate}>{trendData[0].date}</ThemedText>
                      <ThemedText style={styles.timeTrendDate}>{trendData[trendData.length - 1].date}</ThemedText>
                    </View>
                  )}
                </>
              );
            })()}
          </View>

          <View style={styles.timeBreakdownBox}>
            <ThemedText style={styles.timeBreakdownTitle}>月ごとの学習時間</ThemedText>
            {monthlyDurations.map(({ month, minutes }) => (
              <View key={month} style={styles.timeBreakdownRow}>
                <ThemedText style={styles.timeBreakdownDate}>{month}</ThemedText>
                <ThemedText style={styles.timeBreakdownValue}>{formatDuration(minutes)}</ThemedText>
              </View>
            ))}
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
  container: { flex: 1, padding: 16, backgroundColor: '#FAF9FF', width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 20 },
  emptyText: { fontSize: 18, textAlign: 'center', marginTop: 32, color: '#777' },

  totalBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#EAE7F4',
  },
  totalText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  cardsContainer: { gap: 16 },
  pcLayout: { flexDirection: 'row' },
  mobileLayout: { flexDirection: 'column' },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EAE7F4',
    borderRadius: 18,
    padding: 15,
    backgroundColor: '#fff',
  },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subjectList: { gap: 8 },
  subjectListEmpty: { fontSize: 13, color: '#777' },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  subjectName: { flex: 1, fontSize: 13 },
  subjectPoint: { fontSize: 12, fontWeight: 'bold', color: '#554a8e' },

  totalDurationBox: {
    marginTop: 24,
    marginBottom: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  totalDurationLabel: { fontSize: 15, color: '#625c80' },
  totalDurationText: { fontSize: 24, fontWeight: 'bold', color: '#554a8e', marginTop: 6 },

  timeBreakdownBox: {
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  timeBreakdownTitle: { fontSize: 17, fontWeight: 'bold', color: '#554a8e', marginBottom: 8 },
  timeTrendCaption: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  timeTrendDate: { fontSize: 12, color: '#625c80' },
  timeBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ecff',
  },
  timeBreakdownDate: { fontSize: 15, color: '#45405f' },
  timeBreakdownValue: { fontSize: 15, fontWeight: 'bold', color: '#554a8e' },
});
