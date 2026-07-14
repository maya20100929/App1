import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { FC, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Task = {
  id: string;
  text: string;
  done: boolean;
  reminderAt?: string;
  completedAt?: string;
};

const formatDateTime = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${y}/${m}/${d} ${h}:${min}`;
};

const toDateTimeLocalValue = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d}T${h}:${min}`;
};


const NotificationScreen: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  /* ===== 追加用 ===== */
  const [newText, setNewText] = useState('');
  const [newTime, setNewTime] = useState('');

  /* ===== 編集用 ===== */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTime, setEditTime] = useState('');

  /* ===== Mobile DateTimePicker ===== */
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] =
    useState<'new' | 'edit' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const webInputRef = useRef<HTMLInputElement | null>(null);

  /* ===== 追加 ===== */
  const addTask = () => {
    if (!newText || !newTime) return;

    setTasks(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: newText,
        reminderAt: newTime,
        done: false,
      },
    ]);

    setNewText('');
    setNewTime('');
  };

  /* ===== 編集 ===== */
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditTime(task.reminderAt ?? '');
  };

  const saveEdit = () => {
    if (!editingId) return;

    setTasks(prev =>
      prev.map(t =>
        t.id === editingId
          ? { ...t, text: editText, reminderAt: editTime }
          : t
      )
    );

    setEditingId(null);
    setEditText('');
    setEditTime('');
  };

  /* ===== Mobile Picker ===== */
  const openDatePicker = (target: 'new' | 'edit') => {
    setPickerTarget(target);

    if (Platform.OS === 'web') {
      webInputRef.current?.showPicker?.();
      webInputRef.current?.focus();
      return;
    }

    setShowDatePicker(true);
  };

  const onSelectDate = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (!date) return;

    setSelectedDate(date);
    setShowTimePicker(true);
  };

  const onSelectTime = (_: any, time?: Date) => {
    setShowTimePicker(false);
    if (!time || !selectedDate || !pickerTarget) return;

    const finalDate = new Date(selectedDate);
    finalDate.setHours(time.getHours(), time.getMinutes(), 0, 0);

    const value = formatDateTime(finalDate);
    pickerTarget === 'new' ? setNewTime(value) : setEditTime(value);
    setPickerTarget(null);
  };

  const onWebDateTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value || !pickerTarget) return;

    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    const parsedDate = new Date(year, month - 1, day, hour, minute);
    const formattedValue = formatDateTime(parsedDate);

    if (pickerTarget === 'new') {
      setNewTime(formattedValue);
    } else {
      setEditTime(formattedValue);
    }

    setPickerTarget(null);
  };

  /* ===== 完了・削除 ===== */
  const completeTask = (id: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              done: true,
              reminderAt: undefined,
              completedAt: new Date().toLocaleString(),
            }
          : t
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const notificationTasks = tasks.filter(t => !t.done && t.reminderAt);
  const historyTasks = tasks.filter(t => t.done);

  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>通知予定</ThemedText>

      {/* ===== 追加 ===== */}
      <View style={styles.addBox}>
        <TextInput
          style={styles.input}
          placeholder="やること"
          placeholderTextColor="#a8a8a8"
          value={newText}
          onChangeText={setNewText}
        />

        {/* ===== 日時入力 ===== */}
        <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('new')}>
          <View style={styles.dateButtonContent}>
            <Ionicons name="calendar-outline" size={18} color="#aaacf5ff" />
            <ThemedText style={styles.dateButtonText}>{newTime || '日時を選択'}</ThemedText>
          </View>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <input
            ref={webInputRef}
            type="datetime-local"
            onChange={onWebDateTimeChange}
            style={styles.webPickerInput}
          />
        )}

        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <ThemedText style={styles.buttonText}>追加</ThemedText>
        </TouchableOpacity>
      </View>

      {/* ===== 一覧 ===== */}
      {notificationTasks.map(task => (
        <View key={task.id} style={styles.card}>
          {editingId === task.id ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="やること"
                placeholderTextColor="#a8a8a8"
                value={editText}
                onChangeText={setEditText}
              />

              <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('edit')}>
                <View style={styles.dateButtonContent}>
                  <Ionicons name="calendar-outline" size={18} color="#aaacf5ff" />
                  <ThemedText style={styles.dateButtonText}>{editTime || '日時を選択'}</ThemedText>
                </View>
              </TouchableOpacity>
              {Platform.OS === 'web' && (
                <input
                  ref={webInputRef}
                  type="datetime-local"
                  onChange={onWebDateTimeChange}
                  style={styles.webPickerInput}
                />
              )}
            </>
          ) : (
            <>
              <ThemedText style={styles.taskText}>{task.text}</ThemedText>
              <ThemedText style={styles.timeText}>{task.reminderAt}</ThemedText>
            </>
          )}

          <View style={styles.buttons}>
            {editingId === task.id ? (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={saveEdit}
              >
                <ThemedText style={styles.buttonText}>保存</ThemedText>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => startEdit(task)}
                >
                  <ThemedText style={styles.buttonText}>編集</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => completeTask(task.id)}
                >
                  <ThemedText style={styles.buttonText}>完了</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteTask(task.id)}
                >
                  <ThemedText style={styles.buttonText}>削除</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}

      <ThemedText style={[styles.title, styles.historyTitle]}>履歴</ThemedText>

      {historyTasks.map(task => (
        <View key={task.id} style={styles.historyCard}>
          <ThemedText style={styles.taskText}>{task.text}</ThemedText>
          <ThemedText style={styles.timeText}>完了：{task.completedAt}</ThemedText>
        </View>
      ))}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate ?? new Date()}
          mode="date"
          onChange={onSelectDate}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          onChange={onSelectTime}
        />
      )}
    </ScrollView>
  );
};

export default NotificationScreen;

/* ===== styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#aaacf5ff' },
  historyTitle: { marginTop: 20, marginBottom: 12 },
  addBox: { borderWidth: 1, borderColor: '#aaacf5ff', padding: 14, borderRadius: 18, backgroundColor: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: 'rgb(236, 237, 255)',
    padding: 10,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#f4f1fa',
    fontFamily: Fonts.rounded,
    color: '#aaaf5ff',
  },

  dateButton: {
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: {
    color: '#aaacf5ff',
    fontFamily: Fonts.rounded,
  },
  webPickerInput: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
    width: 1,
    height: 1,
  },

  addButton: { backgroundColor: '#aaacf5ff', padding: 12, borderRadius: 18, alignItems: 'center' },
  card: { borderWidth: 1, borderColor: '#aaacf5ff', padding: 14, borderRadius: 18, marginBottom: 14, backgroundColor: '#fff' },
  historyCard: { borderWidth: 1, borderColor: '#aaacf5ff', padding: 14, borderRadius: 18, marginBottom: 14, backgroundColor: '#fff' },
  taskText: { fontSize: 16, fontWeight: 'bold', color: '#aaacf5ff' },
  timeText: { color: '#aaacf5ff' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  editButton: { backgroundColor: '#aaacf5ff', padding: 8, borderRadius: 16 },
  doneButton: { backgroundColor: '#aaacf5ff', padding: 8, borderRadius: 16 },
  deleteButton: { backgroundColor: '#aaacf5ff', padding: 8, borderRadius: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  back: { marginTop: 20, textAlign: 'center', color: '#aaacf5ff' },
});
