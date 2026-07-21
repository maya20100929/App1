import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { getRecordsByDate, StudyRecord } from '../../../lib/recordStore';

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}時間${remainingMinutes}分` : `${remainingMinutes}分`;
};

export default function DailyDetailScreen() {
  const params = useLocalSearchParams();
  const dateParam = params.date as string;

  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 画面フォーカス時にデータを取得
  useFocusEffect(
    useCallback(() => {
      if (dateParam) {
        loadRecords();
      }
    }, [dateParam])
  );

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      if (dateParam) {
        const data = await getRecordsByDate(dateParam);
        setRecords(data);
      }
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPoint = useMemo(
    () => records.reduce((sum, r) => sum + r.point, 0),
    [records]
  );

  const totalDurationMinutes = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0),
    [records]
  );

  const subjectBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.subject] = (map[r.subject] || 0) + r.point;
    });
    return Object.entries(map);
  }, [records]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C7BFA" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>日別 詳細</ThemedText>
      <ThemedText style={styles.dateText}>{dateParam}</ThemedText>

      <View style={styles.box}>
        <ThemedText style={styles.boxTitle}>合計：{totalPoint} pt</ThemedText>
        <ThemedText style={styles.durationTotal}>この日の学習時間：{formatDuration(totalDurationMinutes)}</ThemedText>
        {subjectBreakdown.map(([subject, point]) => (
          <ThemedText key={subject} style={styles.boxItem}>
            {subject}：{point} pt
          </ThemedText>
        ))}
      </View>

      <View style={styles.detailsBox}>
        <ThemedText style={styles.detailsTitle}>詳細</ThemedText>
        {records.map(record => (
          <View key={record.id} style={styles.recordItem}>
            <ThemedText style={styles.recordSubject}>{record.subject}</ThemedText>
            <ThemedText style={styles.recordContent}>{record.material} - {record.content}</ThemedText>
            <ThemedText style={styles.recordAmount}>
              {record.amount} {record.unit}
            </ThemedText>
            <ThemedText style={styles.recordPoint}>{record.point} pt</ThemedText>
            {record.durationMinutes !== undefined && (
              <ThemedText style={styles.recordDuration}>
                かかった時間：{formatDuration(Number(record.durationMinutes) || 0)}
              </ThemedText>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  dateText: { fontSize: 16, color: '#666', marginBottom: 16 },
  box: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  boxTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  durationTotal: { fontSize: 14, fontWeight: '600', color: '#554a8e', marginBottom: 6 },
  boxItem: { fontSize: 14, marginVertical: 4 },
  detailsBox: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  detailsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  recordItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#6C7BFA',
  },
  recordSubject: { fontSize: 12, fontWeight: '600', color: '#6C7BFA' },
  recordContent: { fontSize: 13, marginTop: 2 },
  recordAmount: { fontSize: 12, color: '#888', marginTop: 2 },
  recordPoint: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  recordDuration: { fontSize: 12, color: '#625c80', marginTop: 2 },
});
