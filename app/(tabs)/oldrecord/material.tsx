import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function MaterialDetailScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>教材ランキング 詳細</Text>

      <View style={styles.box}>
        <Text>1. 青チャート：25 pt</Text>
        <Text>2. 単語帳：10 pt</Text>
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
