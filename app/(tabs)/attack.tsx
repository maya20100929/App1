import { ThemedText } from '@/components/themed-text';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const toRecordedMinutes = (elapsedSeconds: number) => {
  if (elapsedSeconds < 60) return 1;
  const wholeMinutes = Math.floor(elapsedSeconds / 60);
  return wholeMinutes + (elapsedSeconds % 60 >= 30 ? 1 : 0);
};

export default function AttackScreen() {
  const [seconds, setSeconds] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [draftMinutes, setDraftMinutes] = useState(25);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [goal, setGoal] = useState('');
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isCompletionVisible, setIsCompletionVisible] = useState(false);
  const [completedDurationMinutes, setCompletedDurationMinutes] = useState(0);
  const hasFinishedRef = useRef(false);
  const completionScale = useRef(new Animated.Value(0.6)).current;
  const minuteOptions = Array.from({ length: 180 }, (_, index) => index + 1);

  const showCompletion = useCallback((durationMinutes: number) => {
    setCompletedDurationMinutes(durationMinutes);
    setIsCompletionVisible(true);
    completionScale.setValue(0.6);
    Animated.sequence([
      Animated.spring(completionScale, { toValue: 1.12, useNativeDriver: true, friction: 5 }),
      Animated.timing(completionScale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [completionScale]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds(value => {
      if (value <= 1) {
        setIsRunning(false);
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          showCompletion(minutes);
        }
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(interval);
  }, [isRunning, minutes, showCompletion]);

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
          <TouchableOpacity style={styles.endButton} onPress={() => {
            const elapsedMinutes = toRecordedMinutes(minutes * 60 - seconds);
            hasFinishedRef.current = true;
            setIsRunning(false);
            showCompletion(elapsedMinutes);
          }}>
            <ThemedText style={styles.endButtonText}>終了</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={() => { hasFinishedRef.current = false; setIsRunning(false); setSeconds(0); setIsConfigured(false); }}>
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
              <TouchableOpacity style={styles.pickerDone} onPress={() => { hasFinishedRef.current = false; setMinutes(draftMinutes); setSeconds(draftMinutes * 60); setIsConfigured(true); setIsRunning(true); setIsPickerVisible(false); }}><ThemedText style={styles.pickerDoneText}>決定して開始</ThemedText></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {isCompletionVisible && (
        <TouchableOpacity
          style={styles.completionOverlay}
          activeOpacity={0.9}
          onPress={() => router.push({
            pathname: '/Homescreen',
            params: {
              attack: '1',
              attackGoal: goal.trim() || 'タイムアタック',
              attackDuration: String(completedDurationMinutes),
            },
          })}
        >
          <Animated.View style={[styles.completionBadge, { transform: [{ scale: completionScale }] }]}>
            <ThemedText style={styles.completionText}>終了！</ThemedText>
            <ThemedText style={styles.completionHint}>タップして記録する</ThemedText>
          </Animated.View>
        </TouchableOpacity>
      )}
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
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  endButton: { backgroundColor: '#ff8e72', borderRadius: 16, paddingVertical: 11, paddingHorizontal: 24 },
  endButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
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
  completionOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 248, 245, 0.72)', zIndex: 10 },
  completionBadge: { backgroundColor: '#ff8e72', borderRadius: 32, paddingVertical: 28, paddingHorizontal: 42, shadowColor: '#b14f3a', shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  completionText: { color: '#fff', fontSize: 38, fontWeight: '900' },
  completionHint: { color: '#fff', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
