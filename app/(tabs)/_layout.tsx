import { Slot, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function TabsLayout() {
  type RoutePath = '/Homescreen' | '/oldrecord' | '/testrecord' | '/notification' | '/settingsscreen' | '/attack' | '/calendar' | '/login' | '/register';
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname as RoutePath;
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-260)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuOpen ? 0 : -260,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [menuOpen, slideAnim]);

  const navigate = (path: '/Homescreen' | '/oldrecord' | '/testrecord' | '/notification' | '/settingsscreen' | '/attack' | '/calendar' | '/login' | '/register') => {
    setMenuOpen(false);
    router.push(path);
  };

  const showHomeButton = currentPath !== '/Homescreen';
  const hideHeader = currentPath === '/login' || currentPath === '/register';
  const menuItems: Array<{ label: string; path: RoutePath }> = [
    { label: '今までの記録', path: '/oldrecord' },
    { label: 'テスト', path: '/testrecord' },
    { label: 'カレンダー', path: '/calendar' },
    { label: '通知', path: '/notification' },
    { label: '設定', path: '/settingsscreen' },
  ];

  return (
    <ThemedView style={styles.container}>
      {!hideHeader ? (
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => setMenuOpen(true)}>
            <ThemedText style={styles.hamburgerIcon}>☰</ThemedText>
          </TouchableOpacity>
          {showHomeButton ? (
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => navigate('/Homescreen')}
              accessibilityLabel="ホーム"
              accessibilityRole="button"
            >
              <ThemedText style={styles.homeButtonText}>⌂</ThemedText>
            </TouchableOpacity>
          ) : null}
        </ThemedView>
      ) : null}

      <Slot />

      {!hideHeader && menuOpen ? <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)} /> : null}

      {!hideHeader ? (
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}> 
          {menuItems
            .filter(item => item.path !== currentPath)
            .map(item => (
              <TouchableOpacity
                key={item.path}
                style={styles.menuButton}
                onPress={() => navigate(item.path)}
              >
                <ThemedText style={styles.menuText}>{item.label}</ThemedText>
              </TouchableOpacity>
            ))}
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e2ff',
    backgroundColor: '#fff',
  },
  hamburgerIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#aaacf5ff',
  },
  homeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#aaacf5ff',
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  overlay: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(170,172,245,0.18)',
  },
  sidebar: {
    position: 'absolute',
    top: 56,
    left: 0,
    width: 260,
    bottom: 0,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  menuButton: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#aaacf5ff',
  },
  menuText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
