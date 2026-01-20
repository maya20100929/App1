import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  

  const handleLogin = () => {
    if (!agreed) {
      Alert.alert('利用規約', '利用規約に同意してください');
      return;
    }
    Alert.alert('ログイン情報', `ユーザーID: ${userId}\nパスワード: ${password}`);
  };

  return (
    <View style={styles.container}>
      {/* ①題名 */}
      <Text style={styles.title}>ログイン</Text>

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
      
      {/* ログインボタン */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>ログイン</Text>
      </TouchableOpacity>

      {/* 一本線 */}
      <View style={styles.divider} />

      {/* ④新規登録 */}
      <Link href="/register" asChild>
        <TouchableOpacity>
          <Text style={styles.registerText}>新規登録はこちら</Text>
        </TouchableOpacity>
      </Link>

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  linkText: { color: '#007AFF', textDecorationLine: 'underline', marginLeft: 8 },
  button: { backgroundColor: '#aaacf5ff', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#fff', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#ccc', marginVertical: 24 },
  registerText: { color: '#007AFF', fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { margin: 20, backgroundColor: 'white', borderRadius: 8, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalText: { fontSize: 16, lineHeight: 24 },
  modalButton: { marginTop: 12, backgroundColor: '#aaacf5ff', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16 },
});
