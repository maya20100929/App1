import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
      <Text style={styles.title}>本人確認</Text>

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
        <Text style={styles.buttonText}>決定</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#aaacf5ff', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#fff', fontSize: 16 },
});
