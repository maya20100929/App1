import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { FC, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [testDateText, setTestDateText] = useState('');
  const slideAnim = useRef(new Animated.Value(-250)).current;

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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    Animated.timing(slideAnim, {
      toValue: menuOpen ? -250 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeMenu = () => {
    setMenuOpen(false);
    Animated.timing(slideAnim, {
      toValue: -250,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };




  const { width } = useWindowDimensions();
  const isPC = width > 600;
  const isMobile = !isPC;

  // 共通レンダリング関数

  const renderTasks = () => (
    <ThemedView style={[styles.section, styles.box]}>
      <ThemedText style={styles.sectionTitle}>今日やること</ThemedText>

      {todayTasks.map(task => (
        <ThemedView key={task.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <TouchableOpacity onPress={() => toggleTask(task.id)} style={{ marginRight: 8 }}>
            <ThemedText>{task.done ? '☑' : '☐'}</ThemedText>
          </TouchableOpacity>

          {editingTaskId === task.id ? (
            <ThemedView style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[styles.dateInput, { flex: 1, marginRight: 8 }]}
                value={editingText}
                onChangeText={setEditingText}
                placeholder="タスクを編集"
              />
              <TouchableOpacity onPress={() => saveEdit(task.id)} style={[styles.addButton, { paddingHorizontal: 12 }]}>
                <ThemedText style={styles.addButtonText}>保存</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit} style={[styles.menuButton, { marginLeft: 8 }]}>
                <ThemedText style={styles.menuText}>キャンセル</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <>
              <ThemedText
                style={[
                  styles.bullet,
                  task.done && { textDecorationLine: 'line-through' },
                ]}
              >
                {task.text}
              </ThemedText>

              <TouchableOpacity onPress={() => { setEditingTaskId(task.id); setEditingText(task.text); }} style={{ marginLeft: 8 }}>
                <ThemedText style={{ color: '#007AFF' }}>編集</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </ThemedView>
      ))}
      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
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
          <ThemedText style={styles.addButtonText}>＋</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  const renderPreviousMessages = () => (
    <ThemedView style={[styles.section, styles.box]}>
      <ThemedText style={styles.sectionTitle}>
        昨日までで出来てないこと & 昨日からの自分へのメッセージ
      </ThemedText>
      <ThemedText>・あいうえお</ThemedText>
      <ThemedText>・かきくけこ</ThemedText>
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
        <ThemedView style={styles.mobileHeader}>
          <TouchableOpacity onPress={toggleMenu}>
            <ThemedText style={styles.hamburgerIcon}>☰</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {menuOpen && (
          <Pressable
            style={styles.sidebarOverlayActive}
            onPress={closeMenu}
          />
        )}

        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              router.push('/record');
              closeMenu();
            }}
          >
            <ThemedText style={styles.menuText}>記録</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              router.push('/oldrecord');
              closeMenu();
            }}
          >
            <ThemedText style={styles.menuText}>今までの記録</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              router.push('/testrecord');
              closeMenu();
            }}
          >
            <ThemedText style={styles.menuText}>テスト</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              router.push('/notification');
              closeMenu();
            }}
          >
            <ThemedText style={styles.menuText}>通知</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              router.push('/settingsscreen');
              closeMenu();
            }}
          >
            <ThemedText style={styles.menuText}>設定</ThemedText>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView style={styles.mobileContent}>
        {!user && (
          <ThemedView style={{ alignItems: 'center', marginBottom: 12 }}>
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
            <ThemedView style={{ flexDirection: 'row', marginTop: 8 }}>
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
                <ThemedText style={styles.menuText}>登録</ThemedText>
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
                <ThemedText style={styles.menuText}>ログイン</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        )}
        <ThemedView style={{ alignItems: 'center', marginBottom: 20 }}>
          <ThemedText style={styles.sectionTitle}>次回テスト日</ThemedText>
          <ThemedText style={styles.dateDisplay}>
            {testDateText || '日付が未設定'}
          </ThemedText>
        </ThemedView>

        {renderPreviousMessages()}
        {renderTasks()}
      </ScrollView>
      </ThemedView>
    );
  }

  // ====== PC表示 ======
  return (
    <ThemedView style={styles.pcContainer}>
      <ThemedView style={styles.sideMenu}>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/record')}>
          <ThemedText style={styles.menuText}>記録</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/oldrecord')}>
          <ThemedText style={styles.menuText}>今までの記録</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/testrecord')}>
          <ThemedText style={styles.menuText}>テスト</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/notification')}>
          <ThemedText style={styles.menuText}>通知</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/settingsscreen')}>
          <ThemedText style={styles.menuText}>設定</ThemedText>
        </TouchableOpacity>
      </ThemedView>

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
    backgroundColor: '#fbf7ff',
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
    backgroundColor: '#fbf7ff',
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
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    borderRadius: 20,
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

  dateInput: {
    borderWidth: 1,
    borderColor: '#e8e2ff',
    borderRadius: 18,
    backgroundColor: '#fbf7ff',
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

  bullet: { fontSize: 16, marginBottom: 4, color: '#aaacf5ff' },

  addButton: {
    marginTop: 8,
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
