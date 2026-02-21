import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAllRecords, StudyRecord } from '../../../lib/recordStore';

type Subject = '数学' | '英語' | '国語' | '理科' | '社会';

const subjectColors: Record<Subject, string> = {
  数学: '#6C7BFA',
  英語: '#4CAF50',
  国語: '#9C27B0',
  理科: '#FF9800',
  社会: '#03A9F4',
};

export default function SubjectDetailScreen() {
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const data = await getAllRecords();
      setRecords(data);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subjectPoints = useMemo(() => {
    const map: Record<Subject, { point: number; entries: StudyRecord[] }> = {
      数学: { point: 0, entries: [] },
      英語: { point: 0, entries: [] },
      国語: { point: 0, entries: [] },
      理科: { point: 0, entries: [] },
      社会: { point: 0, entries: [] },
    };
    records.forEach(r => {
      map[r.subject].point += r.point;
      map[r.subject].entries.push(r);
    });
    return Object.entries(map)
      .filter(([, { point }]) => point > 0)
      .map(([subject, { point, entries }]) => ({
        subject: subject as Subject,
        point,
        entries,
      }));
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
      <Text style={styles.title}>科目別 詳細</Text>

      {subjectPoints.length === 0 ? (
        <Text style={styles.noDataText}>データがありません</Text>
      ) : (
        <View>
          {subjectPoints.map(({ subject, point, entries }) => (
            <View key={subject} style={styles.subjectItemWrapper}>
              <View style={styles.subjectItem}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: subjectColors[subject] },
                  ]}
                />
                <View style={styles.subjectContent}>
                  <Text style={styles.subjectName}>{subject}</Text>
                  <Text style={styles.subjectPoint}>{point} pt</Text>
                </View>
              </View>
              <View style={styles.entriesBox}>
                {entries.map((entry) => (
                  <View key={entry.id} style={styles.entryItem}>
                    <Text style={styles.entryMaterial}>{entry.material}</Text>
                    <Text style={styles.entryContent}>{entry.content}</Text>
                    <Text style={styles.entryAmount}>{entry.amount} {entry.unit} → {entry.point} pt</Text>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  noDataText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 },
  subjectItemWrapper: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  colorIndicator: { width: 8, height: 40, borderRadius: 4, marginRight: 12 },
  subjectContent: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: 'bold' },
  subjectPoint: { fontSize: 14, color: '#666', marginTop: 4 },
  entriesBox: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  entryItem: {
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    paddingLeft: 8,
    marginVertical: 4,
  },
  entryMaterial: { fontSize: 12, fontWeight: '600', color: '#666' },
  entryContent: { fontSize: 12, color: '#333', marginTop: 2 },
  entryAmount: { fontSize: 11, color: '#888', marginTop: 2 },
  entryDate: { fontSize: 10, color: '#aaa', marginTop: 2 },
});
