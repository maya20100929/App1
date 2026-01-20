import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'test_date';

export async function saveTestDate(dateText: string) {
  await AsyncStorage.setItem(KEY, dateText);
}

export async function loadTestDate(): Promise<string | null> {
  return await AsyncStorage.getItem(KEY);
}
