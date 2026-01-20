import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { FC, useState } from 'react';
import { Platform } from 'react-native';

import {
    ScrollView,
    StyleSheet,
    Text,
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

    const value = finalDate.toLocaleString();
    pickerTarget === 'new' ? setNewTime(value) : setEditTime(value);
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
      <Text style={styles.title}>通知予定</Text>

      {/* ===== 追加 ===== */}
      <View style={styles.addBox}>
        <TextInput
          style={styles.input}
          placeholder="やること"
          value={newText}
          onChangeText={setNewText}
        />

        {/* ===== 日時入力 ===== */}
        {Platform.OS === 'web' ? (
          <View style={styles.webInputWrapper}>
            <input
              type="datetime-local"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              style={webInput}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              setPickerTarget('new');
              setShowDatePicker(true);
            }}
          >
            <Text>{newTime || '日時を選択'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Text style={styles.buttonText}>追加</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 一覧 ===== */}
      {notificationTasks.map(task => (
        <View key={task.id} style={styles.card}>
          {editingId === task.id ? (
            <>
              <TextInput
                style={styles.input}
                value={editText}
                onChangeText={setEditText}
              />

              {Platform.OS === 'web' ? (
                <View style={styles.webInputWrapper}>
                  <input
                    type="datetime-local"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    style={webInput}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => {
                    setPickerTarget('edit');
                    setShowDatePicker(true);
                  }}
                >
                  <Text>{editTime || '日時を選択'}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.taskText}>{task.text}</Text>
              <Text style={styles.timeText}>{task.reminderAt}</Text>
            </>
          )}

          <View style={styles.buttons}>
            {editingId === task.id ? (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={saveEdit}
              >
                <Text style={styles.buttonText}>保存</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => startEdit(task)}
                >
                  <Text style={styles.buttonText}>編集</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => completeTask(task.id)}
                >
                  <Text style={styles.buttonText}>完了</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteTask(task.id)}
                >
                  <Text style={styles.buttonText}>削除</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}

      <Text style={styles.title}>履歴</Text>

      {historyTasks.map(task => (
        <View key={task.id} style={styles.historyCard}>
          <Text style={styles.taskText}>{task.text}</Text>
          <Text style={styles.timeText}>完了：{task.completedAt}</Text>
        </View>
      ))}

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>戻る</Text>
      </TouchableOpacity>

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

/* ===== Web input 中身 ===== */
const webInput: React.CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  fontSize: 16,
  backgroundColor: 'transparent',
};

/* ===== styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  addBox: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 8 },

  webInputWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  addButton: { backgroundColor: '#3f51b5', padding: 10, borderRadius: 6, alignItems: 'center' },
  card: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 12 },
  historyCard: { borderWidth: 1, borderColor: '#bbb', padding: 12, borderRadius: 8, marginBottom: 12 },
  taskText: { fontSize: 16, fontWeight: 'bold' },
  timeText: { color: '#555' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  editButton: { backgroundColor: '#ff9800', padding: 6, borderRadius: 6 },
  doneButton: { backgroundColor: '#4caf50', padding: 6, borderRadius: 6 },
  deleteButton: { backgroundColor: '#f44336', padding: 6, borderRadius: 6 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  back: { marginTop: 20, textAlign: 'center', color: '#3f51b5' },
});
