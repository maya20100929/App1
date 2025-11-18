import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#aaacf5ff');
  const [lastLogin, setLastLogin] = useState('');

  const themeColors = [
    '#aaacf5ff', // 現在の色（パープル）
    '#007AFF',   // ブルー
    '#30d5c8',   // ミント
    '#ff7eb9',   // ピンク
    '#1a1a1a',   // ブラック
  ];

  // 最終ログイン表示
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('lastLogin');
      if (saved) {
        const d = new Date(saved);
        setLastLogin(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}  ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
      }
    })();
  }, []);

  // 選んだテーマカラー保存
  const handleSelectColor = async (color: string) => {
    setSelectedColor(color);
    await AsyncStorage.setItem('themeColor', color);
  };

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', onPress: () => Alert.alert('ログアウトしました') },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('アカウント削除', '本当に削除しますか？\nこの操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: () => Alert.alert('アカウントを削除しました') },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 設定内検索 */}
      <TextInput
        style={styles.searchInput}
        placeholder="設定を検索"
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* テーマカラー */}
      <Text style={styles.sectionTitle}>テーマカラー</Text>
      <View style={styles.colorRow}>
        {themeColors.map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorDot,
              { backgroundColor: color },
              selectedColor === color && styles.selectedDot,
            ]}
            onPress={() => handleSelectColor(color)}
          />
        ))}
      </View>

      {/* 利用履歴 */}
      <Text style={styles.sectionTitle}>利用履歴</Text>
      <View style={styles.box}>
        <Text style={styles.boxText}>
          最終ログイン：{lastLogin || 'データなし'}
        </Text>
      </View>

      {/* アカウント */}
      <Text style={styles.sectionTitle}>アカウント</Text>
      <View style={styles.box}>
        <TouchableOpacity style={styles.accountButton} onPress={handleLogout}>
          <Text style={styles.accountButtonText}>ログアウト</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>アカウント削除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },

  searchInput: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },

  colorRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },

  selectedDot: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },

  box: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },

  boxText: {
    fontSize: 16,
  },

  accountButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  accountButtonText: { color: '#fff', fontSize: 16 },

  deleteButton: {
    backgroundColor: '#ff3b30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#fff', fontSize: 16 },
});
