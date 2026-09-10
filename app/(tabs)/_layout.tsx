import { Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type SectionLabel = 'ホーム' | '記録' | '科目' | 'カレンダー' | 'テスト' | 'アタック' | '友達' | '設定';

type PrimaryDestination = {
  label: Exclude<SectionLabel, '科目' | 'カレンダー' | '設定'>;
  path: '/Homescreen' | '/oldrecord' | '/testrecord' | '/attack' | '/friends';
};

const primaryDestinations: PrimaryDestination[] = [
  { label: 'ホーム', path: '/Homescreen' },
  { label: '記録', path: '/oldrecord' },
  { label: 'テスト', path: '/testrecord' },
  { label: 'アタック', path: '/attack' },
  { label: '友達', path: '/friends' },
];

const getSection = (pathname: string): SectionLabel => {
  if (pathname.startsWith('/calendar')) return 'カレンダー';
  if (pathname === '/testrecord') return 'テスト';
  if (pathname === '/attack') return 'アタック';
  if (pathname.startsWith('/friends')) return '友達';
  if (pathname === '/settingsscreen') return '設定';
  if (pathname.startsWith('/oldrecord') || pathname === '/record') return '記録';
  if (pathname.startsWith('/subjects')) return '科目';
  return 'ホーム';
};

const getBackDestination = (pathname: string) => {
  if (pathname.startsWith('/oldrecord/') ) return { label: '記録', path: '/oldrecord' as const };
  if (pathname.startsWith('/subjects/')) return { label: '科目', path: '/subjects' as const };
  if (pathname === '/record') return { label: 'ホーム', path: '/Homescreen' as const };
  if (pathname === '/notification' || pathname === '/help') {
    return { label: 'ホーム', path: '/Homescreen' as const };
  }
  return null;
};

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const hideHeader = pathname === '/login';
  const section = getSection(pathname);
  const backDestination = getBackDestination(pathname);
  const showSectionTitle = pathname.startsWith('/subjects') || !!backDestination;

  return (
    <ThemedView className="flex-1 bg-canvas-light dark:bg-canvas-dark" style={[styles.container, !hideHeader && { paddingTop: 44 }]}>
      {!hideHeader && (
        <ThemedView className="border-b border-brand-200 bg-surface-light dark:border-brand-800 dark:bg-surface-dark" style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable accessibilityLabel="Cura ホーム" onPress={() => router.replace('/Homescreen')} style={styles.brandButton}>
              <ThemedText style={styles.brand}>Cura</ThemedText>
            </Pressable>
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
                      <ThemedText
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={[styles.navigationText, isCurrent && styles.navigationTextCurrent]}
                      >
                        {destination.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={styles.utilityNavigation}>
              <Pressable accessibilityLabel="カレンダー" accessibilityRole="button" onPress={() => router.replace('/calendar')} style={[styles.iconButton, section === 'カレンダー' && styles.iconButtonCurrent]}>
                <Ionicons name="calendar-outline" size={19} color={section === 'カレンダー' ? '#FFFFFF' : '#70698A'} />
              </Pressable>
              <Pressable accessibilityLabel="設定" accessibilityRole="button" onPress={() => router.replace('/settingsscreen')} style={[styles.iconButton, section === '設定' && styles.iconButtonCurrent]}>
                <Ionicons name="settings-outline" size={19} color={section === '設定' ? '#FFFFFF' : '#70698A'} />
              </Pressable>
            </View>
            {showSectionTitle && <ThemedText style={styles.sectionTitle}>{section}</ThemedText>}
          </View>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    elevation: 4,
  },
  headerContent: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    justifyContent: 'flex-start',
    minHeight: 44,
  },
  brandButton: { paddingLeft: 2, paddingRight: 18, paddingVertical: 7, marginRight: 8, zIndex: 1 },
  brand: { color: '#4E427F', fontSize: 19, fontWeight: '900', letterSpacing: -.5 },
  utilityNavigation: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
    justifyContent: 'flex-end',
    minWidth: 76,
    paddingLeft: 12,
    zIndex: 1,
  },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconButtonCurrent: { backgroundColor: '#7464E8' },
  primaryNavigation: {
    position: 'absolute',
    left: 96,
    right: 96,
    top: 6,
    height: 36,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 620,
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 'auto',
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  navigationItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  navigationItemCurrent: { backgroundColor: '#7464E8' },
  navigationText: { color: '#70698A', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  navigationTextCurrent: { color: '#FFFFFF' },
  backButton: { flex: 1, paddingVertical: 8 },
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
