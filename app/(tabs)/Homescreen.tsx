import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { getSubjectSettings, type SubjectSetting } from '../../lib/subjectStore';

// 日本時間の YYYY-MM-DD を取得
const getJapanDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\//g, '-');
};

const HomeScreen: FC = () => {
  const params = useLocalSearchParams<{ attack?: string; attackGoal?: string; attackDuration?: string }>();

  type Task = {
    id: string;
    text: string;
    done: boolean;
    date: string;
    archived?: boolean;
    subject?: Subject;
    category?: string;
    material?: string;
    amount?: number;
    unit?: string;
    difficulty?: Difficulty;
    durationMinutes?: number;
  };

  type Difficulty = '' | '1' | '2' | '3';

  const pointRules = {
    数学: {
      青チャート: 1,
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
  const [recordingTaskId, setRecordingTaskId] = useState<string | null>(null);
  const [modalTaskText, setModalTaskText] = useState('');
  const newTaskInputRef = React.useRef<TextInput | null>(null);
  const [previousMessages, setPreviousMessages] = useState<Task[]>([]);
  const [subject, setSubject] = useState<Subject>('数学');
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [customMaterial, setCustomMaterial] = useState('');
  const [customPointRate, setCustomPointRate] = useState('1');
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [allMaterials, setAllMaterials] = useState<{ name: string; rate: number }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ unit: string; pointPerUnit: number }[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectSettings, setSubjectSettings] = useState<SubjectSetting[]>([]);
  const [dayBoundaryTick, setDayBoundaryTick] = useState(0);
  const [isAttackRecordMode, setIsAttackRecordMode] = useState(false);

  useEffect(() => {
    if (params.attack !== '1') return;

    setRecordingTaskId(null);
    setRecordModalTab('record');
    setContent(params.attackGoal ?? 'タイムアタック');
    setDurationMinutes(params.attackDuration ?? '');
    setIsAttackRecordMode(true);
    setIsRecordModalVisible(true);
  }, [params.attack, params.attackGoal, params.attackDuration]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      console.log('Homescreen: onAuthStateChanged', { uid: u?.uid ?? null });
      setUser(u);
    });
    return () => unsub();
  }, []);

  useFocusEffect(
    useCallback(() => {
      getSubjectSettings()
        .then(settings => {
          setSubjectSettings(settings);
          setSubjects(settings.map(item => item.name));
        })
        .catch(error => console.error('Homescreen load subjects failed', error));
    }, [])
  );

  const categories = useMemo(
    () => subjectSettings.find(item => item.name === subject)?.categories ?? [],
    [subject, subjectSettings]
  );

  // 日本時間の日付が変わったら一覧を再判定する
