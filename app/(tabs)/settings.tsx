import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  // 仮の正しいログイン情報
  const correctUserId = 'user123';
  const correctPassword = 'pass123';

  const handleLogin = () => {
    if (userId === correctUserId && password === correctPassword) {
      // 正しい場合は SettingsScreen に遷移
      router.push('/settingsscreen');
    } else {
      Alert.alert('ログイン失敗', 'ユーザーIDまたはパスワードが間違っています');
    }
  };

  return (
    <View style={styles.container}>
      {/* ①題名 */}
      <ThemedText style={styles.title}>本人確認</ThemedText>

      {/* ②ユーザーID */}
      <TextInput
        style={styles.input}
        placeholder="ユーザーID"
        value={userId}
        onChangeText={setUserId}
      />

      {/* ③パスワード */}
      <TextInput
        style={styles.input}
        placeholder="パスワード"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* 決定ボタン */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <ThemedText style={styles.buttonText}>決定</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff4ff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: '#aaacf5ff' },
  input: { borderWidth: 1, borderColor: '#f0e8ff', borderRadius: 18, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fbf5ff', fontFamily: Fonts.rounded },
  button: { backgroundColor: '#aaacf5ff', borderRadius: 22, padding: 14, alignItems: 'center', marginBottom: 24, shadowColor: '#d6d8ff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
  buttonText: { color: '#fff', fontSize: 16 },
});
