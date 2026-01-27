import { router } from 'expo-router';
import React, { FC, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useEffect } from 'react';

const HomeScreen: FC = () => {

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


const [todayTasks, setTodayTasks] = useState<Task[]>([
  { id: '1', text: 'あああああああ', done: false, date: '2026-01-27' },
  { id: '2', text: 'いいいいいいいい', done: false, date: '2026-01-27' },
]);

const [pastTasks, setPastTasks] = useState<Task[]>([]);
const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);




  /* ===== テスト日付 ===== */
  const [testDateText, setTestDateText] = useState('2025-12-10');


const toggleTask = (id: string) => {
  setTodayTasks(prev =>
    prev.map(task =>
      task.id === id
        ? { ...task, done: !task.done }
        : task
    )
  );
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
      <TouchableOpacity style={styles.addButton} onPress={addTask}>
        <Text style={styles.addButtonText}>＋</Text>
      </TouchableOpacity>
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
  setPastTasks(prev => {
    const target = prev.find(t => t.id === id);
    if (!target) return prev;

    setArchivedTasks(a => [...a, { ...target, archived: true }]);
    return prev.filter(t => t.id !== id);
  });
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




