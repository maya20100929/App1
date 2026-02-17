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
    return Object.entries(map).filter(([, point]) => point > 0);
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
          {subjectPoints.map(([subject, point]) => (
            <View key={subject} style={styles.subjectItem}>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: subjectColors[subject as Subject] },
                ]}
              />
              <View style={styles.subjectContent}>
                <Text style={styles.subjectName}>{subject}</Text>
                <Text style={styles.subjectPoint}>{point} pt</Text>
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
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 8,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  colorIndicator: { width: 8, height: 40, borderRadius: 4, marginRight: 12 },
  subjectContent: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: 'bold' },
  subjectPoint: { fontSize: 14, color: '#666', marginTop: 4 },
});
