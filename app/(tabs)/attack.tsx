import { ThemedText } from '@/components/themed-text';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export default function AttackScreen() {
  const [seconds, setSeconds] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [draftMinutes, setDraftMinutes] = useState(25);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [goal, setGoal] = useState('');
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const minuteOptions = Array.from({ length: 180 }, (_, index) => index + 1);

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

  // アタック中だけ自動スリープを防ぎ、停止・終了時には通常の設定に戻す。
  useEffect(() => {
    const tag = 'attack-timer';
    if (isRunning) {
      activateKeepAwakeAsync(tag).catch(() => {});
    } else {
      deactivateKeepAwake(tag).catch(() => {});
    }
    return () => { deactivateKeepAwake(tag).catch(() => {}); };
  }, [isRunning]);

  return (
    <View style={[styles.container, isConfigured && styles.runningContainer]}>
      {!isConfigured && <>
        <ThemedText style={styles.title}>タイムアタック</ThemedText>
        <ThemedText style={styles.description}>目標を決めて、集中した時間を測ろう。</ThemedText>
      </>}
      <TextInput
        style={[styles.input, goal ? styles.inputFilled : styles.inputPlaceholder]}
        value={goal}
        onChangeText={setGoal}
        placeholder="例：英単語を50個覚える"
        placeholderTextColor="#a8a0a0"
      />
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.timerCard, isConfigured && styles.timerCardRunning, isConfigured && !isRunning && styles.timerCardPaused]}
        onPress={() => {
          if (isRunning) {
            setIsRunning(false);
          } else if (isConfigured) {
            setIsRunning(true);
          } else {
            setDraftMinutes(minutes);
            setIsPickerVisible(true);
          }
        }}
      >
        {!isConfigured && <ThemedText style={styles.goalLabel}>{goal || '目標を設定しよう'}</ThemedText>}
        <ThemedText style={[styles.timer, isConfigured && styles.timerRunning]}>{formatTime(isConfigured ? seconds : minutes * 60)}</ThemedText>
        {!isConfigured && <ThemedText style={styles.timerHint}>タップして時間を設定</ThemedText>}
        {isRunning && <ThemedText style={[styles.timerHint, styles.pauseHint]}>タップして一時停止</ThemedText>}
        {isConfigured && !isRunning && (
          <View pointerEvents="none" style={styles.pausedOverlay}>
            <View style={styles.playIconCircle}><ThemedText style={styles.playIcon}>▶</ThemedText></View>
          </View>
        )}
      </TouchableOpacity>
      {isConfigured && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.resetButton} onPress={() => { setIsRunning(false); setSeconds(0); setIsConfigured(false); }}>
            <ThemedText style={styles.resetButtonText}>リセット</ThemedText>
          </TouchableOpacity>
        </View>
      )}
      <Modal visible={isPickerVisible} transparent animationType="fade" onRequestClose={() => setIsPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <ThemedText style={styles.pickerTitle}>制限時間を選択</ThemedText>
            <View style={styles.wheelFrame}>
              <View pointerEvents="none" style={styles.wheelSelection} />
              <ScrollView
                showsVerticalScrollIndicator={false}
                snapToInterval={48}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: (draftMinutes - 1) * 48 }}
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelContent}
                scrollEventThrottle={16}
                onScroll={event => {
                  const index = Math.max(0, Math.min(minuteOptions.length - 1, Math.round(event.nativeEvent.contentOffset.y / 48)));
                  setDraftMinutes(minuteOptions[index]);
                }}
                onMomentumScrollEnd={event => {
                  const index = Math.max(0, Math.min(minuteOptions.length - 1, Math.round(event.nativeEvent.contentOffset.y / 48)));
                  setDraftMinutes(minuteOptions[index]);
                }}
              >
                {minuteOptions.map(minute => (
                  <ThemedText key={minute} style={[styles.wheelItem, minute === draftMinutes && styles.wheelItemSelected]}>{minute} 分</ThemedText>
                ))}
              </ScrollView>
            </View>
            <View style={styles.pickerActions}>
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setIsPickerVisible(false)}><ThemedText style={styles.pickerCancelText}>キャンセル</ThemedText></TouchableOpacity>
              <TouchableOpacity style={styles.pickerDone} onPress={() => { setMinutes(draftMinutes); setSeconds(draftMinutes * 60); setIsConfigured(true); setIsRunning(true); setIsPickerVisible(false); }}><ThemedText style={styles.pickerDoneText}>決定して開始</ThemedText></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff8f5' },
  runningContainer: { paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#6e3c7a', marginBottom: 8 },
  description: { color: '#786a78', marginBottom: 20 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffd4c8', borderRadius: 16, padding: 14, fontSize: 16 },
  inputPlaceholder: { color: '#a8a0a0' },
  inputFilled: { color: '#222' },
  timerCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 36, marginTop: 24, borderWidth: 1, borderColor: '#ffe2da' },
  timerCardRunning: { flex: 1, borderRadius: 28, marginTop: 16, paddingVertical: 0 },
  timerCardPaused: { backgroundColor: '#fff6f2', borderColor: '#ffb6a5' },
  goalLabel: { color: '#786a78', marginBottom: 12 },
  timer: { fontSize: 56, fontWeight: '800', color: '#ff7658', fontVariant: ['tabular-nums'] },
  timerRunning: { fontSize: 112 },
  pausedOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 246, 242, 0.45)', borderRadius: 28, zIndex: 2 },
  playIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(216, 95, 69, 0.88)' },
  playIcon: { color: '#fff', fontSize: 46, marginLeft: 6 },
  timerHint: { color: '#a48f8b', marginTop: 8, fontSize: 13 },
  pauseHint: { position: 'absolute', bottom: 28, color: '#a88f89', fontSize: 13, fontWeight: '600' },
  actions: { marginTop: 24 },
  resetButton: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  resetButtonText: { color: '#b8aaa7', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(65, 40, 45, 0.35)' },
  pickerModal: { backgroundColor: '#fff', borderRadius: 24, padding: 20 },
  pickerTitle: { textAlign: 'center', fontSize: 19, fontWeight: '800', color: '#6e3c7a', marginBottom: 14 },
  wheelFrame: { height: 240, overflow: 'hidden', position: 'relative' },
  wheelContent: { paddingVertical: 96 },
  wheelSelection: { position: 'absolute', left: 8, right: 8, top: 96, height: 48, borderRadius: 12, backgroundColor: 'rgba(255, 240, 235, 0.55)', borderWidth: 2, borderColor: '#ffb8a5', zIndex: 0 },
  wheelScroll: { zIndex: 1 },
  wheelItem: { height: 48, lineHeight: 48, textAlign: 'center', color: '#b5a5a1', fontSize: 20 },
  wheelItemSelected: { color: '#e05e43', fontWeight: '800', fontSize: 24 },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  pickerCancel: { paddingHorizontal: 16, paddingVertical: 12 },
  pickerCancelText: { color: '#786a78', fontWeight: '700' },
  pickerDone: { backgroundColor: '#ff8e72', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  pickerDoneText: { color: '#fff', fontWeight: '800' },
});
