import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>わたしの勉強スタイルを見つけよう💖</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff3ff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#aaacf5ff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaacf5ff',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 24,
  },
});