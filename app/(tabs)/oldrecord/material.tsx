import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAllRecords, StudyRecord } from '../../../lib/recordStore';

export default function MaterialDetailScreen() {
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

  const materialRanking = useMemo(() => {
    const map: Record<string, { point: number; entries: StudyRecord[] }> = {};
    records.forEach(r => {
      if (!map[r.material]) {
        map[r.material] = { point: 0, entries: [] };
      }
      map[r.material].point += r.point;
      map[r.material].entries.push(r);
    });
    return Object.entries(map)
      .map(([material, { point, entries }]) => ({ material, point, entries }))
      .sort((a, b) => b.point - a.point);
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
      <Text style={styles.title}>教材ランキング 詳細</Text>

      {materialRanking.length === 0 ? (
        <Text style={styles.noDataText}>データがありません</Text>
      ) : (
        <View style={styles.box}>
          {materialRanking.map(({ material, point, entries }, index) => (
            <View key={material} style={styles.rankItem}>
              <View style={styles.rankHeader}>
                <Text style={styles.rankNumber}>{index + 1}.</Text>
                <View style={styles.rankContent}>
                  <Text style={styles.materialName}>{material}</Text>
                  <Text style={styles.materialPoint}>{point} pt</Text>
                </View>
              </View>
              <View style={styles.entriesBox}>
                {entries.map((entry) => (
                  <View key={entry.id} style={styles.entryItem}>
                    <Text style={styles.entrySubject}>{entry.subject}</Text>
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
  box: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  rankItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C7BFA',
    marginRight: 12,
    minWidth: 30,
  },
  rankContent: { flex: 1 },
  materialName: { fontSize: 15, fontWeight: '600' },
  materialPoint: { fontSize: 13, color: '#666', marginTop: 4 },
  entriesBox: {
    marginTop: 8,
    paddingLeft: 40,
  },
  entryItem: {
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    paddingLeft: 8,
    marginVertical: 4,
  },
  entrySubject: { fontSize: 12, fontWeight: '600', color: '#666' },
  entryContent: { fontSize: 12, color: '#333', marginTop: 2 },
  entryAmount: { fontSize: 11, color: '#888', marginTop: 2 },
  entryDate: { fontSize: 10, color: '#aaa', marginTop: 2 },
});
