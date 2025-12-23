import { router } from 'expo-router';
import React, { FC, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const HomeScreen: FC = () => {
  const [todayTasks, setTodayTasks] = useState([
    "あああああああ",
    "いいいいいいいい",
  ]);

  const addTask = () => setTodayTasks([...todayTasks, "新しいタスク"]);

  const testDate = new Date("2025-12-10");
  const today = new Date();
  const diffDays = Math.ceil((testDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const { width } = useWindowDimensions();
  const isPC = width > 600;
  const isMobile = !isPC;

  // 共通レンダリング関数
  const renderTasks = () => (
    <View style={[styles.section, styles.box]}>
      <Text style={styles.sectionTitle}>今日やること</Text>
      {todayTasks.map((task, index) => (
        <Text key={index} style={styles.bullet}>・{task}</Text>
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

        <Text style={styles.daysLeft}>テストまで {diffDays}日</Text>

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
          <Text style={styles.daysLeft}>テストまで {diffDays}日</Text>
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
  menuRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16 },
  menuButton: { padding: 12, backgroundColor: "#aaacf5ff", borderRadius: 8, marginBottom: 8 },
  menuText: { color: "#fff", fontWeight: "bold" },
  daysLeft: { 
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 0,
    textAlign: "center",
    textAlignVertical: "center", 
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  goalText: { fontSize: 16 },
  bullet: { fontSize: 16, marginBottom: 4 },
  addButton: { marginTop: 8, backgroundColor: "#aaacf5ff", padding: 8, borderRadius: 8, alignItems: "center" },
  addButtonText: { color: "#fff", fontSize: 18 },

  box: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
  },

  pcContainer: { flex: 1, flexDirection: "row" },
  sideMenu: { width: 200, backgroundColor: "#f0edffff", padding: 16 },
  mainArea: { flex: 1, padding: 16, backgroundColor: "#fff" },
  topRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "stretch",
    marginBottom: 30,
    marginTop: 40, 
  },
  goalSection: { flex: 1, marginLeft: 16, justifyContent: "center" },
  twoColumns: { flexDirection: "row", justifyContent: "space-between" },
  column: { flex: 1, marginRight: 8 },
});
