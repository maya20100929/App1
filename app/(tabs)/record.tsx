import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { Picker } from '@react-native-picker/picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getCustomMaterialsBySubject, getUnitPointRulesBySubject, saveCustomMaterial, saveRecord, type Subject } from '../../lib/recordStore';
import { getSubjects } from '../../lib/subjectStore';

/* =====================
   型定義
===================== */
type Difficulty = '' | '1' | '2' | '3';

type PointRule = {
  [material: string]: number;
};


/* =====================
   初期データ
===================== */
const pointRules: Record<string, PointRule> = {
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
  const [subjects, setSubjects] = useState<string[]>([]);

  const [material, setMaterial] = useState('');
  const [customMaterial, setCustomMaterial] = useState('');
  const [customPointRate, setCustomPointRate] = useState('1');

  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('');

  const [selectedUnit, setSelectedUnit] = useState('');

  // カスタム教材と定義済み教材を合わせたリスト
  const [allMaterials, setAllMaterials] = useState<{ name: string; rate: number }[]>([]);
  // ユーザー設定の単位とポイント
  const [unitOptions, setUnitOptions] = useState<{ unit: string; pointPerUnit: number }[]>([]);

  const difficultyMultiplier = useMemo(() => {
    switch (difficulty) {
      case '1':
        return 1.2;
      case '2':
        return 1.5;
      case '3':
        return 1.8;
      default:
        return 1;
    }
  }, [difficulty]);

  const actualMaterial = material === '__custom__' ? customMaterial : material;
  const actualUnit = selectedUnit;

  const materialRate = useMemo(() => {
    if (!actualMaterial) return 1;

    if (material === '__custom__') {
      const parsed = Number(customPointRate);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }

    const matchedMaterial = allMaterials.find(item => item.name === actualMaterial);
    return Number(matchedMaterial?.rate ?? 1);
  }, [actualMaterial, allMaterials, customPointRate, material]);

  const loadMaterials = useCallback(async () => {
    try {
      // 定義済み教材
      const baseMaterials = Object.entries(pointRules[subject] ?? {}).map(([name, rate]) => ({
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
  }, [subject]);

  const loadUnitRules = useCallback(async () => {
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
  }, [subject]);

  // 科目変更時にカスタム教材とユニットルールを読み込む
  useFocusEffect(
    useCallback(() => {
      loadMaterials();
      loadUnitRules();
      getSubjects().then(setSubjects).catch(error => console.error('Failed to load subjects:', error));
    }, [loadMaterials, loadUnitRules])
  );

  /* =====================
     ポイント計算（単位ベース）
  ===================== */
  const selectedUnitRule = useMemo(() => {
    if (!actualUnit) return null;
    return unitOptions.find(u => u.unit === actualUnit) ?? null;
  }, [actualUnit, unitOptions]);

  const basePoint = useMemo(() => {
    const num = Number(amount);
    if (!Number.isFinite(num) || !num || !actualUnit || !selectedUnitRule) return 0;

    return Math.floor(num * Number(selectedUnitRule.pointPerUnit));
  }, [amount, actualUnit, selectedUnitRule]);

  const point = useMemo(() => {
    if (!basePoint) return 0;

    const computedPoint = basePoint * Number(materialRate) * Number(difficultyMultiplier);
    return Math.floor(computedPoint);
  }, [basePoint, materialRate, difficultyMultiplier]);

  /* =====================
     保存
  ===================== */
  const handleSave = useCallback(async () => {
    console.log('=== handleSave called ===');
    console.log('Validation:', { actualMaterial, content, amount, actualUnit });
    
    if (!content || !amount || !actualUnit) {
      Alert.alert('入力不足', '内容・量・単位を入力してください');
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
        ...(difficulty ? { difficulty } : {}),
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

      const difficultyLabel = difficulty
        ? `${'★'.repeat(Number(difficulty))}（${difficultyMultiplier.toFixed(1)}倍）`
        : '未選択（1.0倍）';

      Alert.alert(
        '保存しました',
        `${subject} / ${actualMaterial}\n${amount}${actualUnit} → ${point} pt\n難易度：${difficultyLabel}`
      );

      // フォームをリセット
      setMaterial('');
      setCustomMaterial('');
      setCustomPointRate('1');
      setContent('');
      setAmount('');
      setDifficulty('');

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
  }, [actualMaterial, content, amount, actualUnit, material, customPointRate, subject, point, customMaterial, difficulty, difficultyMultiplier]);

  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>勉強を記録</ThemedText>

      {/* 科目 */}
      <ThemedText style={styles.label}>科目</ThemedText>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={subject} onValueChange={setSubject}>
          {subjects.map(item => (
            <Picker.Item key={item} label={item} value={item} />
          ))}
        </Picker>
      </View>

      {/* 教材 */}
      <ThemedText style={styles.label}>教材</ThemedText>
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
          <ThemedText style={styles.label}>ポイント倍率</ThemedText>
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
      <ThemedText style={styles.label}>内容</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="例：二次関数、長文①"
        value={content}
        onChangeText={setContent}
      />

      {/* 難易度 */}
      <ThemedText style={styles.label}>難易度</ThemedText>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={difficulty} onValueChange={value => setDifficulty(value as Difficulty)}>
          <Picker.Item label="選択しない（1.0倍）" value="" />
          <Picker.Item label="★（1.2倍）" value="1" />
          <Picker.Item label="★★（1.5倍）" value="2" />
          <Picker.Item label="★★★（1.8倍）" value="3" />
        </Picker>
      </View>

      {/* 単位選択 */}
      <ThemedText style={styles.label}>単位</ThemedText>
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
        <ThemedText style={styles.noDataText}>設定画面で単位を設定してください</ThemedText>
      )}

      {/* 量 */}
      <ThemedText style={styles.label}>
        量（{actualUnit ?? '単位'}）
      </ThemedText>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* ポイント */}
      <View style={styles.pointBox}>
        <ThemedText style={styles.pointText}>今回のポイント：{point} pt</ThemedText>
        <ThemedText style={styles.pointHintText}>
          計算：{amount || 0}{actualUnit || '単位'} × {selectedUnitRule?.pointPerUnit ?? 0}pt × {difficultyMultiplier.toFixed(1)}倍 = {point}pt
        </ThemedText>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <ThemedText style={styles.buttonText}>保存</ThemedText>
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9e1ff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontFamily: Fonts.rounded,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pointBox: {
    backgroundColor: '#fff',
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
  pointHintText: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    color: '#7a4b78',
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
