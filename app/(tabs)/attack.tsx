import { ThemedText } from '@/components/themed-text';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export default function AttackScreen() {
  const [seconds, setSeconds] = useState(0);
  const [minutes, setMinutes] = useState('25');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [goal, setGoal] = useState('');

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds(value => {
      if (value <= 1) {
        setIsRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>タイムアタック</ThemedText>
      <ThemedText style={styles.description}>目標を決めて、集中した時間を測ろう。</ThemedText>
      <TextInput
        style={styles.input}
        value={goal}
        onChangeText={setGoal}
        placeholder="例：英単語を50個覚える"
      />
      {!isConfigured && <TextInput style={styles.input} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="制限時間（分）" />}
      <View style={styles.timerCard}>
        <ThemedText style={styles.goalLabel}>{goal || '目標を入力しよう'}</ThemedText>
        <ThemedText style={styles.timer}>{formatTime(seconds)}</ThemedText>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          if (!isConfigured) {
            setSeconds(Math.max(1, Number(minutes) || 1) * 60);
            setIsConfigured(true);
            setIsRunning(true);
          } else setIsRunning(value => !value);
        }}>
          <ThemedText style={styles.primaryButtonText}>{isConfigured ? (isRunning ? '一時停止' : '再開') : '開始'}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={() => { setIsRunning(false); setSeconds(0); setIsConfigured(false); }}>
          <ThemedText style={styles.resetButtonText}>リセット</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff8f5' },
  title: { fontSize: 26, fontWeight: '800', color: '#6e3c7a', marginBottom: 8 },
  description: { color: '#786a78', marginBottom: 20 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffd4c8', borderRadius: 16, padding: 14, fontSize: 16 },
  timerCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 36, marginTop: 24, borderWidth: 1, borderColor: '#ffe2da' },
  goalLabel: { color: '#786a78', marginBottom: 12 },
  timer: { fontSize: 56, fontWeight: '800', color: '#ff7658', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  primaryButton: { flex: 1, alignItems: 'center', backgroundColor: '#ff8e72', borderRadius: 18, padding: 16 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  resetButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffb6a5', borderRadius: 18, paddingHorizontal: 18 },
  resetButtonText: { color: '#d85f45', fontWeight: '700' },
});
