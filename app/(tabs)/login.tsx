import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: '',
    androidClientId: '',
    webClientId: '241701972988-4f5mcf63nrmms507rh1brjd49f7eh2p5.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) {
        handleGoogleSignIn(idToken);
      } else {
        setErrorMessage('Google 認証に失敗しました。再度お試しください。');
      }
    } else if (response?.type === 'error') {
      setErrorMessage('Google 認証がキャンセルされました。');
    }
  }, [response]);

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

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setErrorMessage('');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      router.push('/Homescreen');
    } catch (e: any) {
      console.error('Google sign in failed', e);
      setErrorMessage('Googleでのログインに失敗しました。');
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>ログイン</ThemedText>

      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        value={userId}
        onChangeText={setUserId}
      />

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

      {errorMessage ? (
        <ThemedText style={{ color: 'red', marginBottom: 16, textAlign: 'center' }}>
          {errorMessage}
        </ThemedText>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <ThemedText style={styles.buttonText}>ログイン</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={() => promptAsync()}
        disabled={!request}
      >
        <ThemedText style={styles.googleButtonText}>Googleでログイン</ThemedText>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Link href="/register" asChild>
        <TouchableOpacity>
          <ThemedText style={styles.registerText}>新規登録はこちら</ThemedText>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: '#8a2f8a' },
  input: { borderWidth: 1, borderColor: '#e8e2ff', borderRadius: 18, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fff', fontFamily: Fonts.rounded },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  linkText: { color: '#aaacf5ff', textDecorationLine: 'underline', marginLeft: 8 },
  button: { backgroundColor: '#aaacf5ff', borderRadius: 24, padding: 14, alignItems: 'center', marginBottom: 16, shadowColor: '#d6d8ff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
  googleButton: { backgroundColor: '#aaacf5ff' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  googleButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#aaacf5ff', marginVertical: 24 },
  registerText: { color: '#aaacf5ff', fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  modalContent: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 22, maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#7a2f7f' },
  modalText: { fontSize: 16, lineHeight: 24 },
  modalButton: { marginTop: 12, backgroundColor: '#aaacf5ff', borderRadius: 18, padding: 12, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16 },
});
