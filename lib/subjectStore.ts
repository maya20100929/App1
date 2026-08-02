import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubjectSetting = { name: string; color: string; categories: string[] };
const SUBJECTS_KEY = 'custom_subjects';
const FALLBACK_COLOR = '#6C7BFA';
const DEFAULT_SUBJECTS: SubjectSetting[] = [
  { name: '数学', color: '#6C7BFA', categories: [] },
  { name: '英語', color: '#4CAF50', categories: [] },
  { name: '国語', color: '#9C27B0', categories: [] },
  { name: '理科', color: '#FF9800', categories: [] },
  { name: '社会', color: '#03A9F4', categories: [] },
];

export async function getSubjectSettings(): Promise<SubjectSetting[]> {
  const saved = await AsyncStorage.getItem(SUBJECTS_KEY);
  if (!saved) return DEFAULT_SUBJECTS;
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => typeof item === 'string'
      ? { name: item, color: FALLBACK_COLOR, categories: [] }
      : {
          name: String(item.name ?? ''),
          color: item.color || FALLBACK_COLOR,
          categories: Array.isArray(item.categories)
            ? item.categories.map((name: unknown) => String(name).trim()).filter(Boolean)
            : [],
        })
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
  return save([...settings, { name: subject, color, categories: [] }]);
}

export async function updateSubject(oldName: string, name: string, color: string) {
  const subject = name.trim();
  const settings = await getSubjectSettings();
  if (!subject || settings.some(item => item.name === subject && item.name !== oldName)) return settings;
  return save(settings.map(item => item.name === oldName ? { ...item, name: subject, color } : item));
}

export async function deleteSubject(name: string) {
  return save((await getSubjectSettings()).filter(item => item.name !== name));
}

export async function addSubjectCategory(subjectName: string, categoryName: string) {
  const category = categoryName.trim();
  const settings = await getSubjectSettings();
  if (!category) return settings;
  return save(settings.map(subject =>
    subject.name === subjectName && !subject.categories.includes(category)
      ? { ...subject, categories: [...subject.categories, category] }
      : subject
  ));
}

export async function deleteSubjectCategory(subjectName: string, categoryName: string) {
  const settings = await getSubjectSettings();
  return save(settings.map(subject =>
    subject.name === subjectName
      ? { ...subject, categories: subject.categories.filter(category => category !== categoryName) }
      : subject
  ));
}