useEffect(() => {
  let timer: ReturnType<typeof setTimeout>;

  const scheduleNextJapanMidnight = () => {
    const now = new Date();

    // 現在の日本時間の日付
    const japanToday = getJapanDateString(now);

    // 翌日の日付を作る
    const tomorrow = new Date(`${japanToday}T00:00:00+09:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);

    timer = setTimeout(() => {
      setDayBoundaryTick(tick => tick + 1);
      scheduleNextJapanMidnight();
    }, Math.max(1000, tomorrow.getTime() - now.getTime()));
  };

  scheduleNextJapanMidnight();

  return () => clearTimeout(timer);
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

      const today = getJapanDateString();

const todayArr: Task[] = [];
const pastArr: Task[] = [];
const archivedArr: Task[] = [];

all.forEach(t => {
  if (t.archived) {
    archivedArr.push(t);
    return;
  }

  // 完了済みのタスクは当日だけ表示する
  if (t.done && t.date < today) {
    return;
  }

  // 未完了で日付が過去なら「やり残し」
  if (!t.done && t.date < today) {
    pastArr.push(t);
  } else {
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
  }, [user, dayBoundaryTick]);

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
      const baseMaterials = Object.entries(pointRules[subject as keyof typeof pointRules] ?? {}).map(([name, rate]) => ({
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

  // Date
  if (raw instanceof Date) {
    return getJapanDateString(raw);
  }

  // Firestore Timestamp
  if ((raw as any)?.toDate && typeof (raw as any).toDate === 'function') {
    try {
      return getJapanDateString((raw as any).toDate());
    } catch (e) {
      return '';
    }
  }

  // string
  if (typeof raw === 'string') {
    const trimmed = raw.trim();

    // すでに YYYY-MM-DD の場合はそのまま使用
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);

    if (!isNaN(parsed.getTime())) {
      return getJapanDateString(parsed);
    }

    return trimmed;
  }

  // number（Unix timestamp）
  if (typeof raw === 'number') {
    const d = new Date(raw);

    return isNaN(d.getTime())
      ? ''
      : getJapanDateString(d);
  }

  // その他
  try {
    const d = new Date(raw);

    return isNaN(d.getTime())
      ? ''
      : getJapanDateString(d);
  } catch (e) {
    return '';
  }
};

useEffect(() => {
  const today = getJapanDateString();

  setTodayTasks(prev => {
    const stillToday: Task[] = [];
    const moved: Task[] = [];

    prev.forEach(task => {
      if (task.done && task.date < today) {
        return;
      }

      if (!task.done && task.date < today) {
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
}, [dayBoundaryTick]);

  const [todayTasks, setTodayTasks] = useState<Task[]>([]);

  const [pastTasks, setPastTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  // 今日の勉強時間を集計
  const todayStudyMinutes = useMemo(() => {
    const today = getJapanDateString();

    return todayTasks.reduce((total, task) => {
      if (task.date !== today || !task.done) return total;
      return total + (task.durationMinutes ?? 0);
    }, 0);
  }, [todayTasks]);

  const studyHours = Math.floor(todayStudyMinutes / 60);
  const studyMinutes = todayStudyMinutes % 60;



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

  const deleteTask = (id: string) => {
    (async () => {
      if (!user) {
        const allTasks = [...todayTasks, ...pastTasks, ...archivedTasks];
        const target = allTasks.find(task => task.id === id);
        if (!target) return;

        setTodayTasks(prev => prev.filter(task => task.id !== id));
        setPastTasks(prev => prev.filter(task => task.id !== id));
        setArchivedTasks(prev => [...prev.filter(task => task.id !== id), { ...target, archived: true }]);
        return;
      }

      try {
        await updateDoc(doc(db, 'users', user.uid, 'tasks', id), { archived: true });
      } catch (error) {
        console.warn('deleteTask failed', error);
        Alert.alert('エラー', 'タスクの削除に失敗しました。');
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

    const dateStr = getJapanDateString();
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
    const actualMaterial = material === '__custom__' ? customMaterial.trim() : material;
    const numericAmount = Number(amount);
    const hasAmount = Number.isFinite(numericAmount) && numericAmount > 0 && !!selectedUnit;

    if (!text || !actualMaterial) {
      Alert.alert('入力不足', '教材と目標を入力してください。');
      return;
    }

    const dateStr = getJapanDateString();
    const newTask = {
      id: `local-${Date.now()}`,
      text,
      done: false,
      date: dateStr,
      archived: false,
      subject,
      ...(category ? { category } : {}),
      material: actualMaterial,
      ...(hasAmount ? { amount: numericAmount, unit: selectedUnit } : {}),
      ...(hasAmount && difficulty ? { difficulty } : {}),
    };

    if (!user) {
      setTodayTasks(prev => [...prev, newTask]);
      setModalTaskText('');
      setMaterial('');
      setCustomMaterial('');
      setCustomPointRate('1');
      setAmount('');
      setDifficulty('');
      setCategory('');
      setIsRecordModalVisible(false);
      console.log('Homescreen: saved modal task locally');
      return;
    }

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    try {
      console.log('Homescreen: adding modal task', text);
      await addDoc(tasksRef, {
        text,
        done: false,
        date: dateStr,
        archived: false,
        subject,
        ...(category ? { category } : {}),
        material: actualMaterial,
        ...(hasAmount ? { amount: numericAmount, unit: selectedUnit } : {}),
        ...(hasAmount && difficulty ? { difficulty } : {}),
        createdAt: Date.now(),
      });
      setModalTaskText('');
      setMaterial('');
      setCustomMaterial('');
      setCustomPointRate('1');
      setAmount('');
      setDifficulty('');
      setCategory('');
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
  const shouldShowSelectedMaterial =
    !!material && material !== '__custom__' && !allMaterials.some(item => item.name === material);

  const completeTaskAfterRecord = useCallback(async (
    id: string,
    record: {
      subject: Subject;
      category?: string;
      material: string;
      content: string;
      amount: number;
      unit: string;
      durationMinutes?: number;
      difficulty?: Difficulty;
    }
  ) => {
    const taskUpdate = {
      done: true,
      text: record.content || `${record.material} ${record.amount}${record.unit}`,
      subject: record.subject,
      ...(record.category ? { category: record.category } : {}),
      material: record.material,
      amount: record.amount,
      unit: record.unit,
      ...(record.durationMinutes ? { durationMinutes: record.durationMinutes } : {}),
      ...(record.difficulty ? { difficulty: record.difficulty } : {}),
    };
    const isStoredTask =
      todayTasks.some(task => task.id === id) ||
      pastTasks.some(task => task.id === id) ||
      archivedTasks.some(task => task.id === id);

    if (!isStoredTask) {
      setPreviousMessages(prev => prev.map(task => task.id === id ? { ...task, ...taskUpdate } : task));
      return;
    }

    if (!user) {
      setTodayTasks(prev => prev.map(task => task.id === id ? { ...task, ...taskUpdate } : task));
      setPastTasks(prev => prev.map(task => task.id === id ? { ...task, ...taskUpdate } : task));
      setArchivedTasks(prev => prev.map(task => task.id === id ? { ...task, ...taskUpdate } : task));
      return;
    }

    await updateDoc(doc(db, 'users', user.uid, 'tasks', id), taskUpdate);
  }, [archivedTasks, pastTasks, todayTasks, user]);

  const addCompletedTaskFromRecord = useCallback(async (
    record: {
      subject: Subject;
      category?: string;
      material: string;
      content: string;
      amount: number;
      unit: string;
      durationMinutes?: number;
      difficulty?: Difficulty;
    }
  ) => {
    const dateStr = getJapanDateString();
    const text = record.content || `${record.material} ${record.amount}${record.unit}`;
    const newTask = {
      id: `local-record-${Date.now()}`,
      text,
      done: true,
      date: dateStr,
      archived: false,
      subject: record.subject,
      ...(record.category ? { category: record.category } : {}),
      material: record.material,
      amount: record.amount,
      unit: record.unit,
      ...(record.durationMinutes ? { durationMinutes: record.durationMinutes } : {}),
      ...(record.difficulty ? { difficulty: record.difficulty } : {}),
    };

    if (!user) {
      setTodayTasks(prev => [...prev, newTask]);
      return;
    }

    await addDoc(collection(db, 'users', user.uid, 'tasks'), {
      text,
      done: true,
      date: dateStr,
      archived: false,
      subject: record.subject,
      ...(record.category ? { category: record.category } : {}),
      material: record.material,
      amount: record.amount,
      unit: record.unit,
      ...(record.durationMinutes ? { durationMinutes: record.durationMinutes } : {}),
      ...(record.difficulty ? { difficulty: record.difficulty } : {}),
      createdAt: Date.now(),
    });
  }, [user]);

  const handleRecordSave = useCallback(async () => {
    console.log("handleRecordSave");
    const actualMaterial = material === '__custom__' ? customMaterial.trim() : material;
    const numericAmount = Number(amount);
    const duration = Number(durationMinutes);
    if (!subject || !actualMaterial || !amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('入力不足', '科目・教材・量を入力してください');
      return;
    }
    if (durationMinutes && (!Number.isFinite(duration) || duration <= 0)) {
      Alert.alert('入力内容を確認してください', 'かかった時間は1分以上の数字で入力してください。');
      return;
    }

    try {
      const record = {
        date: getJapanDateString(),
        subject,
        ...(category ? { category } : {}),
        material: actualMaterial,
        content: content.trim(),
        amount: numericAmount,
        unit: selectedUnit,
        point,
        ...(durationMinutes ? { durationMinutes: duration } : {}),
        ...(difficulty ? { difficulty } : {}),
      };

      const recordId = await saveRecord(record);
      console.log('Homescreen record saved', { recordId, record });

      if (material === '__custom__' && customPointRate) {
        await saveCustomMaterial(subject, customMaterial, Number(customPointRate));
      }

      if (recordingTaskId) {
        await completeTaskAfterRecord(recordingTaskId, record);
      } else {
        await addCompletedTaskFromRecord(record);
      }

      Alert.alert('保存しました', `${subject}${category ? `（${category}）` : ''} / ${actualMaterial}\n${amount}${selectedUnit} → ${point} pt`);

      setMaterial('');
      setCustomMaterial('');
      setCustomPointRate('1');
      setContent('');
      setAmount('');
      setDurationMinutes('');
      setDifficulty('');
      setCategory('');
      setSelectedUnit(unitOptions[0]?.unit ?? '');
      setRecordingTaskId(null);
      setIsAttackRecordMode(false);
      await loadMaterials();
      setIsRecordModalVisible(false);
    } catch (error) {
      console.error('Homescreen handleRecordSave failed', error);
      Alert.alert('エラー', '記録の保存に失敗しました。');
    }
  }, [subject, category, material, customMaterial, customPointRate, content, amount, durationMinutes, selectedUnit, point, difficulty, recordingTaskId, completeTaskAfterRecord, addCompletedTaskFromRecord, unitOptions, loadMaterials]);

  const openRecordFromTask = useCallback((task: Task) => {
    if (task.subject) {
      setSubject(task.subject);
    }
    setCategory(task.category ?? '');
    setRecordingTaskId(task.id);
    setRecordModalTab('record');
    setMaterial(task.material ?? '');
    setCustomMaterial('');
    setCustomPointRate('1');
    setContent(task.text);
    setAmount(task.amount ? String(task.amount) : '');
    setSelectedUnit(task.unit ?? '');
    setDifficulty(task.difficulty ?? '');
    setDurationMinutes(task.durationMinutes ? String(task.durationMinutes) : '');
    setIsRecordModalVisible(true);
  }, []);
  const { width } = useWindowDimensions();
  const isPC = width > 600;
  const isMobile = !isPC;

  type TaskRowProps = {
    task: Task;
    isLeftover?: boolean;
    editingTaskId: string | null;
    editingText: string;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onOpenRecord: (task: Task) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
    onStartEdit: (task: Task) => void;
    onSetEditingText: (text: string) => void;
  };

  const TaskRow: FC<TaskRowProps> = ({
    task,
    isLeftover = false,
    editingTaskId,
    editingText,
    onToggle,
    onDelete,
    onOpenRecord,
    onSaveEdit,
    onCancelEdit,
    onStartEdit,
    onSetEditingText,
  }) => {
    const translateY = React.useRef(new Animated.Value(12)).current;
    const opacity = React.useRef(new Animated.Value(0)).current;
    const shouldAnimate = task.done;
    const taskTitle = task.material || task.text;
    const taskAmount = task.amount ? `${task.amount}${task.unit ?? ''}` : '';
    const difficultyLabel = task.difficulty === '2' ? '★★' : task.difficulty === '3' ? '★★★' : '';

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
        <TouchableOpacity
          accessibilityLabel={task.done ? 'タスクを未完了に戻す' : 'タスクを完了にする'}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          onPress={() => task.done ? onToggle(task.id) : onOpenRecord(task)}
          style={[styles.taskCheckButton, task.done && styles.taskCheckButtonDone]}
        >
          {task.done && <ThemedText style={styles.taskCheckMark}>✓</ThemedText>}
        </TouchableOpacity>
        {task.done ? (
          <TouchableOpacity
            accessibilityLabel="このタスクの記録を確認する"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => onOpenRecord(task)}
            style={styles.taskDetails}
          >
            <ThemedView style={[styles.taskStatusBadge, styles.taskStatusBadgeDone]}>
              <ThemedText style={[styles.taskStatusText, styles.taskStatusTextDone]}>
                {task.subject || (isLeftover ? 'やり残し' : '今日のタスク')}
              </ThemedText>
              {isLeftover && task.subject && (
                <ThemedText style={styles.taskLeftoverLabel}>やり残し</ThemedText>
              )}
            </ThemedView>
            <ThemedText numberOfLines={2} style={[styles.taskTitle, styles.taskTitleDone]}>
              {taskTitle}
            </ThemedText>
            {taskAmount && (
              <ThemedText numberOfLines={1} style={styles.taskHint}>
                終了：{taskAmount}
              </ThemedText>
            )}
            {difficultyLabel && (
              <ThemedText style={styles.taskDetailText}>
                {difficultyLabel}
              </ThemedText>
            )}
          </TouchableOpacity>
        ) : (
          <ThemedView style={styles.taskDetails}>
            <ThemedView style={[styles.taskStatusBadge, task.done && styles.taskStatusBadgeDone]}>
              <ThemedText style={[styles.taskStatusText, task.done && styles.taskStatusTextDone]}>
                {task.subject || (isLeftover ? 'やり残し' : '今日のタスク')}
              </ThemedText>
              {isLeftover && task.subject && (
                <ThemedText style={styles.taskLeftoverLabel}>やり残し</ThemedText>
              )}
            </ThemedView>
            <ThemedText numberOfLines={2} style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
              {taskTitle}
            </ThemedText>
            <ThemedText numberOfLines={1} style={styles.taskHint}>
              {task.material ? `目標：${task.text}` : '終わったらチェックをつけよう'}
            </ThemedText>
          </ThemedView>
        )}
        {!task.done && (
          <TouchableOpacity
            accessibilityLabel="タスクを削除する"
            accessibilityRole="button"
            onPress={() => onDelete(task.id)}
            style={styles.deleteTaskButton}
          >
            <ThemedText style={styles.deleteTaskButtonText}>🗑</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );

    if (!shouldAnimate) {
      return (
        <ThemedView style={styles.taskGridItem}>
          {rowContent}
        </ThemedView>
      );
    }

    return (
      <Animated.View
        style={[
          styles.taskGridItem,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {rowContent}
      </Animated.View>
    );
  };

  const renderStudyTime = () => (
    <ThemedView style={styles.studyTimeBox}>
      <ThemedText style={styles.studyTimeTitle}>
        今日の勉強時間
      </ThemedText>

      <ThemedText style={styles.studyTimeValue}>
        {studyHours > 0 ? `${studyHours}時間` : ''}
        {studyMinutes > 0 ? `${studyMinutes}分` : ''}
        {todayStudyMinutes === 0 ? '0分' : ''}
      </ThemedText>
    </ThemedView>
  );

  // 共通レンダリング関数

  const renderTasks = () => (


    <ThemedView style={[styles.section, styles.box]}>
      <ThemedView style={styles.todayHeader}>
        <ThemedText style={styles.sectionTitle}>今日やること</ThemedText>
        <TouchableOpacity
          style={styles.penButton}
          onPress={() => {
            setRecordingTaskId(null);
            setIsRecordModalVisible(true);
          }}
        >
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
      <ThemedView style={styles.taskGrid}>
        {pastTasks.filter(task => !task.done).map(task => (
          <TaskRow
            key={task.id}
            task={task}
            isLeftover
            editingTaskId={editingTaskId}
            editingText={editingText}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onOpenRecord={openRecordFromTask}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onStartEdit={() => { }}
            onSetEditingText={setEditingText}
          />
        ))}
      </ThemedView>

      {previousMessages.filter(item => !item.done).map(item => (
        <TaskRow
          key={item.id}
          task={{ ...item, date: '' }}
          isLeftover
          editingTaskId={editingTaskId}
          editingText={editingText}
          onToggle={togglePreviousMessage}
          onDelete={(id) => setPreviousMessages(prev => prev.filter(item => item.id !== id))}
          onOpenRecord={openRecordFromTask}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onStartEdit={() => { }}
          onSetEditingText={setEditingText}
        />
      ))}

      {todayTasks.filter(task => !task.done).map(task => (
        <TaskRow
          key={task.id}
          task={task}
          editingTaskId={editingTaskId}
          editingText={editingText}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onOpenRecord={openRecordFromTask}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onStartEdit={(selectedTask) => {
            setEditingTaskId(selectedTask.id);
            setEditingText(selectedTask.text);
          }}
          onSetEditingText={setEditingText}
        />
      ))}

      {pastTasks.filter(task => task.done).map(task => (
        <TaskRow
          key={task.id}
          task={task}
          isLeftover
          editingTaskId={editingTaskId}
          editingText={editingText}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onOpenRecord={openRecordFromTask}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onStartEdit={() => { }}
          onSetEditingText={setEditingText}
        />
      ))}

      {previousMessages.filter(item => item.done).map(item => (
        <TaskRow
          key={item.id}
          task={{ ...item, date: '' }}
          isLeftover
          editingTaskId={editingTaskId}
          editingText={editingText}
          onToggle={togglePreviousMessage}
          onDelete={(id) => setPreviousMessages(prev => prev.filter(item => item.id !== id))}
          onOpenRecord={openRecordFromTask}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onStartEdit={() => { }}
          onSetEditingText={setEditingText}
        />
      ))}

      {todayTasks.filter(task => task.done).map(task => (
        <TaskRow
          key={task.id}
          task={task}
          editingTaskId={editingTaskId}
          editingText={editingText}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onOpenRecord={openRecordFromTask}
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

  // const renderPreviousMessages = () => (
  //   <ThemedView style={styles.section}>
  //     <ThemedText style={styles.sectionTitle}>
  //       引き継ぎ
  //     </ThemedText>
  //     {previousMessages.map(item => (
  //       <ThemedView key={item.id} style={styles.checklistRow}>
  //         <TouchableOpacity onPress={() => togglePreviousMessage(item.id)} style={styles.checkButton}>
  //           <ThemedText style={styles.checkButtonText}>{item.done ? '☑' : '☐'}</ThemedText>
  //         </TouchableOpacity>
  //         <ThemedText style={[styles.bullet, styles.checklistText, item.done && { textDecorationLine: 'line-through' }]}>
  //           {item.text}
  //         </ThemedText>
  //       </ThemedView>
  //     ))}
  //   </ThemedView>
  // );

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
    setRecordingTaskId(null);
    setIsAttackRecordMode(false);
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
            <ThemedText style={styles.modalTitle}>入力する</ThemedText>
            <TouchableOpacity onPress={closeRecordModal} style={styles.modalCloseButton}>
              <ThemedText style={styles.modalCloseText}>×</ThemedText>
            </TouchableOpacity>
          </View>
          {!recordingTaskId && !isAttackRecordMode && (
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
          )}
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            <ThemedText style={styles.label}>{recordModalTab === 'todo' ? '科目' : '科目'}</ThemedText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={subject} onValueChange={value => { setSubject(value); setCategory(''); }}>
                {subjects.map(item => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            {categories.length > 0 && (
              <>
                <ThemedText style={styles.label}>細かい教科</ThemedText>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={category} onValueChange={setCategory}>
                    <Picker.Item label="選択しない" value="" />
                    {categories.map(item => (
                      <Picker.Item key={item} label={item} value={item} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            <ThemedText style={styles.label}>教材</ThemedText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={material} onValueChange={setMaterial}>
                <Picker.Item label="選択してください" value="" color="#b8b8b8" />
                {shouldShowSelectedMaterial && (
                  <Picker.Item label={material} value={material} />
                )}
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
                {recordModalTab === 'record' && (
                  <>
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
              </>
            )}

            <ThemedText style={styles.label}>{recordModalTab === 'todo' ? '目標' : 'メモ'}</ThemedText>
            <TextInput
              style={styles.input}
              placeholder={recordModalTab === 'todo' ? '例：二次関数を30問解く' : '例：二次関数を30問解いた'}
              placeholderTextColor="#b8b8b8"
              value={recordModalTab === 'todo' ? modalTaskText : content}
              onChangeText={text => recordModalTab === 'todo' ? setModalTaskText(text) : setContent(text)}
            />

            {recordModalTab === 'record' && (
              <>
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

                <ThemedText style={styles.label}>かかった時間（分）</ThemedText>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="例：45"
                  placeholderTextColor="#b8b8b8"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />

                <ThemedView style={styles.pointBox}>
                  <ThemedText style={styles.pointText}>今回のポイント：{point} pt</ThemedText>
                  <ThemedText style={styles.pointHintText}>
                    計算：{amount || 0}{selectedUnit || '単位'} × {selectedUnitRule?.pointPerUnit ?? 0}pt × {(difficulty === '1' ? 1.2 : difficulty === '2' ? 1.5 : difficulty === '3' ? 1.8 : 1).toFixed(1)}倍 = {point}pt
                  </ThemedText>
                </ThemedView>
              </>
            )}

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
          <ThemedView style={styles.nextTestRowMobile}>
            <ThemedView>
              <ThemedText style={styles.sectionTitle}>次回テスト日</ThemedText>
              <ThemedText style={styles.dateDisplay}>
                {testDateText || '日付が未設定'}
              </ThemedText>
            </ThemedView>
            {renderStudyTime()}
          </ThemedView>
          {/* アタックは上部バーから移動できるためここでは表示しない */}

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
              {renderStudyTime()}
            </ThemedView>
            <ThemedView style={{ height: 30 }} />

        {/* アタックは上部バーから移動できるためここでは表示しない */}

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
    minWidth: 120,
    marginBottom: 6,
    textAlign: 'left',
    fontWeight: '700',
  },

  studyTimeBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aaacf5ff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 12,
  },

  nextTestRowMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },

  studyTimeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6e3c7a',
    marginBottom: 4,
    textAlign: 'center',
  },

  studyTimeValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#aaacf5ff',
    textAlign: 'center',
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

  attackButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    backgroundColor: '#ff8e72',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  attackButtonText: { color: '#fff', fontWeight: '800' },

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
    paddingVertical: 16,
    paddingLeft: 12,
    paddingRight: 8,
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

  taskGridItem: {
    width: '50%',
    marginBottom: 10,
  },

  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
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
    minHeight: 98,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9e1ff',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    marginBottom: 10,
  },

  taskCardDone: {
    backgroundColor: '#fff',
    borderColor: '#e9e1ff',
  },

  taskDetails: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  taskCheckButton: {
    width: 24,
    height: 24,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#aaa5d6',
    backgroundColor: '#fff',
  },

  taskCheckButtonDone: {
    borderColor: '#8d87c8',
    backgroundColor: '#8d87c8',
  },

  taskCheckMark: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },

  taskStatusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
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

  taskLeftoverLabel: {
    color: '#8b5d84',
    fontSize: 13,
    fontWeight: '700',
  },

  taskTitle: {
    flex: 1,
    color: '#302d45',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    marginTop: 5,
  },

  taskTitleDone: {
    color: '#68657a',
    textDecorationLine: 'line-through',
  },

  taskHint: {
    color: '#625c80',
    fontSize: 13,
    marginTop: 3,
  },

  taskDetailText: {
    color: '#625c80',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  deleteTaskButton: {
    width: 32,
    height: 32,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f7e8ed',
  },

  deleteTaskButtonText: {
    fontSize: 16,
    lineHeight: 19,
  },

});
