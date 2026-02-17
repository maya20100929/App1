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
    const map: Record<string, number> = {};
    records.forEach(r => {
      map[r.material] = (map[r.material] || 0) + r.point;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
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
          {materialRanking.map(([material, point], index) => (
            <View key={material} style={styles.rankItem}>
              <Text style={styles.rankNumber}>{index + 1}.</Text>
              <View style={styles.rankContent}>
                <Text style={styles.materialName}>{material}</Text>
                <Text style={styles.materialPoint}>{point} pt</Text>
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
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
});
