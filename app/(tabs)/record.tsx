import { Picker } from '@react-native-picker/picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getCustomMaterialsBySubject, getUnitPointRulesBySubject, saveCustomMaterial, saveRecord } from '../../lib/recordStore';

/* =====================
   型定義
===================== */
type Subject = '数学' | '英語' | '国語' | '理科' | '社会';

type SubjectRule = {
  subject: Subject;
  unit: string;
};

type PointRule = {
  [material: string]: number;
};

type PointRules = {
  [key in Subject]: PointRule;
};

/* =====================
   初期データ
===================== */
const subjectRules: SubjectRule[] = [
  { subject: '数学', unit: '問' },
  { subject: '英語', unit: '語' },
  { subject: '国語', unit: 'ページ' },
  { subject: '理科', unit: '問' },
  { subject: '社会', unit: 'ページ' },
];

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
  const [customMaterial, setCustomMaterial] = useState('');
  const [customPointRate, setCustomPointRate] = useState('1');

  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');

  const [selectedUnit, setSelectedUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [customPointPerUnit, setCustomPointPerUnit] = useState('1');

  // カスタム教材と定義済み教材を合わせたリスト
  const [allMaterials, setAllMaterials] = useState<{ name: string; rate: number }[]>([]);
  // ユーザー設定の単位とポイント
  const [unitOptions, setUnitOptions] = useState<{ unit: string; pointPerUnit: number }[]>([]);

  const rule = useMemo(
    () => subjectRules.find(r => r.subject === subject),
    [subject]
  );

  // 科目変更時にカスタム教材とユニットルールを読み込む
  useFocusEffect(
    useCallback(() => {
      loadMaterials();
      loadUnitRules();
    }, [subject])
  );

  const loadMaterials = async () => {
    try {
      // 定義済み教材
      const baseMaterials = Object.entries(pointRules[subject]).map(([name, rate]) => ({
        name,
        rate,
      }));

      // カスタム教材を取得
      const customMaterials = await getCustomMaterialsBySubject(subject);
      const customMaterialsList = customMaterials.map(cm => ({
        name: cm.material,
        rate: cm.pointRate,
      }));

      // 合わせる（重複は除く）
      const materialMap = new Map<string, number>();
      baseMaterials.forEach(m => materialMap.set(m.name, m.rate));
      customMaterialsList.forEach(m => materialMap.set(m.name, m.rate));

      setAllMaterials(Array.from(materialMap).map(([name, rate]) => ({ name, rate })));
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const loadUnitRules = async () => {
    try {
      const rules = await getUnitPointRulesBySubject(subject);
      setUnitOptions(rules.map(r => ({ unit: r.unit, pointPerUnit: r.pointPerUnit })));
      // 最初のユニットを選択
      if (rules.length > 0) {
        setSelectedUnit(rules[0].unit);
      }
    } catch (error) {
      console.error('Failed to load unit rules:', error);
    }
  };

  /* =====================
     実際に使う教材名
  ===================== */
  const actualMaterial =
    material === '__custom__' ? customMaterial : material;

  /* =====================
     実際に使う単位
  ===================== */
  const actualUnit = customUnit || selectedUnit;

  /* =====================
     ポイント計算（単位ベース）
  ===================== */
  const point = useMemo(() => {
    const num = Number(amount);
    if (!num || !actualUnit) return 0;

    const unitRule = unitOptions.find(u => u.unit === actualUnit);
    if (!unitRule) return 0;

    return Math.floor(num * unitRule.pointPerUnit);
  }, [amount, actualUnit, unitOptions]);

  /* =====================
     保存
  ===================== */
  const handleSave = useCallback(async () => {
    console.log('=== handleSave called ===');
    console.log('Validation:', { actualMaterial, content, amount, actualUnit });
    
    if (!actualMaterial || !content || !amount || !actualUnit) {
      Alert.alert('入力不足', 'すべて入力してください');
      return;
    }

    try {
      const record = {
        date: new Date().toISOString().slice(0, 10),
        subject,
        material: actualMaterial,
        content,
        amount: Number(amount),
        unit: actualUnit,
        point,
      };

      // recordを保存（FirebaseまたはAsyncStorageにフォールバック）
      try {
        const recordId = await saveRecord(record);
        console.log('記録保存成功:', { recordId, record });
      } catch (saveError) {
        console.error('記録保存失敗:', saveError);
        throw saveError;
      }

      // カスタム教材の場合は保存
      if (material === '__custom__' && customPointRate) {
        try {
          await saveCustomMaterial(subject, customMaterial, Number(customPointRate));
          console.log('カスタム教材保存成功');
        } catch (cmError) {
          console.error('カスタム教材保存失敗:', cmError);
        }
      }

      Alert.alert(
        '保存しました',
        `${subject} / ${actualMaterial}\n${amount}${actualUnit} → ${point} pt`
      );

      // フォームをリセット
      setMaterial('');
      setCustomMaterial('');
      setCustomPointRate('1');
      setContent('');
      setAmount('');
      setCustomUnit('');
      setCustomPointPerUnit('1');

      // 教材リストを再読み込み後、最初のユニットを選択
      try {
        const units = await getUnitPointRulesBySubject(subject);
        if (units.length > 0) {
          setSelectedUnit(units[0].unit);
        } else {
          setSelectedUnit('');
        }
      } catch (error) {
        console.error('Failed to load unit rules:', error);
      }

      // 記録画面に戻す（oldrecordのuseFocusEffectが発動して自動更新される）
      setTimeout(() => {
        router.push('/oldrecord');
      }, 500);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('エラー', '保存に失敗しました');
    }
  }, [actualMaterial, content, amount, actualUnit, material, customPointRate, subject, point, customMaterial]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>勉強を記録</Text>

      {/* 科目 */}
      <Text style={styles.label}>科目</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={subject} onValueChange={setSubject}>
          {subjectRules.map(r => (
            <Picker.Item key={r.subject} label={r.subject} value={r.subject} />
          ))}
        </Picker>
      </View>

      {/* 教材 */}
      <Text style={styles.label}>教材</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={material} onValueChange={setMaterial}>
          <Picker.Item label="選択してください" value="" />
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
            value={customMaterial}
            onChangeText={setCustomMaterial}
          />
          <Text style={styles.label}>ポイント倍率</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="例：1 1.2 0.5"
            value={customPointRate}
            onChangeText={setCustomPointRate}
          />
        </>
      )}

      {/* 内容 */}
      <Text style={styles.label}>内容</Text>
      <TextInput
        style={styles.input}
        placeholder="例：二次関数、長文①"
        value={content}
        onChangeText={setContent}
      />

      {/* 単位選択 */}
      <Text style={styles.label}>単位</Text>
      {unitOptions.length > 0 ? (
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={selectedUnit} onValueChange={setSelectedUnit}>
            <Picker.Item label="選択してください" value="" />
            {unitOptions.map(u => (
              <Picker.Item key={u.unit} label={`${u.unit} (${u.pointPerUnit}pt)`} value={u.unit} />
            ))}
          </Picker>
        </View>
      ) : (
        <Text style={styles.noDataText}>設定画面で単位を設定してください</Text>
      )}

      {/* カスタム単位 */}
      <View style={styles.switchRow}>
        <Text>カスタム単位を使う</Text>
        <Switch value={!!customUnit} onValueChange={val => setCustomUnit(val ? '' : '')} />
      </View>

      {customUnit !== undefined && customUnit !== '' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="単位名を入力（例：セット、分）"
            value={customUnit}
            onChangeText={setCustomUnit}
          />
          <Text style={styles.label}>この単位の1あたりのポイント</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="例：1 2 0.5"
            value={customPointPerUnit}
            onChangeText={setCustomPointPerUnit}
          />
        </>
      )}

      {/* 量 */}
      <Text style={styles.label}>
        量（{actualUnit ?? '単位'}）
      </Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* ポイント */}
      <View style={styles.pointBox}>
        <Text style={styles.pointText}>今回のポイント：{point} pt</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>保存</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* =====================
   styles
===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: '#fff3ff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#6d3f7f',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#5b2f6f',
  },
  noDataText: {
    fontSize: 14,
    color: '#7a4b78',
    marginBottom: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e8e2ff',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#fff3ff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fbf7ff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pointBox: {
    backgroundColor: '#faf4ff',
    padding: 16,
    borderRadius: 18,
    marginBottom: 24,
  },
  pointText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#6e3c7a',
  },
  button: {
    backgroundColor: '#aaacf5ff',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#d6d8ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
