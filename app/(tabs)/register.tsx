import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../lib/firebase';

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  

  const validateForm = () => {
    const errors: string[] = [];
    const email = userId.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('有効なメールアドレスを入力してください。');
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      errors.push('パスワードは8文字以上で、英字と数字を含めてください。');
    }
    if (!agreed) {
      errors.push('利用規約とプライバシーポリシーに同意してください。');
    }
    return errors;
  };

  const handleLogin = async () => {
    console.log('handleLogin called');
    const errors = validateForm();
    console.log('errors:', errors);
    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
      return;
    }
    setErrorMessage('');
    try {
      const userCred = await createUserWithEmailAndPassword(auth, userId.trim(), password);
      const uid = userCred.user.uid;
      try {
        await setDoc(doc(db, 'users', uid), {
          email: userId.trim(),
          agreed: true,
          createdAt: serverTimestamp(),
        });
      } catch (e2: any) {
        console.warn('failed to save user doc', e2);
      }
      // navigate to index (ログイン画面)
      router.push('/');
    } catch (e: any) {
      const msg = e?.message || String(e);
      setErrorMessage(msg);
    }
  };

  return (
    <View style={styles.container}>
      {/* ①題名 */}
      <ThemedText style={styles.title}>新規登録</ThemedText>

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
      <ThemedText style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
        パスワードは8文字以上で、英字と数字を含めてください。
      </ThemedText>

      {/* 利用規約チェック（ここにSwitchを置く） */}
    <View style={styles.termsContainer}>
      <Switch
        value={agreed}
        onValueChange={setAgreed}
        trackColor={{ true: '#007AFF', false: '#ccc' }}
      thumbColor={'#fff'}
  />
    <TouchableOpacity onPress={() => setModalVisible(true)}>
      <ThemedText style={styles.linkText}>利用規約・プライバシーポリシーを見る</ThemedText>
    </TouchableOpacity>
    </View>

      {/* エラーメッセージ */}
      {errorMessage ? (
        <ThemedText style={{ color: 'red', marginBottom: 16, textAlign: 'center' }}>
          {errorMessage}
        </ThemedText>
      ) : null}

      {/* 登録ボタン */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <ThemedText style={styles.buttonText}>登録</ThemedText>
      </TouchableOpacity>


      {/* モーダル */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <ThemedText style={styles.modalTitle}>利用規約</ThemedText>
              <ThemedText style={styles.modalText}>
                第1条（適用）{'\n'}
                1.本規約は、ユーザーと当社との間の本アプリの利用に関する一切の関係に適用されます。{'\n'}
                2.当社は本規約を随時変更できるものとし、変更後の規約は本アプリ上に表示された時点から効力を生じます。{'\n'}
                {'\n'}
                第2条（利用登録）{'\n'}
                1.本アプリの利用希望者は、当社の定める方法により利用登録を行うものとします。{'\n'}
                2.利用登録の申請に対し、当社が承認した時点で利用契約が成立します。{'\n'}
                3.当社は、利用登録の申請を承認しない場合があります。その理由については開示しません。{'\n'}
                {'\n'}
                第3条（ユーザーの責任）{'\n'}
                1.ユーザーは自己の責任において本アプリを利用するものとします。{'\n'}
                2.ユーザーは、以下の行為を行ってはなりません。{'\n'}
                  ・法令または公序良俗に反する行為{'\n'}
                  ・他のユーザー、第三者、当社に損害を与える行為{'\n'}
                  ・本アプリの運営を妨げる行為{'\n'}
                  ・不正アクセスやデータ改ざん等の不正行為{'\n'}
                {'\n'}
                第4条（知的財産権）{'\n'}
                1.本アプリに関する著作権、商標権、特許権その他の知的財産権はすべて当社または当社にライセンスを許諾した第三者に帰属します。{'\n'}
                2.ユーザーは本アプリを個人的に利用する範囲内でのみ使用でき、無断で複製・配布・商用利用することはできません。{'\n'}
                {'\n'}
                第5条（禁止事項）{'\n'}
                ユーザーは、以下の行為を行ってはなりません。{'\n'}
                1.本アプリの改変、リバースエンジニアリング{'\n'}
                2.ウイルスや有害なプログラムの送信{'\n'}
                3.他のユーザーの個人情報の収集・利用{'\n'}
                4.本アプリを営利目的で利用すること{'\n'}
                {'\n'}
                第6条（本アプリの提供の停止等）{'\n'}
                1.当社は、以下の場合にユーザーへの事前通知なく本アプリの提供を停止または中断することがあります。{'\n'}
                  ・本アプリの保守・更新を行う場合{'\n'}
                  ・火災、停電、天災地変などやむを得ない事由がある場合{'\n'}
                2.当社は、本条に基づく停止・中断によりユーザーまたは第三者に生じた損害について、一切責任を負いません。{'\n'}
                {'\n'}
                第7条（免責事項）{'\n'}
                1.当社は、本アプリに関して、その完全性、正確性、最新性、特定目的適合性等について一切保証しません。{'\n'}
                2.ユーザーが本アプリを利用したことにより生じた損害について、当社は一切責任を負いません。{'\n'}
                {'\n'}
                第8条（利用規約の変更）{'\n'}
                当社は、必要に応じて本規約を変更することができ、変更後の規約は本アプリ上に掲示された時点で効力を生じます。ユーザーは変更後も本アプリを利用した時点で、変更に同意したものとみなされます。{'\n'}
                {'\n'}
                第9条（準拠法・管轄）{'\n'}
                1.本規約の解釈にあたっては、日本法を準拠法とします。{'\n'}
                2.本アプリに関して紛争が生じた場合、当社所在地の管轄裁判所を第一審の専属的合意管轄裁判所とします。{'\n'}
                {'\n'}
                第10条（未成年者の利用）{'\n'}
                1.ユーザーが未成年者（日本法上18歳未満を指します）の場合、本アプリを利用するにあたって、必ず親権者その他の法定代理人の同意を得るものとします。{'\n'}
                2.未成年者のユーザーが本アプリを利用した場合、当社は、親権者等の同意を得たうえでの利用であるとみなします。{'\n'}
                3.未成年者が親権者等の同意を得ずに本アプリを利用し、または虚偽の申告を行った場合でも、当社は一切の責任を負いません。{'\n'}
                4.ユーザーが利用開始後に成年に達した場合、当該ユーザーは成年到達後も引き続き本アプリを利用する意思をもって本規約に同意したものとみなします。{'\n'}
              </ThemedText>


<ThemedText style={styles.modalTitle}>プライバシーポリシー</ThemedText>
              <ThemedText style={styles.modalText}>
                {'\n'}
                プライバシーポリシー{'\n'}
        本プライバシーポリシー（以下「本ポリシー」といいます。）は、当社（以下「当社」といいます。）が提供する勉強アプリ「○○」（以下「本アプリ」といいます。）における、ユーザーの個人情報の取り扱いについて定めるものです。ユーザーは本アプリを利用することで、本ポリシーに同意したものとみなされます。{'\n'}
        {'\n'}
        第1条（収集する情報）{'\n'}
        本アプリでは、以下の情報を収集する場合があります。{'\n'}
        1. ユーザーが登録時に提供する情報{'\n'}
        ・氏名（ニックネーム可）{'\n'}
        ・メールアドレス{'\n'}
        ・学年や学校名（任意）{'\n'}
        2. 利用状況に関する情報{'\n'}
        ・アプリの利用ログ（学習時間、進捗、達成度など）{'\n'}
        ・デバイス情報（OS、端末種類、アプリのバージョンなど）{'\n'}
        3. お問い合わせ時に提供される情報{'\n'}
        ・問い合わせ内容{'\n'}
        ・連絡先情報（メールアドレスなど）{'\n'}
        {'\n'}
        第2条（個人情報の利用目的）{'\n'}
        収集した情報は、以下の目的で利用します。{'\n'}
        ・本アプリの運営・管理{'\n'}
        ・ユーザーへのサポート対応{'\n'}
        ・アプリ機能の改善や新機能の開発{'\n'}
        ・法令に基づく対応{'\n'}
        ・本アプリに関する通知（更新情報やお知らせ）{'\n'}
        {'\n'}
        第3条（個人情報の第三者提供）{'\n'}
        当社は、法令に定める場合を除き、ユーザーの同意なしに個人情報を第三者に提供しません。{'\n'}
        {'\n'}
        第4条（未成年者の個人情報）{'\n'}
        1. 未成年者（18歳未満）のユーザーが個人情報を提供する場合は、必ず親権者等の同意を得たうえで提供するものとします。{'\n'}
        2. 当社は、未成年者が親権者等の同意を得ずに個人情報を提供した場合の責任を負いません。{'\n'}
        {'\n'}
        第5条（情報の安全管理）{'\n'}
        当社は、個人情報の漏えい・紛失・改ざんを防ぐために、合理的な安全対策を講じます。{'\n'}
        {'\n'}
        第6条（個人情報の開示・訂正・削除）{'\n'}
        ユーザーは、当社に対して自己の個人情報の開示、訂正、利用停止または削除を求めることができます。請求方法や手順については、本アプリ内の問い合わせフォームにてご連絡ください。{'\n'}
        {'\n'}
        第7条（プライバシーポリシーの変更）{'\n'}
        本ポリシーは、必要に応じて変更されることがあります。変更後のプライバシーポリシーは、本アプリ上に掲示された時点で効力を生じます。{'\n'}
        {'\n'}
        第8条（お問い合わせ窓口）{'\n'}
        本ポリシーに関するお問い合わせは、以下の窓口までお願いします。{'\n'}
        ○○株式会社{'\n'}
        E-mail: support@example.com{'\n'}
              </ThemedText>

            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.modalButtonText}>閉じる</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff4ff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: '#aaacf5ff' },
  input: { borderWidth: 1, borderColor: '#f0e8ff', borderRadius: 18, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fbf5ff', fontFamily: Fonts.rounded },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  linkText: { color: '#aaacf5ff', textDecorationLine: 'underline', marginLeft: 8 },
  button: { backgroundColor: '#aaacf5ff', borderRadius: 22, padding: 14, alignItems: 'center', marginBottom: 24, shadowColor: '#d6d8ff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
  buttonText: { color: '#fff', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#f0e7ff', marginVertical: 24 },
  registerText: { color: '#aaacf5ff', fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  modalContent: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#6a2d7d' },
  modalText: { fontSize: 16, lineHeight: 24 },
  modalButton: { marginTop: 12, backgroundColor: '#aaacf5ff', borderRadius: 18, padding: 12, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16 },
});
