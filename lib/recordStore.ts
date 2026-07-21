import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type Subject = '数学' | '英語' | '国語' | '理科' | '社会';

export type StudyRecord = {
  id: string;
  date: string;
  subject: Subject;
  material: string;
  content: string;
  amount: number;
  unit: string;
  point: number;
  durationMinutes?: number;
  difficulty?: '' | '1' | '2' | '3';
  userId?: string;
};

export type CustomMaterial = {
  subject: Subject;
  material: string;
  pointRate: number;
  userId?: string;
};

export type UnitPointRule = {
  subject: Subject;
  unit: string;
  pointPerUnit: number;
  userId?: string;
};

const COLLECTION_NAME = 'studyRecords';
const CUSTOM_MATERIALS_COLLECTION = 'customMaterials';
const UNIT_POINT_RULES_COLLECTION = 'unitPointRules';

/**
 * 現在のユーザーIDを取得
 */
function getCurrentUserId(): string {
  const user = auth.currentUser;
  const userId = user?.uid || 'anonymous';
  console.log('[recordStore] Current user:', { uid: user?.uid, isNull: !user });
  return userId;
}

/**
 * 新しい学習記録を保存
 */
export async function saveRecord(
  record: Omit<StudyRecord, 'id'>
): Promise<string> {
  const userId = getCurrentUserId();
  console.log('[recordStore] saveRecord called with userId:', userId);
  
  // ユーザーが認証されている場合はFirebaseに保存
  if (userId !== 'anonymous') {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...record,
        userId,
        createdAt: new Date(),
      });
      console.log('[recordStore] Record saved to Firebase with id:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[recordStore] Error saving to Firebase:', error);
      // Firebaseエラーの場合はAsyncStorageにフォールバック
    }
  }

  // 認証されていない場合またはFirebaseエラーの場合、AsyncStorageに保存
  try {
    const key = `record_${record.date}_${Date.now()}`;
    await AsyncStorage.setItem(key, JSON.stringify(record));
    console.log('[recordStore] Record saved to AsyncStorage with key:', key);
    return key;
  } catch (asError) {
    console.error('[recordStore] Error saving to AsyncStorage:', asError);
    throw asError;
  }
}

/**
 * すべての学習記録を取得（Firebase と AsyncStorage の両方）
 */
export async function getAllRecords(): Promise<StudyRecord[]> {
  const userId = getCurrentUserId();
  let allRecords: StudyRecord[] = [];

  // Firebase から取得
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    allRecords = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as StudyRecord));
    console.log('[recordStore] Firebase records loaded:', allRecords.length);
  } catch (error) {
    console.error('[recordStore] Error loading from Firebase:', error);
  }

  // AsyncStorage から取得（Firebase にないデータのみ追加）
  try {
    const keys = await AsyncStorage.getAllKeys();
    const recordKeys = keys.filter(k => k.startsWith('record_'));
    
    for (const key of recordKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const record = JSON.parse(value);
        // Firebaseにないデータのみ追加
        if (!allRecords.some(r => r.id === record.id || (r.date === record.date && r.content === record.content && r.material === record.material))) {
          allRecords.push({
            id: key,
            ...record,
          });
        }
      }
    }
    console.log('[recordStore] After merging AsyncStorage:', allRecords.length);
  } catch (error) {
    console.error('[recordStore] Error loading from AsyncStorage:', error);
  }

  return allRecords;
}

/**
 * 特定の日付の学習記録を取得（Firebase と AsyncStorage の両方）
 */
export async function getRecordsByDate(date: string): Promise<StudyRecord[]> {
  const userId = getCurrentUserId();
  let allRecords: StudyRecord[] = [];

  // Firebase から取得
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('date', '==', date),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    allRecords = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as StudyRecord));
    console.log('[recordStore] Firebase records for date:', date, 'count:', allRecords.length);
  } catch (error) {
    console.error('[recordStore] Error loading from Firebase:', error);
  }

  // AsyncStorage から取得（該当日付で Firebase にないデータのみ追加）
  try {
    const keys = await AsyncStorage.getAllKeys();
    const recordKeys = keys.filter(k => k.startsWith('record_'));
    
    for (const key of recordKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const record = JSON.parse(value);
        // 日付が一致して、Firebaseにないデータのみ追加
        if (record.date === date && !allRecords.some(r => r.id === record.id || (r.date === record.date && r.content === record.content && r.material === record.material))) {
          allRecords.push({
            id: key,
            ...record,
          });
        }
      }
    }
    console.log('[recordStore] After merging AsyncStorage for date:', date, 'total:', allRecords.length);
  } catch (error) {
    console.error('[recordStore] Error loading from AsyncStorage:', error);
  }

  return allRecords;
}

/**
 * 科目別の学習記録を取得（現在のユーザーのみ）
 */
export async function getRecordsBySubject(
  subject: Subject
): Promise<StudyRecord[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('subject', '==', subject),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as StudyRecord));
}

/**
 * 教材別の学習記録を取得（現在のユーザーのみ）
 */
export async function getRecordsByMaterial(
  material: string
): Promise<StudyRecord[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('material', '==', material),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as StudyRecord));
}

/**
 * 学習記録を更新
 */
export async function updateRecord(
  id: string,
  record: Partial<Omit<StudyRecord, 'id'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...record,
    updatedAt: new Date(),
  });
}

/**
 * 学習記録を削除
 */
export async function deleteRecord(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * カスタム教材を保存
 */
export async function saveCustomMaterial(
  subject: Subject,
  material: string,
  pointRate: number
): Promise<void> {
  const userId = getCurrentUserId();
  const docId = `${userId}_${subject}_${material}`;
  const docRef = doc(db, CUSTOM_MATERIALS_COLLECTION, docId);
  await setDoc(docRef, {
    subject,
    material,
    pointRate,
    userId,
    createdAt: new Date(),
  });
}

/**
 * 科目のカスタム教材を取得（現在のユーザーのみ）
 */
export async function getCustomMaterialsBySubject(
  subject: Subject
): Promise<CustomMaterial[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, CUSTOM_MATERIALS_COLLECTION),
    where('subject', '==', subject),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...(doc.data() as CustomMaterial),
  }));
}

/**
 * 単位あたりのポイントルールを保存
 */
export async function saveUnitPointRule(
  subject: Subject,
  unit: string,
  pointPerUnit: number
): Promise<void> {
  const userId = getCurrentUserId();
  const docId = `${userId}_${subject}_${unit}`;
  const docRef = doc(db, UNIT_POINT_RULES_COLLECTION, docId);
  await setDoc(docRef, {
    subject,
    unit,
    pointPerUnit,
    userId,
    updatedAt: new Date(),
  });
}

/**
 * 科目のユニットポイントルールを取得
 */
export async function getUnitPointRulesBySubject(
  subject: Subject
): Promise<UnitPointRule[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, UNIT_POINT_RULES_COLLECTION),
    where('subject', '==', subject),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...(doc.data() as UnitPointRule),
  }));
}

/**
 * 特定のユニットポイントルールを取得
 */
export async function getUnitPointRule(
  subject: Subject,
  unit: string
): Promise<UnitPointRule | null> {
  const userId = getCurrentUserId();
  const docSnapshot = await getDocs(query(
    collection(db, UNIT_POINT_RULES_COLLECTION),
    where('subject', '==', subject),
    where('unit', '==', unit),
    where('userId', '==', userId)
  ));

  if (docSnapshot.empty) {
    return null;
  }

  const data = docSnapshot.docs[0].data();
  return data as UnitPointRule;
}
