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
  onSnapshot,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { auth, db } from '../(lib)/firebase';

const HomeScreen: FC = () => {

  const [user, setUser] = useState<any | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
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


  type Task = {
  id: string;
  text: string;
  done: boolean;
  date: string;
  archived?: boolean;
};


  const [todayTasks, setTodayTasks] = useState<Task[]>([]);

const [pastTasks, setPastTasks] = useState<Task[]>([]);
const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);




  /* ===== テスト日付 ===== */
  const [testDateText, setTestDateText] = useState('2025-12-10');


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

  const testDate = useMemo(() => {
    const d = new Date(testDateText);
    return isNaN(d.getTime()) ? null : d;
  }, [testDateText]);

  const diffLeft = useMemo(() => {
    if (!testDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    testDate.setHours(0, 0, 0, 0);
    const diff =
      (testDate.getTime() - today.getTime()) /
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
        <TouchableOpacity
    key={task.id}
    onPress={() => toggleTask(task.id)}
    style={{ flexDirection: 'row', alignItems: 'center' }}
  >
    <Text>
      {task.done ? '☑' : '☐'}
    </Text>

    <Text
      style={[
        styles.bullet,
        task.done && { textDecorationLine: 'line-through' },
      ]}
    >
      {task.text}
    </Text>
  </TouchableOpacity>
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
            if (!user) return;
            const tasksRef = collection(db, 'users', user.uid, 'tasks');
            const dateStr = new Date().toISOString().slice(0, 10);
            try {
              await addDoc(tasksRef, {
                text: newTaskText || '新しいタスク',
                done: false,
                date: dateStr,
                archived: false,
                createdAt: Date.now(),
              });
              setNewTaskText('');
            } catch (e) {
              console.warn('addTask failed', e);
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
      <Text style={styles.goalText}>ここに目標を表示</Text>
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
                  try {
                    await createUserWithEmailAndPassword(auth, email, password);
                  } catch (e) {
                    console.warn('register failed', e);
                  }
                }}
              >
                <Text style={styles.menuText}>登録</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={async () => {
                  try {
                    await signInWithEmailAndPassword(auth, email, password);
                  } catch (e) {
                    console.warn('login failed', e);
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
                try {
                  await signOut(auth);
                } catch (e) {
                  console.warn('logout failed', e);
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
});




