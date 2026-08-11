import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { getAllRecords, getRecordsByDate, type StudyRecord } from '../../lib/recordStore';

type Task = { id: string; text: string; date: string; done: boolean; archived?: boolean };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function CalendarScreen() {
  type CalendarEvent = {
    id: string;
    title: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    memo?: string;
    type: 'テスト' | '模試' | '学校' | 'その他';
  };
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [testDate, setTestDate] = useState('');
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allRecords, setAllRecords] = useState<StudyRecord[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<any>(auth.currentUser);
  const [newTask, setNewTask] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventMemo, setEventMemo] = useState('');
  const [eventStartDate, setEventStartDate] = useState(selectedDate);
  const [eventEndDate, setEventEndDate] = useState(selectedDate);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventType, setEventType] =
    useState<'テスト' | '模試' | '学校' | 'その他'>('テスト');
  const webInputRef = useRef<HTMLInputElement | null>(null);


  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), snap => setTestDate(snap.data()?.testDate || ''));
  }, [user]);
  useEffect(() => {
    getAllRecords().then(setAllRecords).catch(() => setAllRecords([]));
  }, [user]);
  useEffect(() => {
    getRecordsByDate(selectedDate).then(setRecords).catch(() => setRecords([]));
    if (!user) { setTasks([]); return; }
    getDocs(collection(db, 'users', user.uid, 'tasks')).then(snapshot => {
      const savedTasks = snapshot.docs.map
        (item => ({ id: item.id, ...item.data() } as Task)).filter(task => !task.archived); setAllTasks(savedTasks); setTasks(savedTasks.filter(task => task.date === selectedDate));
    }
    );

    const today = dateKey(new Date());
    const isFuture = selectedDate > today;
  }, [selectedDate, user]);


  useEffect(() => {
    if (!user) return;

    const loadEvents = async () => {
      const snapshot = await getDocs(
        collection(db, 'users', user.uid, 'events')
      );

      const savedEvents: CalendarEvent[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<CalendarEvent, 'id'>),
      }));

      setAllEvents(savedEvents);
      setEvents(savedEvents.filter((event) => {
        const start = event.startDate || event.date || selectedDate;
        const end = event.endDate || start;
        return selectedDate >= start && selectedDate <= end;
      }));
    };

    loadEvents();

  }, [user, selectedDate]);

  const today = dateKey(new Date());
  const isFuture = selectedDate > today;


  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [month]);
  const changeMonth = (amount: number) => setMonth(value => new Date(value.getFullYear(), value.getMonth() + amount, 1));

  const saveTask = async () => {
    if (!user) return;
    if (!newTask.trim()) return;

    await addDoc(
      collection(db, 'users', user.uid, 'tasks'),
      {
        text: newTask,
        date: selectedDate,
        done: false,
        archived: false,
      }
    );

    setNewTask('');
    setShowInput(false);

    const snapshot = await getDocs(
      collection(db, 'users', user.uid, 'tasks')
    );

    const savedTasks = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Task))
      .filter(task => !task.archived);

    setAllTasks(savedTasks);
    setTasks(savedTasks.filter(task => task.date === selectedDate));
  };

  const openEventModal = () => {
    setEventTitle('');
    setEventMemo('');
    setEventStartDate(selectedDate);
    setEventEndDate(selectedDate);
    setPickerTarget(null);
    setModalVisible(true);
  };

  const openDatePicker = (target: 'start' | 'end') => {
    const baseDate = target === 'start' ? eventStartDate : eventEndDate;
    setPickerTarget(target);

    if (Platform.OS === 'web') {
      webInputRef.current?.showPicker?.();
      webInputRef.current?.focus();
      return;
    }

    const parsed = new Date(`${baseDate || selectedDate}T12:00:00`);
    setDatePickerValue(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
    setShowDatePicker(true);
  };

  const onSelectDate = (_event: any, date?: Date) => {
    setShowDatePicker(false);
    if (!date || !pickerTarget) return;

    const value = dateKey(date);
    if (pickerTarget === 'start') {
      setEventStartDate(current => {
        const nextStart = value;
        setEventEndDate(currentEnd => (currentEnd < nextStart ? nextStart : currentEnd));
        return nextStart;
      });
    } else {
      setEventEndDate(current => {
        const nextEnd = value;
        setEventStartDate(currentStart => (currentStart > nextEnd ? nextEnd : currentStart));
        return nextEnd;
      });
    }
    setPickerTarget(null);
  };

  const onWebDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value || !pickerTarget) return;

    if (pickerTarget === 'start') {
      setEventStartDate(value);
      if (eventEndDate < value) {
        setEventEndDate(value);
      }
    } else {
      setEventEndDate(value);
      if (eventStartDate > value) {
        setEventStartDate(value);
      }
    }

    setPickerTarget(null);
  };

  const saveEvent = async () => {
    if (!user) return;

    const title = eventTitle.trim();
    const memo = eventMemo.trim();

    if (!title) {
      Alert.alert('入力不足', '予定名を入力してください');
      return;
    }

    const startDate = eventStartDate || selectedDate;
    const endDate = eventEndDate || startDate;

    if (endDate < startDate) {
      Alert.alert('入力不足', '開始日を終わり日より前にしてください');
      return;
    }

    await addDoc(collection(db, 'users', user.uid, 'events'), {
      title,
      startDate,
      endDate,
      date: startDate,
      type: 'その他',
      memo,
      createdAt: new Date().toISOString(),
    });

    setModalVisible(false);
    setEventTitle('');
    setEventMemo('');
    setEventStartDate(selectedDate);
    setEventEndDate(selectedDate);

    const snapshot = await getDocs(collection(db, 'users', user.uid, 'events'));
    const savedEvents: CalendarEvent[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<CalendarEvent, 'id'>),
    }));
    setAllEvents(savedEvents);
    setEvents(savedEvents.filter((event) => {
      const start = event.startDate || event.date || selectedDate;
      const end = event.endDate || start;
      return selectedDate >= start && selectedDate <= end;
    }));
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.monthRow}>
      <TouchableOpacity onPress={() => changeMonth(-1)}><ThemedText style={styles.monthButton}>‹</ThemedText></TouchableOpacity>
      <ThemedText style={styles.title}>{month.getFullYear()}年 {month.getMonth() + 1}月</ThemedText>
      <TouchableOpacity onPress={() => changeMonth(1)}><ThemedText style={styles.monthButton}>›</ThemedText></TouchableOpacity>
    </View>
    <View style={styles.weekRow}>{['日', '月', '火', '水', '木', '金', '土'].map(day => <ThemedText key={day} style={styles.weekday}>{day}</ThemedText>)}</View>
    <View style={styles.grid}>{days.map(day => {
      const key = dateKey(day); const isCurrentMonth = day.getMonth() === month.getMonth(); const isTest = key === testDate;
      const isToday = key === dateKey(new Date());
      const hasRecord = allRecords.some(record => record.date === key); const dayTasks = allTasks.filter(task => task.date === key);
      return <TouchableOpacity key={key} style={[
  styles.day,
  !isCurrentMonth && styles.otherMonth,
  isToday && styles.todayDayPink,
  key === selectedDate && styles.selectedDay,
]}onPress={() => setSelectedDate(key)}>

   <ThemedText style={styles.dayNumber}>
    {day.getDate()}
  </ThemedText>
        {isTest && <ThemedText style={styles.testBadge}>テスト</ThemedText>}
        {hasRecord && <ThemedText style={styles.recordBadge}>記録</ThemedText>}
        {dayTasks.length > 0 && <ThemedText style={styles.taskBadge}>{dayTasks.filter(task => task.done).length}/{dayTasks.length} 完了</ThemedText>}
      </TouchableOpacity>;
    })}</View>
    <View style={styles.detailBox}>




      <TouchableOpacity
        style={styles.addButton}
        onPress={openEventModal}
      >
        <ThemedText style={styles.addButtonText}>
          ＋予定を追加
        </ThemedText>
      </TouchableOpacity>

      <ThemedText style={styles.sectionTitle}>
        予定
      </ThemedText>

      {events.length === 0 ? (
        <ThemedText style={styles.empty}>
          予定はありません
        </ThemedText>
      ) : (
        events.map(event => (
          <ThemedText
            key={event.id}
            style={styles.item}
          >
            {event.type}：{event.title}
          </ThemedText>
        ))
      )}


      <ThemedText style={styles.detailTitle}>
        {selectedDate}
      </ThemedText>
      {selectedDate === testDate && <TouchableOpacity style={styles.testLink} onPress={() => router.push('/testrecord')}><ThemedText style={styles.testLinkText}>テスト予定を見る</ThemedText></TouchableOpacity>}

      {!isFuture && (
        <>
          <ThemedText style={styles.sectionTitle}>できたこと</ThemedText>

          {records.length === 0 && tasks.filter(task => task.done).length === 0 ? (
            <ThemedText style={styles.empty}>記録なし</ThemedText>
          ) : (
            <>
              {records.map(record => (
                <ThemedText key={record.id} style={styles.item}>
                  ・{record.subject}：{record.content}
                </ThemedText>
              ))}

              {tasks
                .filter(task => task.done)
                .map(task => (
                  <ThemedText key={task.id} style={styles.item}>
                    ✓ {task.text}
                  </ThemedText>
                ))}
            </>
          )}

          <ThemedText style={styles.sectionTitle}>できなかったこと</ThemedText>

          {tasks.filter(task => !task.done).length === 0 ? (
            <ThemedText style={styles.empty}>なし</ThemedText>
          ) : (
            tasks
              .filter(task => !task.done)
              .map(task => (
                <ThemedText key={task.id} style={styles.item}>
                  ・{task.text}
                </ThemedText>
              ))
          )}
        </>
      )}
    </View>

    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ThemedText style={styles.modalTitle}>予定を追加</ThemedText>

          <ThemedText style={styles.fieldLabel}>開始日</ThemedText>
          <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('start')}>
            <ThemedText style={styles.dateButtonText}>{eventStartDate || '開始日を選択'}</ThemedText>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <input
              ref={webInputRef}
              type="date"
              onChange={onWebDateChange}
              style={{ display: 'none' }}
            />
          )}

          <ThemedText style={styles.fieldLabel}>終了日</ThemedText>
          <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('end')}>
            <ThemedText style={styles.dateButtonText}>{eventEndDate || '終了日を選択'}</ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.fieldLabel}>予定名</ThemedText>
          <TextInput
            style={styles.input}
            value={eventTitle}
            onChangeText={setEventTitle}
            placeholder="例: 期末テスト"
            placeholderTextColor="#999"
          />

          <ThemedText style={styles.fieldLabel}>メモ</ThemedText>
          <TextInput
            style={[styles.input, styles.memoInput]}
            value={eventMemo}
            onChangeText={setEventMemo}
            placeholder="メモを入力"
            placeholderTextColor="#999"
            multiline
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <ThemedText style={styles.cancelButtonText}>キャンセル</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveEvent}>
              <ThemedText style={styles.saveButtonText}>保存</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {showDatePicker && (
      <View style={styles.pickerOverlay} pointerEvents="box-none">
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
            onChange={onSelectDate}
            style={styles.dateTimePicker}
          />
        </View>
      </View>
    )}
  </ScrollView>;
}



