import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DailyDetailScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>日別 詳細</Text>

      <View style={styles.box}>
        <Text>2025-12-21</Text>
        <Text>合計：20 pt</Text>
        <Text>数学：10 pt</Text>
        <Text>英語：10 pt</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  box: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
});
