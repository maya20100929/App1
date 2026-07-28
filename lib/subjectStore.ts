import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubjectSetting = { name: string; color: string };
const SUBJECTS_KEY = 'custom_subjects';
const FALLBACK_COLOR = '#6C7BFA';

export async function getSubjectSettings(): Promise<SubjectSetting[]> {
  const saved = await AsyncStorage.getItem(SUBJECTS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => typeof item === 'string'
      ? { name: item, color: FALLBACK_COLOR }
      : { name: String(item.name ?? ''), color: item.color || FALLBACK_COLOR })
      .filter(item => item.name);
  } catch { return []; }
}

export async function getSubjects(): Promise<string[]> {
  return (await getSubjectSettings()).map(item => item.name);
}

async function save(settings: SubjectSetting[]) {
  await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(settings));
  return settings;
}

export async function addSubject(name: string, color = FALLBACK_COLOR) {
  const subject = name.trim();
  const settings = await getSubjectSettings();
  if (!subject || settings.some(item => item.name === subject)) return settings;
  return save([...settings, { name: subject, color }]);
}

export async function updateSubject(oldName: string, name: string, color: string) {
  const subject = name.trim();
  const settings = await getSubjectSettings();
  if (!subject || settings.some(item => item.name === subject && item.name !== oldName)) return settings;
  return save(settings.map(item => item.name === oldName ? { name: subject, color } : item));
}

export async function deleteSubject(name: string) {
  return save((await getSubjectSettings()).filter(item => item.name !== name));
}