const styles = StyleSheet.create({
  addButton: {
    backgroundColor: '#6C7BFA',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  pickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.15)',
    zIndex: 10,
  },
  pickerContainer: {
    width: '92%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimePicker: {
    width: '100%',
    minWidth: 320,
    maxWidth: 360,
    backgroundColor: '#fff',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 12,
  },

  // ===== ヘッダー =====
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#554a8e',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#554a8e',
    marginBottom: 12,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#554a8e',
    marginTop: 10,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: '#d8d1f7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },

  dateButton: {
    borderWidth: 1,
    borderColor: '#d8d1f7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },

  dateButtonText: {
    color: '#554a8e',
    fontSize: 15,
    fontWeight: '600',
  },

  memoInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 10,
  },

  cancelButton: {
    backgroundColor: '#f0ecff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  cancelButtonText: {
    color: '#554a8e',
    fontWeight: '700',
  },

  saveButton: {
    backgroundColor: '#6C7BFA',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  monthButton: {
    fontSize: 36,
    color: '#6C7BFA',
    paddingHorizontal: 12,
  },

  // ===== 曜日 =====
  weekRow: {
    flexDirection: 'row',
  },

  weekday: {
    width: '14.285%',
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: 8,
    color: '#777',
  },

  // ===== カレンダー =====
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#e7e1fa',
  },

  day: {
    width: '14.285%',
    height: 82,
    padding: 6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e7e1fa',
    backgroundColor: '#fff',
    position: 'relative',
  },

  otherMonth: {
    backgroundColor: '#fafafa',
    opacity: 0.45,
  },

  selectedDay: {
    backgroundColor: '#eeeaff',
  },

  // ===== バッジ =====
  testBadge: {
    color: '#fff',
    backgroundColor: '#ff8e72',
    borderRadius: 7,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
    paddingVertical: 2,
  },

  recordBadge: {
    color: '#fff',
    backgroundColor: '#6C7BFA',
    borderRadius: 7,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 3,
    paddingVertical: 2,
  },

  taskBadge: {
    color: '#554a8e',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 3,
  },

  // ===== 詳細エリア =====
  detailBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#faf8ff',
  },

  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },

  sectionTitle: {
    fontWeight: '800',
    color: '#554a8e',
    marginTop: 14,
    marginBottom: 6,
  },

  item: {
    paddingVertical: 3,
  },

  empty: {
    color: '#888',
  },

  // ===== テスト画面へのリンク =====
  testLink: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff8e72',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  testLinkText: {
    color: '#fff',
    fontWeight: '700',
  },


dayNumberWrapper: {
  width: 24,
  height: 24,
  position: 'relative',
},

todayDayRed: {
  backgroundColor: '#FFEAEA', // 薄い赤
},
todayDayPink: {
  backgroundColor: '#FFF2F2',
},
dayNumber: {
  fontWeight: '700',
},
});