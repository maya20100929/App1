import { Picker } from '@react-native-picker/picker';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

/* =====================
   型定義
===================== */
type Subject = '数学' | '英語' | '国語' | '理科' | '社会';

type SubjectRule = {
  subject: Subject;
  unit: string;
};

type PointRule = {
  [material: string]: number; // 1単位あたりのpt
};

type PointRules = {
  [key in Subject]: PointRule;
};

/* =====================
   科目ごとの単位
===================== */
const subjectRules: SubjectRule[] = [
  { subject: '数学', unit: '問' },
  { subject: '英語', unit: '語' },
  { subject: '国語', unit: 'ページ' },
  { subject: '理科', unit: '問' },
  { subject: '社会', unit: 'ページ' },
];

/* =====================
   教材ごとのポイント換算
===================== */
const pointRules: PointRules = {
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
};

export default function RecordScreen() {
  const [subject, setSubject] = useState<Subject>('数学');
  const [material, setMaterial] = useState('');
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');

  const rule = useMemo(
    () => subjectRules.find(r => r.subject === subject),
    [subject]
  );

  /* =====================
     ポイント計算
  ===================== */
  const point = useMemo(() => {
    const num = Number(amount);
    if (!num || !material) return 0;

    const rate = pointRules[subject][material];
    if (!rate) return 0;

    return Math.floor(num * rate);
  }, [amount, material, subject]);

  /* =====================
     保存（仮）
  ===================== */
  const handleSave = () => {
    if (!material || !content || !amount) {
      Alert.alert('入力不足', 'すべて入力してください');
      return;
    }

    const record = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      subject,
      material,
      content,
      amount: Number(amount),
      unit: rule?.unit,
      point,
    };

    console.log('保存データ', record);

    Alert.alert(
      '保存しました',
      `${subject} / ${material}\n${amount}${rule?.unit} → ${point} pt`
    );

    setMaterial('');
    setContent('');
    setAmount('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>勉強を記録</Text>

      {/* 科目 */}
      <Text style={styles.label}>科目</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={subject} onValueChange={setSubject}>
          {subjectRules.map(r => (
            <Picker.Item
              key={r.subject}
              label={r.subject}
              value={r.subject}
            />
          ))}
        </Picker>
      </View>

      {/* 教材 */}
      <Text style={styles.label}>教材</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={material}
          onValueChange={setMaterial}
        >
          <Picker.Item label="選択してください" value="" />
          {Object.keys(pointRules[subject]).map(m => (
            <Picker.Item key={m} label={m} value={m} />
          ))}
        </Picker>
      </View>

      {/* 内容 */}
      <Text style={styles.label}>内容</Text>
      <TextInput
        style={styles.input}
        placeholder="例：二次関数、長文①"
        value={content}
        onChangeText={setContent}
      />

      {/* 量 */}
      <Text style={styles.label}>量（{rule?.unit}）</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* ポイント */}
      <View style={styles.pointBox}>
        <Text style={styles.pointText}>
          今回のポイント：{point} pt
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>保存</Text>
      </TouchableOpacity>
    </View>
  );
}

/* =====================
   styles
===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  pointBox: {
    backgroundColor: '#eef0ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  pointText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6b6ff5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
