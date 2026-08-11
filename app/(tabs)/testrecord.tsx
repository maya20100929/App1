import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { auth, db } from '../../lib/firebase';
import { getSubjectSettings, type SubjectSetting } from '../../lib/subjectStore';

type SubjectTab = {
  id: string;
  label: string;
  color: string;
  parentName: string;
};

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
  const [selectedSubject, setSelectedSubject] = useState<string>('数学');
  const [subjectTabs, setSubjectTabs] = useState<SubjectTab[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isGoalFocused, setIsGoalFocused] = useState(false);
  const [isDateFocused, setIsDateFocused] = useState(false);

  /* ===== テスト日付 ===== */
  const [testDateText, setTestDateText] = useState('2025-12-10');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
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

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDateForPicker = useMemo(() => {
    const parsed = new Date(testDateText);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [testDateText]);

useEffect(() => {
  if (!user) return;

  if (!testDateText) return;

  saveTestInfo({ silent: true });
}, [testDateText]);

  const openCalendar = () => {
    setIsDateFocused(true);
    setIsCalendarVisible(true);
  };

 const saveTestInfo = async (
  options?: {
    silent?: boolean;
  }
) => {
  const silent = options?.silent ?? false;

  if (!user) {
    Alert.alert('ログインが必要', 'テスト情報を保存するにはログインしてください。');
    return;
  }

  if (testDateText && !isValidYMD(testDateText)) {
    Alert.alert('日付形式が不正です', '日付は YYYY-MM-DD 形式で入力してください');
    return;
  }

  try {
    const payload: any = {};

    if (goalText && goalText.trim() !== '') {
      payload.testGoal = goalText;
    }

    if (testDateText) {
      payload.testDate = testDateText;
    }

    console.log('testrecord: saving user doc', JSON.stringify(payload));

    if (Object.keys(payload).length === 0) {
      if (!silent) Alert.alert('保存する内容がありません');
      return;
    }

    await setDoc(doc(db, 'users', user.uid), payload, { merge: true });

    const snap = await getDoc(doc(db, 'users', user.uid));

    console.log('testrecord: saved doc snapshot', JSON.stringify(snap.data()));

    if (!silent) {
      Alert.alert('保存しました');
    }
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

  const [subjectData, setSubjectData] = useState<Record<string, SubjectData>>({});

  const { width } = useWindowDimensions();
  const isMobile = width <= 600;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const settings = await getSubjectSettings();
        const tabs = settings.flatMap(setting => {
          const categories = (setting.categories ?? []).map(item => item.trim()).filter(Boolean);
          if (categories.length > 0) {
            return categories.map(category => ({
              id: category,
              label: category,
              color: setting.color,
              parentName: setting.name,
            }));
          }

          return [{
            id: setting.name,
            label: setting.name,
            color: setting.color,
            parentName: setting.name,
          }];
        });

        setSubjectTabs(tabs);
        setSubjectData(prev => {
          const next = { ...prev };
          tabs.forEach(tab => {
            if (!next[tab.id]) {
              next[tab.id] = { memoText: '', todos: [] };
            }
          });
          return next;
        });

        if (!tabs.some(tab => tab.id === selectedSubject)) {
          setSelectedSubject(tabs[0]?.id ?? '');
        }
      })();
    }, [selectedSubject])
  );

  const current = subjectData[selectedSubject] ?? { memoText: '', todos: [] };

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
    <PaperProvider>
      <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* 上段 */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View style={isMobile ? styles.fullWidth : undefined}>
          <ThemedText style={styles.testTitle}>次のテスト</ThemedText>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.dateInput, isDateFocused && styles.dateInputActive]}
              activeOpacity={0.8}
              onPress={openCalendar}
            >
              <ThemedText style={[styles.dateInputText, !testDateText && styles.dateInputPlaceholder]}>
                {testDateText || '日付を選択'}
              </ThemedText>
            </TouchableOpacity>
            {daysLeft !== null && (
              <ThemedText style={styles.daysLeft}>
                残り <ThemedText style={styles.daysLeftNumber}>{daysLeft}</ThemedText> 日
              </ThemedText>
            )}
          </View>
        </View>

        <View style={[styles.goalBox, isMobile && styles.goalBoxMobile]}>
          <ThemedText style={styles.goalLabel}>目標</ThemedText>
          <View
            style={[
              styles.goalInputContainer,
              isGoalFocused && styles.goalInputContainerActive,
            ]}
          >
            <TextInput
              style={styles.goalInput}
              multiline
              placeholder="今回のテストの目標"
              placeholderTextColor="#9ca3af"
              value={goalText}
              onChangeText={setGoalText}
              onFocus={() => setIsGoalFocused(true)}
              onBlur={() => {
                setIsGoalFocused(false);
                saveTestInfo({ silent: true });
              }}
              scrollEnabled={false}
            />
          </View>
        </View>
      </View>

      <DatePickerModal
  locale="ja"
  mode="single"
  visible={isCalendarVisible}
  date={selectedDateForPicker}
  onDismiss={() => {
    setIsCalendarVisible(false);
    setIsDateFocused(false);
  }}
