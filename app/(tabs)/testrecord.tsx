import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Subject = '数学' | '国語' | '理科' | '社会' | '英語';
const subjects: Subject[] = ['数学', '国語', '理科', '社会', '英語'];

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

type SubjectData = {
  goalText: string;
  memoText: string;
  todos: Todo[];
};

export default function TestOverviewScreen() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('数学');
  const [isEditMode, setIsEditMode] = useState(false);

  /* ===== テスト日付 ===== */
  const [testDateText, setTestDateText] = useState('2025-12-10');

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
    数学: { goalText: '', memoText: '', todos: [] },
    国語: { goalText: '', memoText: '', todos: [] },
    理科: { goalText: '', memoText: '', todos: [] },
    社会: { goalText: '', memoText: '', todos: [] },
    英語: { goalText: '', memoText: '', todos: [] },
  });

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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.testTitle}>次のテスト</Text>

          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              value={testDateText}
              onChangeText={setTestDateText}
              placeholder="YYYY-MM-DD"
            />
            {daysLeft !== null && (
              <Text style={styles.daysLeft}>
                残り {daysLeft} 日
              </Text>
            )}
          </View>
        </View>

        <View style={styles.goalBox}>
          <Text style={styles.goalLabel}>目標</Text>
          <TextInput
            style={styles.goalInput}
            multiline
            value={current.goalText}
            onChangeText={text =>
              setSubjectData(prev => ({
                ...prev,
                [selectedSubject]: {
                  ...prev[selectedSubject],
                  goalText: text,
                },
              }))
            }
          />
        </View>
      </View>

      <View style={styles.divider} />

      {/* 教科 + ボタン */}
      <View style={styles.subjectRow}>
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

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={addTodo}
          >
            <Text>追加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { marginLeft: 8 }]}
            onPress={() => setIsEditMode(p => !p)}
          >
            <Text>{isEditMode ? '完了' : '編集'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* メイン */}
      <View style={styles.mainArea}>
        {/* 左 */}
        <View style={styles.progressArea}>
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
        <View style={styles.contentArea}>
          <View style={styles.todoBox}>
            <Text style={styles.boxTitle}>やる事</Text>

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

          <View style={styles.memoBox}>
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
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  testTitle: { fontSize: 18, fontWeight: 'bold' },

  dateRow: { marginTop: 6 },

  dateInput: {
    borderWidth: 1,
    padding: 6,
    width: 140,
  },

  daysLeft: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },

  goalBox: {
    width: '40%',
    borderWidth: 1,
    padding: 8,
  },

  goalLabel: { fontSize: 12 },

  goalInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  divider: {
    height: 1,
    backgroundColor: '#000',
    marginVertical: 16,
  },

  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  subjectTabs: { flexDirection: 'row' },

  subjectTab: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 12,
    marginRight: 6,
  },

  subjectTabActive: { backgroundColor: '#ddd' },

  subjectText: { fontSize: 12 },

  subjectTextActive: { fontWeight: 'bold' },

  addButton: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },

  mainArea: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 16,
  },

  progressArea: {
    width: 120,
    alignItems: 'center',
  },

  progressBarBg: {
    width: 80,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
  },

  progressBarFill: {
    height: 8,
    backgroundColor: '#b9b5f5',
    borderRadius: 4,
  },

  contentArea: {
    flex: 1,
    marginLeft: 16,
  },

  todoBox: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
  },

  boxTitle: { fontSize: 12, marginBottom: 4 },

  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  checkbox: {
    fontSize: 18,
    marginRight: 8,
  },

  todoInput: { flex: 1 },

  editButtons: {
    flexDirection: 'row',
    marginLeft: 6,
    gap: 6,
  },

  memoBox: {
    flex: 1,
    borderWidth: 1,
    padding: 8,
  },

  memoInput: {
    flex: 1,
    textAlignVertical: 'top',
  },
});
