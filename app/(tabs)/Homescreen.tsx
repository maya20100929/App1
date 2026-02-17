import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
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

  const [user, setUser] = useState<any | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

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
      setTodayTasks([]);
      setPastTasks([]);
      setArchivedTasks([]);
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
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, snap => {
      const data = snap.data();
      console.log('Homescreen: onSnapshot user doc', { uid: user.uid, data });
      const raw = data?.testDate;

      setRawTestDateRaw(raw);
      setRawTestGoalRaw(data?.testGoal ?? null);

      const normalized = normalizeDateField(raw);
      console.log('Homescreen: normalized date', { raw, normalized });
      setTestDateText(normalized);
      setTestGoal(data?.testGoal ?? '');
    });

    return () => unsubUser();
  }, [user]);


  // manual fetch for debugging
  const fetchUserDoc = async () => {
    if (!user) {
      Alert.alert('ログインが必要', 'ユーザー情報を取得するにはログインしてください。');
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      console.log('Homescreen: fetchUserDoc', JSON.stringify(snap.data()));
      const data = snap.data() || {};
      setRawTestDateRaw(data.testDate ?? null);
      setRawTestGoalRaw(data.testGoal ?? null);
      setTestDateText(normalizeDateField(data.testDate));
      setTestGoal(data.testGoal ?? '');
      Alert.alert('ユーザードキュメントを取得しました');
    } catch (e) {
      console.warn('Homescreen: fetchUserDoc failed', e);
      Alert.alert('取得に失敗しました');
    }
  };


