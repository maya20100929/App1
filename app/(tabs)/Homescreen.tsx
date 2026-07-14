import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { Picker } from '@react-native-picker/picker';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { auth, db } from '../../lib/firebase';
import { getCustomMaterialsBySubject, getUnitPointRulesBySubject, saveCustomMaterial, saveRecord, type Subject } from '../../lib/recordStore';

const HomeScreen: FC = () => {

  type Task = {
    id: string;
    text: string;
    done: boolean;
    date: string;
    archived?: boolean;
  };

  type Difficulty = '' | '1' | '2' | '3';

  const subjectRules = [
    { subject: '数学', unit: '問' },
    { subject: '英語', unit: '語' },
    { subject: '国語', unit: 'ページ' },
    { subject: '理科', unit: '問' },
    { subject: '社会', unit: 'ページ' },
  ] as const;

  const pointRules = {
    数学: {
      青チャート: 1,
      フォーカスゴールド: 1.2,
    },
    英語: {
      単語帳: 0.2,
      長文: 5,
    },
    国語: {
      問題集: 2,
    },
    理科: {
      問題集: 1,
    },
    社会: {
      教科書: 1.5,
    },
  } as const;

  const [user, setUser] = useState<any | null>(() => auth.currentUser);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [testDateText, setTestDateText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isRecordModalVisible, setIsRecordModalVisible] = useState(false);
  const [recordModalTab, setRecordModalTab] = useState<'todo' | 'record'>('todo');
  const [modalTaskText, setModalTaskText] = useState('');
  const newTaskInputRef = React.useRef<TextInput | null>(null);
  const [previousMessages, setPreviousMessages] = useState([
    { id: 'message-1', text: 'あいうえお', done: false },
    { id: 'message-2', text: 'かきくけこ', done: false },
  ]);
  const [subject, setSubject] = useState<Subject>('数学');
  const [material, setMaterial] = useState('');
  const [customMaterial, setCustomMaterial] = useState('');
  const [customPointRate, setCustomPointRate] = useState('1');
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [allMaterials, setAllMaterials] = useState<{ name: string; rate: number }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ unit: string; pointPerUnit: number }[]>([]);

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

      console.log(
  "取得件数",
  snapshot.docs.length,
  snapshot.docs.map(d => ({
    id: d.id,
    text: d.data().text,
  }))
);

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

