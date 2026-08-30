import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRecordsBySubject, type StudyRecord } from '@/lib/recordStore';
import { getSubjectSettings, type SubjectSetting } from '@/lib/subjectStore';

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours > 0 ? `${hours}時間${remaining}分` : `${remaining}分`;
};

export default function SubjectDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const subjectName = decodeURIComponent(name ?? '');
  const [subject, setSubject] = useState<SubjectSetting | null>(null);
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      Promise.all([getSubjectSettings(), getRecordsBySubject(subjectName)])
        .then(([settings, subjectRecords]) => {
          if (!isActive) return;
          setSubject(settings.find(item => item.name === subjectName) ?? null);
          setRecords(subjectRecords);
        })
        .catch(error => console.error('Failed to load subject detail', error))
        .finally(() => {
          if (isActive) setIsLoading(false);
        });

      return () => {
        isActive = false;
      };
    }, [subjectName])
  );

  const totalPoint = useMemo(
    () => records.reduce((total, record) => total + Number(record.point || 0), 0),
    [records]
  );
  const totalMinutes = useMemo(
    () => records.reduce((total, record) => total + Number(record.durationMinutes || 0), 0),
    [records]
  );
  const materialCount = useMemo(
    () => new Set(records.map(record => record.material)).size,
    [records]
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.eyebrow}>科目</ThemedText>
        <ThemedText style={styles.title}>{subjectName || '科目'}</ThemedText>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#7464E8" />
          </View>
        ) : (
          <>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <ThemedText style={styles.metricValue}>{totalPoint}</ThemedText>
                <ThemedText style={styles.metricLabel}>ポイント</ThemedText>
              </View>
              <View style={styles.metric}>
                <ThemedText style={styles.metricValue}>{formatDuration(totalMinutes)}</ThemedText>
                <ThemedText style={styles.metricLabel}>学習時間</ThemedText>
              </View>
              <View style={styles.metric}>
                <ThemedText style={styles.metricValue}>{materialCount}</ThemedText>
                <ThemedText style={styles.metricLabel}>教材</ThemedText>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>カテゴリ</ThemedText>
              {subject?.categories.length ? (
                <View style={styles.categoryList}>
                  {subject.categories.map(category => (
                    <ThemedText key={category} style={styles.category}>{category}</ThemedText>
                  ))}
                </View>
              ) : (
                <ThemedText style={styles.emptyText}>まだカテゴリはありません</ThemedText>
              )}
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>教材</ThemedText>
              <ThemedText style={styles.emptyText}>
                次の段階で、ここから教材詳細を開いて「始める」まで進められるようにします。
              </ThemedText>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  eyebrow: { color: '#7464E8', fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#211B37', fontSize: 32, fontWeight: '900', marginTop: 6 },
  loading: { paddingVertical: 48 },
  metrics: { flexDirection: 'row', gap: 12, marginTop: 28 },
  metric: { flex: 1 },
  metricValue: { color: '#211B37', fontSize: 23, fontWeight: '900', lineHeight: 30 },
  metricLabel: { color: '#70698A', fontSize: 12, marginTop: 2 },
  section: { marginTop: 36 },
  sectionTitle: { color: '#211B37', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { backgroundColor: '#E9E5FF', borderRadius: 99, color: '#453B91', fontSize: 13, paddingHorizontal: 12, paddingVertical: 7 },
  emptyText: { color: '#70698A', fontSize: 14, lineHeight: 22 },
});