const normalizeDateField = (raw: any) => {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    if ((raw as any).toDate && typeof (raw as any).toDate === 'function') {
      try { return (raw as any).toDate().toISOString().slice(0, 10); } catch (e) { return ''; }
    }
    if (typeof raw === 'string') return raw;
    try {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch (e) {
      return '';
    }
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




  /* ===== テスト日付 ===== */
  const [testDateText, setTestDateText] = useState('');
  const [testGoal, setTestGoal] = useState('');

  // debug raw values from Firestore
  const [rawTestDateRaw, setRawTestDateRaw] = useState<any>(null);
  const [rawTestGoalRaw, setRawTestGoalRaw] = useState<any>(null);

  const isValidYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  const saveTestInfo = async () => {
    console.log('🔥 saveTestInfo called', { testDateText, testGoal }); // ← ここ①

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
      if (testGoal && testGoal.trim() !== '') payload.testGoal = testGoal;
      if (testDateText) payload.testDate = testDateText;

      console.log('🧾 payload', payload);

      if (Object.keys(payload).length === 0) {
        Alert.alert('保存する内容がありません');
        return;
      }

      await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
      Alert.alert('保存しました');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '保存に失敗しました';
      Alert.alert('エラー', msg);
    }
  };




  const toggleTask = (id: string) => {
    // update in Firestore
    (async () => {
      if (!user) return;
      const all = [...todayTasks, ...pastTasks, ...archivedTasks];
      const target = all.find(t => t.id === id);
      if (!target) return;
      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      try {
        await updateDoc(taskRef, { done: !target.done });
      } catch (e) {
        console.warn('toggleTask update failed', e);
      }
    })();
  };

  const saveEdit = (id: string) => {
    (async () => {
      if (!user) {
        Alert.alert('ログインが必要', 'タスクを編集するにはログインしてください。');
        return;
      }
      const text = editingText.trim();
      if (!text) {
        Alert.alert('入力してください', '編集内容を入力してください。');
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

const testDate = useMemo(() => {
  if (!testDateText) return null;

  const [y, m, d] = testDateText.split('-').map(Number);
  if (!y || !m || !d) return null;

  const date = new Date(y, m - 1, d); // ← 月は -1 する
  return isNaN(date.getTime()) ? null : date;
}, [testDateText]);

  const diffLeft = useMemo(() => {
    if (!testDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d = new Date(testDate);
    d.setHours(0, 0, 0, 0);

    const diff =
      (d.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
  }, [testDate]);


  const { width } = useWindowDimensions();
  const isPC = width > 600;
  const isMobile = !isPC;

  // 共通レンダリング関数

  const renderTasks = () => (
    <View style={[styles.section, styles.box]}>
      <Text style={styles.sectionTitle}>今日やること</Text>

      {todayTasks.map(task => (
        <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <TouchableOpacity onPress={() => toggleTask(task.id)} style={{ marginRight: 8 }}>
            <Text>{task.done ? '☑' : '☐'}</Text>
          </TouchableOpacity>

          {editingTaskId === task.id ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[styles.dateInput, { flex: 1, marginRight: 8 }]}
                value={editingText}
                onChangeText={setEditingText}
                placeholder="タスクを編集"
              />
              <TouchableOpacity onPress={() => saveEdit(task.id)} style={[styles.addButton, { paddingHorizontal: 12 }]}>
                <Text style={styles.addButtonText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit} style={[styles.menuButton, { marginLeft: 8 }]}>
                <Text style={styles.menuText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.bullet,
                  task.done && { textDecorationLine: 'line-through' },
                ]}
              >
                {task.text}
              </Text>

              <TouchableOpacity onPress={() => { setEditingTaskId(task.id); setEditingText(task.text); }} style={{ marginLeft: 8 }}>
                <Text style={{ color: '#007AFF' }}>編集</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <TextInput
          style={[styles.dateInput, { flex: 1, marginRight: 8 }]}
          value={newTaskText}
          onChangeText={setNewTaskText}
          placeholder="新しいタスク"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={async () => {
            console.log('Homescreen: add button pressed', { newTaskText, userPresent: !!user });
            if (!user) {
              Alert.alert('ログインが必要', 'タスクを追加するにはログインしてください。');
              return;
            }
            const text = newTaskText.trim();
            if (!text) {
              Alert.alert('入力してください', 'タスク内容を入力してください。');
              return;
            }
            const tasksRef = collection(db, 'users', user.uid, 'tasks');
            const dateStr = new Date().toISOString().slice(0, 10);
            try {
              console.log('Homescreen: adding task', text);
              await addDoc(tasksRef, {
                text,
                done: false,
                date: dateStr,
                archived: false,
                createdAt: Date.now(),
              });
              setNewTaskText('');
              console.log('Homescreen: addTask succeeded');
            } catch (e: unknown) {
              console.warn('addTask failed', e);
              const msg =
                e instanceof Error ? e.message : 'タスクの追加に失敗しました。';
              Alert.alert('エラー', msg);
            }

          }}
        >
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviousMessages = () => (
    <View style={[styles.section, styles.box]}>
      <Text style={styles.sectionTitle}>
        昨日までで出来てないこと & 昨日からの自分へのメッセージ
      </Text>
      <Text>・あいうえお</Text>
      <Text>・かきくけこ</Text>
    </View>
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


  const renderGoal = () => (
    <View style={[styles.goalSection, isMobile && { marginBottom: 20, marginTop: 16 }]}>
      <Text style={styles.sectionTitle}>今回のテストの目標</Text>
      <Text style={styles.goalText}>{testGoal || 'ここに目標を表示'}</Text>
    </View>
  );


  // ====== スマホ表示 ======
  if (isMobile) {
    return (
      <ScrollView style={styles.container}>
        {!user && (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <TextInput
              style={styles.dateInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.dateInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
            />
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.menuButton, { marginRight: 8 }]}
                onPress={async () => {
                  console.log('Homescreen: register pressed', { email });
                  try {
                    const res = await createUserWithEmailAndPassword(auth, email, password);
                    console.log('Homescreen: register success', { uid: res.user?.uid });
                  } catch (e) {
                    console.warn('register failed', e);
                    Alert.alert('登録エラー', String(e));
                  }
                }}
              >
                <Text style={styles.menuText}>登録</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={async () => {
                  console.log('Homescreen: login pressed', { email });
                  try {
                    const res = await signInWithEmailAndPassword(auth, email, password);
                    console.log('Homescreen: login success', { uid: res.user?.uid });
                  } catch (e) {
                    console.warn('login failed', e);
                    Alert.alert('ログインエラー', String(e));
                  }
                }}
              >
                <Text style={styles.menuText}>ログイン</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {user && (
          <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={async () => {
                console.log('Homescreen: logout pressed');
                try {
                  await signOut(auth);
                  console.log('Homescreen: logout success');
                } catch (e) {
                  console.warn('logout failed', e);
                  Alert.alert('ログアウトエラー', String(e));
                }
              }}
            >
              <Text style={styles.menuText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.menuRow}>
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/record')}>
            <Text style={styles.menuText}>記録</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/oldrecord')}>
            <Text style={styles.menuText}>今までの記録</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/testrecord')}>
            <Text style={styles.menuText}>テスト</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/notification')}>
            <Text style={styles.menuText}>通知</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/settings')}>
            <Text style={styles.menuText}>設定</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text style={styles.dateDisplay}>
    {testDateText || '日付が未設定'}
  </Text>

  <TouchableOpacity style={[styles.addButton, { marginLeft: 8 }]} onPress={fetchUserDoc}>
    <Text>再取得</Text>
  </TouchableOpacity>
</View>

          <Text style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            raw date: {rawTestDateRaw ? (rawTestDateRaw.toString ? rawTestDateRaw.toString() : String(rawTestDateRaw)) : 'null'}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            raw goal: {rawTestGoalRaw ?? 'null'}
          </Text>
        </View>

        {renderGoal()}

        <View style={{ height: 20 }} />

        {renderPreviousMessages()}
        {renderTasks()}
      </ScrollView>
    );
  }

  // ====== PC表示 ======
  return (
    <View style={styles.pcContainer}>
      <View style={styles.sideMenu}>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/record')}>
          <Text style={styles.menuText}>記録</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/oldrecord')}>
          <Text style={styles.menuText}>今までの記録</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/testrecord')}>
          <Text style={styles.menuText}>テスト</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/notification')}>
          <Text style={styles.menuText}>通知</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/settings')}>
          <Text style={styles.menuText}>設定</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainArea}>
        <View style={styles.topRow}>
          <View>
            <TextInput
              style={styles.dateInput}
              value={testDateText}
              onChangeText={setTestDateText}
              placeholder="YYYY-MM-DD"
            />
            {diffLeft !== null && (
              <Text style={styles.daysLeft}>テストまで {diffLeft}日</Text>
            )}
          </View>
          {renderGoal()}
        </View>

        <View style={{ height: 30 }} />

        <View style={styles.twoColumns}>
          <View style={styles.column}>{renderPreviousMessages()}</View>
          <View style={styles.column}>{renderTasks()}</View>
        </View>
      </ScrollView>
    </View>
  );
};



export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },


  dateDisplay: {
    borderWidth: 1,
    padding: 8,
    width: 140,
    marginBottom: 4,
    textAlign: 'center',
    backgroundColor: '#f3f3f3',
  },


  menuRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },

  menuButton: {
    padding: 12,
    backgroundColor: "#aaacf5ff",
    borderRadius: 8,
    marginBottom: 8,
  },

  menuText: { color: "#fff", fontWeight: "bold" },

  dateInput: {
    borderWidth: 1,
    padding: 6,
    width: 140,
    marginBottom: 4,
    textAlign: 'center',
  },

  daysLeft: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },

  section: { marginBottom: 20 },

  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },

  goalText: { fontSize: 16 },

  bullet: { fontSize: 16, marginBottom: 4 },

  addButton: {
    marginTop: 8,
    backgroundColor: "#aaacf5ff",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },

  addButtonText: { color: "#fff", fontSize: 18 },

  box: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
  },

  pcContainer: { flex: 1, flexDirection: "row" },

  sideMenu: {
    width: 200,
    backgroundColor: "#f0edffff",
    padding: 16,
  },

  mainArea: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 30,
    marginTop: 40,
  },

  goalSection: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },

  twoColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  column: { flex: 1, marginRight: 8 },

  saveButton: {
    marginLeft: 8,
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

});




