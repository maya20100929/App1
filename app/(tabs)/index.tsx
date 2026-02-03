import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../lib/firebase';

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  

  const validateForm = () => {
    const errors: string[] = [];
    const email = userId.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('有効なメールアドレスを入力してください。');
    }
    if (password.length === 0) {
      errors.push('パスワードを入力してください。');
    }
    return errors;
  };

  const handleLogin = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
      return;
    }
    setErrorMessage('');
    try {
      await signInWithEmailAndPassword(auth, userId.trim(), password);
      router.push('/Homescreen');
    } catch (e: any) {
      let msg = 'ログインエラー';
      if (e.code === 'auth/user-not-found') {
        msg = 'このアカウントは存在しません';
      } else if (e.code === 'auth/wrong-password') {
        msg = 'パスワードが間違っています';
      } else if (e.code === 'auth/invalid-email') {
        msg = 'メールアドレスの形式が正しくありません';
      } else {
        msg = 'メールアドレスまたはパスワードが間違っています';
      }
      setErrorMessage(msg);
    }
  };

  return (
    <View style={styles.container}>
      {/* ①題名 */}
      <Text style={styles.title}>ログイン</Text>

      {/* ②メアド */}
      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        value={userId}
        onChangeText={setUserId}
      />

      {/* ③パスワード */}
      <View style={{ position: 'relative' }}>
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={{ position: 'absolute', right: 12, top: 12 }}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      {/* エラーメッセージ */}
      {errorMessage ? (
        <Text style={{ color: 'red', marginBottom: 16, textAlign: 'center' }}>
          {errorMessage}
        </Text>
      ) : null}

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
