import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { auth, db } from '../../lib/firebase';

type Subject = '数学' | '国語' | '理科' | '社会' | '英語';
const subjects: Subject[] = ['数学', '国語', '理科', '社会', '英語'];

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

type SubjectData = {
  memoText: string;
  todos: Todo[];
};

export default function TestOverviewScreen() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('数学');
  const [isEditMode, setIsEditMode] = useState(false);

  /* ===== テスト日付 ===== */
  const [testDateText, setTestDateText] = useState('2025-12-10');
  const [goalText, setGoalText] = useState('');
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
    });
    return () => unsubAuth();
  }, []);

  // normalize incoming date values (string | Timestamp | Date)
  const normalizeDateField = (raw: any) => {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    if (raw instanceof Timestamp) return raw.toDate().toISOString().slice(0, 10);
    if (typeof raw === 'string') return raw;
    // fallback
    try {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, snap => {
      const data = snap.data();
      if (data) {
        if (data.testDate !== undefined) setTestDateText(normalizeDateField(data.testDate));
        if (data.testGoal !== undefined) setGoalText(data.testGoal);
      }
    });
    return () => unsub();
  }, [user]);

  const isValidYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  const saveTestInfo = async () => {
    if (!user) {
      Alert.alert('ログインが必要', 'テスト情報を保存するにはログインしてください。');
      return;
    }

    if (testDateText && !isValidYMD(testDateText)) {
      Alert.alert('日付形式が不正です', '日付は YYYY-MM-DD 形式で入力してください');
      return;
    }

    try {
      // store as normalized YYYY-MM-DD string, but don't overwrite existing fields when empty
      const payload: any = {};
      if (goalText && goalText.trim() !== '') payload.testGoal = goalText;
      if (testDateText) payload.testDate = testDateText;
      console.log('testrecord: saving user doc', JSON.stringify(payload));
      if (Object.keys(payload).length === 0) {
        Alert.alert('保存する内容がありません');
        return;
      }
      await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
      const snap = await getDoc(doc(db, 'users', user.uid));
      console.log('testrecord: saved doc snapshot', JSON.stringify(snap.data()));
      console.log('testrecord: save succeeded');
      Alert.alert('保存しました');
    } catch (e) {
      console.warn('saveTestInfo failed', e);
      Alert.alert('保存に失敗しました');
    }
  };

  const deleteTestInfo = () => {
    if (!user) {
      Alert.alert('ログインが必要', 'テスト情報を削除するにはログインしてください。');
      return;
    }
    Alert.alert('削除', 'テスト情報を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await setDoc(doc(db, 'users', user.uid), { testDate: '', testGoal: '' }, { merge: true });
            setTestDateText('');
            setGoalText('');
          } catch (e) {
            console.warn('deleteTestInfo failed', e);
          }
        },
      },
    ]);
  };

  const testDate = useMemo(() => {
    const d = new Date(testDateText);
    return isNaN(d.getTime()) ? null : d;
  }, [testDateText]);

  const daysLeft = useMemo(() => {
    if (!testDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    testDate.setHours(0, 0, 0, 0);
    const diff =
      (testDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
  }, [testDate]);

  const [subjectData, setSubjectData] = useState<Record<Subject, SubjectData>>({
    数学: { memoText: '', todos: [] },
    国語: { memoText: '', todos: [] },
    理科: { memoText: '', todos: [] },
    社会: { memoText: '', todos: [] },
    英語: { memoText: '', todos: [] },
  });

  const { width } = useWindowDimensions();
  const isMobile = width <= 600;

  const current = subjectData[selectedSubject];

  /* ===== 進捗 ===== */
  const totalTasks = current.todos.length;
  const doneTasks = current.todos.filter(t => t.done).length;
  const progressPercent = useMemo(() => {
    if (totalTasks === 0) return 0;
    return Math.round((doneTasks / totalTasks) * 100);
  }, [totalTasks, doneTasks]);

  /* ===== Todo操作 ===== */
  const addTodo = () => {
    setSubjectData(prev => ({
      ...prev,
      [selectedSubject]: {
        ...prev[selectedSubject],
        todos: [
          ...prev[selectedSubject].todos,
          { id: Date.now().toString(), text: '', done: false },
        ],
      },
    }));
  };

  const toggleTodo = (id: string) => {
    if (isEditMode) return;
    setSubjectData(prev => ({
      ...prev,
      [selectedSubject]: {
        ...prev[selectedSubject],
        todos: prev[selectedSubject].todos.map(t =>
          t.id === id ? { ...t, done: !t.done } : t
        ),
      },
    }));
  };

  const updateTodoText = (id: string, text: string) => {
    setSubjectData(prev => ({
      ...prev,
      [selectedSubject]: {
        ...prev[selectedSubject],
        todos: prev[selectedSubject].todos.map(t =>
          t.id === id ? { ...t, text } : t
        ),
      },
    }));
  };

  const deleteTodo = (id: string) => {
    setSubjectData(prev => ({
      ...prev,
      [selectedSubject]: {
        ...prev[selectedSubject],
        todos: prev[selectedSubject].todos.filter(t => t.id !== id),
      },
    }));
  };

  const moveTodo = (index: number, dir: 'up' | 'down') => {
    setSubjectData(prev => {
      const todos = [...prev[selectedSubject].todos];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= todos.length) return prev;
      [todos[index], todos[target]] = [todos[target], todos[index]];
      return {
        ...prev,
        [selectedSubject]: { ...prev[selectedSubject], todos },
      };
    });
  };

  return (
    <View style={styles.container}>
      {/* 上段 */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View style={isMobile ? styles.fullWidth : undefined}>
          <Text style={styles.testTitle}>次のテスト</Text>

          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              value={testDateText}
              onChangeText={setTestDateText}
              placeholder="YYYY-MM-DD"
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveTestInfo}>
              <Text style={styles.buttonText}>保存</Text>
            </TouchableOpacity>
            {daysLeft !== null && (
              <Text style={styles.daysLeft}>
                残り <Text style={styles.daysLeftNumber}>{daysLeft}</Text> 日
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.goalBox, isMobile && styles.goalBoxMobile]}>
          <Text style={styles.goalLabel}>目標</Text>
          <TextInput
            style={styles.goalInput}
            multiline
            placeholder="今回のテストの目標"
            value={goalText}
            onChangeText={setGoalText}
          />
          <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: 'flex-end' }}>
            <TouchableOpacity style={[styles.addButton, { paddingHorizontal: 12 }]} onPress={saveTestInfo}>
              <Text style={styles.buttonText}>保存</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { paddingHorizontal: 12, marginLeft: 8 }]} onPress={deleteTestInfo}>
              <Text style={styles.buttonText}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 教科 + ボタン */}
      <View style={[styles.subjectRow, isMobile && styles.subjectRowMobile]}>
        <View style={styles.subjectTabs}>
          {subjects.map(sub => (
            <TouchableOpacity
              key={sub}
              style={[
                styles.subjectTab,
                selectedSubject === sub && styles.subjectTabActive,
              ]}
              onPress={() => setSelectedSubject(sub)}
            >
              <Text
                style={[
                  styles.subjectText,
                  selectedSubject === sub &&
                    styles.subjectTextActive,
                ]}
              >
                {sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* メイン */}
      <View style={[styles.mainArea, isMobile && styles.mainAreaMobile]}>
        {/* 左 */}
        <View style={[styles.progressArea, isMobile && styles.progressAreaMobile]}>
          <Text>進捗</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text>
            {doneTasks}/{totalTasks}（{progressPercent}%）
          </Text>
        </View>

        {/* 右 */}
        <View style={[styles.contentArea, isMobile && styles.contentAreaMobile]}>
          <View style={[styles.todoBox, isMobile && styles.sectionBoxMobile]}>
            <View style={styles.todoHeader}>
              <Text style={styles.boxTitle}>やる事</Text>
              <View style={styles.todoActionRow}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addTodo}
                >
                  <Text style={styles.buttonText}>追加</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, styles.todoActionButton]}
                  onPress={() => setIsEditMode(p => !p)}
                >
                  <Text style={styles.buttonText}>{isEditMode ? '完了' : '編集'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {current.todos.map((todo, index) => (
              <View key={todo.id} style={styles.todoItem}>
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={() => toggleTodo(todo.id)}
                  >
                    <Text style={styles.checkbox}>
                      {todo.done ? '☑' : '☐'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TextInput
                  style={[
                    styles.todoInput,
                    todo.done &&
                      !isEditMode && {
                        textDecorationLine: 'line-through',
                      },
                  ]}
                  value={todo.text}
                  onChangeText={text =>
                    updateTodoText(todo.id, text)
                  }
                />

                {isEditMode && (
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      onPress={() => moveTodo(index, 'up')}
                    >
                      <Text>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveTodo(index, 'down')}
                    >
                      <Text>↓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTodo(todo.id)}
                    >
                      <Text>🗑</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={[styles.memoBox, isMobile && styles.sectionBoxMobile]}>
            <TextInput
              style={styles.memoInput}
              multiline
              value={current.memoText}
              onChangeText={text =>
                setSubjectData(prev => ({
                  ...prev,
                  [selectedSubject]: {
                    ...prev[selectedSubject],
                    memoText: text,
                  },
                }))
              }
              placeholder="メモ"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ===== styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: '#fff3ff' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerRowMobile: {
    flexDirection: 'column',
  },

  testTitle: { fontSize: 22, fontWeight: 'bold', color: '#aaacf5ff' },

  dateRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  dateInput: {
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    borderRadius: 18,
    backgroundColor: '#fbf7ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 160,
  },
  daysLeft: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8a3a82',
  },

  daysLeftNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#8a3a82',
  },

  goalBox: {
    width: '40%',
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#f7f3ff',
  },

  goalBoxMobile: {
    width: '100%',
    marginTop: 18,
  },

  goalLabel: { fontSize: 12, color: '#aaacf5ff' },

  goalInput: {
    minHeight: 68,
    textAlignVertical: 'top',
    borderRadius: 16,
    backgroundColor: '#fbf7ff',
    padding: 10,
  },

  divider: {
    height: 1,
    backgroundColor: '#e8e2ff',
    marginVertical: 18,
  },

  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  subjectRowMobile: {
    flexDirection: 'column',
    gap: 12,
  },

  subjectTabs: { flexDirection: 'row' },

  subjectTab: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f0edff',
    borderRadius: 16,
    marginRight: 8,
  },

  subjectTabActive: { backgroundColor: '#aaacf5ff' },

  subjectText: { fontSize: 12, color: '#aaacf5ff' },

  subjectTextActive: { fontWeight: 'bold', color: '#fff' },

  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#aaacf5ff',
    borderRadius: 16,
  },

  saveButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#aaacf5ff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  mainArea: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 18,
  },

  mainAreaMobile: {
    flexDirection: 'column',
  },

  progressArea: {
    width: 120,
    alignItems: 'center',
  },

  progressAreaMobile: {
    width: '100%',
    marginBottom: 18,
  },

  progressBarBg: {
    width: 90,
    height: 10,
    backgroundColor: '#f2efff',
    borderRadius: 6,
  },

  progressBarFill: {
    height: 10,
    backgroundColor: '#aaacf5ff',
    borderRadius: 6,
  },
  contentArea: {
    flex: 1,
    marginLeft: 18,
  },

  contentAreaMobile: {
    marginLeft: 0,
  },

  fullWidth: {
    width: '100%',
  },

  sectionBoxMobile: {
    width: '100%',
  },

  todoBox: {
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    padding: 14,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: '#f8f1ff',
  },

  boxTitle: { fontSize: 13, marginBottom: 6, color: '#aaacf5ff' },

  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  todoActionRow: {
    flexDirection: 'row',
    gap: 8,
  },

  todoActionButton: {
    marginLeft: 0,
  },

  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  checkbox: {
    fontSize: 18,
    marginRight: 10,
  },

  todoInput: { flex: 1, paddingVertical: 8, color: '#4A1D4D' },

  editButtons: {
    flexDirection: 'row',
    marginLeft: 6,
    gap: 6,
  },

  memoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff3ff',
  },

  memoInput: {
    flex: 1,
    textAlignVertical: 'top',
    padding: 10,
    backgroundColor: '#fbf7ff',
    borderRadius: 16,
  },
});
