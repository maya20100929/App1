import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getSubjectSettings, type SubjectSetting } from '@/lib/subjectStore';

export default function SubjectsScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      getSubjectSettings()
        .then(settings => {
          if (isActive) setSubjects(settings);
        })
        .catch(error => console.error('Failed to load subjects', error))
        .finally(() => {
          if (isActive) setIsLoading(false);
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.eyebrow}>学習の対象</ThemedText>
        <ThemedText style={styles.title}>科目を選ぶ</ThemedText>
        <ThemedText style={styles.description}>
          科目から教材を選び、学習を始めます。
        </ThemedText>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#7464E8" />
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>科目がありません</ThemedText>
            <ThemedText style={styles.emptyDescription}>科目は今後この画面から追加できるようにします。</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {subjects.map(subject => (
              <Pressable
                key={subject.name}
                accessibilityRole="button"
                accessibilityLabel={`${subject.name}を開く`}
                onPress={() => router.push(`/subjects/${encodeURIComponent(subject.name)}` as never)}
                style={styles.subjectRow}
              >
                <View>
                  <ThemedText style={styles.subjectName}>{subject.name}</ThemedText>
                  <ThemedText style={styles.subjectMeta}>
                    {subject.categories.length > 0 ? `${subject.categories.length} カテゴリ` : 'カテゴリ未設定'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.disclosure}>›</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  eyebrow: { color: '#7464E8', fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#211B37', fontSize: 32, fontWeight: '900', marginTop: 6 },
  description: { color: '#70698A', fontSize: 15, marginTop: 8, marginBottom: 28 },
  loading: { paddingVertical: 48 },
  list: { gap: 10 },
  subjectRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  subjectName: { color: '#211B37', fontSize: 21, fontWeight: '800' },
  subjectMeta: { color: '#70698A', fontSize: 13, marginTop: 4 },
  disclosure: { color: '#7464E8', fontSize: 30, lineHeight: 30 },
  emptyState: { paddingVertical: 48 },
  emptyTitle: { color: '#211B37', fontSize: 19, fontWeight: '800' },
  emptyDescription: { color: '#70698A', marginTop: 6 },
});