console.log(
  "todayArr",
  todayArr.map(t => ({
    id: t.id,
    text: t.text,
  }))
);

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

  const loadMaterials = useCallback(async () => {
    try {
      const baseMaterials = Object.entries(pointRules[subject]).map(([name, rate]) => ({
        name,
        rate,
      }));
      const customMaterials = await getCustomMaterialsBySubject(subject);
      const customMaterialsList = customMaterials.map(cm => ({
        name: cm.material,
        rate: cm.pointRate,
      }));
      const materialMap = new Map<string, number>();
      baseMaterials.forEach(m => materialMap.set(m.name, m.rate));
      customMaterialsList.forEach(m => materialMap.set(m.name, m.rate));
      setAllMaterials(Array.from(materialMap).map(([name, rate]) => ({ name, rate })));
    } catch (error) {
      console.error('Homescreen loadMaterials failed', error);
    }
  }, [subject]);

  const loadUnitRules = useCallback(async () => {
    try {
      const rules = await getUnitPointRulesBySubject(subject);
      setUnitOptions(rules.map(r => ({ unit: r.unit, pointPerUnit: r.pointPerUnit })));
      if (rules.length > 0) {
        setSelectedUnit(rules[0].unit);
      } else {
        setSelectedUnit('');
      }
    } catch (error) {
      console.error('Homescreen loadUnitRules failed', error);
    }
  }, [subject]);

  useEffect(() => {
    loadMaterials();
    loadUnitRules();
  }, [loadMaterials, loadUnitRules]);

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
      setNewTaskText('');
      console.log('Homescreen: addTask succeeded');
    } catch (e: unknown) {
      console.warn('addTask failed', e);
      const msg = e instanceof Error ? e.message : 'タスクの追加に失敗しました。';
      Alert.alert('エラー', msg);
    }
  };

  const handleModalAddTask = async () => {
    console.log('Homescreen: modal add task pressed', { modalTaskText, userPresent: !!user });
    const text = modalTaskText.trim();
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
      setModalTaskText('');
      console.log('Homescreen: saved modal task locally');
      return;
    }

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    try {
      console.log('Homescreen: adding modal task', text);
      const docRef = await addDoc(tasksRef, {
        text,
        done: false,
        date: dateStr,
        archived: false,
        createdAt: Date.now(),
      });
      setModalTaskText('');
      setIsRecordModalVisible(false);
      console.log('Homescreen: modal add task succeeded');
    } catch (e: unknown) {
      console.warn('modal addTask failed', e);
      const msg = e instanceof Error ? e.message : 'タスクの追加に失敗しました。';
      Alert.alert('エラー', msg);
    }
  };

  const selectedUnitRule = useMemo(() => {
    if (!selectedUnit) return null;
    return unitOptions.find(u => u.unit === selectedUnit) ?? null;
  }, [selectedUnit, unitOptions]);

  const basePoint = useMemo(() => {
    const num = Number(amount);
    if (!Number.isFinite(num) || !num || !selectedUnit || !selectedUnitRule) return 0;
    return Math.floor(num * Number(selectedUnitRule.pointPerUnit));
  }, [amount, selectedUnit, selectedUnitRule]);

  const point = useMemo(() => {
    if (!basePoint) return 0;
    const materialRate = material === '__custom__'
      ? Number(customPointRate) || 1
      : Number(allMaterials.find(item => item.name === material)?.rate ?? 1);
    const difficultyMultiplier = difficulty === '1' ? 1.2 : difficulty === '2' ? 1.5 : difficulty === '3' ? 1.8 : 1;
    return Math.floor(basePoint * materialRate * difficultyMultiplier);
  }, [basePoint, material, customPointRate, allMaterials, difficulty]);

  const handleRecordSave = useCallback(async () => {
    console.log("handleRecordSave");
    const actualMaterial = material === '__custom__' ? customMaterial : material;
    if (!actualMaterial || !content || !amount || !selectedUnit) {
      Alert.alert('入力不足', '教材・内容・量・単位を入力してください');
      return;
    }

    try {
      const record = {
        date: new Date().toISOString().slice(0, 10),
        subject,
        material: actualMaterial,
        content,
        amount: Number(amount),
        unit: selectedUnit,
        point,
        ...(difficulty ? { difficulty } : {}),
      };

      const recordId = await saveRecord(record);
      console.log('Homescreen record saved', { recordId, record });

      if (material === '__custom__' && customPointRate) {
        await saveCustomMaterial(subject, customMaterial, Number(customPointRate));
      }

      Alert.alert('保存しました', `${subject} / ${actualMaterial}\n${amount}${selectedUnit} → ${point} pt`);

      setMaterial('');
      setCustomMaterial('');
      setCustomPointRate('1');
      setContent('');
      setAmount('');
      setDifficulty('');
      setSelectedUnit(unitOptions[0]?.unit ?? '');
      await loadMaterials();
      setIsRecordModalVisible(false);
    } catch (error) {
      console.error('Homescreen handleRecordSave failed', error);
      Alert.alert('エラー', '記録の保存に失敗しました。');
    }
  }, [subject, material, customMaterial, customPointRate, content, amount, selectedUnit, point, difficulty, unitOptions, loadMaterials]);
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
    <ThemedView style={[styles.taskCard, task.done && styles.taskCardDone]}>
      <ThemedView style={styles.taskDetails}>
        <ThemedView style={[styles.taskStatusBadge, task.done && styles.taskStatusBadgeDone]}>
          <ThemedText style={[styles.taskStatusText, task.done && styles.taskStatusTextDone]}>
            {task.done ? '完了' : '今日のタスク'}
          </ThemedText>
        </ThemedView>
        <ThemedText numberOfLines={2} style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
          {task.text}
        </ThemedText>
        <ThemedText style={styles.taskHint}>
          {task.done ? 'おつかれさまでした！' : '終わったらチェックをつけよう'}
        </ThemedText>
      </ThemedView>
      <TouchableOpacity
        accessibilityLabel={task.done ? 'タスクを未完了に戻す' : 'タスクを完了にする'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        onPress={() => onToggle(task.id)}
        style={[styles.completeButton, task.done && styles.completeButtonDone]}
      >
        {task.done && <ThemedText style={styles.completeButtonMark}>✓</ThemedText>}
      </TouchableOpacity>
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
      <ThemedView style={styles.todayHeader}>
        <ThemedText style={styles.sectionTitle}>今日やること</ThemedText>
        <TouchableOpacity style={styles.penButton} onPress={() => setIsRecordModalVisible(true)}>
          <ThemedText style={styles.penButtonText}>✎</ThemedText>
        </TouchableOpacity>
      </ThemedView>

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
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
        </ThemedView>
        <TouchableOpacity style={[styles.addButton, !isInputFocused && styles.addButtonInactive]} onPress={handleAddTask}>
          <ThemedText style={styles.addButtonText}>保存</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {previousMessages.length > 0 && (
        <ThemedView style={styles.leftoverCard}>
          <ThemedView style={styles.leftoverHeader}>
            <ThemedText style={styles.leftoverLabel}>やり残し</ThemedText>
          </ThemedView>
          {previousMessages.map(item => (
            <ThemedView key={item.id} style={styles.leftoverRow}>
              <TouchableOpacity onPress={() => togglePreviousMessage(item.id)} style={styles.checkButton}>
                <ThemedText style={styles.checkButtonText}>{item.done ? '☑' : '☐'}</ThemedText>
              </TouchableOpacity>
              <ThemedText style={[styles.leftoverText, item.done && { textDecorationLine: 'line-through' }]}>
                {item.text}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      )}



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

  const closeRecordModal = () => {
    setIsRecordModalVisible(false);
  };

  const renderRecordModal = () => (
    <Modal
      visible={isRecordModalVisible}
      animationType="slide"
      transparent
      onRequestClose={closeRecordModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>勉強記録を入力</ThemedText>
            <TouchableOpacity onPress={closeRecordModal} style={styles.modalCloseButton}>
              <ThemedText style={styles.modalCloseText}>×</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.modalTabRow}>
            <TouchableOpacity
              style={[styles.modalTab, recordModalTab === 'todo' && styles.modalTabActive]}
              onPress={() => setRecordModalTab('todo')}
            >
              <ThemedText style={[styles.modalTabText, recordModalTab === 'todo' && styles.modalTabTextActive]}>やること</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalTab, recordModalTab === 'record' && styles.modalTabActive]}
              onPress={() => setRecordModalTab('record')}
            >
              <ThemedText style={[styles.modalTabText, recordModalTab === 'record' && styles.modalTabTextActive]}>やったこと</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            <ThemedText style={styles.label}>{recordModalTab === 'todo' ? '科目' : '科目'}</ThemedText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={subject} onValueChange={setSubject}>
                {subjectRules.map(r => (
                  <Picker.Item key={r.subject} label={r.subject} value={r.subject} />
                ))}
              </Picker>
            </View>

            <ThemedText style={styles.label}>教材</ThemedText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={material} onValueChange={setMaterial}>
                <Picker.Item label="選択してください" value="" color="#b8b8b8" />
                {allMaterials.map(m => (
                  <Picker.Item key={m.name} label={m.name} value={m.name} />
                ))}
                <Picker.Item label="＋ 教材を追加 / 編集" value="__custom__" />
              </Picker>
            </View>

            {material === '__custom__' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="教材名を入力"
                  placeholderTextColor="#b8b8b8"
                  value={customMaterial}
                  onChangeText={setCustomMaterial}
                />
                <ThemedText style={styles.label}>ポイント倍率</ThemedText>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  placeholder="例：1 1.2 0.5"
                  placeholderTextColor="#b8b8b8"
                  value={customPointRate}
                  onChangeText={setCustomPointRate}
                />
              </>
            )}

            <ThemedText style={styles.label}>{recordModalTab === 'todo' ? '目標' : '記録'}</ThemedText>
            <TextInput
              style={styles.input}
              placeholder={recordModalTab === 'todo' ? '例：二次関数を30問解く' : '例：二次関数を30問解いた'}
              placeholderTextColor="#b8b8b8"
              value={recordModalTab === 'todo' ? modalTaskText : content}
              onChangeText={text => recordModalTab === 'todo' ? setModalTaskText(text) : setContent(text)}
            />

            <ThemedText style={styles.label}>難易度</ThemedText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={difficulty} onValueChange={value => setDifficulty(value as Difficulty)}>
                  <Picker.Item label="選択しない（1.0倍）" value="" color="#b8b8b8" />
                <Picker.Item label="★★（1.5倍）" value="2" />
                <Picker.Item label="★★★（1.8倍）" value="3" />
              </Picker>
            </View>

            <ThemedText style={styles.label}>単位</ThemedText>
            {unitOptions.length > 0 ? (
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={selectedUnit} onValueChange={setSelectedUnit}>
                  <Picker.Item label="選択してください" value="" color="#b8b8b8" />
                  {unitOptions.map(u => (
                    <Picker.Item key={u.unit} label={`${u.unit} (${u.pointPerUnit}pt)`} value={u.unit} />
                  ))}
                </Picker>
              </View>
            ) : (
              <ThemedText style={styles.noDataText}>設定画面で単位を設定してください</ThemedText>
            )}

            <ThemedText style={styles.label}>量（{selectedUnit || '単位'}）</ThemedText>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="例：5"
              placeholderTextColor="#b8b8b8"
              value={amount}
              onChangeText={setAmount}
            />

            <ThemedView style={styles.pointBox}>
              <ThemedText style={styles.pointText}>今回のポイント：{point} pt</ThemedText>
              <ThemedText style={styles.pointHintText}>
                計算：{amount || 0}{selectedUnit || '単位'} × {selectedUnitRule?.pointPerUnit ?? 0}pt × {(difficulty === '1' ? 1.2 : difficulty === '2' ? 1.5 : difficulty === '3' ? 1.8 : 1).toFixed(1)}倍 = {point}pt
              </ThemedText>
            </ThemedView>

            <TouchableOpacity
              style={styles.addButton}
              onPress={recordModalTab === 'todo' ? handleModalAddTask : handleRecordSave}
            >
              <ThemedText style={styles.addButtonText}>
                {recordModalTab === 'todo' ? '目標を保存' : '記録を保存'}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );


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
        {renderRecordModal()}
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

        <ThemedView style={styles.twoColumnsVertical}>
          <ThemedView style={styles.columnFull}>{renderTasks()}</ThemedView>
        </ThemedView>
        {renderRecordModal()}
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

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e8e2ff',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  inputField: {
    flex: 1,
    marginBottom: 0,
    width: '100%',
  },

  input: {
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontFamily: Fonts.rounded,
  },

  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#5b2f6f',
  },

  noDataText: {
    fontSize: 14,
    color: '#7a4b78',
    marginBottom: 12,
  },

  pointBox: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },

  pointText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#6e3c7a',
  },

  pointHintText: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    color: '#7a4b78',
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

  leftoverCard: {
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 20,
    backgroundColor: '#faf7ff',
    padding: 12,
    marginBottom: 12,
  },

  leftoverHeader: {
    backgroundColor: '#f0ebff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },

  leftoverLabel: {
    color: '#6e3c7a',
    fontWeight: '700',
    fontSize: 14,
  },

  leftoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ebff',
  },

  leftoverText: {
    flex: 1,
    color: '#6e3c7a',
    fontSize: 16,
  },

  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  penButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0ebff',
  },

  penButtonText: {
    fontSize: 18,
    color: '#6e3c7a',
    transform: [{ scaleX: -1 }],
  },

  modalTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#faf7ff',
  },

  modalTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  modalTabActive: {
    borderBottomColor: '#aaacf5ff',
  },

  modalTabText: {
    color: '#7a4b78',
    fontSize: 16,
    fontWeight: '600',
  },

  modalTabTextActive: {
    color: '#6e3c7a',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e9e1ff',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6e3c7a',
  },

  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f0ff',
  },

  modalCloseText: {
    fontSize: 20,
    color: '#6e3c7a',
    lineHeight: 22,
  },

  modalContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  modalContentInner: {
    paddingBottom: 16,
  },

  addButtonInactive: {
    backgroundColor: '#e8e2ff',
  },

  addButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  box: {
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 20,
    padding: 16,
  },

  recordBox: {
    marginTop: 16,
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

  twoColumnsVertical: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  column: { flex: 1, marginRight: 8 },

  columnFull: {
    flex: 1,
    marginBottom: 20,
    width: '100%',
  },

  saveButton: {
    marginLeft: 8,
    backgroundColor: '#aaacf5ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 126,
    backgroundColor: '#f2efff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e3dcff',
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 16,
    marginBottom: 12,
  },

  taskCardDone: {
    backgroundColor: '#fbfaff',
    borderColor: '#eae6f8',
  },

  taskDetails: {
    flex: 1,
  },

  taskStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ded6ff',
  },

  taskStatusBadgeDone: {
    backgroundColor: '#e8e6f4',
  },

  taskStatusText: {
    color: '#554a8e',
    fontSize: 13,
    fontWeight: '700',
  },

  taskStatusTextDone: {
    color: '#77728e',
  },

  taskTitle: {
    flex: 1,
    color: '#302d45',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 29,
    marginTop: 8,
  },

  taskTitleDone: {
    color: '#68657a',
    textDecorationLine: 'line-through',
  },

  taskHint: {
    color: '#7e7996',
    fontSize: 13,
    marginTop: 5,
  },

  completeButton: {
    width: 44,
    height: 44,
    marginLeft: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#aaa5d6',
    backgroundColor: '#fff',
  },

  completeButtonDone: {
    borderColor: '#8d87c8',
    backgroundColor: '#8d87c8',
  },

  completeButtonMark: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 30,
  },
});
