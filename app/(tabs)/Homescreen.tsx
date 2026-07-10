import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { FC, useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { auth, db } from '../../lib/firebase';

const HomeScreen: FC = () => {

  type Task = {
    id: string;
    text: string;
    done: boolean;
    date: string;
    archived?: boolean;
  };

  const [user, setUser] = useState<any | null>(() => auth.currentUser);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [testDateText, setTestDateText] = useState('');
  const newTaskInputRef = React.useRef<TextInput | null>(null);
  const [previousMessages, setPreviousMessages] = useState([
    { id: 'message-1', text: 'あいうえお', done: false },
    { id: 'message-2', text: 'かきくけこ', done: false },
  ]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      console.log('Homescreen: onAuthStateChanged', { uid: u?.uid ?? null });
      setUser(u);
    });
    return () => unsub();
  }, []);

  // listen to tasks for current user
  useEffect(() => {
    if (!user) {
      return;
    }

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const q = query(tasksRef);
    const unsub = onSnapshot(q, snapshot => {
      const all: Task[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayArr: Task[] = [];
      const pastArr: Task[] = [];
      const archivedArr: Task[] = [];

      all.forEach(t => {
        if (t.archived) {
          archivedArr.push(t);
          return;
        }
        const td = new Date(t.date);
        td.setHours(0, 0, 0, 0);
        if (!t.done && td < today) {
          pastArr.push(t);
        } else if (!t.done && td.getTime() === today.getTime()) {
          todayArr.push(t);
        } else if (t.done && td.getTime() === today.getTime()) {
          todayArr.push(t);
        } else {
          // future or other tasks, treat as today when date matches
          todayArr.push(t);
        }
      });

      setTodayTasks(todayArr);
      setPastTasks(pastArr);
      setArchivedTasks(archivedArr);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTestDateText('');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, snap => {
      const data = snap.data();
      const normalized = normalizeDateField(data?.testDate ?? '');
      console.log('Homescreen: onSnapshot user doc', { uid: user.uid, testDate: data?.testDate, normalized });
      setTestDateText(normalized);
    });

    return () => unsubUser();
  }, [user?.uid]);


  const normalizeDateField = (raw: any) => {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    if ((raw as any)?.toDate && typeof (raw as any).toDate === 'function') {
      try { return (raw as any).toDate().toISOString().slice(0, 10); } catch (e) { return ''; }
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return trimmed;
    }
    if (typeof raw === 'number') {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    try {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch (e) {
      return ''; }
  };


  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setTodayTasks(prev => {
      const stillToday: Task[] = [];
      const moved: Task[] = [];

      prev.forEach(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);

        if (!task.done && taskDate < today) {
          moved.push(task);
        } else {
          stillToday.push(task);
        }
      });

      if (moved.length > 0) {
        setPastTasks(p => [...p, ...moved]);
      }

      return stillToday;
    });
  }, []);

  const [todayTasks, setTodayTasks] = useState<Task[]>([]);

  const [pastTasks, setPastTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);




  const toggleTask = (id: string) => {
    (async () => {
      const all = [...todayTasks, ...pastTasks, ...archivedTasks];
      const target = all.find(t => t.id === id);
      if (!target) return;

      const nextDone = !target.done;

      if (!user) {
        setTodayTasks(prev => prev.map(task => task.id === id ? { ...task, done: nextDone } : task));
        setPastTasks(prev => prev.map(task => task.id === id ? { ...task, done: nextDone } : task));
        setArchivedTasks(prev => prev.map(task => task.id === id ? { ...task, done: nextDone } : task));
        return;
      }

      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      try {
        await updateDoc(taskRef, { done: nextDone });
      } catch (e) {
        console.warn('toggleTask update failed', e);
      }
    })();
  };

  const saveEdit = (id: string) => {
    (async () => {
      const text = editingText.trim();
      if (!text) {
        Alert.alert('入力してください', '編集内容を入力してください。');
        return;
      }

      if (!user) {
        setTodayTasks(prev => prev.map(task => task.id === id ? { ...task, text } : task));
        setPastTasks(prev => prev.map(task => task.id === id ? { ...task, text } : task));
        setArchivedTasks(prev => prev.map(task => task.id === id ? { ...task, text } : task));
        setEditingTaskId(null);
        setEditingText('');
        return;
      }

      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      try {
        await updateDoc(taskRef, { text });
        setEditingTaskId(null);
        setEditingText('');
      } catch (e) {
        console.warn('saveEdit failed', e);
      }
    })();
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditingText('');
  };

  const handleAddTask = async () => {
    console.log('Homescreen: add button pressed', { newTaskText, userPresent: !!user });
    const text = newTaskText.trim();
    if (!text) {
      Alert.alert('入力してください', 'タスク内容を入力してください。');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const newTask = {
      id: `local-${Date.now()}`,
      text,
      done: false,
      date: dateStr,
      archived: false,
    };

    if (!user) {
      setTodayTasks(prev => [...prev, newTask]);
      setNewTaskText('');
      console.log('Homescreen: saved task locally');
      return;
    }

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    try {
      console.log('Homescreen: adding task', text);
      const docRef = await addDoc(tasksRef, {
        text,
        done: false,
        date: dateStr,
        archived: false,
        createdAt: Date.now(),
      });
      setTodayTasks(prev => [...prev, { ...newTask, id: docRef.id }]);
      setNewTaskText('');
      console.log('Homescreen: addTask succeeded');
    } catch (e: unknown) {
      console.warn('addTask failed', e);
      const msg = e instanceof Error ? e.message : 'タスクの追加に失敗しました。';
      Alert.alert('エラー', msg);
    }
  };

  const { width } = useWindowDimensions();
  const isPC = width > 600;
  const isMobile = !isPC;

  type TaskRowProps = {
    task: Task;
    editingTaskId: string | null;
    editingText: string;
    onToggle: (id: string) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
    onStartEdit: (task: Task) => void;
    onSetEditingText: (text: string) => void;
  };

  const TaskRow: FC<TaskRowProps> = ({
    task,
    editingTaskId,
    editingText,
    onToggle,
    onSaveEdit,
    onCancelEdit,
    onStartEdit,
    onSetEditingText,
  }) => {
    const translateY = React.useRef(new Animated.Value(12)).current;
    const opacity = React.useRef(new Animated.Value(0)).current;
    const shouldAnimate = task.done;

    useEffect(() => {
      if (!shouldAnimate) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }, [opacity, translateY, shouldAnimate]);

    const rowContent = (
      <ThemedView style={styles.checklistRow}>
        <TouchableOpacity onPress={() => onToggle(task.id)} style={styles.checkButton}>
          <ThemedText style={styles.checkButtonText}>{task.done ? '☑' : '☐'}</ThemedText>
        </TouchableOpacity>

        {editingTaskId === task.id ? (
          <ThemedView style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.dateInput, { flex: 1, marginRight: 8 }]}
              value={editingText}
              onChangeText={onSetEditingText}
              placeholder="タスクを編集"
            />
            <TouchableOpacity onPress={() => onSaveEdit(task.id)} style={[styles.addButton, { paddingHorizontal: 12 }]}>
              <ThemedText style={styles.addButtonText}>保存</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCancelEdit} style={styles.cancelEditButton}>
              <ThemedText style={styles.cancelEditButtonText}>×</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView style={styles.checklistContent}>
            <ThemedText
              style={[
                styles.bullet,
                styles.checklistText,
                task.done && { textDecorationLine: 'line-through' },
              ]}
            >
              {task.text}
            </ThemedText>

            <TouchableOpacity onPress={() => onStartEdit(task)} style={styles.editButton}>
              <ThemedText style={styles.editButtonText}>編集</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>
    );

    if (!shouldAnimate) {
      return rowContent;
    }

    return (
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
        }}
      >
        {rowContent}
      </Animated.View>
    );
  };

  // 共通レンダリング関数

  const renderTasks = () => (
    <ThemedView style={[styles.section, styles.box]}>
      <ThemedText style={styles.sectionTitle}>今日やること</ThemedText>

      <ThemedView style={styles.inputRow}>
        <ThemedView style={styles.inputWrapper}>
          <TextInput
            ref={newTaskInputRef}
            style={[styles.dateInput, styles.inputField]}
            value={newTaskText}
            onChangeText={setNewTaskText}
            placeholder="新しいタスク"
            placeholderTextColor="#b8b8b8"
            editable={true}
            autoFocus={false}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
        </ThemedView>
        <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
          <ThemedText style={styles.addButtonText}>保存</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {todayTasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          editingTaskId={editingTaskId}
          editingText={editingText}
          onToggle={toggleTask}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onStartEdit={(selectedTask) => {
            setEditingTaskId(selectedTask.id);
            setEditingText(selectedTask.text);
          }}
          onSetEditingText={setEditingText}
        />
      ))}
    </ThemedView>
  );

  const togglePreviousMessage = (id: string) => {
    setPreviousMessages(prev =>
      prev.map(item => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const renderPreviousMessages = () => (
    <ThemedView style={styles.section}>
      <ThemedText style={styles.sectionTitle}>
        引き継ぎ
      </ThemedText>
      {previousMessages.map(item => (
        <ThemedView key={item.id} style={styles.checklistRow}>
          <TouchableOpacity onPress={() => togglePreviousMessage(item.id)} style={styles.checkButton}>
            <ThemedText style={styles.checkButtonText}>{item.done ? '☑' : '☐'}</ThemedText>
          </TouchableOpacity>
          <ThemedText style={[styles.bullet, styles.checklistText, item.done && { textDecorationLine: 'line-through' }]}>
            {item.text}
          </ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );

  const completePastTask = (id: string) => {
    (async () => {
      if (!user) return;
      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      try {
        await updateDoc(taskRef, { archived: true });
      } catch (e) {
        console.warn('completePastTask failed', e);
      }
    })();
  };



  // ====== スマホ表示 ======
  if (isMobile) {
    return (
      <ThemedView style={styles.mobileContainer}>
        <ScrollView style={styles.mobileContent}>
        <ThemedView style={{ alignItems: 'center', marginBottom: 20 }}>
          <ThemedText style={styles.sectionTitle}>次回テスト日</ThemedText>
          <ThemedText style={styles.dateDisplay}>
            {testDateText || '日付が未設定'}
          </ThemedText>
        </ThemedView>

        {renderTasks()}
        {renderPreviousMessages()}
      </ScrollView>
      </ThemedView>
    );
  }

  // ====== PC表示 ======
  return (
    <ThemedView style={styles.pcContainer}>
      <ScrollView style={styles.mainArea}>
        <ThemedView style={[styles.topRow, { alignItems: 'center' }]}> 
          <ThemedView>
            <ThemedText style={styles.sectionTitle}>次回テスト日</ThemedText>
            <ThemedText style={styles.dateDisplay}>
              {testDateText || '日付が未設定'}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={{ height: 30 }} />

        <ThemedView style={styles.twoColumns}>
          <ThemedView style={styles.column}>{renderPreviousMessages()}</ThemedView>
          <ThemedView style={styles.column}>{renderTasks()}</ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};



export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  mobileContainer: {
    flex: 1,
    position: 'relative',
  },

  mobileContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  mobileHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e2ff',
    zIndex: 10,
  },

  hamburgerIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#aaacf5ff',
  },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 50,
    bottom: 0,
    width: 250,
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 12,
    zIndex: 100,
    shadowColor: '#d6d8ff',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    zIndex: 50,
    pointerEvents: 'none',
  },

  sidebarOverlayActive: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 90,
  },

  dateDisplay: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: 180,
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '700',
  },

  menuRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  menuButton: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#aaacf5ff',
    borderRadius: 20,
    marginBottom: 10,
    minWidth: '30%',
    alignItems: 'center',
    shadowColor: '#d6d8ff',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },

  menuText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  cancelEditButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0ebff',
  },

  cancelEditButtonText: {
    color: '#8b7bd8',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },

  dateInput: {
    borderWidth: 1,
    borderColor: '#e8e2ff',
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 160,
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
  },

  daysLeft: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#6e3c7a',
  },

  section: { marginBottom: 20 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#aaacf5ff' },

  goalText: { fontSize: 16, color: '#aaacf5ff' },

  bullet: { fontSize: 16, marginBottom: 0, color: '#aaacf5ff' },

  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 28,
  },

  checkButton: {
    width: 24,
    height: 24,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkButtonText: {
    fontSize: 18,
    lineHeight: 18,
  },

  checklistContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  checklistText: {
    flex: 1,
    marginBottom: 0,
  },

  editButton: {
    marginLeft: 8,
    paddingVertical: 2,
  },

  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  inputWrapper: {
    flex: 1,
    marginRight: 8,
  },

  inputField: {
    flex: 1,
    marginBottom: 0,
    width: '100%',
  },

  addButton: {
    backgroundColor: '#aaacf5ff',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#d6d8ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },

  addButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  box: {
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 20,
    padding: 16,
  },

  pcContainer: { flex: 1, flexDirection: 'row' },

  sideMenu: {
    width: 200,
    padding: 16,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },

  mainArea: {
    flex: 1,
    padding: 16,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 30,
    marginTop: 40,
  },

  goalSection: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },

  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  column: { flex: 1, marginRight: 8 },

  saveButton: {
    marginLeft: 8,
    backgroundColor: '#aaacf5ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