onConfirm={({ date }) => {
  if (date) {
    setTestDateText(formatDate(date));
  }

  setIsCalendarVisible(false);
  setIsDateFocused(false);
}}

/>

      <View style={styles.divider} />

      {/* 教科 + ボタン */}
      <View style={[styles.subjectRow, isMobile && styles.subjectRowMobile]}>
        <View style={styles.subjectTabs}>
          {subjectTabs.map(tab => {
            const isActive = selectedSubject === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.subjectTab,
                  isActive && styles.subjectTabActive,
                  isActive && { backgroundColor: tab.color },
                ]}
                onPress={() => setSelectedSubject(tab.id)}
              >
                <ThemedText
                  style={[
                    styles.subjectText,
                    isActive && styles.subjectTextActive,
                    isActive ? { color: '#fff' } : { color: tab.color },
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* メイン */}
      <View style={[styles.mainArea, isMobile && styles.mainAreaMobile]}>
        {/* 左 */}
        <View style={[styles.progressArea, isMobile && styles.progressAreaMobile]}>
          <ThemedText>進捗</ThemedText>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <ThemedText>
            {doneTasks}/{totalTasks}（{progressPercent}%）
          </ThemedText>
        </View>

        {/* 右 */}
        <View style={[styles.contentArea, isMobile && styles.contentAreaMobile]}>
          <View style={[styles.todoBox, isMobile && styles.sectionBoxMobile]}>
            <View style={styles.todoHeader}>
              <ThemedText style={styles.boxTitle}>やる事</ThemedText>
              <View style={styles.todoActionRow}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addTodo}
                >
                  <ThemedText style={styles.buttonText}>追加</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, styles.todoActionButton]}
                  onPress={() => setIsEditMode(p => !p)}
                >
                  <ThemedText style={styles.buttonText}>{isEditMode ? '完了' : '編集'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {current.todos.map((todo, index) => (
              <View key={todo.id} style={styles.todoItem}>
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={() => toggleTodo(todo.id)}
                  >
                    <ThemedText style={styles.checkbox}>
                      {todo.done ? '☑' : '☐'}
                    </ThemedText>
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
                      <ThemedText>↑</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveTodo(index, 'down')}
                    >
                      <ThemedText>↓</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTodo(todo.id)}
                    >
                      <ThemedText>🗑</ThemedText>
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
              scrollEnabled={false}
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
    </ScrollView>
    </PaperProvider>
  );

}

/* ===== styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: '#fff' },

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
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 160,
    fontFamily: Fonts.rounded,
  },

  dateInputText: {
  fontFamily: Fonts.rounded,
  fontSize: 16,
  color: '#4A1D4D',
  textAlign: 'center',
},

dateInputPlaceholder: {
  color: '#9ca3af',
},


  dateInputActive: {
    borderColor: '#8a3a82',
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
    backgroundColor: '#fff',
  },

  goalBoxMobile: {
    width: '100%',
    marginTop: 18,
  },

  goalLabel: { fontSize: 12, color: '#aaacf5ff' },

  goalInputContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    borderRadius: 16,
    padding: 2,
    backgroundColor: '#fff',
  },

  goalInputContainerIdle: {
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },

  goalInputContainerActive: {
    borderColor: '#aaacf5ff',
    backgroundColor: '#fff',
  },

  goalInput: {
    minHeight: 68,
    textAlignVertical: 'top',
    borderRadius: 16,
    backgroundColor: 'transparent',
    padding: 10,
    fontFamily: Fonts.rounded,
    color: '#4A1D4D',
  },

  divider: {
    height: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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

  todoInput: { flex: 1, paddingVertical: 8, color: '#4A1D4D', fontFamily: Fonts.rounded },

  editButtons: {
    flexDirection: 'row',
    marginLeft: 6,
    gap: 6,
  },

  memoBox: {
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
  },

  memoInput: {
    minHeight: 140,
    textAlignVertical: 'top',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    fontFamily: Fonts.rounded,
  },

});
