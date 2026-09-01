import { Slot, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type PrimaryDestination = {
  label: '今日' | '記録' | '科目' | 'カレンダー' | 'テスト' | 'アタック';
  path: '/Homescreen' | '/oldrecord' | '/subjects' | '/calendar' | '/testrecord' | '/attack';
};

const primaryDestinations: PrimaryDestination[] = [
  { label: '今日', path: '/Homescreen' },
  { label: '記録', path: '/oldrecord' },
  { label: '科目', path: '/subjects' },
  { label: 'カレンダー', path: '/calendar' },
  { label: 'テスト', path: '/testrecord' },
  { label: 'アタック', path: '/attack' },
];

const getSection = (pathname: string): PrimaryDestination['label'] => {
  if (pathname.startsWith('/calendar')) return 'カレンダー';
  if (pathname === '/testrecord') return 'テスト';
  if (pathname === '/attack') return 'アタック';
  if (pathname.startsWith('/oldrecord') || pathname === '/record') return '記録';
  if (pathname.startsWith('/subjects')) return '科目';
  return '今日';
};

const getBackDestination = (pathname: string) => {
  if (pathname.startsWith('/oldrecord/') ) return { label: '記録', path: '/oldrecord' as const };
  if (pathname.startsWith('/subjects/')) return { label: '科目', path: '/subjects' as const };
  if (pathname === '/record') return { label: '今日', path: '/Homescreen' as const };
  if (pathname === '/testrecord' || pathname === '/notification' || pathname === '/settingsscreen' || pathname === '/help') {
    return { label: '今日', path: '/Homescreen' as const };
  }
  return null;
};

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const hideHeader = pathname === '/login';
  const section = getSection(pathname);
  const backDestination = getBackDestination(pathname);

  return (
    <ThemedView className="flex-1 bg-canvas-light dark:bg-canvas-dark" style={[styles.container, !hideHeader && { paddingTop: 44 }]}>
      {!hideHeader && (
        <ThemedView className="border-b border-brand-200 bg-surface-light dark:border-brand-800 dark:bg-surface-dark" style={styles.header}>
          {backDestination ? (
            <Pressable
              accessibilityLabel={`${backDestination.label}に戻る`}
              accessibilityRole="button"
              onPress={() => router.replace(backDestination.path)}
              style={styles.backButton}
            >
              <ThemedText style={styles.backText}>← {backDestination.label}</ThemedText>
            </Pressable>
          ) : (
            <View style={styles.primaryNavigation}>
              {primaryDestinations.map(destination => {
                const isCurrent = destination.label === section;
                return (
                  <Pressable
                    key={destination.path}
                    accessibilityLabel={destination.label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isCurrent }}
                    onPress={() => router.replace(destination.path)}
                    style={[styles.navigationItem, isCurrent && styles.navigationItemCurrent]}
                  >
                    <ThemedText style={[styles.navigationText, isCurrent && styles.navigationTextCurrent]}>
                      {destination.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}
          {backDestination && <ThemedText style={styles.sectionTitle}>{section}</ThemedText>}
        </ThemedView>
      )}

      <Slot />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 44 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    elevation: 4,
  },
  primaryNavigation: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 620,
  },
  navigationItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  navigationItemCurrent: { backgroundColor: '#7464E8' },
  navigationText: { color: '#70698A', fontSize: 14, fontWeight: '700' },
  navigationTextCurrent: { color: '#FFFFFF' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: '#7464E8', fontSize: 15, fontWeight: '700' },
  sectionTitle: {
    position: 'absolute',
    alignSelf: 'center',
    top: 12,
    color: '#211B37',
    fontSize: 16,
    fontWeight: '800',
  },
  
});
