import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { getAllRecords, getRecordsByDate, type StudyRecord } from '../../lib/recordStore';

type Task = { id: string; text: string; date: string; done: boolean; archived?: boolean };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function CalendarScreen() {
  type CalendarEvent = {
    id: string;
    title: string;
    date: string;
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
  const [eventType, setEventType] =
    useState<'テスト' | '模試' | '学校' | 'その他'>('テスト');


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
      setEvents(savedEvents.filter((event) => event.date === selectedDate));
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

        onPress={() =>
          setModalVisible(true)
        }
      >
        <ThemedText style={styles.addButtonText}>
          ＋ この日に予定を追加
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowInput(!showInput)}
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
      <ThemedText style={styles.detailTitle}>{selectedDate}</ThemedText>
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